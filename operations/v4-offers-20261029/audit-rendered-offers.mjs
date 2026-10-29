import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {parse} from 'parse5';
const root=resolve(import.meta.dirname,'../..'),dist=join(root,'dist'),output=join(root,'output/v4-offers');
const candidates=new Map();let pages=0;
const patterns=[
 ['prior-price',/\$(?:2,950|4,500|7,500|11,500|275|450|375|650|850|1,250|1,750|1,800|950|2,500|2,000)(?![\d,.])/],
 ['prior-care-edit-limit',/(?:30|45)[ -]minute(?:s)? (?:of )?(?:supplied )?(?:edit|change)|(?:supplied )?edits[^.!?]{0,35}(?:30|45) minutes/i],
 ['prior-monthly-scope',/existing (?:service )?page (?:OR|or) (?:selected |eligible )?(?:local )?profile|conditional, relevant outreach|Brochure Website Care included, with no second|Each includes brochure Website Care|up to 20 pages[^.!?]{0,80}(?:care|monitoring)/i],
 ['internal-planning',/base hours|reserved hours|reservedHours|phase budget remains|existing specialist schedule retained|5\.3125|internal planning/i]
];
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).filter(x=>!['script','style'].includes(x.tagName)).map(text).join(' ');
function visit(n,main=false){
 main=main||n.tagName==='main';
 if(main&&['p','li','td','th','option','h1','h2','h3','h4'].includes(n.tagName)){
  const value=text(n).replace(/\s+/gu,' ').trim();
  for(const [kind,pattern] of patterns)if(pattern.test(value)){
   const key=kind+'\n'+value,entry=candidates.get(key)||{kind,text:value,routes:[]};
   if(!entry.routes.includes(currentRoute))entry.routes.push(currentRoute);candidates.set(key,entry);
  }
 }
 for(const child of n.childNodes||[])visit(child,main);
}
let currentRoute='';
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const file=join(path,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name==='index.html'){currentRoute='/'+relative(dist,path).replaceAll('\\','/')+'/';if(currentRoute==='//')currentRoute='/';pages++;visit(parse(await readFile(file,'utf8')));}}}
await walk(dist);await mkdir(output,{recursive:true});
const result={reviewedAt:new Date().toISOString(),pages,candidates:[...candidates.values()]};
await writeFile(join(output,'rendered-offer-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pages,candidates:result.candidates.length,groups:result.candidates.map(({kind,text,routes})=>({kind,text,count:routes.length,example:routes[0]}))},null,2));
