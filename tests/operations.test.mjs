import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { capacity, cash, gate, phases, changeDecision, incidentDecision, businessDaysBefore, renewalDecision, cancellationDecision } from '../scripts/operations.mjs';

const search = { service: 'search', renewal_timestamp: '2026-11-02T09:00:00-05:00', renewal_local_date: '2026-11-02', timezone: 'America/New_York', written_cancellation_route: 'SYNTHETIC written route', closures: [], business_calendar_confirmed: true, paid_period_end: '2026-11-02T08:59:59-05:00' };

test('purchase to handoff: every gate requires explicit evidence, never silence', () => {
  for (const phase of phases) {
    const blocked = gate(phase, {});
    assert.equal(blocked.status, 'blocked');
    assert.ok(blocked.missing.length > 0);
    const proof = Object.fromEntries(blocked.missing.map(key => [key, true]));
    assert.equal(gate(phase, proof).status, 'ready-for-human-decision');
    proof[blocked.missing[0]] = 'pending';
    assert.equal(gate(phase, proof).status, 'blocked');
  }
  const launch = gate('Approve and launch', {});
  assert.ok(launch.missing.includes('actual_provider_and_inbox_receipt'));
  assert.ok(launch.missing.includes('tested_rollback'));
});
test('scope change: unpaid extra waits for approval; defect is not extra', () => {
  assert.equal(changeDecision({ deliverable: 'new page' }).action, 'hold-extra-work');
  assert.equal(changeDecision({ deliverable: 'page', acceptance_test: 'QA', fee: 850, date_effect: 'later', written_approval_reference: 'SYNTHETIC' }).action, 'ready-for-approved-change');
  assert.deepEqual(changeDecision({ is_accepted_scope_defect: true }), { action: 'correct-under-existing-scope', extra_invoice: false });
});
test('incident blocks critical release; Care triage is not unlimited repair', () => {
  const result = incidentDecision({ critical: true });
  assert.equal(result.release_blocked, true);
  assert.equal(result.restoration_deadline, null);
  assert.ok(result.missing.includes('client_notice_reference'));
  assert.equal(result.repair, 'separately-quote-repair-if-needed');
  assert.equal(incidentDecision({ build_defect_in_correction_window: true }).repair, 'covered-build-defect');
});
test('Search renewal pauses without useful task and inputs; charged cycle allows choice', () => {
  assert.equal(renewalDecision(search).action, 'pause-next-invoice');
  assert.equal(renewalDecision({ ...search, useful_task_approved: true }).action, 'pause-next-invoice');
  assert.equal(renewalDecision({ ...search, useful_task_approved: true, required_inputs_ready: true }).action, 'pause-next-invoice-until-dated-task-review');
  assert.equal(renewalDecision({ ...search, useful_task_approved: true, required_inputs_ready: true, task_approved_local_date: '2026-10-26', inputs_ready_local_date: '2026-10-26' }).action, 'ready-for-human-renewal-review');
  assert.equal(renewalDecision({ ...search, charged: true }).action, 'customer-chooses-refund-or-credit');
  assert.equal(renewalDecision({ ...search, charged: true, work_begun: true }).action, 'itemize-work-and-reconcile-unearned-remainder');
});
test('business dates honor weekend and supplied closures without DST arithmetic drift', () => {
  assert.equal(businessDaysBefore('2026-11-02', 5), '2026-10-26');
  assert.equal(businessDaysBefore('2026-11-02', 5, ['2026-10-30']), '2026-10-23');
  assert.throws(() => businessDaysBefore('2026-02-30', 5));
  assert.equal(renewalDecision({ ...search, renewal_local_date: '2026-11-03' }).action, 'hold-enrollment-or-renewal');
  assert.equal(renewalDecision({ ...search, business_calendar_confirmed: false }).action, 'hold-enrollment-or-renewal');
});
test('Care requires real coverage, recipient and escalation before renewal', () => {
  const care = { ...search, service: 'care' };
  assert.equal(renewalDecision(care).action, 'hold-renewal-and-agree-coverage-adjustment');
  assert.equal(renewalDecision({ ...care, actual_coverage_confirmed: true, alert_recipient_confirmed: true, escalation_confirmed: true }).action, 'ready-for-human-renewal-review');
});
test('cancellation before exact instant stops next invoice and preserves paid work', () => {
  assert.equal(renewalDecision({ ...search, cancellation_received_at: '2026-11-02T13:59:59Z' }).action, 'stop-next-renewal');
  assert.equal(renewalDecision({ ...search, cancellation_received_at: '2026-11-02T14:00:00Z' }).action, 'review-current-cycle-and-stop-future-renewals');
  const result = cancellationDecision({});
  assert.equal(result.preserve_paid_site_and_accounts, true);
  assert.equal(result.handoff_within_business_days, 5);
  assert.equal(result.automatic_refund, false);
  assert.ok(result.missing.includes('dated_work_ledger_reference'));
});

