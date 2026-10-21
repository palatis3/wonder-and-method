import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {conceptPages} from '../src/portfolio-concepts.mjs';
import {resolveDemoService} from '../src/assets/portfolio-concepts.js';
import {workGallery,workItems} from '../src/work-gallery.mjs';
import {sourceHandoff} from '../src/source-handoff.mjs';
import {studioSearchStudy} from '../src/studio-search-study.mjs';
import {projectCalendar,conceptDebrief} from '../src/buyer-experience.mjs';
import {buffaloStudy} from '../src/buffalo-study.mjs';

test('the clearer Northline options retain every old service query choice',()=>{
 const choices=['Kitchen remodeling','Bathroom remodeling','Interior layout changes'];
 for(const [old,current] of [['Kitchen remodeling conversation',choices[0]],['Bathroom remodeling conversation',choices[1]],['Interior layout conversation',choices[2]]]){
  const query=new URLSearchParams('service='+encodeURIComponent(old)).get('service');
  assert.equal(resolveDemoService('northline',query,choices),current);
  assert.equal(resolveDemoService('northline',current,choices),current);
 }
 assert.equal(resolveDemoService('northline','unknown',choices),null);
 assert.equal(resolveDemoService('northline',null,choices),null);
 assert.equal(resolveDemoService('hearthside','Classic cheese',['Classic cheese ($16)','Pepperoni ($19)','Garden ($18)']),'Classic cheese ($16)');
 assert.equal(resolveDemoService('fieldwork','Garden assessment',['Seasonal garden care','Planting refresh','Garden assessment']),'Garden assessment');
});

test('all nine concept routes remain, with disabled submit controls and honest preview labels',()=>{
 const pages=conceptPages();
 assert.equal(pages.length,9);
 for(const id of ['fieldwork','northline','hearthside']){
  const page=pages.find(page=>page.path===`/work/${id}/request/`);
  const form=page.body.match(/<form\b[^>]*>([\s\S]*?)<\/form>/)?.[1];
  const disabled=form?.match(/<fieldset disabled>([\s\S]*?)<\/fieldset>/)?.[1];
  assert.ok(disabled,id);
  assert.match(disabled,/<button type="submit"/);
  assert.equal((form.match(/type="submit"/g)||[]).length,(disabled.match(/type="submit"/g)||[]).length);
  assert.match(page.body,/nothing is sent or saved/i);
  assert.match(page.body,/Demo complete · Nothing sent/);
  assert.match(page.title,id==='hearthside'?/^Preview your order/:/^Request an estimate/);
  assert.match(page.body,id==='hearthside'?/See my order/:/See my request/);
  assert.doesNotMatch(page.body,/<form[^>]+(?:action|method)=|confirm by text|within 10 minutes|free in-home estimate/i);
 }
 const north=pages.find(page=>page.path==='/work/northline/remodeling/').body;
 assert.match(north,/service=Kitchen%20remodeling/);
 assert.doesNotMatch(north,/remodeling conversation|layout conversation/);
});

test('Work keeps every project and both films with a useful early inquiry route',()=>{
 const items=workItems({homeEdition:'living-city'}),html=workGallery({homeEdition:'living-city'});
 assert.deepEqual(items.map(item=>item.id),['fieldwork','northline','hearthside','websites','search','handoff','workflow','buffalo-civic','studies']);
 assert.equal(new Set(items.slice(0,3).map(item=>item.details)).size,3);
 assert.equal((html.match(/class="work-group"/g)||[]).length,3);
 assert.ok(html.indexOf('goal=new_website')<html.indexOf('id="fieldwork"'));
 for(const id of ['website-decisions','creative-samples','buffalo-civic','studies'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/poster="\/assets\/waterfront\/film-poster-landscape.webp"/);
 assert.match(html,/<source src="\/assets\/waterfront\/film-landscape.mp4" type="video\/mp4">/);
 assert.match(html,/href="\/work\/buffalo-civic\/"/);
 assert.match(html,/Sample website handoff/);
 assert.match(html,/Inquiry tracker demo/);
 assert.doesNotMatch(html,/audio-only information|through the brief, content changes, checks and next review/);
});

test('the page-planning example describes its real contents and preserves saved section links',()=>{
 const {title,body}=studioSearchStudy;
 assert.equal(title,'How I decide which pages a website needs');
 assert.equal(workItems({}).find(item=>item.id==='search').title,title);
 assert.doesNotMatch(body,/Before, my homepage|Now it says what I do/);
 for(const id of ['search-page-map','owned-search-receipt','search-brief','search-change','search-verification'])assert.ok(body.includes(`id="${id}"`));
 assert.doesNotMatch(body,/<span id="search-(?:brief|change|verification)"><\/span>/);
 assert.match(body,/\/assets\/guides\/studio-intent-map.csv/);
});

test('plain handoff wording preserves the paid-completion trigger and full delivery rights',()=>{
 const html=sourceHandoff();
 assert.match(html,/<h1>Sample website handoff\.<\/h1>/);
 assert.match(html,/within five business days after the paid work is finished, or after settling the account if the project stops early/);
 assert.doesNotMatch(html,/within five business days (?:of|after) (?:your )?final payment/);
 assert.match(html,/does not delay file delivery/);
 assert.match(html,/There is no drag-and-drop editor/);
 assert.match(html,/Read the included permission before reusing the sample/);
 assert.match(html,/one optional walkthrough call of up to 30 minutes/);
 assert.match(html,/Reusable components and third-party software retain their licenses/);
 assert.match(html,/21190e9af341b6e889c9581debe456423b2a99d93728a579aade1dabb61650c0/);
});

test('the project calendar matches current build-day units and adds both review windows',async()=>{
 const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8'));
 const html=projectCalendar();
 for(const id of ['launch_site','focused_site','signature_site'])assert.ok(html.includes(offers[id].delivery_average),id);
 assert.match(html,/two rounds, each allowing up to five business days/);
 assert.match(html,/written proposal confirms the start, review and launch dates/);
 assert.match(html,/after the paid work is finished/);
 assert.doesNotMatch(html,/few extra days|usual review window/);
});

test('animation and restaurant explanations invite useful inquiries without new commitments',()=>{
 const art=buffaloStudy(),restaurant=conceptDebrief('hearthside');
 assert.equal((art.match(/<video\b/g)||[]).length,2);
 assert.match(art,/Ask about custom homepage animation/);
 assert.match(art,/use the video controls to pause/);
 assert.match(restaurant,/custom order preview shown here/);
 assert.match(restaurant,/is separate work/);
 assert.doesNotMatch(restaurant,/the Order button|Order for pickup/);
});
