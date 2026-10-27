import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parse} from 'parse5';
import {renderPages} from '../../src/pages.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=x=>createHash('sha256').update(x).digest('hex');
const base='output/human-quality-20261027',out=base+'/directory-final-deltas';fs.mkdirSync(out,{recursive:true});
const old=fs.readFileSync(base+'/services-after-review/current.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse).filter(r=>r.route.startsWith('/areas/'));
const reviews=fs.readFileSync('operations/human-quality-20261027/audits/services-directories-after-independent.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const pages=new Map(renderPages({config:read('config/site.json'),offers:read('config/offers.json'),map:read('authority/v5/site-map.json'),geography:read('authority/v5/geography.json')}).map(p=>[p.path,p]));
const blocks=new Set(['article','section','header','div','p','ul','ol','li','h1','h2','h3','h4','summary','table','tr','nav','figure','figcaption','aside','details','form','label','fieldset','button','option']);
function text(n){if(n.nodeName==='#text')return n.value;if(['script','style','noscript'].includes(n.tagName))return '';const v=(n.childNodes||[]).map(text).join(n.tagName==='tr'?' | ':'');return (blocks.has(n.tagName)?'\n':'')+(n.tagName==='details'?'[DISCLOSURE]\n':'')+v+(blocks.has(n.tagName)?'\n':'');}
const walk=n=>[n,...(n.childNodes||[]).flatMap(walk)],attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const unique=new Map(),rows=[];
for(const before of old){
 const prior=reviews.find(r=>r.route===before.route);assert.equal(prior.inputHash,before.inputHash);assert.equal(prior.mainTextSha256,sha(before.mainText));
 const page=pages.get(before.route),main=walk(parse(page.html)).find(n=>n.tagName==='main'),nodes=walk(main);
 const mainText=text(main).replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 const a=before.mainText.split('\n').filter(Boolean),b=mainText.split('\n').filter(Boolean),removed=[...new Set(a.filter(s=>!b.includes(s)))],added=[...new Set(b.filter(s=>!a.includes(s)))];
 const links=nodes.filter(n=>n.tagName==='a').map(n=>({text:text(n).trim(),href:attr(n,'href')})),ids=nodes.map(n=>attr(n,'id')).filter(Boolean);
 const row={route:before.route,priorReviewSha256:sha(JSON.stringify(prior)),priorInputHash:before.inputHash,currentInputHash:sha(page.html),mainTextSha256:sha(mainText),priorRatings:prior.dimensionRatings,priorFindings:prior.findings,removed,added,removedIds:before.ids.filter(id=>!ids.includes(id)),removedLinks:[...new Set(before.links.map(l=>l.href))].filter(h=>!links.some(l=>l.href===h)),duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),currentMainText:mainText};
 for(const [kind,lines] of [['removed',removed],['added',added]])for(const line of lines){const id=sha(kind+'\n'+line);if(!unique.has(id))unique.set(id,{id,kind,text:line,routes:[]});unique.get(id).routes.push(before.route);}
 rows.push(row);
}
assert.equal(rows.length,53);
fs.writeFileSync(out+'/pages.jsonl',rows.map(JSON.stringify).join('\n')+'\n');
fs.writeFileSync(out+'/unique-lines.json',JSON.stringify([...unique.values()],null,2)+'\n');
fs.writeFileSync(out+'/summary.json',JSON.stringify({routes:rows.length,uniqueChangedLines:unique.size,source:'Complete prior independent main reads plus explicit current delta, not a new full read.',structuralDefects:rows.filter(r=>r.removedIds.length||r.removedLinks.length||r.duplicateIds.length).map(r=>({route:r.route,removedIds:r.removedIds,removedLinks:r.removedLinks,duplicateIds:r.duplicateIds}))},null,2)+'\n');
console.log(JSON.stringify({routes:rows.length,uniqueChangedLines:unique.size,output:out}));
