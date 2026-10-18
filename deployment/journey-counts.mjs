import {journeyPages as pages,journeySources as sources} from './journey-dimensions.mjs';
const events=new Set(['page_view','offer_select','question_select','contact_select','request_start','question_start','inquiry_saved','question_saved','email_click','chat_open']);
const services=new Set(['launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint','unsure']);
export const journeyRetentionDays=90;
export function journeyReportCoverage(days,now=Date.now()){
 if(!Number.isInteger(days)||days<1||days>journeyRetentionDays)throw Error('Reporting days must be 1–90.');
 const day=offset=>new Date(now-offset*86400000).toISOString().slice(0,10);
 const since=day(days-1),comparisonSince=day(2*days-1),retainedSince=day(journeyRetentionDays-1);
 const previousAvailable=comparisonSince>=retainedSince;
 return {since,comparisonSince,coverage:{retentionDays:journeyRetentionDays,retainedSince,through:day(0),comparisonThrough:day(days),previousAvailable,reason:previousAvailable?null:'previous_period_outside_retention',scope:'retention_window_only'}};
}
const reply=status=>new Response(null,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
export async function saveJourneyCount(request,env,{readLimited,fingerprint,now=Date.now()}){
 if(env.JOURNEY_COUNTS!=='aggregate'||env.ENVIRONMENT!=='production'||env.RELEASE_APPROVED!=='true'||env.INQUIRY_MODE!=='live')return reply(404);
 if(request.method!=='POST')return reply(405);
 if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return reply(403);
 if(request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1')return reply(204);
 if(/(?:bot(?:[\s/;)]|$)|crawler|spider|HeadlessChrome|Lighthouse|PageSpeed)/i.test(request.headers.get('User-Agent')||''))return reply(204);
 if(!env.DB||!env.FINGERPRINT_SECRET||env.FINGERPRINT_SECRET.length<32)return reply(503);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return reply(415);
 let data;try{data=JSON.parse(await readLimited(request.body,512));}catch{return reply(400);}
 if(!data||typeof data!=='object'||Array.isArray(data)||!['event,page,service','event,page,service,source'].includes(Object.keys(data).sort().join(','))||!events.has(data.event)||!services.has(data.service)||!pages.has(data.page)||!sources.has(data.source??'not_recorded'))return reply(400);
 // Distinct short-lived rate key; never stored with aggregate events.
 const key=await fingerprint(env.FINGERPRINT_SECRET,`journey-rate:${request.headers.get('CF-Connecting-IP')||'unknown'}:${Math.floor(now/600000)}`);
 const allowed=await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<60 RETURNING hits').bind(key,now+1200000).first();
 if(!allowed)return reply(429);
 const day=new Date(now).toISOString().slice(0,10);
 await env.DB.prepare('INSERT INTO journey_counts (day,event,service,page,source,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)').bind(day,data.event,data.service,data.page,data.source??'not_recorded').run();
 return reply(204);
}
export async function cleanJourneyCounts(db,now=Date.now()){
 if(!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='journey_counts'").first())return;
 const before=new Date(now-(journeyRetentionDays-1)*86400000).toISOString().slice(0,10);
 await db.prepare('DELETE FROM journey_counts WHERE day < ?').bind(before).run();
}
