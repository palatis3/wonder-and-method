import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY,STAGES,SAMPLES,emptyState,validateState,addSample,updateRecord,displayRecords,parseSaved,readSaved,saveState,clearSaved,csvCell,exportCsv} from '../src/assets/lead-workbench-state.js';
import {leadWorkbench} from '../src/lead-workbench.mjs';
const time='2026-10-15T12:00:00.000Z';
const seeded=()=>SAMPLES.reduce((state,sample)=>addSample(state,sample.id,time).state,emptyState());

test('sample intake is bounded, deduplicated and immutable',()=>{
 const initial=emptyState(),first=addSample(initial,SAMPLES[0].id,time);
 assert.equal(initial.records.length,0);assert.equal(first.created,true);assert.equal(first.state.records.length,1);
 assert.deepEqual(first.state.records[0],{sampleId:SAMPLES[0].id,stage:'New',notes:'',createdAt:time});
 const again=addSample(first.state,SAMPLES[0].id,time);assert.equal(again.created,false);assert.equal(again.state,first.state);
 assert.equal(seeded().records.length,3);assert.throws(()=>addSample(initial,'real-customer',time));assert.throws(()=>addSample(initial,SAMPLES[0].id,'yesterday'));
 for(const sample of SAMPLES)assert.match(sample.email,/@example\.test$/);
});

test('record edits preserve sample identity and creation time and enforce stage and note limits',()=>{
 const original=seeded();
 for(const stage of STAGES){const next=updateRecord(original,SAMPLES[1].id,{stage,notes:'Synthetic only'});assert.equal(next.records[1].stage,stage);assert.equal(next.records[1].createdAt,time);assert.equal(next.records[1].sampleId,SAMPLES[1].id);assert.equal(original.records[1].notes,'');}
 assert.equal(updateRecord(original,SAMPLES[0].id,{stage:'Won',notes:'x'.repeat(1500)}).records[0].notes.length,1500);
 for(const patch of [{stage:'Admin',notes:''},{stage:'Won',notes:'x'.repeat(1501)},{stage:'Won',notes:'bad\u0000notes'},{stage:'Won',notes:{}}])assert.throws(()=>updateRecord(original,SAMPLES[0].id,patch));
 assert.throws(()=>updateRecord(original,'missing',{stage:'Won',notes:''}));
});

test('search and stage filters combine without changing stored records or canonical sample facts',()=>{
 const state=updateRecord(seeded(),SAMPLES[1].id,{stage:'Proposal',notes:'Synthetic bluebird request'});
 assert.deepEqual(displayRecords(state,{query:' BLUEBIRD ',stage:'Proposal'}).map(x=>x.sampleId),[SAMPLES[1].id]);
 assert.equal(displayRecords(state,{query:'bluebird',stage:'Won'}).length,0);assert.equal(displayRecords(state,{query:'alex@example.test'}).length,1);
 assert.equal(displayRecords(state).length,3);assert.equal(state.records.length,3);assert.equal(displayRecords(state)[1].business,SAMPLES[1].business);
 assert.throws(()=>displayRecords(state,{stage:'bad'}));
});

test('saved state rejects arbitrary fields, sample spoofing, invalid timestamps and malformed payloads',()=>{
 const good=seeded();assert.equal(validateState(good),true);assert.deepEqual(parseSaved(JSON.stringify(good)),{state:good,status:'restored'});assert.equal(parseSaved(null).status,'empty');
 const candidates=[null,[],{}, {...good,version:2},{...good,customer:'private'},{...good,records:[...good.records,good.records[0]]}];
 for(const change of [{sampleId:'real-person'},{email:'private@example.test'},{stage:'Admin'},{notes:'x'.repeat(1501)},{createdAt:'2026-02-30T12:00:00.000Z'},{createdAt:'2026-10-15'}])candidates.push({...good,records:[{...good.records[0],...change}]});
 for(const candidate of candidates){assert.equal(validateState(candidate),false);assert.deepEqual(parseSaved(JSON.stringify(candidate)),{state:emptyState(),status:'invalid'});}
 assert.equal(parseSaved('{broken').status,'invalid');
});

test('storage save, restore and removal have explicit success and unavailable states',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 assert.equal(readSaved(storage).status,'empty');assert.equal(saveState(storage,seeded()),true);assert.equal(values.size,1);assert.ok(values.has(STORAGE_KEY));assert.deepEqual(readSaved(storage).state,seeded());assert.equal(clearSaved(storage),true);assert.equal(readSaved(storage).status,'empty');
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');},removeItem(){throw Error('blocked');}};
 for(const unavailable of [undefined,blocked]){assert.equal(readSaved(unavailable).status,'unavailable');assert.equal(saveState(unavailable,seeded()),false);assert.equal(clearSaved(unavailable),false);}
 assert.throws(()=>saveState(storage,{version:1,records:[{email:'arbitrary'}]}));
});

// Independent RFC-style parser exercises quoting rather than mirroring the exporter.
function parseCsv(csv){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if(c==='\r'&&csv[i+1]==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field='';i++;}else field+=c;}assert.equal(quoted,false);return rows;}
test('CSV preserves commas, quotes and line breaks and exports only the named synthetic fields',()=>{
 const note='Synthetic, "quoted" note\nSecond line\r\nThird line',state=updateRecord(seeded(),SAMPLES[0].id,{stage:'Contacted',notes:note}),rows=parseCsv(exportCsv(state));
 assert.deepEqual(rows[0],['Sample ID','Contact','Business','Email','Request','Stage','Synthetic notes','Created UTC']);assert.equal(rows.length,4);assert.ok(rows.every(row=>row.length===8));assert.equal(rows[1][6],note);assert.equal(rows[1][7],time);assert.equal(rows[1][3],SAMPLES[0].email);
 assert.equal(parseCsv(exportCsv(emptyState())).length,1);
});
test('CSV neutralizes formula-like prefixes including whitespace and preserves ordinary notes',()=>{
 for(const value of ['=1+1','+SUM(A1)','-3','@SUM(A1)','  =1','\t+1','\n@SUM(A1)','\uFEFF=1'])assert.equal(parseCsv(csvCell(value)+'\r\n')[0][0],"'"+value);
 assert.equal(parseCsv(csvCell('Synthetic note = ordinary text')+'\r\n')[0][0],'Synthetic note = ordinary text');
});

test('workbench discloses local synthetic limits and contains no native submission path',()=>{
 const html=leadWorkbench();assert.doesNotMatch(html,/<form\b|type="submit"/);assert.match(html,/Made-up details only/);assert.match(html,/Saved browser data is unprotected/);assert.match(html,/sample inquiries and notes are not sent/);assert.match(html,/no sign-in and is not for real customer data/);assert.match(html,/hidden><h2 id="workbench-heading"/);
 for(const id of ['sample-inquiry','remember-samples','sample-search','sample-filter','sample-stage','sample-notes'])assert.ok(html.includes(`for="${id}"`),id);
 assert.match(html,/role="status" aria-live="polite" aria-atomic="true"/);assert.match(html,/<noscript>/);
});
