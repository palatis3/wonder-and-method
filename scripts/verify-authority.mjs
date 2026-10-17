import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const original=process.argv[2]||'C:/Users/palat/Documents/Codex/2026-10-12/ar/outputs/wonder-and-method-business-plan-v5';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const results=[];
for(const file of await readdir(resolve(root,'authority/v5'))){const expected=hash(await readFile(resolve(original,file)));const actual=hash(await readFile(resolve(root,'authority/v5',file)));if(expected!==actual)throw new Error(`Authority mismatch: ${file}`);results.push({file,sha256:actual,match:true});}
const originalZip=resolve(original,'../Wonder-and-Method-Business-Plan-V5.zip');
const zip=hash(await readFile(resolve(root,'authority/Wonder-and-Method-Business-Plan-V5.zip')));if(zip!==hash(await readFile(originalZip)))throw new Error('Historical archive mismatch');
const keywords=JSON.parse(await readFile(resolve(root,'authority/v5/keyword-manifest.json'),'utf8'));
const geography=JSON.parse(await readFile(resolve(root,'authority/v5/geography.json'),'utf8'));
if(keywords.keywords.length!==482||geography.municipalities.length!==44||geography.counts.grouped_search_names!==38)throw new Error('Planning inventory changed');
const evidence={checkedAt:new Date().toISOString(),originalPath:original,files:results,zipSha256:zip,keywords:482,municipalities:44,groupedSearchPlaces:38,status:'All copied authority files and complete archive match original bytes; original not modified.'};
await writeFile(resolve(root,'evidence/authority-integrity.json'),JSON.stringify(evidence,null,2));console.log(`Verified ${results.length} V5 files and full ZIP byte-for-byte; 482 keywords, 44 municipalities and 38 grouped places preserved.`);
