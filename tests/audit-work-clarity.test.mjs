import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {conceptPages} from '../src/portfolio-concepts.mjs';
import {workGallery,workItems} from '../src/work-gallery.mjs';
import {sourceHandoff} from '../src/source-handoff.mjs';
import {studioSearchStudy} from '../src/studio-search-study.mjs';
import {projectCalendar,conceptDebrief} from '../src/buyer-experience.mjs';
import {buffaloStudy} from '../src/buffalo-study.mjs';

test('Work keeps every project and both films with a useful early inquiry route',()=>{
 const items=workItems({homeEdition:'living-city'}),html=workGallery({homeEdition:'living-city'});
 assert.deepEqual(items.map(item=>item.id),['assetrounds','fieldwork','northline','hearthside','websites','search','handoff','workflow','buffalo-civic','studies']);
 assert.equal(new Set(items.slice(1,4).map(item=>item.details)).size,3);
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
 assert.match(restaurant,/Creating an ordering system or setting up the outside account/);
 assert.match(restaurant,/is separate work/);
 assert.doesNotMatch(restaurant,/the Order button|Order for pickup/);
});
