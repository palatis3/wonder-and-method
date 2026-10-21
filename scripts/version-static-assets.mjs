import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';

const extensions='css|js|mjs|woff2?|ttf|otf|svg|png|jpe?g|webp|gif|avif|ico|mp4|webm|mp3|wav|ogg';
// Keep established crawler/browser identity URLs stable across this rollout.
const stableIcons=new Set(['/assets/brand/favicon-96.png','/assets/brand/apple-touch-icon.png']);
const absolutePattern=()=>new RegExp(`(?<![\\w:/])(/assets/[\\w@%+./-]+\\.(?:${extensions}))(\\?[^\\s"'<>\\x60)\\\\]*)?(#[^\\s"'<>\\x60)\\\\]*)?`,'g');
const relativePattern=()=>new RegExp(`(["'])(\\.{1,2}/[\\w@%+./-]+\\.(?:${extensions})(?:\\?[^\\s"'<>\\x60)\\\\]*)?(?:#[^\\s"'<>\\x60)\\\\]*)?)\\1`,'g');
const eligible=path=>new RegExp(`\\.(?:${extensions})$`,'i').test(path)&&!path.startsWith('/assets/buyer-packs/')&&!stableIcons.has(path);
const editable=path=>/\.(?:css|js|mjs|svg)$/.test(path);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,12);
const address=(reference,from)=>new URL(reference,'https://assets.invalid'+from);

function references(text,from){
 const result=new Set();
 for(const match of text.matchAll(absolutePattern()))result.add(match[1]);
 for(const match of text.matchAll(relativePattern()))result.add(address(match[2],from).pathname);
 return result;
}

export function versionAssetReferences(text,from,versions){
 const lookup=path=>versions instanceof Map?versions.get(path):versions[path];
 const update=reference=>{
  const escapedAmpersands=/&(?:amp|#38|#x26);/i.test(reference);
  const decoded=escapedAmpersands?reference.replace(/&(?:amp|#38|#x26);/gi,'&'):reference;
  const url=address(decoded,from),version=lookup(url.pathname);
  if(!version||stableIcons.has(url.pathname))return reference;
  url.searchParams.set('v',version);
  // Relative module imports retain their location and resolve to the same URL
  // as matching absolute script tags; documents and downloads are never hashed.
  const base=decoded.split(/[?#]/)[0];
  const updated=base+url.search+url.hash;
  return escapedAmpersands?updated.replaceAll('&','&amp;'):updated;
 };
 const replaceUrls=source=>source.replace(absolutePattern(),(_all,path,query='',hash='')=>update(path+query+hash))
  .replace(relativePattern(),(_all,quote,path)=>quote+update(path)+quote);
 // A descriptor-free srcset candidate may end directly in a separator comma.
 // Parse that boundary before URL parameters so replacing v cannot swallow it.
 const srcsets=/\b(?:srcset|data-city-preview-srcset)\s*=\s*(["'])(.*?)\1/gs;
 let result='',cursor=0;
 for(const match of text.matchAll(srcsets)){
  result+=replaceUrls(text.slice(cursor,match.index));
  const value=match[2].split(/,(?=\s|$)/).map(replaceUrls).join(',');
  const start=match[0].indexOf(match[1])+1;
  result+=match[0].slice(0,start)+value+match[1];
  cursor=match.index+match[0].length;
 }
 return result+replaceUrls(text.slice(cursor));
}

export async function fingerprintStaticAssets(output){
 const root=resolve(output),paths=new Map(),versions=new Map(),visiting=new Set();
 async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=resolve(directory,entry.name);
  if(entry.isDirectory())await walk(file);
  else {const path='/'+relative(root,file).split(sep).join('/');if(eligible(path))paths.set(path,file);}
 }}
 await walk(resolve(root,'assets'));
 async function fingerprint(path){
  if(versions.has(path))return versions.get(path);
  if(visiting.has(path))throw Error('Circular static asset dependency: '+path);
  visiting.add(path);
  let bytes=await readFile(paths.get(path));
  if(editable(path)){
   const source=bytes.toString('utf8');
   for(const dependency of references(source,path))if(dependency!==path&&paths.has(dependency))await fingerprint(dependency);
   const transformed=versionAssetReferences(source,path,versions);
   if(transformed!==source){bytes=Buffer.from(transformed);await writeFile(paths.get(path),bytes);}
  }
  const version=sha(bytes);versions.set(path,version);visiting.delete(path);return version;
 }
 for(const path of paths.keys())await fingerprint(path);
 return versions;
}
