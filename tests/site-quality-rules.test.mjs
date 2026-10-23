import test from 'node:test';
import assert from 'node:assert/strict';
import {markupFindings,locationCopyFindings,locationPurposeFingerprint,guidePurposeFingerprint,relatedGuideFindings,historicalFragmentFindings,assertHistoricalDestination,assertHistoricalHtml} from '../scripts/site-quality-rules.mjs';

const html='<html><head><title>Website planning</title><meta name="description" content="A useful brief."></head><body><main><h1>Website planning</h1><p id="coverage">Where we work.</p></main></body></html>';
const entry={path:'/areas/example/',title:'Example web design',description:'A scope comparison.',lead:'Choose a scope.',decisionTitle:'Keep the inquiry useful.',decision:'Explain the needed information.',coverageNote:'Remote service.',scopeTrigger:'Custom website uploads require separate assessment.',sources:[{url:'https://example.com/offer',label:'Public offer',observation:'The business describes its service.'}],relatedGuides:[{path:'/guides/example/',label:'Related planning example'}]};

test('rendered copy checks catch the missing-state-description regression and ignore executable code',()=>{
 assert.deepEqual(markupFindings('/areas/',html),[]);
 assert.ok(markupFindings('/areas/',html.replace('Where we work.','undefined')).some(x=>x.rule==='unresolved-copy'));
 assert.deepEqual(markupFindings('/areas/',html.replace('</body>','<script>let value=undefined;</script></body>')),[]);
 assert.deepEqual(markupFindings('/work/',html.replace('</body>','<template><h4 data-title></h4></template></body>')),[],'An inert UI template is populated before display and covered by browser tests.');
 assert.deepEqual(markupFindings('/work/',html.replace('</main>','<div hidden><h4 data-title></h4><div><p>undefined</p></div></div></main>')),[],'A hidden editor is populated before display.');
 assert.deepEqual(markupFindings('/tools/',html.replace('Where we work.','A percentage return is undefined when total cost is zero.')),[]);
 assert.deepEqual(markupFindings('/areas/',html.replace('Where we work.','Avoid an undefined complete restoration.')),[]);
 assert.ok(markupFindings('/areas/',html.replace('<p id="coverage">Where we work.</p>','<p aria-hidden="true">undefined</p>')).some(x=>x.rule==='unresolved-copy'),'aria-hidden does not make visible text disappear.');
 assert.ok(markupFindings('/',html.replace('Where we work.','Website scope: [object Object]')).some(x=>x.rule==='unresolved-copy'));
 for(const bad of ['NaN','[object Object]','${state.description}','{{description}}'])assert.ok(markupFindings('/',html.replace('Where we work.',bad)).some(x=>x.rule==='unresolved-copy'),bad);
 assert.ok(markupFindings('/',html.replace('content="A useful brief."','content=""')).some(x=>x.rule==='metadata'));
 assert.ok(markupFindings('/',html.replace('<h1>Website planning</h1>','<h1><span></span></h1>')).some(x=>x.rule==='empty-heading'));
 assert.ok(markupFindings('/',html.replace('</main>','<span id="coverage">Duplicate</span></main>')).some(x=>x.rule==='duplicate-id'));
});

test('scope checks reject offering engineering as another website quote while allowing assigned specialist responsibilities',()=>{
 assert.deepEqual(locationCopyFindings(entry),[]);
 assert.ok(locationCopyFindings({...entry,scopeTrigger:'Door engineering, electrical work and construction detailing need separate scope.'}).some(x=>x.rule==='scope-responsibility'));
 assert.deepEqual(locationCopyFindings({...entry,scopeTrigger:'Door engineering and electrical work remain with qualified specialists. Website upload tools require separate assessment.'}),[]);
 assert.deepEqual(locationCopyFindings({...entry,scopeTrigger:'Installation is outside this website service. A customer portal requires separate assessment.'}),[]);
 assert.deepEqual(locationCopyFindings({...entry,scopeTrigger:'The maker provides engineering drawings. Installation-scheduling tools need separate website assessment.'}),[],'Specialist work and website tools in separate sentences do not create an extra trade offer.');
 assert.deepEqual(locationCopyFindings({...entry,scopeTrigger:'Secure uploads require separate website assessment; a page does not establish certification.'}),[]);
 assert.ok(locationCopyFindings({...entry,sources:[{url:'javascript:alert(1)',label:'Example',observation:'An example.'}]}).some(x=>x.rule==='source-record'));
});

