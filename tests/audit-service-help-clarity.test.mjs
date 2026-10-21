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

const contractor=contractorService(offers,config);
const text=html=>html.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);

test('contractor page keeps all three states and a seven-item page plan without mobile table cards',()=>{
 const title=text(contractor.match(/<h1>(.*?)<\/h1>/s)[1]);
 assert.equal(title,'Websites for contractors and home-service businesses.');
 for(const state of config.serviceCoverage.regions)assert.ok(contractor.includes(state));
 for(const trade of ['plumbing','electrical','HVAC','roofing','exterior','remodeling','landscaping','cleaning'])assert.ok(contractor.toLowerCase().includes(trade.toLowerCase()));
 const plan=contractor.match(/<h3>A sample seven-page plan<\/h3>(.*?)<\/section>/s)[1];
 assert.equal((plan.match(/<li>/g)||[]).length,7);
 assert.match(plan,/seven pages plus Focused’s two included guides use nine of its 15 pages/);
 assert.match(plan,/combine the service pages into a six-page Launch plan/);
 assert.doesNotMatch(contractor,/<table|compact-offer|data-label=/);
 const words=text(contractor).split(' ').length;
 assert.ok(words>=500&&words<=1200,`Contractor copy has ${words} words`);
});

test('contractor simplification preserves payment, editing, evidence and form boundaries near the decision',()=>{
 const packages=contractor.match(/<h2>Choose your website package\.<\/h2>(.*?)<\/section>/s)[1];
 for(const id of ['launch_site','focused_site','signature_site'])assert.ok(packages.includes(money(offers[id].public_price)));
 assert.match(packages,/50% to book, 30% when you approve the design and 20% when you approve the working website, before launch/);
 assert.match(packages,/no drag-and-drop editor/);
 assert.match(packages,/Domain, hosting, paid tools, tax and approved extras are separate/);
 assert.match(contractor,/eligible business with authorized access/);
 assert.match(contractor,/A request is not a confirmed appointment or a quote/);
 assert.match(contractor,/Photo uploads, dispatch tools and custom integrations need a separate scope/);
 assert.match(contractor,/ready booking link or compatible standard embed may fit an included connection/);
 assert.ok(contractor.includes('A guided quote form costs '+money(offers.add_ons.find(item=>item.id==='guided_quote_form').public_price)));
 assert.match(contractor,/not an automatic price/);
 assert.match(contractor,/both fictional studio concepts/);
 assert.doesNotMatch(contractor,/every request reaches your inbox|guaranteed (?:inbox|delivery)/i);
 const closing=contractor.match(/<section class="studio-closing">(.*?)<\/section>/s)[1];
 assert.match(closing,/>Discuss your website<\/a>/);
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
  assert.equal(item.title,article.title,item.path);
  assert.equal(item.title,metadata.title,item.path);
  assert.equal(item.description,metadata.description,item.path);
  assert.ok(item.description.length<=160,item.path);
 }
});
