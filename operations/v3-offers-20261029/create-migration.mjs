import {DatabaseSync} from 'node:sqlite';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {journeyPages} from '../../deployment/journey-dimensions.mjs';
import {inquiryChoices} from '../../src/shared.mjs';

// Derive additive constraints from the complete previous schema, retaining all
// historical dimensions and indexes. This only generates SQL; it never opens D1.
const db=new DatabaseSync(':memory:');
for(const file of (await readdir('deployment/migrations')).filter(f=>/^00(?:[0-3]\d|4[0-8])_.*\.sql$/.test(f)).sort())db.exec(await readFile('deployment/migrations/'+file,'utf8'));
const services=inquiryChoices.map(([id])=>id);
if(services.length!==16)throw Error('Expected fifteen offers and unsure');
const quoted=values=>values.map(v=>{if(!/^[a-z0-9_]+$/.test(v))throw Error('Invalid dimension');return `'${v}'`;}).join(',');
let sql='-- V3 offers: retain historical aggregate rows and add current service/page keys.\n-- Both daily and monthly service constraints expand together.\n';
for(const table of ['journey_counts','journey_monthly_counts']){
 const original=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table).sql;
 const oldServices=[...original.match(/CHECK\(service IN \(([^)]+)\)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 let create=original.replace(new RegExp('CREATE TABLE "?'+table+'"?'),'CREATE TABLE '+table+'_v3').replace(/CHECK\(service IN \([^)]+\)\)/,`CHECK(service IN (${quoted([...new Set([...oldServices,...services])])}))`);
 if(table==='journey_counts'){
  const oldPages=[...original.match(/CHECK\(page IN \(([^)]+)\)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
  create=create.replace(/CHECK\(page IN \([^)]+\)\)/,`CHECK(page IN (${quoted([...new Set([...oldPages,...journeyPages])].sort())}))`);
 }
 const columns=db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name).join(',');
 const indexes=db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL").all(table).map(r=>r.sql+';');
 sql+=`${create};\nINSERT INTO ${table}_v3 (${columns}) SELECT ${columns} FROM ${table};\nDROP TABLE ${table};\nALTER TABLE ${table}_v3 RENAME TO ${table};\n${indexes.join('\n')}\n`;
}
await writeFile('deployment/migrations/0049_v3_offers.sql',sql);
db.close();
console.log('Generated additive daily/monthly V3 constraints.');