test('repurposing a page cannot silently retain its old guide link',()=>{
 const guide='<article class="journal-article"><h1>Example</h1><p>Relevant planning content.</p></article>',guides=new Map([['/guides/example/',guide]]);
 const review=[{from:entry.path,to:entry.relatedGuides[0].path,label:entry.relatedGuides[0].label,reason:'Explains the same planning decision in more detail.',reviewedAt:'2026-10-23',locationPurposeSha256:locationPurposeFingerprint(entry),guidePurposeSha256:guidePurposeFingerprint(guide)}];
 assert.deepEqual(relatedGuideFindings([entry],review,guides),[]);
 assert.ok(relatedGuideFindings([{...entry,decision:'An unrelated ferry-arrival decision.'}],review,guides).some(x=>/brief changed/.test(x.detail)));
 assert.ok(relatedGuideFindings([{...entry,scopes:[{title:'Ferry arrival',pages:['Arrival'],request:'Find the terminal.'}]}],review,guides).some(x=>/brief changed/.test(x.detail)));
 assert.ok(relatedGuideFindings([entry],review,new Map([['/guides/example/',guide.replace('Relevant planning content.','An unrelated topic.')]])).some(x=>/guide content changed/.test(x.detail)));
 assert.ok(relatedGuideFindings([entry],[],guides).some(x=>x.rule==='related-guide-review'));
 assert.deepEqual(relatedGuideFindings([{...entry,scopeTrigger:'Another website-only scope boundary.'}],review,guides),[],'Unrelated scope wording does not invalidate a purpose review.');
});

test('historical fragments must exist on the final destination, even when the redirect and canonical path are valid',()=>{
 const routes=[{from:'/areas/old-county/',to:'/areas/example/',fragments:['coverage','services']}];
 const result=historicalFragmentFindings(routes,new Map([['/areas/example/',html]]));
 assert.deepEqual(result,[{path:'/areas/old-county/',rule:'historic-fragment',detail:'/areas/example/#services has no target.'}]);
 assert.deepEqual(historicalFragmentFindings(routes,new Map([['/areas/example/',html.replace('</main>','<section id="services">Current service scope.</section></main>')]])),[]);
 assert.ok(historicalFragmentFindings(routes,new Map()).some(x=>x.rule==='historic-destination'));
 for(const inert of ['<!-- <p id="services">Comment</p> -->','<script>const html = `<p id="services">Script</p>`;</script>','<template><p id="services">Template</p></template>','<div hidden><p id="services">Hidden</p></div>','<p id="services" style="display:none">Hidden</p>','<p data-id="services">Data only</p>',"<p data-note='id=\"services\"'>Quoted text</p>"]){
  assert.ok(historicalFragmentFindings(routes,new Map([['/areas/example/',html.replace('</main>',inert+'</main>')]])).some(x=>x.detail.includes('#services')),inert);
 }
 assert.deepEqual(markupFindings('/',html.replace('</main>',"<p data-id=\"coverage\" data-note='id=\"coverage\"'>No duplicate</p><!-- <p id=\"coverage\">Comment</p> --></main>")),[]);
 assert.deepEqual(historicalFragmentFindings(routes,new Map([['/areas/example/',html.replace('</main>',"<p data-note='x > y hidden' id='services'>Visible services.</p></main>")]])),[]);
});

test('historical destinations reject wrong fragments, non-HTML responses, empty bodies and geographic noindex',async()=>{
 const expected=new URL('https://example.com/areas/example/');
 const body=html.replace('</head>','<link rel="canonical" href="https://example.com/areas/example/"><meta name="robots" content="index,follow"><script type="application/ld+json">[{"@type":"Service","areaServed":{"name":"Example County, New York"}}]</script></head>');
 const options={method:'GET',expected,areaName:'Example County',state:'New York'};
 assertHistoricalDestination(new URL(expected+'?qa=1'),expected,'?qa=1');
 assert.throws(()=>assertHistoricalDestination(new URL(expected+'?qa=1#wrong'),expected,'?qa=1'),/fragment/);
 await assertHistoricalHtml(new Response(body,{headers:{'Content-Type':'text/html'}}),options);
 await assert.rejects(()=>assertHistoricalHtml(new Response(body,{headers:{'Content-Type':'application/octet-stream'}}),options),/return HTML/);
 await assert.rejects(()=>assertHistoricalHtml(new Response('',{headers:{'Content-Type':'text/html'}}),options),/nonempty/);
 await assert.rejects(()=>assertHistoricalHtml(new Response(body,{headers:{'Content-Type':'text/html','X-Robots-Tag':'noindex'}}),options),/noindex header/);
 await assert.rejects(()=>assertHistoricalHtml(new Response(null,{headers:{'Content-Type':'text/html'}}),{...options,method:'HEAD',headHtml:''}),/nonempty/);
});
