// Deterministic candidates for manual family review. Similarity is not a verdict.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const drafts=[1,2,3,4,5,6].flatMap(p=>fs.readFileSync(`${root}/drafts/local-${p}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse)).filter(d=>d.route!=='/areas/erie-county/');
const stop=new Set('a an and are as at be before beside both but by can could current each for from has have how if in into is it its keep may must no not of on one only or other our own rather same should so staff than that the their them then these they this those through to two use using was we were what when where which while who will with without would you your'.split(' '));
const df=new Map();
const terms=drafts.map(d=>{
 const geographic=new Set(d.route.split('/').flatMap(s=>s.split('-')));
 const text=[d.customerQuestion,...d.decisions.map(x=>x.body)].join(' ');
 const counts=new Map();for(const t of (text.toLowerCase().match(/[a-z]{3,}/g)||[]))if(!stop.has(t)&&!geographic.has(t))counts.set(t,(counts.get(t)||0)+1);
 for(const t of counts.keys())df.set(t,(df.get(t)||0)+1);return counts;
});
const postings=new Map();
const vectors=terms.map((counts,i)=>{
 const v=new Map();let sum=0;for(const [t,n] of counts){if(df.get(t)>drafts.length*.3||df.get(t)<2)continue;const w=(1+Math.log(n))*Math.log(drafts.length/df.get(t));v.set(t,w);sum+=w*w;}
 const norm=Math.sqrt(sum)||1;for(const [t,w] of v){v.set(t,w/norm);if(!postings.has(t))postings.set(t,[]);postings.get(t).push([i,w/norm]);}return v;
});
const pairs=[],nearest=[];
for(let i=0;i<drafts.length;i++){
 const scores=new Map();for(const [t,w] of vectors[i])for(const [j,v] of postings.get(t))if(j!==i)scores.set(j,(scores.get(j)||0)+w*v);
 const best=[...scores].sort((a,b)=>b[1]-a[1]).slice(0,3);nearest.push({route:drafts[i].route,draftSha256:hash(drafts[i]),candidates:best.map(([j,score])=>({route:drafts[j].route,score}))});
 for(const [j,score] of best)if(j>i)pairs.push({routes:[drafts[i].route,drafts[j].route],score,draftHashes:[hash(drafts[i]),hash(drafts[j])],drafts:[drafts[i],drafts[j]]});
}
pairs.sort((a,b)=>b.score-a.score);
const out='output/human-quality-20261027/family-review';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/nearest.json',JSON.stringify(nearest,null,2)+'\n');
fs.writeFileSync(out+'/pairs.jsonl',pairs.slice(0,100).map(JSON.stringify).join('\n')+'\n');
fs.writeFileSync(out+'/summary.json',JSON.stringify({date:'2026-10-27',routeCount:drafts.length,pairCount:Math.min(100,pairs.length),draftsSha256:hash(drafts),scope:'All standard local draft decision text screened; top100 pairs are manual-review candidates only. No automatic quality verdict, rating or consolidation.'},null,2)+'\n');
console.log(JSON.stringify({routes:drafts.length,pairs:Math.min(100,pairs.length),top:pairs.slice(0,20).map(p=>({routes:p.routes,score:+p.score.toFixed(3)}))}));
