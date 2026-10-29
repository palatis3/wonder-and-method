import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parse} from 'parse5';
import {renderPages} from '../../src/pages.mjs';
import {guidePurposeFingerprint} from '../../scripts/site-quality-rules.mjs';
import config from '../../config/site.json' with {type:'json'};
import offers from '../../config/offers.json' with {type:'json'};
import map from '../../authority/v5/site-map.json' with {type:'json'};
import geography from '../../authority/v5/geography.json' with {type:'json'};
const ledger=JSON.parse(await readFile('operations/google-quality-audit-20261023/related-guide-review.json','utf8'));
const current=new Map(renderPages({config,offers,map,geography}).map(p=>[p.path,p.html]));
const selected=ledger.filter(row=>guidePurposeFingerprint(current.get(row.to))!==row.guidePurposeSha256);
function content(n){if(n.nodeName==='#text')return n.value;return (n.childNodes||[]).map(content).join(' ').replace(/\s+/g,' ').trim();}
function blocks(n,out=[]){if(['p','li','h1','h2','h3','td','th'].includes(n.tagName))out.push(content(n));else for(const x of n.childNodes||[])blocks(x,out);return out;}
const article=html=>html.match(/<article class="journal-article">([^]*?)<\/article>/)[1];
const guides=[];
for(const path of [...new Set(selected.map(r=>r.to))]){
 const before=await readFile('C:/Wonder and Method/performance-gates-20261028/site/dist'+path+'index.html','utf8'),after=current.get(path);
 const old=blocks(parse(article(before))),now=blocks(parse(article(after)));
 const rows=selected.filter(r=>r.to===path);
 guides.push({path,connections:rows.length,beforeMatchesSaved:rows.every(r=>r.guidePurposeSha256===guidePurposeFingerprint(before)),beforeHash:guidePurposeFingerprint(before),afterHash:guidePurposeFingerprint(after),removed:[...new Set(old.filter(p=>!now.includes(p)))],added:[...new Set(now.filter(p=>!old.includes(p)))]});
}
await mkdir('output/v3-audit',{recursive:true});await writeFile('output/v3-audit/guide-deltas.json',JSON.stringify({connections:selected.length,guides},null,2));
console.log(JSON.stringify(guides.map(g=>({path:g.path,connections:g.connections,beforeMatchesSaved:g.beforeMatchesSaved,removed:g.removed.length,added:g.added.length})),null,2));
