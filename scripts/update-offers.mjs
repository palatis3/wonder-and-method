import {readFile,writeFile,rename,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeOfferCatalog,catalogValue,setCatalogValue} from '../src/offer-catalog.mjs';

const root=resolve(import.meta.dirname,'..');
const derived=/\.(?:amount|upfront_price|monthly_equivalent|saving_vs_12_monthly)$|\.graphic_counts\.total$/;
export function applyOfferChanges(current,changeSet,{usedVersions=[]}={}){
 if(!changeSet||typeof changeSet!=='object'||Array.isArray(changeSet)||Object.keys(changeSet).some(key=>!['version','as_of','set','templates'].includes(key)))throw Error('Use a change set with version, as_of, set and optional templates.');
 const version=changeSet.version;
 if(typeof version!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,99}$/.test(version)||[current.version,...(current.previous_versions||[]),...usedVersions].includes(version))throw Error('Choose a new, unused catalog version.');
 if(typeof changeSet.as_of!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(changeSet.as_of)||new Date(changeSet.as_of).toISOString().slice(0,10)!==changeSet.as_of)throw Error('Supply a valid as_of date (YYYY-MM-DD).');
 if(!changeSet.set||typeof changeSet.set!=='object'||Array.isArray(changeSet.set)||!Object.keys(changeSet.set).length)throw Error('Provide at least one field in set.');
 const next=structuredClone(current);
 for(const [path,value] of Object.entries(changeSet.set)){
  if(!/^(launch_site|focused_site|signature_site|plans|baseline|audit_sprint|add_ons|monthly_terms|one_off_terms|annual_terms|add_on_terms)\./.test(path)||derived.test(path))throw Error('Not an editable source field: '+path);
  const old=catalogValue(next,path);
  if(old===undefined||old!==null&&typeof old==='object'||typeof old!==typeof value&&old!==null)throw Error('Set an existing scalar field with its original type: '+path);
  if(Object.hasOwn(next.copy_templates||{},path)&&!Object.hasOwn(changeSet.templates||{},path))throw Error('This prose is derived; edit its source fields or supply its matching template: '+path);
  setCatalogValue(next,path,value);
 }
 for(const [path,template] of Object.entries(changeSet.templates||{})){
  if(!Object.hasOwn(next.copy_templates||{},path)||typeof template!=='string')throw Error('Unknown copy template: '+path);
  next.copy_templates[path]=template;
 }
 next.version=version;next.as_of=changeSet.as_of;
 next.previous_versions=[...new Set([...(current.previous_versions||[]),...usedVersions,current.version])];
 if(Object.keys(changeSet.set).some(path=>path.startsWith('add_ons.')))next.add_on_terms.version=version;
 return normalizeOfferCatalog(next);
}
export function offerChanges(before,after,path=''){
 if(JSON.stringify(before)===JSON.stringify(after))return [];
 if(before&&after&&typeof before==='object'&&typeof after==='object')return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>offerChanges(before[key],after[key],path?path+'.'+key:key));
 return [{field:path,before,after}];
}
export async function updateOffers({catalogPath=resolve(root,'config/offers.json'),changesPath,write=false,usedVersions=[]}){
 const original=await readFile(catalogPath,'utf8'),current=JSON.parse(original),changes=JSON.parse(await readFile(changesPath,'utf8'));
 const next=applyOfferChanges(current,changes,{usedVersions}),diff=offerChanges(current,next);
 if(write){
  if(await readFile(catalogPath,'utf8')!==original)throw Error('Catalog changed during review; retry with the latest file.');
  const temporary=catalogPath+'.update-'+process.pid+'.tmp';
  await writeFile(temporary,JSON.stringify(next,null,2)+'\n',{flag:'wx'});await rename(temporary,catalogPath);
 }
 return {mode:write?'written locally':'preview only',version:next.version,changes:diff};
}
async function historicalVersions(){
 const files=[resolve(root,'authority/v5/offers.json')];
 for(const name of await readdir(resolve(root,'operations/historical')))if(/^offers-.*\.json$/.test(name))files.push(resolve(root,'operations/historical',name));
 return (await Promise.all(files.map(async file=>JSON.parse(await readFile(file,'utf8')).version))).filter(Boolean);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),write=args.includes('--write'),paths=args.filter(arg=>arg!=='--write');
 if(paths.length!==1||paths[0].startsWith('--')||args.filter(arg=>arg==='--write').length>1){console.error('Usage: node scripts/update-offers.mjs changes.json [--write]');process.exitCode=1;}
 else try{console.log(JSON.stringify(await updateOffers({changesPath:resolve(paths[0]),write,usedVersions:await historicalVersions()}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
