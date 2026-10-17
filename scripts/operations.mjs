import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Offline decision aids only. No provider SDK, messages, charges or production release.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const present = value => value !== null && value !== undefined && value !== '';
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
const exactTime = value => typeof value === 'string' && /(?:[+-]\d{2}:\d{2}|Z)$/.test(value) && Number.isFinite(Date.parse(value));
export const phases = ['Fit', 'Quote and book', 'Design and build', 'Approve and launch', 'Correct and hand over', 'Optional service'];

export function capacity(week) {
  const keys = ['available_hours', 'studio_hours', 'sales_hours', 'admin_hours', 'planned_client_hours'];
  const missing = keys.filter(key => !nonnegative(week[key]));
  if (missing.length) return { status: 'pending', missing };
  const potential = Math.max(0, week.available_hours - week.studio_hours - week.sales_hours - week.admin_hours);
  const reserve = money(potential * 0.2);
  const bookable = money(Math.min(24, potential * 0.8));
  return { status: week.planned_client_hours <= bookable ? 'within-week-limit' : 'overbooked', potential_client_hours: potential, unexpected_reserve_hours: reserve, bookable_hours: bookable, remaining_hours: money(bookable - week.planned_client_hours), remaining_gates: ['Check actual dated stage peaks and correction tails', 'Check calendar-month planned <=96 and total client <=120 hours', 'Confirm cash and relevant capability evidence'] };
}

export function cash(month) {
  const keys = ['opening_cash', 'minimum_balance', 'actual_receipts', 'cash_costs', 'tax_reserve_transfer', 'owner_draw', 'unearned_obligations_reserve'];
  const missing = keys.filter(key => !nonnegative(month[key]));
  if (missing.length) return { status: 'pending', missing };
  const ending = money(month.opening_cash + month.actual_receipts - month.cash_costs - month.tax_reserve_transfer - month.owner_draw);
  const headroom = money(ending - month.unearned_obligations_reserve - month.minimum_balance);
  return { status: headroom < 0 ? 'below-reserve-floor' : 'within-entered-reserve-floor', ending_cash_after_outflows_and_tax_transfer: ending, unearned_obligations_reserve: month.unearned_obligations_reserve, headroom, note: 'Planning snapshot from existing invoice/bookkeeping records; not a second payment ledger. No founder hourly cost deducted from bank cash. Unknown or future receipts are not cash.' };
}

export function gate(stage, evidence) {
  const requirements = {
    'Fit': ['buyer_job_known', 'editing_fit_confirmed', 'offer_fit_confirmed'],
    'Quote and book': ['written_scope', 'named_approver', 'ready_inputs', 'mandatory_bills_resolved', 'capability_evidence', 'dated_capacity_with_correction_tail', 'cash_checked', 'booking_payment_confirmed'],
    'Design and build': ['approved_facts_and_rights', 'approved_direction', 'founder_integration_review'],
    'Approve and launch': ['exact_version_written_acceptance', 'agreed_payment_confirmed', 'all_scope_checks_passed', 'actual_provider_and_inbox_receipt', 'no_critical_accessibility_barrier', 'facts_and_licenses_cleared', 'staging_and_secrets_safe', 'tested_rollback', 'client_owned_accounts', 'staffed_launch_window'],
    'Correct and hand over': ['paid_source_and_inventory_delivered', 'client_access_verified', 'operating_notes_delivered', 'defect_owners_and_dates', 'remaining_obligations_recorded'],
    'Optional service': ['service_useful_and_approved', 'supported_stack', 'terms_and_renewal_confirmed', 'coverage_or_search_task_confirmed', 'capacity_confirmed']
  };
  if (!requirements[stage]) throw new Error('Unknown phase');
  const missing = requirements[stage].filter(key => evidence[key] !== true);
  return { stage, status: missing.length ? 'blocked' : 'ready-for-human-decision', missing, automatic_action: false };
}

export function changeDecision(change) {
  if (change.is_accepted_scope_defect === true) return { action: 'correct-under-existing-scope', extra_invoice: false };
  const keys = ['deliverable', 'acceptance_test', 'fee', 'date_effect', 'written_approval_reference'];
  const missing = keys.filter(key => !present(change[key]));
  return { action: missing.length ? 'hold-extra-work' : 'ready-for-approved-change', missing, automatic_invoice: false };
}

export function incidentDecision(incident) {
  const keys = ['first_seen', 'impact', 'owner', 'last_good_release', 'provider_findings', 'form_findings', 'dns_findings', 'current_action', 'client_notice_reference', 'next_update'];
  return { action: 'verify-notify-route', missing: keys.filter(key => !present(incident[key])), release_blocked: incident.critical === true, restoration_deadline: null, repair: incident.build_defect_in_correction_window === true ? 'covered-build-defect' : 'separately-quote-repair-if-needed', note: 'Record actions in the cumulative receipt. Care incident triage is not unlimited repair; a notice reference records a human action, it does not send one.' };
}

