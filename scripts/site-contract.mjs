import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=resolve(import.meta.dirname,'..');
const digest=value=>createHash('sha256').update(value).digest('hex');
const unversioned=value=>value.replace(/([?&](?:amp;)?v=)[a-f0-9]{6,64}/g,'$1BUILD');
const text=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const sorted=values=>[...new Set(values)].sort();

export async function readSiteContract(output){
 const pages={},downloads={},assets={};
 async function walk(folder){for(const item of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=resolve(folder,item.name),name=relative(output,file).replaceAll('\\','/');
  if(item.isDirectory()){await walk(file);continue;}
  if(name.endsWith('.html')){
   const html=await readFile(file,'utf8'),main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
   if(main===undefined)throw Error(`Missing main landmark: ${name}`);
   pages[name]={
    htmlSha256:digest(unversioned(html)),
    title:html.match(/<title>(.*?)<\/title>/s)?.[1]||'',
    description:html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'',
    canonical:html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'',
    robots:html.match(/<meta name="robots" content="([^"]+)"/)?.[1]||'',
    textSha256:digest(text(main)),
    headings:[...main.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)].map(([,level,value])=>[level,text(value)]),
    ids:sorted([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1])),
    links:sorted([...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(x=>unversioned(x[1]))),
    media:sorted([...html.matchAll(/<(?:img|source|video)\b[^>]*>/g)].map(x=>unversioned(x[0]))),
    styles:sorted([...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(x=>unversioned(x[0]))),
    schemaSha256:digest([...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n'))
   };
  }else if(/\.(?:txt|pdf|csv|zip)$/.test(name))downloads[name]={sha256:digest(await readFile(file))};
  else if(name!=='version.json')assets[name]={sha256:digest(await readFile(file))};
 }}
 await walk(resolve(output));
 if(!Object.keys(pages).length)throw Error('No built HTML pages to check.');
 return {schemaVersion:1,pages,downloads,assets};
}

export function compareSiteContract(expected,actual){
 const changes=[];
 if(expected.schemaVersion!==actual.schemaVersion)changes.push('Contract version changed');
 for(const kind of ['pages','downloads','assets']){
  for(const name of sorted([...Object.keys(expected[kind]),...Object.keys(actual[kind])])){
   if(!Object.hasOwn(actual[kind],name))changes.push(`Removed ${kind}: ${name}`);
   else if(!Object.hasOwn(expected[kind],name))changes.push(`Added ${kind}: ${name}`);
   else if(kind==='pages'){
    const fields=sorted([...Object.keys(expected.pages[name]),...Object.keys(actual.pages[name])]).filter(key=>JSON.stringify(expected.pages[name][key])!==JSON.stringify(actual.pages[name][key]));
    if(fields.length)changes.push(`Changed page: ${name} (${fields.join(', ')})`);
   }else if(expected[kind][name].sha256!==actual[kind][name].sha256)changes.push(`Changed ${kind==='downloads'?'download':'asset'}: ${name}`);
  }
 }
 return changes;
}

export async function checkSiteContract({accept=false}={}){
 if(accept&&process.env.CI)throw Error('CI cannot approve content changes or replace the accepted baseline.');
 const file=resolve(root,'tests/baselines/site-content.json'),actual=await readSiteContract(resolve(root,'dist'));
 let expected;try{expected=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const changes=expected?compareSiteContract(expected,actual):['Initial baseline'];
 await mkdir(resolve(root,'output/site-contract'),{recursive:true});
 await writeFile(resolve(root,'output/site-contract/changes.json'),JSON.stringify({changes,pageCount:Object.keys(actual.pages).length,downloadCount:Object.keys(actual.downloads).length},null,2)+'\n');
 if(accept){await mkdir(dirname(file),{recursive:true});await writeFile(file,JSON.stringify(actual,null,2)+'\n');console.log(`Accepted reviewed content: ${Object.keys(actual.pages).length} pages, ${Object.keys(actual.downloads).length} downloads; ${changes.length} changes.`);return;}
 if(changes.length)throw Error(`Content differs from the accepted baseline (${changes.length} changes). Review output/site-contract/changes.json; restore mistakes or explicitly accept intended changes.\n${changes.slice(0,12).join('\n')}`);
 console.log(`Content preservation passed: ${Object.keys(actual.pages).length} pages and ${Object.keys(actual.downloads).length} downloads.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.some(x=>x!=='--accept'))throw Error('Usage: node scripts/site-contract.mjs [--accept]');
 await checkSiteContract({accept:args.includes('--accept')});
}
