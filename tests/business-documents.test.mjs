import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buyerPacks, packBody, buyerPackSection} from '../src/buyer-packs.mjs';
import {paymentContent} from '../src/payment-content.mjs';
import {monthlyPlanDetails, monthlyScopeTable, baselineEnrollmentNote} from '../src/monthly-content.mjs';
import {projectCalendar, conceptDebrief} from '../src/buyer-experience.mjs';
import {sourceHandoff} from '../src/source-handoff.mjs';
import {money} from '../src/shared.mjs';

const offers = JSON.parse(await readFile(new URL('../config/offers.json', import.meta.url), 'utf8'));
const text = pack => pack.sections.flatMap(s => s.items).join(' ');
const config = {contactEmail: 'support@example.test'};

test('buyer packs expose request actions before the approved scope and exclusions',()=>{
 for(const pack of buyerPacks(offers)){
  const html=packBody(pack),firstSection=html.indexOf('<section>');
  assert.ok(html.indexOf('Request '+pack.name)<firstSection,pack.id);assert.ok(html.indexOf('Ask about '+pack.name)<firstSection,pack.id);
  const limits=pack.sections.filter(section=>section.title==='What is not included?');assert.equal(limits.length,1);
  for(const exclusion of pack.summary.offer.v3.excludes)assert.ok(limits[0].items.includes(exclusion),pack.id+' '+exclusion);
 }
});

test('V3 never opens annual enrollment while existing agreement rights remain available',()=>{
 const before=JSON.stringify(offers);
 for(const enabled of [false,true]){
  const candidate=structuredClone(offers);candidate.annual_enrollment_gate.verified=enabled;
  if(enabled){assert.throws(()=>buyerPacks(candidate),/does not offer new annual enrollment/);continue;}
  for(const pack of buyerPacks(candidate)){assert.equal(pack.annual,undefined);assert.doesNotMatch(packBody(pack),/Annual prepayment|annual option/i);}
  const html=paymentContent(config,candidate);for(const phrase of [/existing accepted annual agreement/i,/Undisputed unearned amounts/,/no automatic annual charge/,/unfinished work owed under your accepted project agreement/])assert.match(html,phrase);
 }
 assert.equal(JSON.stringify(offers),before);
});

test('care onboarding is conditional and separate from the Roadmap diagnostic',()=>{
 const html=paymentContent(config,offers),note=baselineEnrollmentNote(offers);
 assert.match(note,/\$375/);assert.match(note,/\$650/);assert.match(note,/not an automatic enrollment charge/);assert.match(note,/reduces duplicated work/);
 assert.match(html,/\$275/);assert.match(html,/\$450/);
 assert.equal(offers.care_variants.brochure.page_cap,20);assert.equal(offers.care_variants.commerce.product_cap,100);
 for(const pack of buyerPacks(offers).filter(p=>p.summary.monthly)){assert.equal(pack.baselineFee,undefined);assert.match(text(pack),/Eligibility and the exact first invoice are confirmed before payment/);}
});

test('V3 build documents preserve payment, approval, cancellation and handoff conditions',()=>{
 const packs=buyerPacks(offers);
 for(const [id,price] of [['launch_site',2950],['focused_site',4500],['business_site',7500],['signature_site',11500],['storefront',8500]]){
  const pack=packs.find(p=>p.id===id),body=text(pack);assert.equal(pack.price,price);
  for(const pattern of [/40%/,/30%/,/unearned prepaid fees/,/approved nonrecoverable outside expenses/,/platform export limits/,/applicable license and ownership limits/,/Form receipt and confirmation are verified/,/one real editing task/])assert.match(body,pattern,id);
  for(const stage of pack.summary.offer.payment_schedule)assert.ok(body.includes(money(stage.amount))&&body.includes(stage.event),id);
 }
 const roadmap=text(packs.find(p=>p.id==='website_baseline'));assert.match(roadmap,/Repairs or new page production/);
 const repair=text(packs.find(p=>p.id==='audit_fix_sprint'));assert.match(repair,/three bounded fixes/);assert.match(repair,/unchanged accepted deliverables even if I underestimate/);
});

test('process describes approved timing and the source example preserves its own limitations',()=>{
 const calendar=projectCalendar(),handoff=sourceHandoff();
 for(const name of ['Focused Website','Custom Website','Business Custom Website','Signature Custom Website'])assert.ok(calendar.includes(name),name);
 assert.match(calendar,/review|feedback/i);assert.doesNotMatch(calendar,/3–5 business days for Launch Website/);
 assert.match(handoff,/five business days after the paid work is finished, or after settling the account if the project stops early/);
 assert.match(handoff,/This sample shows a source-code website handoff/);assert.match(handoff,/supported visual platforms and custom code have different export and editing limits/);assert.match(handoff,/ZIP does not transfer them automatically/);
 assert.match(handoff,/21190e9af341b6e889c9581debe456423b2a99d93728a579aade1dabb61650c0/);
});

test('archived fictional examples retain their dated limits and do not imply included production commerce', async () => {
 const brief = await readFile(new URL('../src/assets/audit-implementation/illustrative-completed-brief.txt', import.meta.url), 'utf8');
 const report = await readFile(new URL('../src/assets/audit-implementation/work-receipt-template.txt', import.meta.url), 'utf8');
 assert.match(brief, /up to six marketing pages.*example uses three/);
 assert.match(report, /Keep Running \/ Improve \/ Grow/);
 assert.match(report, /Grow only/);
 assert.match(report, /Blank template/);
 const demo = conceptDebrief('hearthside');
 assert.match(demo, /A link to an ordering service you already use can be included/);
 assert.match(demo, /Creating an ordering system or setting up the outside account is separate work/);
 assert.doesNotMatch(demo, /order preview|places no order/);
});

test('payment portal remains unavailable without an approved live destination', () => {
 assert.throws(() => paymentContent({...config, payments: {portalUrl: 'https://billing.stripe.com/p/login/test_fake', status: 'live_verified'}}, offers), /verified live/);
 assert.throws(() => paymentContent({...config, payments: {portalUrl: 'https://billing.stripe.com/p/login/example'}}, offers), /unverified/);
 assert.doesNotMatch(paymentContent(config, offers), /Open billing portal/);
});
