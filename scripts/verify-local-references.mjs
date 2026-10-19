import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';

// Generated HTML and CSS use ordinary quoted href/src and url() references.
export async function verifyLocalReferences(output,files){
 const root=resolve(output),seen=new Set();let references=0;
 async function inspect(file){
  file=resolve(file);if(seen.has(file))return;seen.add(file);
  const content=await readFile(file,'utf8');
  const pattern=extname(file)==='.css'?/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g:/(?:href|src)=["']([^"']+)["']/g;
  for(const match of content.matchAll(pattern)){
   const raw=match[1];if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw))continue;
   const path=decodeURIComponent(raw.split(/[?#]/)[0]);const fragment=raw.includes('#')?decodeURIComponent(raw.slice(raw.indexOf('#')+1)):null;
   let target=!path?file:path.startsWith('/')?resolve(root,'.'+path):resolve(dirname(file),path);
   if(target!==root&&!target.startsWith(root+sep))throw Error('Reference escapes output: '+raw);
   try{let info=await stat(target);if(info.isDirectory()){target=resolve(target,'index.html');info=await stat(target);}if(!info.isFile())throw Error('Not a file');}
   catch{try{if(extname(target)||!(await stat(target+'.html')).isFile())throw Error();target+='.html';}catch{throw Error(`Missing local reference ${raw} in ${file.slice(root.length+1)}`);}}
   references++;
   if(fragment&&extname(target)==='.html'){const html=await readFile(target,'utf8');const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));if(!ids.has(fragment))throw Error(`Missing local fragment ${raw} in ${file.slice(root.length+1)}`);}
   if(['.css','.html'].includes(extname(target)))await inspect(target);
  }
 }
 for(const file of files)await inspect(resolve(root,file));
 return {documents:files.length,filesInspected:seen.size,references,status:'pass'};
}
