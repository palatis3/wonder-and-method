// Report only: inspect rendered language in context; never rewrite or fail a build.
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const exceptions=JSON.parse(await readFile(resolve(root,'config/editorial-review-exceptions.json'),'utf8'));
const phrases=['auditable artifact','replacement hypothesis','proximity is not industry expertise','licensed visual evidence','receiving path','route-level','scope','provider','evidence','coverage','municipality','canonical','materially'];
const clean=html=>html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const pages=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(entry.name==='index.html')pages.push(path);}}
await walk(resolve(dist,'areas'));await walk(resolve(dist,'guides'));
const findings=[];
for(const file of pages){
 const html=await readFile(file,'utf8'),main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
 const route='/'+relative(dist,dirname(file)).split('\\').join('/')+'/';
 const passages=[...main.matchAll(/<(p|li|h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/g)].map(match=>clean(match[2]));
 for(const text of passages){
  const flagged=phrases.filter(phrase=>new RegExp('\\b'+phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(text));
  const grammar=/\b(?:a (?:existing|accessible|approved)|an (?:business|customer|useful)|your your|Pla useful)\b/i.test(text);
  if(flagged.length||grammar)findings.push({route,text,phrases:flagged,grammarReview:grammar,contextExceptions:exceptions.exceptions.filter(item=>flagged.includes(item.phrase))});
 }
}
const output=resolve(process.argv[2]||resolve(root,'evidence/editorial-copy-review.json'));
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({reportOnly:true,generatedAt:new Date().toISOString(),pages:pages.length,reviewInstructions:'Read each sentence in context. Listed exceptions are contextual guidance, not an automatic exemption. No readability threshold or word blacklist establishes quality.',findings},null,2)+'\n');
console.log(`Editorial review: ${pages.length} county/hub/guide pages, ${findings.length} passages for contextual review; ${findings.filter(item=>item.grammarReview).length} grammar candidates. Report only.`);
