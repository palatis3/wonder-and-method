// Bind manually authored judgments to current source and rendered content. No ratings are inferred.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parse,parseFragment,serialize} from 'parse5';
import {renderPages} from '../../src/pages.mjs';
import {locationServicePage} from '../../src/location-service-pages.mjs';
import {serviceFaqSection} from '../../src/service-faqs.mjs';
import {normalizeOfferCatalog} from '../../src/offer-catalog.mjs';
import {journal,journalArticle} from '../../src/journal.mjs';
const base='operations/human-quality-20261027',out='output/human-quality-20261027/release-content',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const lines=p=>fs.readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse),sha=x=>createHash('sha256').update(x).digest('hex'),objSha=x=>sha(JSON.stringify(x));
const rawOffers=read('config/offers.json'),offers=normalizeOfferCatalog(rawOffers),locations=read('src/location-service-data.json'),imported=new Map(read('src/human-location-briefs.json').map(d=>[d.route,d]));
const pages=new Map(renderPages({config:read('config/site.json'),offers:rawOffers,map:read('authority/v5/site-map.json'),geography:read('authority/v5/geography.json')}).map(p=>[p.path,p]));
const walk=n=>[n,...(n.childNodes||[]).flatMap(walk)];
const blocks=new Set(['article','section','header','div','p','ul','ol','li','h1','h2','h3','h4','summary','table','tr','nav','figure','figcaption','aside','details','form','label','fieldset','button','option']);
function reviewText(n){if(n.nodeName==='#text')return n.value;if(['script','style','noscript'].includes(n.tagName))return '';const v=(n.childNodes||[]).map(reviewText).join(n.tagName==='tr'?' | ':'');return (blocks.has(n.tagName)?'\n':'')+(n.tagName==='details'?'[DISCLOSURE]\n':'')+v+(blocks.has(n.tagName)?'\n':'');}
const main=p=>walk(parse(p.html)).find(n=>n.tagName==='main'),clean=s=>s.replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
const plain=n=>n.nodeName==='#text'?n.value:['script','style','noscript'].includes(n.tagName)?'':(n.childNodes||[]).map(plain).join(' ');
const plainClean=s=>s.replace(/\s+/g,' ').trim();
const currentMainText=p=>clean(reviewText(main(p)));
function articleMain(p){const n=main(p);n.childNodes=n.childNodes.filter(c=>!(c.tagName==='nav'&&c.attrs?.some(a=>a.name==='class'&&a.value==='breadcrumb')));return n;}
const audits=fs.readdirSync(base+'/audits').filter(f=>/^(local-after-|local-five-replacements-independent|local-research-replacements-independent|final-eight-independent|final-local-replacements-independent|final-findings-recheck)/.test(f)&&f.endsWith('.jsonl')).flatMap(file=>lines(base+'/audits/'+file).map(row=>({file:base+'/audits/'+file,row})));
const drafts=new Map([1,2,3,4,5,6].flatMap(p=>lines(`${base}/drafts/local-${p}.jsonl`)).map(d=>[d.route,d]));
const dims={intent:15,distinctiveness:20,trust:15,coherence:15,scanability:10,nextStep:5},results=[],errors=[];
function add(route,review,file,binding,family){
 const ratings=review.dimensionRatings??review.ratings;assert(ratings,route+' ratings');
 for(const key of Object.keys(dims))assert(Number.isFinite(ratings[key])&&ratings[key]>=0&&ratings[key]<=4,route+' '+key);
 const caps=review.appliedCaps??review.applicableCaps??[];assert.equal(caps.length,0,route+' cap');
 assert.equal((review.requiredFixes??[]).length,0,route+' unresolved required fixes');
 assert(!['hold','revise-content'].includes(review.verdict)&&!['revise','fail'].includes(review.contentVerdict),route+' content hold');
 const p=pages.get(route);assert(p,route);
 results.push({route,family,title:p.title,renderedHtmlSha256:sha(p.html),mainHtmlSha256:sha(serialize(main(p))),dimensionRatings:{...Object.fromEntries(Object.keys(dims).map(k=>[k,ratings[k]])),visuals:null,accessibility:null},contentSubtotal:Object.entries(dims).reduce((n,[k,w])=>n+ratings[k]*w/4,0),contentMaximum:80,finalScore:null,appliedCaps:caps,review:{file,entrySha256:objSha(review),reviewer:review.reviewer??'See referenced record',independent:review.independentReview??review.independent??(/independent|Astra/i.test(review.reviewer??file)&&!file.includes('root-')),binding},intendedVisitorTask:review.intendedVisitorTask??drafts.get(route)?.customerQuestion??null,independentValue:review.independentValue??null,retainedFindings:review.remainingFindings??review.findings??[],scope:'Content judgment bound to exact reviewed input; visual and accessibility ratings remain unassigned.'});
}
for(const entry of locations){try{
 const d=drafts.get(entry.path),projection=Object.fromEntries(['route','inputHash','heading','intro','customerQuestion','decisions','ownerInputs','sourceBridge','limits'].map(k=>[k,d[k]]));
 assert.deepEqual(imported.get(entry.path),projection,entry.path+' import');
 let {body}=locationServicePage(entry,offers,{brief:d});const faq=serviceFaqSection(entry.path,offers),anchor='<section class="section county-section" id="your-brief">';if(faq)body=body.includes(anchor)?body.replace(anchor,faq+anchor):body+faq;
 const bodyHash=sha(body),matching=audits.filter(({row})=>row.route===entry.path&&row.candidateBodySha256===bodyHash);
 assert(matching.length,entry.path+' current review missing');
 const eligible=matching.filter(({row})=>!['hold','revise-content'].includes(row.verdict)&&!['revise','fail'].includes(row.contentVerdict)&&!(row.requiredFixes??[]).length&&!(row.appliedCaps??[]).length);
 assert(eligible.length,entry.path+' no accepted current review');
 // Equal-current-body reviews cannot be chosen merely to inflate a score: prefer the conservative subtotal.
 eligible.sort((a,b)=>Object.entries(dims).reduce((n,[k,w])=>n+(a.row.dimensionRatings[k]-b.row.dimensionRatings[k])*w/4,0));
 const selected=eligible[0],expectedText=plainClean(plain(parseFragment(body))),emittedText=plainClean(plain(articleMain(pages.get(entry.path))));
 assert(emittedText===expectedText,entry.path+' emitted content differs from complete reviewed candidate (shared breadcrumb excluded)');
 add(entry.path,selected.row,selected.file,{kind:'exact-candidate-body',sha256:bodyHash,currentDraftSha256:objSha(d),sourceEntrySha256:objSha(entry),importMatches:true,emittedTextMatches:true},'local-service');
}catch(e){errors.push(String(e.message).split('\n')[0]);}}
const corrections=read(base+'/guide-service-corrections-review.json');
const guides=lines(base+'/audits/guides-final-independent.jsonl');
const guideDateBindings=read(out+'/guide-date-bindings.json');
const guideRenderedReview=read(base+'/audits/guide-rendered-delta-review.json');
const withoutUpdatedDate=html=>html.replace(/<span class="byline-date">Updated <time datetime="[^"]+">[^<]+<\/time><\/span>/g,'<span class="byline-date">Updated [REVIEWED DATE]</span>');
for(const item of journal){try{
 const corrected=corrections.results.find(r=>r.route===item.path),review=corrected??guides.find(r=>r.route===item.path);assert(review,item.path);
 const html=journalArticle(item,rawOffers,journal),dateBinding=guideDateBindings.find(r=>r.route===item.path);
 assert.equal(dateBinding.currentHash,sha(html));assert.equal(dateBinding.reviewedHash,review.inputHash);
 if(sha(html)!==review.inputHash){
  const previous=lines(dateBinding.snapshot).find(r=>r.route===item.path&&r.inputHash===review.inputHash);assert(previous);assert.equal(sha(previous.bodyHtml),review.inputHash);
  assert(withoutUpdatedDate(previous.bodyHtml)===withoutUpdatedDate(html),item.path+' unexpected non-date article change');
  assert.equal(dateBinding.currentDate,'<span class="byline-date">Updated <time datetime="2026-10-27">October 27, 2026</time></span>');
 }
 const renderedReview=guideRenderedReview.rows.find(r=>r.route===item.path),page=pages.get(item.path),escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 let reviewedRenderedHtml=html;
 if(renderedReview){assert.equal(renderedReview.sourceArticleSha256,sha(html));assert.equal(renderedReview.renderedIntroduction,page.description);assert.deepEqual(renderedReview.findings,[]);reviewedRenderedHtml=html.replace(/(<header class="journal-header">[^]*?<p class="lede">)[^]*?(<\/p>)/,(_m,a,b)=>a+escape(page.description)+b);}
 const emitted=plainClean(plain(articleMain(page))),source=plainClean(plain(parseFragment(reviewedRenderedHtml)));
 assert(emitted===source,item.path+' emitted article text differs (shared breadcrumb excluded)');
 if(renderedReview)assert.equal(sha(emitted),renderedReview.emittedTextSha256);
 add(item.path,review,corrected?base+'/guide-service-corrections-review.json':base+'/audits/guides-final-independent.jsonl',{kind:'exact-reviewed-article-with-explicit-rendered-deltas',sha256:sha(html),dateBinding,renderedIntroductionReview:renderedReview?{file:base+'/audits/guide-rendered-delta-review.json',entrySha256:objSha(renderedReview)}:null,emittedTextMatches:true},'guide');
}catch(e){errors.push(String(e.message).split('\n')[0]);}}
const services=lines(base+'/audits/services-final-independent.jsonl'),correctionSnapshots=lines('output/human-quality-20261027/corrections-review/current.jsonl');
for(const initial of services){try{
 const corrected=corrections.results.find(r=>r.route===initial.route),review=corrected??initial;
 const expected=corrected?correctionSnapshots.find(r=>r.route===initial.route).mainTextSha256:review.mainTextSha256;
 const current=sha(currentMainText(pages.get(initial.route)));assert.equal(current,expected,initial.route+' main text');
 add(initial.route,review,corrected?base+'/guide-service-corrections-review.json':base+'/audits/services-final-independent.jsonl',{kind:'exact-complete-main-text',sha256:current},review.family);
}catch(e){errors.push(String(e.message));}}
for(const review of lines(base+'/audits/directories-final-delta.jsonl')){try{
 const current=sha(currentMainText(pages.get(review.route)));assert.equal(current,review.mainTextSha256,review.route+' directory main');
 add(review.route,review,base+'/audits/directories-final-delta.jsonl',{kind:'exact-complete-main-text-and-reviewed-delta',sha256:current},review.family);
}catch(e){errors.push(String(e.message));}}
for(const [route,file,review] of [
 ['/areas/erie-county/',base+'/audits/final-eight-independent.jsonl',lines(base+'/audits/final-eight-independent.jsonl').find(r=>r.route==='/areas/erie-county/')],
 ['/guides/',base+'/audits/guide-index-final.json',read(base+'/audits/guide-index-final.json')]
]){try{const current=sha(serialize(main(pages.get(route))));assert.equal(current,review.mainHtmlSha256,route+' exact main');add(route,review,file,{kind:'exact-complete-main-html',sha256:current},route==='/guides/'?'guide-index':'local-service');}catch(e){errors.push(String(e.message));}}
const expected=[...pages.keys()].filter(r=>/^\/(areas|services|guides)\//.test(r));
for(const route of expected)if(!results.some(r=>r.route===route))errors.push('Missing current content binding '+route);
assert.equal(new Set(results.map(r=>r.route)).size,results.length,'Duplicate results');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/pages.jsonl',results.sort((a,b)=>a.route.localeCompare(b.route)).map(JSON.stringify).join('\n')+'\n');
const summary={generatedAt:new Date().toISOString(),expected:expected.length,bound:results.length,complete:!errors.length&&results.length===2394,errors,minContentSubtotal:Math.min(...results.map(r=>r.contentSubtotal)),below65:results.filter(r=>r.contentSubtotal<65).map(r=>({route:r.route,subtotal:r.contentSubtotal})),dimensions:'Six manual content ratings; visuals/accessibility/final null. No automatic judgment or uplift.'};
fs.writeFileSync(out+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,errors:errors.slice(0,8),errorCount:errors.length}));if(errors.length)process.exitCode=1;
