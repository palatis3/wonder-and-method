import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdir,readFile} from 'node:fs/promises';
import {journeyPages} from '../deployment/journey-dimensions.mjs';
import {inquiryChoices} from '../src/shared.mjs';

test('V3 migration preserves daily/monthly history, accepts every current offer and page, and rejects invalid dimensions',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  const dir=new URL('../deployment/migrations/',import.meta.url);
  for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')&&f<'0049').sort())db.exec(await readFile(new URL(file,dir),'utf8'));
  db.exec("INSERT INTO journey_counts VALUES ('2026-10-28','page_view','launch_site','home','direct',123); INSERT INTO journey_monthly_counts VALUES ('2026-10','page_view','launch_site','home','direct',456); INSERT INTO journey_monthly_state VALUES (1,1793156400000)");
  const daily=db.prepare('SELECT * FROM journey_counts').all(),monthly=db.prepare('SELECT * FROM journey_monthly_counts').all(),state=db.prepare('SELECT * FROM journey_monthly_state').all();
  db.exec(await readFile(new URL('0049_v3_offers.sql',dir),'utf8'));
  assert.deepEqual(db.prepare('SELECT * FROM journey_counts').all(),daily);
  assert.deepEqual(db.prepare('SELECT * FROM journey_monthly_counts').all(),monthly);
  assert.deepEqual(db.prepare('SELECT * FROM journey_monthly_state').all(),state);
  const insert=db.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?,?)'),insertMonthly=db.prepare('INSERT INTO journey_monthly_counts VALUES (?,?,?,?,?,?)');
  const expectedServices=['launch_site','focused_site','business_site','signature_site','keep_running','improve','local_focus','grow','website_baseline','audit_fix_sprint','brand_message','storefront','local_presence','workflow','systems','unsure'];
  assert.deepEqual(inquiryChoices.map(([id])=>id).sort(),[...expectedServices].sort());
  for(const service of expectedServices){
   insert.run('2026-10-29','offer_select',service,'pricing','direct',1);
   insertMonthly.run('2026-10','offer_select',service,'pricing','direct',1);
  }
  for(const page of journeyPages)insert.run('2026-10-29','page_view','unsure',page,'direct',1);
  for(const table of ['journey_counts','journey_monthly_counts']){
   const statement=table==='journey_counts'?insert:insertMonthly,date=table==='journey_counts'?'2026-10-29':'2026-10';
   assert.throws(()=>statement.run(date,'page_view','invented_offer','pricing','direct',1),/CHECK constraint/);
   assert.throws(()=>statement.run(date,'page_view','0','pricing','direct',1),/CHECK constraint/);
   assert.throws(()=>statement.run(date,'invalid_event','unsure','pricing','direct',1),/CHECK constraint/);
  }
  assert.throws(()=>insert.run('2026-10-29','page_view','unsure','unlisted_page','direct',1),/CHECK constraint/);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();}
});
