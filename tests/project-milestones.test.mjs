import test from 'node:test';
import assert from 'node:assert/strict';
import {projectMilestones} from '../src/project-milestones.mjs';
import {checkoutPages} from '../src/checkout-content.mjs';
import {websiteProcess} from '../src/process-content.mjs';
import {money} from '../src/shared.mjs';
import offers from '../config/offers.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};

test('website payment milestones retain catalog amounts and explicit approval conditions',()=>{
 const before=JSON.stringify(offers);
 const pages=checkoutPages(offers,{live:false,notice:'Test only',privacyLink:'Privacy'});
 for(const id of ['launch_site','focused_site','signature_site']){
  const html=pages.find(x=>x.path===`/checkout/${id.replaceAll('_','-')}/`).body;
  const milestones=projectMilestones(offers,{offerId:id,compact:true});
  assert.ok(html.includes(milestones));
  for(const payment of offers[id].payment_schedule)assert.ok(milestones.includes(`${money(payment.amount)} · ${payment.percent}%`));
  for(const approval of ['written proposal approval','written design approval','written working-site approval, before launch'])assert.ok(milestones.includes(approval));
  assert.match(html,/base-package payments; selected additions and their combined total appear in the form/);
 }
 assert.equal(JSON.stringify(offers),before);
 for(const id of ['website_baseline','audit_fix_sprint','keep_running','improve','grow'])assert.throws(()=>projectMilestones(offers,{offerId:id}),/only apply to website builds/);
});

test('conditional calendar examples stay visible and original process bookmarks remain unique',()=>{
 const html=websiteProcess(config,offers);
 for(let i=1;i<=6;i++)assert.equal((html.match(new RegExp(`id="process-stage-${i}"`,'g'))||[]).length,1);
 assert.ok(html.indexOf('class="timing-total"')<html.indexOf('<details'));
 for(const phrase of ['13–15 business days','15–18','17–20','after your agreed inputs are ready','access, decisions and extra work can move the launch date','Silence is never approval and does not trigger a payment'])assert.ok(html.includes(phrase));
 assert.match(html,/written proposal|proposal confirms the dates/);
});
