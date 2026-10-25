import assert from 'node:assert/strict';
import {normalizeOfferCatalog,setCatalogValue} from '../src/offer-catalog.mjs';
import {renderPages} from '../src/pages.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {journal,journalArticle} from '../src/journal.mjs';
import {escapeHtml} from '../src/shared.mjs';

// Deliberately unequal values expose shared-limit assumptions. This never writes
// a catalog or changes an accepted commercial snapshot.
export function offerBindingProbe(offers){
 const probe=structuredClone(offers);
 const set={
  'launch_site.public_name':'Probe & Starter','launch_site.public_price':1601.03,'launch_site.marketing_page_cap':8,'launch_site.forms':3,'launch_site.form_field_limit':7,'launch_site.training_minutes':25,'launch_site.delivery_average':'4–7 business days',
  'focused_site.public_name':'Probe & Complete','focused_site.public_price':2603.07,'focused_site.marketing_page_cap':18,'focused_site.launch_content.articles':3,'focused_site.forms':4,'focused_site.form_field_limit':8,'focused_site.training_minutes':35,
  'signature_site.public_name':'Probe & Studio','signature_site.public_price':4107.11,'signature_site.marketing_page_cap':35,'signature_site.launch_content.articles':5,'signature_site.forms':5,'signature_site.form_field_limit':9,'signature_site.training_minutes':45,'signature_site.search_research.planning_days':110,
  'launch_site.graphic_counts.launch':2,'focused_site.graphic_counts.launch':4,'focused_site.graphic_counts.promotional':5,'focused_site.graphic_counts.supplied_photo_edits':8,
  'signature_site.graphic_counts.launch':7,'signature_site.graphic_counts.promotional':8,'signature_site.graphic_counts.supplied_photo_edits':14,
  'baseline.public_name':'Probe & Review','baseline.one_time_price':425.03,'baseline.page_cap':14,
  'audit_sprint.public_name':'Probe & Repair','audit_sprint.one_time_price':801.01,'audit_sprint.page_cap':16,
  'plans.keep_running.public_name':'Probe & Care','plans.keep_running.monthly_price':175.03,'plans.keep_running.small_change_batches':2,
  'plans.improve.public_name':'Probe & Progress','plans.improve.monthly_price':450.07,'plans.improve.priorities':3,'plans.improve.small_change_batches':3,'plans.improve.review_minutes':25,'plans.improve.search_scope.active_topics':2,
  'plans.grow.public_name':'Probe & Campaign','plans.grow.monthly_price':901.09,'plans.grow.priorities':4,'plans.grow.small_change_batches':4,'plans.grow.review_minutes':35,'plans.grow.search_scope.active_topics':3,'plans.grow.search_scope.competitor_limit':4,'plans.grow.growth_plan.days':120,
  'plans.grow.promotion_reuse.quantity':2,'plans.grow.promotion_reuse.graphic_sizes':4,'plans.grow.promotion_reuse.newsletter_max_words':200
 };
 for(const [path,value] of Object.entries(set))setCatalogValue(probe,path,value);
 return normalizeOfferCatalog(probe);
}

