import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
const hours = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const round = value => Math.round((value + Number.EPSILON)*100)/100;
const after = (date, days) => new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const monday = date => after(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));

// A view of the existing capacity worksheet. Never books work or changes a board.
// Dated allocations avoid prorating a cross-month week or counting recovery twice.
export function capacityCalendar(input) {
  const issues = [], weeks = [], months = new Map(), dates = new Set(), ids = new Map();
  const issue = (code, reference) => issues.push({code,reference});
  const sourceWeeks = Array.isArray(input.weeks) ? input.weeks : [];
  if (!sourceWeeks.length) issue('actual-dated-weeks-required','weeks');
  if (input.booking_inputs?.actual_calendar_confirmed !== true) issue('actual-calendar-unconfirmed','booking_inputs.actual_calendar_confirmed');
  if (input.booking_inputs?.correction_tail_confirmed !== true) issue('correction-tails-unconfirmed','booking_inputs.correction_tail_confirmed');
  for (const [index,week] of sourceWeeks.entries()) {
    const ref = `weeks[${index}]`, start = week.week_start;
    if (!validDate(start) || monday(start) !== start) { issue('week-start-must-be-valid-monday',ref); continue; }
    if (dates.has(start)) { issue('duplicate-week',start); continue; }
    dates.add(start);
    const required = ['available_hours','studio_hours','sales_hours','admin_hours'];
    if (required.some(k=>!hours(week[k]))) { issue('missing-or-invalid-week-hours',ref); continue; }
    const available = Math.min(60,week.available_hours);
    const nonclient = week.studio_hours+week.sales_hours+week.admin_hours;
    if (nonclient > available) issue('nonclient-work-exceeds-week-availability',start);
    const potential = Math.max(0,available-nonclient), reserve = potential*.2, bookable = Math.min(24,potential*.8);
    let planned = 0, actual = 0, unexpected = 0;
    const slots = week.dated_stage_slots;
    if (!Array.isArray(slots)) issue('dated-stage-slots-required',ref);
    for (const [slotIndex,slot] of (Array.isArray(slots)?slots:[]).entries()) {
      const slotRef = `${ref}.dated_stage_slots[${slotIndex}]`;
      if (!slot || typeof slot !== 'object' || typeof slot.id !== 'string' || !slot.id.trim() || !validDate(slot.date) || monday(slot.date) !== start || !['planned_hours','actual_hours','unexpected_hours'].every(k=>hours(slot[k])) || typeof slot.source_reference !== 'string' || !slot.source_reference.trim()) { issue('invalid-or-undated-allocation',slotRef); continue; }
      if (ids.has(slot.id)) { issue('duplicate-allocation-id',slot.id); continue; }
      ids.set(slot.id,slot);
      planned += slot.planned_hours; actual += slot.actual_hours; unexpected += slot.unexpected_hours;
      const month = slot.date.slice(0,7), totals = months.get(month) || {calendar_month:month,planned_client_hours:0,actual_client_hours:0,unexpected_client_hours:0,total_client_hours:0};
      totals.planned_client_hours += slot.planned_hours;
      totals.actual_client_hours += slot.actual_hours;
      totals.unexpected_client_hours += slot.unexpected_hours;
      // Actual is observed work against this allocation (exclusive of unexpected).
      // Max keeps future commitments and overruns without adding actual to plan twice.
      totals.total_client_hours += Math.max(slot.planned_hours,slot.actual_hours)+slot.unexpected_hours;
      months.set(month,totals);
    }
    const total = (Array.isArray(slots)?slots:[]).filter(s=>s && ids.get(s.id)===s).reduce((sum,s)=>sum+Math.max(s.planned_hours,s.actual_hours)+s.unexpected_hours,0);
    if (planned > bookable+1e-8) issue('planned-work-exceeds-week-limit',start);
    if (nonclient+total > available+1e-8) issue('total-work-exceeds-week-availability',start);
    if (week.known_activation_exit_hours_included_once !== true) issue('activation-exit-accounting-unconfirmed',start);
    for (const [key,value] of [['planned_client_hours',planned],['actual_client_hours',actual],['unexpected_client_hours',unexpected]]) {
      if (week[key] != null && (!hours(week[key]) || Math.abs(week[key]-value)>.005)) issue('week-summary-disagrees-with-dated-allocations',`${start}.${key}`);
    }
    weeks.push({week_start:start,reported_available_hours:week.available_hours,effective_available_hours:available,nonclient_hours:round(nonclient),bookable_hours:round(bookable),unexpected_reserve_hours:round(reserve),planned_client_hours:round(planned),actual_client_hours:round(actual),unexpected_client_hours:round(unexpected),total_client_hours:round(total)});
  }
  const calendarMonths = [...months.values()].sort((a,b)=>a.calendar_month.localeCompare(b.calendar_month));
  for (const month of calendarMonths) {
    if (month.planned_client_hours>96+1e-8) issue('planned-calendar-month-exceeds-96h',month.calendar_month);
    if (month.total_client_hours>120+1e-8) issue('total-calendar-month-exceeds-120h',month.calendar_month);
    for (const k of Object.keys(month).filter(k=>k.endsWith('_hours'))) month[k]=round(month[k]);
  }
  for (const supplied of input.calendar_months || []) {
    const derived = calendarMonths.find(m=>m.calendar_month===supplied.calendar_month);
    if (!derived || ['planned_client_hours','total_client_hours'].some(k=>!hours(supplied[k]) || Math.abs(supplied[k]-derived[k])>.005)) issue('month-summary-disagrees-with-dated-allocations',supplied.calendar_month);
  }
  const commitments = input.build_commitments;
  if (!Array.isArray(commitments)) issue('build-commitments-list-required','build_commitments');
  for (const [i,commitment] of (Array.isArray(commitments)?commitments:[]).entries()) {
    const ref = `build_commitments[${i}]`;
    if (!validDate(commitment.launch_date)) { issue('valid-launch-date-required',ref); continue; }
    const end = after(commitment.launch_date,30);
    if (commitment.correction_tail_end !== end) issue('correction-tail-must-extend-30-calendar-days',ref);
    for (let week = monday(commitment.launch_date); week <= monday(end); week=after(week,7)) {
      if (!weeks.some(w=>w.week_start===week)) issue('missing-week-through-correction-tail',week);
    }
    if (!Array.isArray(commitment.correction_slot_ids) || !commitment.correction_slot_ids.length) issue('dated-correction-allocation-required',ref);
    for (const id of commitment.correction_slot_ids || []) {
      const slot=ids.get(id);
      if (!slot || slot.kind!=='correction' || slot.job_id!==commitment.job_id || slot.date<commitment.launch_date || slot.date>end || slot.planned_hours<=0) issue('invalid-correction-allocation',id);
    }
  }
  return {status:issues.length?'hold-capacity-commitment':'ready-for-human-capacity-review',weeks,calendar_months:calendarMonths,issues,automatic_booking:false,remaining_gates:['Cash floor and unearned obligations','Dated capability evidence and scope acceptance','Actual review/launch time slots and staffed recovery window'],accounting:'Observed actual hours replace planned hours per allocation when larger; unexpected recovery is separate. Calendar-month totals use actual dates. 60 total/week, 24 planned client/week, 96 planned client/month and 120 all client/month remain outer guards.'};
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { const input=JSON.parse(await readFile(resolve(process.argv[2]||'operations/capacity-worksheet.json'),'utf8')); const result=capacityCalendar(input); console.log(JSON.stringify(result,null,2)); if(result.issues.length) process.exitCode=1; }
  catch(error) { console.error(error.message); process.exitCode=1; }
}
