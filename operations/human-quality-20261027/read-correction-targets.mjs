import fs from 'node:fs';
const root='operations/human-quality-20261027';
const [batch,start='0',count='5']=process.argv.slice(2);
const reviews=fs.readFileSync(`${root}/audits/local-after-${batch}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse).filter(r=>r.requiredFixes.length);
const skip=new Set(['residual-checkpoint-repair.json','residual-continuation-repair.json'].flatMap(f=>{const x=JSON.parse(fs.readFileSync(`${root}/research/${f}`,'utf8'));return x.routes;}));
const drafts=fs.readdirSync(`${root}/drafts`).filter(f=>/^local-\d+\.jsonl$/.test(f)).flatMap(f=>fs.readFileSync(`${root}/drafts/${f}`,'utf8').trim().split(/\r?\n/).map(l=>({file:f,...JSON.parse(l)})));
const pending=reviews.filter(r=>!skip.has(r.route));
for(const r of pending.slice(+start,+start+(+count))){const d=drafts.find(d=>d.route===r.route);console.log(JSON.stringify({route:r.route,requiredFixes:r.requiredFixes,findings:r.findings,draft:d}));}
console.log(JSON.stringify({pending:pending.length,start:+start,count:+count}));
