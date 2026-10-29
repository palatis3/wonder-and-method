import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parse} from 'parse5';
const pages=JSON.parse(await readFile('output/v3-audit/rendered-pages.json','utf8'));
const patterns={
 retired_name:/\b(?:Launch Website|Signature Website|Keep Running|Website Baseline|Audit [&&] Fix Sprint|Audit & Fix|Improve and Grow|Improve or Grow|Grow plan|Improve plan|Grow allowance)\b/i,
 retired_price:/\$(?:1,400|2,350|3,700|399|750|150|400|800)(?![\d,])(?:\s*(?:\/\s*month|monthly|per month|website|review|sprint|build|fixed fee))/i,
 retired_payment:/\b50%[^.]{0,160}\b30%[^.]{0,160}\b20%|50\s*\/\s*30\s*\/\s*20/,
 review_time:/add (?:your review time|two (?:customer )?review windows|up to ten business days)|five business days each|two review windows of up to five/i,
 old_design:/all three (?:packages|plans)|every (?:website|package|plan)[^.]{0,100}custom design|no (?:visual or )?drag.and.drop editor|no log.in editing dashboard|one (?:original )?(?:animated (?:homepage )?feature or (?:one )?3D|3D centerpiece)/i,
 old_care:/updates[^.]{0,90}backups[^.]{0,50}(?:not included|separate)|backups[^.]{0,80}restores[^.]{0,70}not included|starting review[^.]{0,150}\$650|\$650[^.]{0,110}starting review/i,
 old_repair:/up to two (?:agreed )?(?:small |contained )?fixes|one small fix (?:if|when)|first small fix|baseline fix/i,
 old_extras:/extra (?:social |promotional )?graphics? or (?:short )?newsletter|additional (?:social |promotional )?graphic or newsletter|extra graphic or short newsletter|Grow.{0,80}(?:graphic|excerpt)/i,
 bad_encoding:/\u00c2[\u0080-\u00bf]|\u00e2[\u0080-\u00bf\u20ac]|\u00c3[\u0080-\u00bf]/,
 broken_value:/\bundefined\b|\bNaN\b|\$null/,
 internal_budget:/base hours|budgeted separately|reserved hours|internal estimate|pilot by proposal/i
};
function text(n){if(n.nodeName==='#text')return n.value;if(['script','style'].includes(n.tagName))return '';return (n.childNodes||[]).map(text).join(' ');}
function blocks(n,out=[]){if(['p','li','h1','h2','h3','h4','td','th','summary','option','meta'].includes(n.tagName)){let t=n.tagName==='meta'?n.attrs?.find(x=>x.name==='content')?.value:text(n);if(t)out.push(t.replace(/\s+/g,' ').trim());}else for(const child of n.childNodes||[])blocks(child,out);return out;}
const findings=[],routeResults=[];
for(const page of pages){let count=0;for(const value of new Set(blocks(parse(page.html))))for(const [rule,pattern] of Object.entries(patterns))if(pattern.test(value)){findings.push({path:page.path,rule,text:value});count++;}routeResults.push({path:page.path,title:page.title,findings:count});}
const unique=new Map();for(const f of findings){const key=f.rule+'\0'+f.text;if(!unique.has(key))unique.set(key,{rule:f.rule,text:f.text,paths:[]});unique.get(key).paths.push(f.path);}
const report={generatedAt:new Date().toISOString(),routes:pages.length,findings:findings.length,uniqueFindings:unique.size,byRule:Object.fromEntries(Object.keys(patterns).map(k=>[k,findings.filter(x=>x.rule===k).length])),routeResults,unique:[...unique.values()]};
await mkdir('output/v3-audit',{recursive:true});await writeFile('output/v3-audit/route-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({routes:report.routes,findings:report.findings,uniqueFindings:report.uniqueFindings,byRule:report.byRule},null,2));
