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

test('closed annual gate removes enrollment marketing while preserving existing agreement rights', () => {
 const closed = structuredClone(offers);
 closed.annual_enrollment_gate.verified = false;
 const before = JSON.stringify(closed);
 const packs = buyerPacks(closed);
 for (const id of ['keep_running', 'improve', 'grow']) {
  const pack = packs.find(p => p.id === id);
  assert.equal(pack.annual, undefined);
  assert.equal(pack.baselineFee, 399);
  assert.doesNotMatch(packBody(pack), /Save \$|Annual prepayment|Available on request|annual option/i);
  assert.match(packBody(pack), /href="\/payments\/"/);
  assert.match(paymentContent(config, closed), /within ten business days/);
  assert.match(paymentContent(config, closed), /Undisputed unearned amounts/);
  assert.match(paymentContent(config, closed), /refund the full annual service payment/);
  assert.match(paymentContent(config, closed), /no automatic annual charge/);
  assert.match(paymentContent(config, closed), /unfinished work owed under your accepted project agreement/);
 }
 assert.doesNotMatch(buyerPackSection(closed), /annual prepayment/i);
 assert.doesNotMatch(paymentContent(config, closed), /Annual prepayment|\$1,710|\$4,560|\$9,120/);
 assert.match(paymentContent(config, closed), /existing accepted annual agreement/);
 assert.equal(JSON.stringify(closed), before);
 const open = structuredClone(closed);
 open.annual_enrollment_gate.verified = true;
 assert.equal(buyerPacks(open).find(p => p.id === 'keep_running').annual.upfront_price, 1710);
 assert.match(paymentContent(config, open), /\$1,710/);
});

test('monthly documents distinguish ongoing care, main improvements and Grow-only extra work', () => {
 const packs = buyerPacks(offers);
 const keep = text(packs.find(p => p.id === 'keep_running'));
 const improve = text(packs.find(p => p.id === 'improve'));
 const grow = text(packs.find(p => p.id === 'grow'));
 assert.match(keep, /Keep Running does not include an SEO improvement/);
 assert.match(keep, /monthly fee covers the agreed checks even without supplied edits/);
 assert.doesNotMatch(keep, /Grow|second accepted improvement|small reuse task|30-day|30 calendar days/);
 assert.doesNotMatch(improve, /second accepted improvement|additional small graphic|30-day|30 calendar days/);
 assert.match(improve, /1 completed improvement/);
 assert.match(improve, /full promotional graphic or newsletter draft and setup can replace an improvement by agreement/);
 assert.match(improve, /20-minute call.*equivalent written review/);
 assert.match(grow, /2 completed related improvements/);
 assert.match(grow, /second accepted improvement.*remain owed/);
 assert.match(grow, /30-minute call.*equivalent written review/);
 for (const pack of packs.filter(p => ['keep_running', 'improve', 'grow'].includes(p.id))) {
  assert.match(text(pack), /CMS, plugin and theme (?:software )?updates, backups and restores, and malware cleanup/);
  assert.doesNotMatch(text(pack), /I can quote these separately|No contract/);
  assert.match(text(pack), /five business days after paid completion or settled cancellation/);
 }
 const table = monthlyScopeTable(offers);
 const row = table.match(/<tr><th scope="row">Extra graphic or newsletter excerpt<\/th>(.*?)<\/tr>/)?.[1];
 assert.equal(row, '<td>Not included</td><td>Not included</td><td>1 extra graphic or short excerpt</td>');
 assert.doesNotMatch(table, /May replace the main improvement/);
});

test('baseline first payments retain supported-site cap and qualified reuse rule', () => {
 const html = paymentContent(config, offers);
 for (const amount of ['$549', '$799', '$1,199']) assert.ok(html.includes(amount), amount);
 const note = baselineEnrollmentNote(offers);
 assert.match(note, /supported existing website with up to 12 agreed main pages/);
 assert.match(note, /when its review is still usable/);
 assert.match(note, /safe and feasible/);
 assert.match(note, /Larger existing sites.*assessment/);
 const changed = structuredClone(offers);
 changed.baseline.one_time_price = 425;
 assert.match(paymentContent(config, changed), /\$575/);
 assert.equal(buyerPacks(changed).find(p => p.id === 'improve').baselineFee, 425);
});

test('build and one-off documents retain actual payment, acceptance and ownership limits', () => {
 const packs = buyerPacks(offers);
 for (const [id, cap, price] of [['launch_site', 6, 1400], ['focused_site', 15, 2350], ['signature_site', 30, 3700]]) {
  const pack = packs.find(p => p.id === id), body = text(pack);
  assert.equal(pack.price, price);
  assert.match(body, new RegExp('Up to ' + cap + ' pages'));
  assert.doesNotMatch(body, /Supplied plain policy pages are separate/);
  assert.match(body, /policy pages.*(?:beyond|outside).*(?:cap|count|limit)/);
  assert.match(body, /completed work and unavoidable approved costs/);
  assert.match(body, /any unearned amount is refunded under your signed agreement/);
  assert.match(body, /Silence.*(?:acceptance|approval)/);
  assert.match(body, /licenses|licences/);
  assert.match(body, /30 calendar days after launch/);
  assert.match(body, /contact-form checks record results, including delivery to the receiving inbox/);
  assert.match(body, /one optional|optional.*call/i);
  assert.doesNotMatch(body, /refund.*within ten business days/i);
  const actual = pack.sections.flatMap(section => section.items);
  for (const stage of offers[id].payment_schedule) assert.ok(actual.some(line => line.includes(money(stage.amount)) && line.includes(stage.event) && line.includes(stage.percent + '%')));
 }
 for (const id of ['website_baseline', 'audit_fix_sprint']) {
  const body = text(packs.find(p => p.id === id));
  assert.doesNotMatch(body, /twelve hypothetical hosting|\$759|\$1,110.*hosting/);
  assert.match(body, /approved unavoidable third-party costs/);
  assert.match(body, /unearned amount to be refunded/);
  assert.match(body, /30 calendar days after your written approval of its completion/);
 }
 assert.match(text(packs.find(p => p.id === 'audit_fix_sprint')), /up to two agreed small fixes in total; this is not a Baseline fix plus two more/);
});

test('process and handoff avoid stale schedules and premature final-payment trigger', () => {
 const calendar = projectCalendar(), handoff = sourceHandoff();
 assert.match(calendar, /3–5 business days for Launch, 5–8 business days for Focused and 7–10 business days for Signature/);
 assert.match(calendar, /I write the content/);
 assert.match(calendar, /Add your review time: two rounds, each allowing up to five business days/);
 assert.match(calendar, /Missing information or extra work can move them; I agree any revised dates with you/);
 assert.doesNotMatch(calendar, /April|2027|four working weeks|ten production days/);
 assert.match(handoff, /five business days after the paid work is finished, or after settling the account if the project stops early/);
 assert.doesNotMatch(handoff, /five business days.*final payment/);
 assert.match(handoff, /no drag-and-drop editor/);
 assert.match(handoff, /ZIP does not transfer them automatically/);
 assert.match(handoff, /21190e9af341b6e889c9581debe456423b2a99d93728a579aade1dabb61650c0/);
});

test('examples use current limits and do not imply included production commerce', async () => {
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
