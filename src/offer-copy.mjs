import {isV3,v3Timing} from './v3-offer-content.mjs';
// Current offer explanations; accepted agreements keep their saved terms.
export function websiteDefectSupport(o) {
 if(Number(o.catalog_revision||0)<4)return 'For 30 calendar days after launch, I correct work I built that does not function as agreed, at no charge.';
 const ids=['launch_site','focused_site','business_site','signature_site'];
 const windows=ids.map(id=>`${o[id].defect_days} days for ${o[id].public_name}`);
 return 'The defect-reporting windows after launch are '+windows.slice(0,-1).join(', ')+' and '+windows.at(-1)+'. I correct W&M-caused defects against the accepted scope at no charge. A timely report remains covered until corrected.';
}
export function reviewPageLimits(o) {
 if(isV3(o))return `${o.baseline.public_name} reviews up to ${o.baseline.page_cap} agreed public pages and one inquiry journey; ${o.audit_sprint.public_name} is scoped by up to three named fixes, rather than a full-site page allowance`;
 const a=o.baseline,b=o.audit_sprint;
 return a.page_cap===b.page_cap
  ? `Both cover up to ${a.page_cap} agreed main pages on one website`
  : `${a.public_name} covers up to ${a.page_cap} agreed main pages; ${b.public_name} covers up to ${b.page_cap}, on one website`;
}
export function formFieldLimits(o) {
 const ids=['launch_site','focused_site',...(o.business_site?['business_site']:[]),'signature_site'];
 return new Set(ids.map(id=>o[id].form_field_limit)).size===1
  ? `Forms have up to ${o.launch_site.form_field_limit} agreed fields, one destination and one confirmation.`
  : ids.map(id=>`${o[id].public_name}: up to ${o[id].form_field_limit} agreed fields per form`).join('. ')+'. Each form has one destination and one confirmation.';
}

export function projectTiming(o) {
 if(isV3(o))return v3Timing(o);
 const ids=['launch_site','focused_site',...(o.business_site?['business_site']:[]),'signature_site'];
 const allBusinessDays=ids.every(id=>/ business days$/.test(o[id].delivery_average));
 const ranges=ids.map((id,i)=>o[id].public_name+' '+(i&&allBusinessDays?o[id].delivery_average.replace(/ business days$/,''):o[id].delivery_average));
 return `Planned build work: ${ranges[0]}, ${ranges[1]} and ${ranges[2]}, once your page list, facts, photos and account access are ready. Add your review time: two rounds, each allowing up to five business days. Your proposal confirms the start and launch dates; missing information or extra work can move them.`;
}
export function fullReviewTiming(o) {
 if(isV3(o))return 'Normal two-business-day feedback windows are included in the planned delivery range. We agree longer windows and any change to dates before booking.';
 const ids=['launch_site','focused_site',...(o.business_site?['business_site']:[]),'signature_site'];
 const ranges=ids.map(id=>o[id].delivery_average.match(/^(\d+)[–-](\d+) business days$/));
 if(ranges.some(range=>!range))return 'Add up to ten business days to the listed build-work estimate if you use both full review windows.';
 return 'If you use both full review windows, build and review time is '+ranges.map((r,i)=>`${Number(r[1])+10}–${Number(r[2])+10}${i?'':' business days'} for ${o[ids[i]].public_name}`).join(', ').replace(/, ([^,]+)$/, ' and $1')+'.';
}

export function optionalBuildCall(o) {
 const ids=['launch_site','focused_site',...(o.business_site?['business_site']:[]),'signature_site'];
 return new Set(ids.map(id=>o[id].training_minutes)).size===1
  ? `An optional ${o.launch_site.training_minutes}-minute walkthrough is included.`
  : 'An optional walkthrough is included: '+ids.map(id=>`${o[id].public_name}, up to ${o[id].training_minutes} minutes`).join('; ')+'.';
}
