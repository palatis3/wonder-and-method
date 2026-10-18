import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {rehearseInquiryRecovery} from '../scripts/rehearse-inquiry-recovery.mjs';

test('all current migrations survive the complete isolated inquiry recovery rehearsal',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'wm-inquiry-rehearsal-'));
 try{
  const directory=join(parent,'fresh-fixture');
  const report=await rehearseInquiryRecovery(directory);
  assert.ok(report.migrations.includes('0007_journey_sources.sql'));
  assert.equal(report.integrity,'ok');
  for(const key of ['exactRowAndFrozenPayloadMatch','retentionPreviewMatch','expiredHoldStillBlocksDeletion'])assert.equal(report[key],true,key);
  assert.equal(report.externalRequests,0);assert.equal(report.realRecordsRead,0);
  assert.deepEqual(JSON.parse(await readFile(join(directory,'report.json'),'utf8')),report);
  const restored=new DatabaseSync(join(directory,'synthetic-restored.sqlite'),{readOnly:true});
  try{
   assert.deepEqual({...restored.prepare('SELECT source,total FROM journey_counts').get()},{source:'direct',total:7});
   // The former positional fixture is incompatible with the actual current schema.
   assert.throws(()=>restored.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?)'),/6 columns but 5 values/);
  }finally{restored.close();}
  await assert.rejects(()=>rehearseInquiryRecovery(directory),/EEXIST/);
 }finally{await rm(parent,{recursive:true,force:true});}
});
