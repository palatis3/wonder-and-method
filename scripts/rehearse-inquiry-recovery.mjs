import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import worker from '../deployment/worker.mjs';
import {inquiryRetentionPreview} from '../deployment/inquiry-maintenance.mjs';

const root=resolve(import.meta.dirname,'..');
function adapter(sqlite){return {prepare(sql){const query=values=>({bind:(...next)=>query(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return sqlite.prepare(sql).run(...values);}});return query([]);}};}
const digest=sqlite=>createHash('sha256').update(JSON.stringify(['inquiries','rate_limits','journey_counts','operation_health'].map(table=>[table,sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all()]))).digest('hex');

export async function rehearseInquiryRecovery(directory){
 // A fresh, explicitly named rehearsal directory prevents reuse of real data.
 await mkdir(directory,{recursive:false});
 const source=new DatabaseSync(resolve(directory,'synthetic-source.sqlite'));
 const migrations=(await readdir(resolve(root,'deployment/migrations'))).filter(file=>file.endsWith('.sql')).sort();
 let recovered;
 try{
  for(const file of migrations)source.exec(await readFile(resolve(root,'deployment/migrations',file),'utf8'));
  const now=Date.now(),ids=[1,2,3].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
  const put=source.prepare('INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,last_substantive_contact_at,retention_hold,retention_hold_reason,retention_hold_review_at,notification_payload) VALUES(?,?,?,?,0,?,?,?,?,?,?)');
  const payload=JSON.stringify({name:'Synthetic recovery fixture',email:'fixture@example.test',service:'focused_site',message:'Invented recovery data; no real person or delivery.'});
  for(let i=0;i<3;i++)put.run(ids[i],now-100*86400_000,payload,ids[i],i===2?'manual_review':'accepted',now-95*86400_000,i===1?1:0,i===1?'Synthetic preservation':null,i===1?now-1000:null,JSON.stringify({to:['fixture@example.test'],text:'Frozen synthetic notification'}));
  source.prepare('UPDATE inquiries SET is_client=1 WHERE id=?').run(ids[2]);
  source.prepare('INSERT INTO journey_counts(day,event,service,page,source,total) VALUES(?,?,?,?,?,?)').run(new Date(now).toISOString().slice(0,10),'chat_open','unsure','contact','direct',7);
  source.prepare('INSERT INTO operation_health VALUES(?,?)').run('inquiry-recovery',now);
  const before=digest(source),expected=await inquiryRetentionPreview(adapter(source),now);
  source.prepare('VACUUM INTO ?').run(resolve(directory,'synthetic-restored.sqlite'));
  recovered=new DatabaseSync(resolve(directory,'synthetic-restored.sqlite'));
  assert.equal(recovered.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(digest(recovered),before,'Restored rows and frozen payloads match');
  assert.deepEqual(await inquiryRetentionPreview(adapter(recovered),now),expected);
  assert.deepEqual(expected.due.map(row=>row.id),[ids[0]]);assert.equal(expected.holds_needing_review[0].id,ids[1]);
  const env={DB:adapter(recovered),ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'synthetic',OPERATOR_TOKEN:'synthetic-recovery-only',FINGERPRINT_SECRET:'synthetic-recovery-key-over-32-characters'};
  const headers={Authorization:'Bearer synthetic-recovery-only',Accept:'application/json','X-Confirm-Delete':ids[1]};
  const blocked=await worker.fetch(new Request('https://example.test/api/operator/inquiries/'+ids[1],{method:'DELETE',headers}),env,{waitUntil(){throw Error('No sends permitted in recovery rehearsal');}});
  assert.equal(blocked.status,409);assert.equal(recovered.prepare('SELECT count(*) AS total FROM inquiries').get().total,3);
  const report={checkedAt:new Date().toISOString(),kind:'Isolated current-schema synthetic SQLite restore rehearsal',migrations,fixtureInquiries:3,fixtureAggregateTotal:7,integrity:'ok',restoredContentHash:before,exactRowAndFrozenPayloadMatch:true,retentionPreviewMatch:true,expiredHoldStillBlocksDeletion:true,externalRequests:0,realRecordsRead:0,limits:'Local current-schema restore only. Does not prove Cloudflare account access, remote D1 point-in-time recovery, mailbox restoration, independent vault access or loss of this Windows device.'};
  await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');return report;
 }finally{source.close();recovered?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const label=process.argv[2];
 if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(label||'')){console.error('Supply a new lowercase rehearsal label.');process.exitCode=1;}
 else {const parent=resolve(root,'.runtime/recovery-rehearsals');await mkdir(parent,{recursive:true});rehearseInquiryRecovery(resolve(parent,label)).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});}
}