export function assertOfferBindings({config,offers,map,geography}){
 const probe=offerBindingProbe(offers),pages=renderPages({config,offers:probe,map,geography});
 const routes=new Map(pages.map(page=>[page.path,page]));let assertions=0;
 const has=(path,text)=>{assert.ok(routes.get(path)?.html.includes(text),`Catalog binding missing on ${path}: ${text}`);assertions++;};
 const lacks=(path,text)=>{assert.ok(!routes.get(path)?.html.includes(text),`Stale catalog binding on ${path}: ${text}`);assertions++;};
 has('/pricing/','Probe &amp; Starter');has('/pricing/','Probe &amp; Review');
 has('/pricing/','Probe &amp; Starter: up to 7 agreed fields per form');has('/pricing/','Probe &amp; Studio: up to 9 agreed fields per form');
 has('/pricing/','Two customer topics');has('/pricing/','Three topics and up to 4 competitors');
 has('/pricing/','120-day plan, updated monthly');has('/pricing/','2 extra graphics or short excerpts');
 has('/pricing/','Monthly report and 25-minute call or written review');has('/pricing/','Monthly report and 35-minute call or written review');
 has('/pricing/','Probe &amp; Care: two sets of small text');has('/pricing/','Probe &amp; Campaign: four sets of small text');
 has('/checkout/launch-site/','up to 7 agreed questions');has('/checkout/signature-site/','written 110-day plan');
 has('/checkout/improve/','Three sets of small text');has('/checkout/website-baseline/','Probe &amp; Review review to help you decide');
 for(const path of ['/guides/contact-form-not-working/','/guides/website-audit-checklist/','/guides/website-maintenance-cost/','/payments/']){
  has(path,'Probe &amp; Review covers up to 14 agreed main pages; Probe &amp; Repair covers up to 16');
  lacks(path,'Both cover up to 14');
 }
 has('/process/','Probe &amp; Starter 4–7 business days');has('/process/','14–17 business days for Probe &amp; Starter');
 has('/','Probe &amp; Starter 4–7 business days');
 for(const path of ['/','/process/','/guides/website-project-cost/']){
  has(path,'Probe &amp; Starter, up to 25 minutes');has(path,'Probe &amp; Studio, up to 45 minutes');
  lacks(path,'optional 30-minute');
 }
 has('/guides/website-project-cost/','Probe &amp; Starter includes 3 contact forms');
 has('/guides/website-project-cost/','4 forms, 3 original guides');
 has('/guides/website-project-cost/','5 forms, 5 original guides');
 has('/guides/website-project-cost/','For Probe &amp; Starter: $800.52 / $480.31 / $320.20.');
 has('/guides/website-project-cost/','Proposal A: studio Probe &amp; Starter');
 has('/guides/website-project-cost/','Up to 7 agreed fields');
 has('/guides/ai-website-or-custom/','Probe &amp; Studio is $4,107.11');
 has('/work/buffalo-civic/','Probe &amp; Studio includes one agreed');
 has('/work/','Probe &amp; Complete includes four launch graphics plus five finished promotional graphics, for nine distinct designs');
 has('/work/','Probe &amp; Studio includes seven launch graphics plus eight finished promotional graphics, for 15 distinct designs');
 has('/services/web-design/','Probe &amp; Starter, up to 25 minutes');has('/services/web-design/','Probe &amp; Studio, up to 45 minutes');
 has('/areas/new-jersey/monmouth-county/','Probe &amp; Care includes two sets');
 has('/areas/suffolk-county/','Probe &amp; Progress includes three substantial researched improvements');
 has('/areas/pennsylvania/lancaster-county/','Probe &amp; Progress researches two active services or topics');
 has('/areas/pennsylvania/delaware-county/','Probe &amp; Care can publish two agreed sets');
 has('/areas/ohio/cuyahoga-county/','Probe &amp; Progress and Probe &amp; Campaign include Probe &amp; Care care and their separate allowance');
 has('/guides/seo-work-and-reporting/','two newsletter excerpts of up to 200 words each');
 has('/guides/website-launch-announcement/','Probe &amp; Campaign plan');
 for(const path of ['/pricing/','/checkout/grow/','/guides/seo-work-and-reporting/'])lacks(path,'&amp;amp;');
 for(const path of ['/checkout/launch-site/','/checkout/focused-site/','/checkout/signature-site/']){
  has(path,'Probe &amp; Care');lacks(path,'&amp;amp;');
 }
 const markup=structuredClone(probe),name='Probe & <CatalogName> "quoted" \'text\' &lt;';
 for(const id of ['launch_site','focused_site','signature_site'])markup[id].public_name=name;
 markup.plans.keep_running.public_name=name;
 for(const addon of markup.add_ons)addon.public_name=name;
 const cost=journalArticle(journal.find(item=>item.path==='/guides/website-project-cost/'),markup,journal);
 assert.ok(cost.includes('data-label="'+escapeHtml('Proposal A: studio '+name)+'"'));assertions++;
 assert.ok(cost.includes('>'+escapeHtml(name)+'</a>'));assertions++;
 assert.ok(cost.includes('>'+escapeHtml(name)+': 12 monthly invoices</th>'));assertions++;
 assert.ok(!cost.includes('<CatalogName>')&&!cost.includes('&amp;lt;CatalogName'));assertions++;
 const packs=buyerPacks(probe),pack=id=>packs.find(p=>p.id===id),text=id=>pack(id).sections.flatMap(s=>s.items).join('\n');
 assert.equal(pack('website_baseline').name,'Probe & Review');assertions++;
 for(const [id,phrase] of [['launch_site','3 contact forms'],['focused_site','up to eight agreed fields'],['grow','Two separate extras'],['grow','One 35-minute call'],['grow','120-day plan'],['grow','two newsletter excerpts of up to 200 words each']]){
  assert.ok(text(id).toLowerCase().includes(phrase.toLowerCase()),`Catalog binding missing in ${id} buyer pack: ${phrase}`);assertions++;
 }
 return {status:'PASS',assertions,renderedRoutes:pages.length,buyerPacks:packs.length};
}