// Date-only local business calendar. Holidays/closures must be supplied for the contract timezone.
export function businessDaysBefore(date, count, closures = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(count) || count < 0) throw new Error('Use an ISO local date and nonnegative integer count');
  const d = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== date) throw new Error('Invalid calendar date');
  while (count > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    const iso = d.toISOString().slice(0, 10);
    if (![0, 6].includes(d.getUTCDay()) && !closures.includes(iso)) count--;
  }
  return d.toISOString().slice(0, 10);
}

export function renewalDecision(service) {
  // Honoring a cancellation does not depend on enrollment/calendar readiness.
  if (present(service.cancellation_received_at)) {
    const missing = [];
    if (!['care', 'search'].includes(service.service)) missing.push('supported_service');
    if (!exactTime(service.renewal_timestamp)) missing.push('valid_exact_renewal_timestamp');
    if (missing.length) return { action: 'hold-enrollment-or-renewal', missing, automatic_charge: false };
    if (!exactTime(service.cancellation_received_at)) return { action: 'hold-for-valid-cancellation-time', automatic_charge: false };
    if (Date.parse(service.cancellation_received_at) < Date.parse(service.renewal_timestamp)) return { action: 'stop-next-renewal', service_through: service.paid_period_end ?? null, preserve_paid_site: true, automatic_charge: false };
    return { action: 'review-current-cycle-and-stop-future-renewals', preserve_paid_site: true, automatic_charge: false };
  }
  const required = ['service', 'renewal_timestamp', 'timezone', 'renewal_local_date', 'written_cancellation_route'];
  const missing = required.filter(key => !present(service[key]));
  if (!['care', 'search'].includes(service.service)) missing.push('supported_service');
  if (!Array.isArray(service.closures)) missing.push('confirmed_closures');
  if (service.business_calendar_confirmed !== true) missing.push('business_calendar_confirmed');
  if (!/[+-]\d{2}:\d{2}$|Z$/.test(service.renewal_timestamp ?? '') || !Number.isFinite(Date.parse(service.renewal_timestamp))) missing.push('valid_exact_renewal_timestamp');
  if (!missing.length) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: service.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(service.renewal_timestamp));
      const part = type => parts.find(p => p.type === type).value;
      if (`${part('year')}-${part('month')}-${part('day')}` !== service.renewal_local_date) missing.push('matching_local_renewal_date');
    } catch { missing.push('valid_timezone'); }
  }
  if (missing.length) return { action: 'hold-enrollment-or-renewal', missing, automatic_charge: false };
  const due = businessDaysBefore(service.renewal_local_date, 5, service.closures);
  if (service.service === 'search' && !(service.useful_task_approved === true && service.required_inputs_ready === true)) {
    return { action: service.charged === true ? (service.work_begun === true ? 'itemize-work-and-reconcile-unearned-remainder' : 'customer-chooses-refund-or-credit') : 'pause-next-invoice', task_approval_due_local_date: due, automatic_charge: false };
  }
  if (service.service === 'search' && (!validDate(service.task_approved_local_date) || !validDate(service.inputs_ready_local_date) || service.task_approved_local_date > due || service.inputs_ready_local_date > due)) return { action: 'pause-next-invoice-until-dated-task-review', task_approval_due_local_date: due, automatic_charge: false, note: 'Missing, invalid or late approval/input evidence cannot establish the five-business-day renewal gate. A human must agree the next cycle.' };
  if (service.service === 'care' && !(service.actual_coverage_confirmed === true && service.alert_recipient_confirmed === true && service.escalation_confirmed === true)) return { action: 'hold-renewal-and-agree-coverage-adjustment', automatic_charge: false };
  return { action: 'ready-for-human-renewal-review', task_approval_due_local_date: service.service === 'search' ? due : null, automatic_charge: false, note: 'Check recorded approval/input dates against the deadline. Care checks continue through paid periods even without an edit; no unused edit rollover.' };
}

export function cancellationDecision(record) {
  const keys = ['signed_terms_reference', 'dated_work_ledger_reference', 'approved_committed_costs_reference', 'payments_reference', 'paid_materials_inventory_reference'];
  const missing = keys.filter(key => !present(record[key]));
  return { action: missing.length ? 'prepare-reconciliation' : 'human-reconcile-under-signed-terms', missing, stop_future_renewal: true, preserve_paid_site_and_accounts: true, handoff_within_business_days: 5, routine_handoff_included: true, new_migration_separate: true, remaining_actions: ['Identify unfinished and unpaid material', 'Provide paid source/assets/licenses and deploy notes', 'Verify client access/export', 'Remove delegated access after verification', 'Record retention/deletion owner and action'], automatic_refund: false, note: 'Deposits are not automatically earned. Resolve any disputed amounts under the agreement.' };
}

