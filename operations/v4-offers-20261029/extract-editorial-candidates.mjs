import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parse} from 'parse5';
const root=resolve(import.meta.dirname,'../..'),read=path=>readFile(resolve(root,path),'utf8');
const report=JSON.parse(await read('output/seo/report.json')),ledger=JSON.parse(await read('operations/editorial-review.json'));
const key=x=>JSON.stringify([x.route,x.rule,x.evidenceSha256]),prior=new Set(ledger.decisions.map(key));
const nodes=(node,p)=>[...(p(node)?[node]:[]),...(node.childNodes||[]).flatMap(x=>nodes(x,p))];
const text=n=>n.nodeName==='#text'?n.value:['script','style','template'].includes(n.tagName)?'':(n.childNodes||[]).map(text).join(' ');
const segmenter=new Intl.Segmenter('en',{granularity:'sentence'}),words=value=>value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[];
const result=[];
for(const item of report.findings.filter(x=>x.severity==='review'&&!prior.has(key(x)))){
 const doc=parse(await read('dist/.'+item.route+'index.html')),main=nodes(doc,n=>n.tagName==='main')[0];
 const passages=nodes(main,n=>n.tagName==='p').map(text).map(t=>t.replace(/\s+/gu,' ').trim()).flatMap(p=>[...segmenter.segment(p)]).filter(s=>words(s.segment).length>35).map(s=>s.segment.trim());
 result.push({...item,passages});
}
await writeFile(resolve(root,'operations/v4-offers-20261029/review/editorial-candidates.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify([...new Set(result.flatMap(x=>x.passages))],null,2));
