import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {countyContextOptions as legacyOptions} from '../src/approved-rerun-county-context.mjs';

const dataUrl=new URL('../src/location-service-data.json',import.meta.url);
const outputUrl=new URL('../src/location-inquiry-contexts.json',import.meta.url);
export function deriveLocationInquiryContexts(entries,legacy=legacyOptions){
 const known=new Set(legacy.map(([key])=>key)),rows=[];
 const seen=new Set();
 for(const entry of entries){
  if(!/^\/areas\/[a-z0-9/-]+\/$/.test(entry.path)||seen.has(entry.path))throw Error('Invalid or duplicate reviewed service-area path');
  seen.add(entry.path);
  const key=entry.path.slice('/areas/'.length,-1);
  if(!known.has(key))rows.push([key,entry.market.replaceAll(' / ', ', ')]);
 }
 return rows.sort(([a],[b])=>a.localeCompare(b,'en-US'));
}
export async function assertLocationInquiryContexts(){
 const [entries,actual]=await Promise.all([dataUrl,outputUrl].map(async url=>JSON.parse(await readFile(url,'utf8'))));
 if(JSON.stringify(actual)!==JSON.stringify(deriveLocationInquiryContexts(entries)))throw Error('Refresh reviewed service-area inquiry contexts: node scripts/location-inquiry-contexts.mjs --write');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.includes('--write')){
  const entries=JSON.parse(await readFile(dataUrl,'utf8'));
  const rows=deriveLocationInquiryContexts(entries);
  await writeFile(outputUrl,'[\n'+rows.map(row=>' '+JSON.stringify(row)).join(',\n')+'\n]\n');
  console.log(`Recorded ${rows.length} additional service-area inquiry contexts; ${legacyOptions.length} legacy keys retained.`);
 }else{await assertLocationInquiryContexts();console.log('Service-area inquiry contexts match reviewed pages.');}
}