export function rehearse() {
  const service = { service: 'search', renewal_timestamp: '2026-11-02T09:00:00-05:00', timezone: 'America/New_York', renewal_local_date: '2026-11-02', written_cancellation_route: 'SYNTHETIC written route; not an address', closures: [], business_calendar_confirmed: true };
  return {
    status: 'SYNTHETIC ONLY — deterministic local logic rehearsal, not client or provider evidence',
    external_actions: [],
    purchase_to_handoff: phases.map(stage => { const blocked = gate(stage, {}); return { blocked, simulated_complete: gate(stage, Object.fromEntries(blocked.missing.map(key => [key, true]))) }; }),
    scope_change: { unapproved: changeDecision({ deliverable: 'SYNTHETIC extra page' }), approved: changeDecision({ deliverable: 'SYNTHETIC extra page', acceptance_test: 'SYNTHETIC QA', fee: 850, date_effect: 'SYNTHETIC revised date', written_approval_reference: 'SYNTHETIC approval' }), defect: changeDecision({ is_accepted_scope_defect: true }) },
    incident: incidentDecision({ critical: true, first_seen: '2026-10-13T14:00:00Z', impact: 'SYNTHETIC form failure', owner: 'SYNTHETIC founder', last_good_release: 'SYNTHETIC v1', provider_findings: 'SYNTHETIC unavailable', form_findings: 'SYNTHETIC error', dns_findings: 'SYNTHETIC unchanged', current_action: 'SYNTHETIC tested workaround', client_notice_reference: 'SYNTHETIC unsent notice', next_update: '2026-10-13T15:00:00Z' }),
    search_renewal: renewalDecision({ ...service, useful_task_approved: true, required_inputs_ready: true, task_approved_local_date: '2026-10-26', inputs_ready_local_date: '2026-10-26' }),
    search_pause: renewalDecision(service),
    search_unused_charge: renewalDecision({ ...service, charged: true }),
    search_started_charge: renewalDecision({ ...service, charged: true, work_begun: true }),
    care_missing_coverage: renewalDecision({ ...service, service: 'care' }),
    care_renewal: renewalDecision({ ...service, service: 'care', actual_coverage_confirmed: true, alert_recipient_confirmed: true, escalation_confirmed: true }),
    cancellation_before_renewal: renewalDecision({ ...service, cancellation_received_at: '2026-11-02T13:59:59Z' }),
    cancellation_handoff: cancellationDecision({ signed_terms_reference: 'SYNTHETIC terms', dated_work_ledger_reference: 'SYNTHETIC completed work', approved_committed_costs_reference: 'SYNTHETIC costs', payments_reference: 'SYNTHETIC payments', paid_materials_inventory_reference: 'SYNTHETIC inventory' }),
    capacity_overbooked: capacity({ available_hours: 40, studio_hours: 10, sales_hours: 6, admin_hours: 4, planned_client_hours: 17 }),
    cash_below_reserve: cash({ opening_cash: 5000, minimum_balance: 2000, actual_receipts: 3000, cash_costs: 2000, tax_reserve_transfer: 500, owner_draw: 1000, unearned_obligations_reserve: 3000 }),
    limitations: ['No actual customer, payment, inbox receipt or production release', 'No proof of paid demand, profitability, speed or recurring retention', 'Human evidence and dated inputs still required for real commitments']
  };
}

const commands = { capacity, cash, renewal: renewalDecision, change: changeDecision, incident: incidentDecision, cancellation: cancellationDecision };
async function main() {
  const [command, input, output] = process.argv.slice(2);
  if (command === 'rehearse') {
    const rendered = JSON.stringify(rehearse(), null, 2) + '\n';
    if (input) await writeFile(resolve(input), rendered, { flag: 'wx' });
    else process.stdout.write(rendered);
    return;
  }
  if (command === 'init') {
    if (!input) throw new Error('Provide a new local job directory');
    const folder = resolve(input);
    await mkdir(folder, { recursive: true });
    for (const name of ['accepted-scope', 'cumulative-receipt']) {
      await writeFile(resolve(folder, name + '.json'), await readFile(resolve(root, 'operations/templates', name + '.json')), { flag: 'wx' });
    }
    console.log('Created blank scope and receipt. Add a row to the single weekly board; do not store credentials.');
    return;
  }
  if (!input || (!commands[command] && command !== 'gate')) throw new Error('Usage: node scripts/operations.mjs <capacity|cash|renewal|change|incident|cancellation|gate> input.json [output.json]; or init new-job-directory. Offline only.');
  const data = JSON.parse(await readFile(resolve(input), 'utf8'));
  const result = command === 'gate' ? gate(data.stage, data.evidence) : commands[command](data);
  const rendered = JSON.stringify(result, null, 2) + '\n';
  if (output) await writeFile(resolve(output), rendered, { flag: 'wx' });
  else process.stdout.write(rendered);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
