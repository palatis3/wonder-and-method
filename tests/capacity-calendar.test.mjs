import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityCalendar} from '../scripts/capacity-calendar.mjs';

const slot = (date,id='slot',plan=20,actual=0,unexpected=0) => ({id,date,job_id:'SYNTHETIC',kind:'delivery',planned_hours:plan,actual_hours:actual,unexpected_hours:unexpected,source_reference:'SYNTHETIC receipt allocation'});
const week = (start,slots=[]) => ({week_start:start,available_hours:60,studio_hours:15,sales_hours:8,admin_hours:7,dated_stage_slots:slots,known_activation_exit_hours_included_once:true});
const sheet = weeks => ({weeks,build_commitments:[],calendar_months:[],booking_inputs:{actual_calendar_confirmed:true,correction_tail_confirmed:true}});
const codes = result => result.issues.map(i=>i.code);

test('blank calendar cannot authorize booking; reported 80 hours retains the 60-hour guard',()=>{
  assert.equal(capacityCalendar({}).status,'hold-capacity-commitment');
  const row=week('2026-10-26',[slot('2026-10-26','a',24)]);row.available_hours=80;row.studio_hours=35;
  const result=capacityCalendar(sheet([row]));
  assert.equal(result.weeks[0].effective_available_hours,60);
  assert.equal(result.weeks[0].bookable_hours,8);
  assert.ok(codes(result).includes('planned-work-exceeds-week-limit'));
  assert.equal(result.automatic_booking,false);
});

test('cross-month weeks assign hours to actual dates and do not double-count actual against plan',()=>{
  const result=capacityCalendar(sheet([week('2026-10-26',[slot('2026-10-30','a',10,12,1),slot('2026-11-01','b',10,8,2)])]));
  assert.equal(result.status,'ready-for-human-capacity-review');
  assert.deepEqual(result.calendar_months.map(m=>[m.calendar_month,m.planned_client_hours,m.total_client_hours]),[['2026-10',10,13],['2026-11',10,12]]);
  assert.equal(result.weeks[0].total_client_hours,25);
});

test('five individually compliant weeks can still exceed calendar-month planned cap',()=>{
  const starts=['2026-10-26','2026-11-02','2026-11-09','2026-11-16','2026-11-23'];
  const dates=['2026-11-01','2026-11-02','2026-11-09','2026-11-16','2026-11-23'];
  const result=capacityCalendar(sheet(starts.map((s,i)=>week(s,[slot(dates[i],'s'+i)]))));
  assert.ok(codes(result).includes('planned-calendar-month-exceeds-96h'));
  assert.ok(!codes(result).includes('planned-work-exceeds-week-limit'));
});

test('observed recovery and overruns count toward 120-hour calendar-month guard',()=>{
  const result=capacityCalendar(sheet(['2026-11-02','2026-11-09','2026-11-16','2026-11-23'].map((s,i)=>week(s,[slot(s,'s'+i,20,26,5)]))));
  assert.ok(codes(result).includes('total-calendar-month-exceeds-120h'));
  assert.ok(codes(result).includes('total-work-exceeds-week-availability'));
});

test('missing tail weeks block a build even beyond the visible delivery horizon',()=>{
  const input=sheet([week('2026-10-26',[{...slot('2026-10-30','tail',2),kind:'correction'}])]);
  input.build_commitments=[{job_id:'SYNTHETIC',launch_date:'2026-10-28',correction_tail_end:'2026-11-27',correction_slot_ids:['tail']}];
  assert.ok(codes(capacityCalendar(input)).includes('missing-week-through-correction-tail'));
  input.weeks.push(...['2026-11-02','2026-11-09','2026-11-16','2026-11-23'].map(s=>week(s)));
  assert.equal(capacityCalendar(input).status,'ready-for-human-capacity-review');
  input.build_commitments[0].correction_slot_ids=['unknown'];
  assert.ok(codes(capacityCalendar(input)).includes('invalid-correction-allocation'));
});

test('bad dates, duplicate IDs, omitted hours and stale handwritten totals hold the decision',()=>{
  const input=sheet([week('2026-10-26',[slot('2026-10-26'),slot('2026-10-27'),slot('2026-02-30','bad'),{...slot('2026-10-28','missing'),actual_hours:null}])]);
  input.weeks[0].planned_client_hours=0;
  input.calendar_months=[{calendar_month:'2026-10',planned_client_hours:0,total_client_hours:0}];
  const result=capacityCalendar(input);
  for(const code of ['duplicate-allocation-id','invalid-or-undated-allocation','week-summary-disagrees-with-dated-allocations','month-summary-disagrees-with-dated-allocations']) assert.ok(codes(result).includes(code),code);
  assert.equal(result.calendar_months[0].planned_client_hours,20);
});
