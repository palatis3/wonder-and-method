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
 for(const id of ['launch_site','focused_site','business_site','signature_site','storefront']){
  const html=pages.find(x=>x.path===`/checkout/${id.replaceAll('_','-')}/`).body;
  const milestones=projectMilestones(offers,{offerId:id,compact:true});
  assert.ok(milestones.includes('project-milestones'));
  for(const payment of offers[id].payment_schedule){assert.ok(milestones.includes(`${money(payment.amount)} · ${payment.percent}%`));assert.ok(html.includes(`${money(payment.amount)} · ${payment.percent}%`));assert.ok(html.includes(payment.event));}
  for(const approval of ['written proposal approval','written design approval','written working-site approval, before launch'])assert.ok(milestones.includes(approval));
  assert.match(html,/proposal confirms the scope/);assert.match(html,/nothing is booked or charged/i);
 }
 assert.equal(JSON.stringify(offers),before);
 for(const id of ['website_baseline','audit_fix_sprint','keep_running','improve','local_focus','grow','brand_message','local_presence','workflow','systems'])assert.throws(()=>projectMilestones(offers,{offerId:id}),/only apply to website builds/);
});

test('build and review time stay visible, with detailed calendar examples and original bookmarks',()=>{
 const html=websiteProcess(config,offers);
 for(let i=1;i<=6;i++)assert.equal((html.match(new RegExp(`id="process-stage-${i}"`,'g'))||[]).length,1);
 assert.ok(html.indexOf('<strong>Your review time:</strong>')<html.indexOf('<details'));assert.match(html,/two business days/i);assert.match(html,/included/i);assert.doesNotMatch(html,/Up to 5 business days|windows are added|allows up to five business days/);
 for(const phrase of ['5–10 business days','2–3 weeks','3–4 weeks','4–6 weeks','Silence is never approval and does not trigger a payment'])assert.ok(html.includes(phrase));
 assert.match(html,/written proposal|proposal confirms the dates/);
});
