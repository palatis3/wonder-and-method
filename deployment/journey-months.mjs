export const journeyMonthlyRetentionMonths=24;

export async function hasJourneyMonths(db){
 const row=await db.prepare("SELECT count(*) AS total FROM sqlite_master WHERE type='table' AND name IN ('journey_monthly_counts','journey_monthly_state')").first();
 if(row.total!==0&&row.total!==2)throw Error('Incomplete monthly aggregate schema.');
 return row.total===2;
}

export function journeyMonthWindow(months=journeyMonthlyRetentionMonths,now=Date.now()){
 if(!Number.isInteger(months)||months<1||months>journeyMonthlyRetentionMonths)throw Error('Reporting months must be 1–24.');
 const date=new Date(now),month=offset=>new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-offset,1)).toISOString().slice(0,7);
 return {months,sinceMonth:month(months-1),throughMonth:month(0),retainedSinceMonth:month(journeyMonthlyRetentionMonths-1)};
}

export async function saveJourneyTotals(db,day,data,now){
 const source=data.source??'not_recorded';
 const daily=db.prepare('INSERT INTO journey_counts (day,event,service,page,source,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)').bind(day,data.event,data.service,data.page,source);
 if(!await hasJourneyMonths(db)){await daily.run();return;}
 // The monthly increment sees the daily value BEFORE its capped increment.
 // D1 batch is atomic: a rejected daily key also rolls back monthly/state writes.
 const monthly=db.prepare(`INSERT INTO journey_monthly_counts (month,event,service,page,source,total)
  SELECT ?,?,?,?,?,1 WHERE COALESCE((SELECT total FROM journey_counts WHERE day=? AND event=? AND service=? AND page=? AND source=?),0)<1000000
  ON CONFLICT(month,event,service,page,source) DO UPDATE SET total=total+1`)
  .bind(day.slice(0,7),data.event,data.service,data.page,source,day,data.event,data.service,data.page,source);
 const started=db.prepare('INSERT INTO journey_monthly_state (id,first_recorded_at) SELECT 1,? WHERE EXISTS (SELECT 1 FROM journey_monthly_counts) ON CONFLICT(id) DO NOTHING').bind(now);
 await db.batch([monthly,daily,started]);
}

export async function cleanJourneyMonths(db,now=Date.now()){
 if(!await hasJourneyMonths(db))return;
 await db.prepare('DELETE FROM journey_monthly_counts WHERE month < ?').bind(journeyMonthWindow(journeyMonthlyRetentionMonths,now).retainedSinceMonth).run();
}

export async function readJourneyMonths(db,months=journeyMonthlyRetentionMonths,now=Date.now()){
 const window=journeyMonthWindow(months,now);
 if(!await hasJourneyMonths(db))return null;
 const first=await db.prepare('SELECT first_recorded_at FROM journey_monthly_state WHERE id=1').first();
 const {results:counts}=await db.prepare('SELECT month,event,SUM(total) AS total FROM journey_monthly_counts WHERE month>=? AND month<=? GROUP BY month,event ORDER BY month,event').bind(window.sinceMonth,window.throughMonth).all();
 const {results:bySource}=await db.prepare("SELECT month,source,SUM(total) AS total FROM journey_monthly_counts WHERE month>=? AND month<=? AND event='page_view' GROUP BY month,source ORDER BY month,source").bind(window.sinceMonth,window.throughMonth).all();
 return {...window,retentionMonths:journeyMonthlyRetentionMonths,firstRecordedAt:first?.first_recorded_at??null,counts,bySource,
  note:'Prospective monthly event totals, not unique people, leads or linked journeys. No daily history was backfilled. The first recorded month and current UTC month can be incomplete. A month without rows means no recorded events, not verified zero visitors. Collection continuity is not verified; privacy choices, blockers, bots and outages affect counts. Retention includes the current UTC month and the preceding 23 months.'};
}