test('cancellation is honored without unrelated calendar or enrollment inputs', () => {
  const minimal = { service: 'search', renewal_timestamp: '2026-11-02T09:00:00-05:00', cancellation_received_at: '2026-11-01T12:00:00Z' };
  assert.equal(renewalDecision(minimal).action, 'stop-next-renewal');
  assert.equal(renewalDecision({ ...minimal, service: 'care' }).action, 'stop-next-renewal');
  assert.equal(renewalDecision({ ...minimal, cancellation_received_at: '2026-11-03T12:00:00Z' }).action, 'review-current-cycle-and-stop-future-renewals');
  assert.equal(renewalDecision({ ...minimal, cancellation_received_at: '2026-11-01T12:00:00' }).action, 'hold-for-valid-cancellation-time');
  assert.equal(renewalDecision({ ...minimal, renewal_timestamp: 'unknown' }).action, 'hold-enrollment-or-renewal');
});
test('capacity uses actual inputs, 20 percent recovery and outer weekly cap', () => {
  assert.equal(capacity({}).status, 'pending');
  assert.equal(capacity({ available_hours: null }).status, 'pending');
  const result = capacity({ available_hours: 40, studio_hours: 10, sales_hours: 6, admin_hours: 4, planned_client_hours: 17 });
  assert.equal(result.bookable_hours, 16);
  assert.equal(result.unexpected_reserve_hours, 4);
  assert.equal(result.status, 'overbooked');
  assert.equal(capacity({ available_hours: 80, studio_hours: 0, sales_hours: 0, admin_hours: 0, planned_client_hours: 25 }).bookable_hours, 24);
});
test('cash separates actual cash and unfinished obligation reserve; null is not zero', () => {
  assert.equal(cash({}).status, 'pending');
  const result = cash({ opening_cash: 5000, minimum_balance: 2000, actual_receipts: 3000, cash_costs: 2000, tax_reserve_transfer: 500, owner_draw: 1000, unearned_obligations_reserve: 3000 });
  assert.equal(result.ending_cash_after_outflows_and_tax_transfer, 4500);
  assert.equal(result.headroom, -500);
  assert.equal(result.status, 'below-reserve-floor');
});
test('actual business records stay empty and configured providers have evidence references', async () => {
  const load = async name => JSON.parse(await readFile(new URL('../operations/' + name, import.meta.url), 'utf8'));
  assert.deepEqual((await load('weekly-board.json')).rows, []);
  assert.deepEqual((await load('capacity-worksheet.json')).weeks, []);
  assert.deepEqual((await load('cash-worksheet.json')).months, []);
  const systems = (await load('business-setup-and-inventory.json')).existing_systems;
  for (const system of Object.values(systems)) {
    if (system.provider === null) {
      assert.equal(system.nonsecret_reference, null);
    } else {
      assert.ok(system.owner, 'A configured provider must have an owner');
      assert.ok(system.nonsecret_reference?.startsWith('evidence/'), 'A configured provider must reference verification evidence');
      // Offline fixture retains only the recorded verification date/method; private provider records are excluded from Git.
      const evidence = JSON.parse(await readFile(new URL('./fixtures/provider-evidence-references.json', import.meta.url), 'utf8'))[system.nonsecret_reference];
      assert.ok(evidence.verified_on && evidence.method);
    }
  }
});
test('all editable JSON files parse, including playbook and synthetic evidence', async () => {
  for (const folder of ['', 'templates/', 'synthetic/']) {
    for (const file of await readdir(new URL('../operations/' + folder, import.meta.url))) {
      if (file.endsWith('.json')) JSON.parse(await readFile(new URL('../operations/' + folder + file, import.meta.url), 'utf8'));
    }
  }
});
