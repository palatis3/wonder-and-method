import test from 'node:test';
import assert from 'node:assert/strict';
import offers from '../config/offers.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
import {contractorService,newGuides} from '../src/audit-guide-updates.mjs';
import {researchServiceLinks} from '../src/research-service-links.mjs';
import {webDesignContent,careContent,auditContent} from '../src/service-content.mjs';
import {redesignPage} from '../src/search-guides.mjs';
import {searchMetadata,searchSupplement} from '../src/search-content.mjs';
import {journal} from '../src/journal.mjs';
import {money} from '../src/shared.mjs';
import {serviceCoverage} from '../src/service-area.mjs';
import {serviceStates} from '../src/service-area-directory.mjs';

const contractor=contractorService(offers,config);
const text=html=>html.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);

test('contractor page links to complete coverage and keeps a seven-item page plan without mobile table cards',()=>{
 const title=text(contractor.match(/<h1>(.*?)<\/h1>/s)[1]);
 assert.equal(title,'Websites for contractors and home-service businesses.');
 assert.match(contractor,/<a href="\/areas\/">50 states, Washington, DC, and Puerto Rico<\/a>/);
 assert.deepEqual([...serviceCoverage(config).regions].sort(),serviceStates.map(state=>state.name).sort());
 assert.equal(serviceCoverage(config).areaServed.length,52);
 for(const state of ['Louisiana','Arkansas','Texas'])assert.ok(serviceCoverage(config).regions.includes(state));
 assert.ok(!contractor.includes(serviceCoverage(config).region),'full region list stays in the directory and metadata');
 for(const trade of ['plumbing','electrical','HVAC','roofing','exterior','remodeling','landscaping','cleaning'])assert.ok(contractor.toLowerCase().includes(trade.toLowerCase()));
 const plan=contractor.match(/<h3>A sample seven-page plan<\/h3>(.*?)<\/section>/s)[1];
 assert.equal((plan.match(/<li>/g)||[]).length,7);
 assert.match(plan,/seven pages plus Business Custom Website’s 1 included guide use 8 of its 15 pages/);
 assert.match(plan,/eight-page Focused Website plan is another option/);
 assert.doesNotMatch(contractor,/<table|compact-offer|data-label=/);
 const words=text(contractor).split(' ').length;
 assert.ok(words>=500&&words<=1200,`Contractor copy has ${words} words`);
});

test('contractor simplification preserves payment, editing, evidence and form boundaries near the decision',()=>{
 const packages=contractor.match(/<h2>Choose the pages your customers need\.<\/h2>(.*?)<\/section>/s)[1];
 const assurances=contractor.match(/<h2>Writing, checks and future updates\.<\/h2>(.*?)<\/section>/s)[1];
 for(const id of ['launch_site','focused_site','business_site','signature_site'])assert.ok(packages.includes(money(offers[id].public_price)));
 assert.match(assurances,/40% to book, 30% when you approve copy\/design direction and 30% when you approve staging, before launch/);
 assert.match(assurances,/agree on your platform and editing workflow before booking/);
 assert.match(assurances,/Domain, hosting, paid tools, tax and approved extras are separate/);
 assert.match(contractor,/eligible business with authorized access/);
 assert.match(contractor,/A request is not a confirmed appointment or a quote/);
 assert.match(contractor,/Photo uploads, dispatch tools and custom integrations need a separate agreement on the work and price/);
 assert.match(contractor,/ready booking link or compatible standard embed may fit an included connection/);
 assert.ok(contractor.includes('Guided quote form — '+money(offers.add_ons.find(item=>item.id==='guided_quote_form').public_price)));
 assert.match(contractor,/does not calculate an automatic price/);
 assert.match(contractor,/two fictional concepts above.*not examples of your completed jobs/);
 assert.doesNotMatch(contractor,/every request reaches your inbox|guaranteed (?:inbox|delivery)/i);
 const closing=contractor.match(/<section class="studio-closing">(.*?)<\/section>/s)[1];
 assert.match(closing,/>Ask about your website<\/a>/);
 assert.ok(hrefs(closing).some(url=>url.includes('goal=new_website')&&url.includes('request_kind=question#inquiry')));
});

test('service preparation is one brief row with concrete links that do not repeat the page body',()=>{
 assert.equal(researchServiceLinks('/pricing/'),'');
 assert.equal(researchServiceLinks('/process/'),'');
 const pages={
  '/services/web-design/':webDesignContent(offers),
  '/services/website-redesign/':redesignPage(offers).body,
  '/services/website-audit/':auditContent(offers),
  '/services/website-care/':careContent(offers),
  '/services/contractor-websites/':contractor
 };
 for(const [path,body] of Object.entries(pages)){
  const row=researchServiceLinks(path),links=hrefs(row);
  assert.match(row,/class="service-preparation"/);
  assert.match(row,/<h2 id="related-planning-guides">Related guides<\/h2>/);
  assert.match(row,/<ul><li><a/);assert.doesNotMatch(row,/Prepare your next decision|Compare the same scope/);
  assert.equal(new Set(links).size,links.length,path);
  assert.ok(links.length>0,path);
  const existing=new Set(hrefs(body+searchSupplement(path,offers,config)).map(url=>url.split('#')[0]));
  for(const link of links)assert.ok(!existing.has(link.split('#')[0]),`${path} repeats ${link}`);
 }
});

test('the three added guides share their canonical title and concise description across metadata and articles',()=>{
 assert.deepEqual(newGuides.map(item=>item.path),['/guides/website-maintenance-cost/','/guides/website-launch-checklist/','/guides/ai-website-or-custom/']);
 for(const item of newGuides){
  const article=journal.find(guide=>guide.path===item.path),metadata=searchMetadata[item.path];
  assert.equal(article.title,item.path==='/guides/website-maintenance-cost/'?'Website maintenance costs':item.title,item.path);
  assert.equal(item.description,article.description,item.path);
  assert.equal(item.title,metadata.title,item.path);
  assert.equal(item.description,metadata.description,item.path);
  assert.ok(item.description.length<=160,item.path);
 }
});
