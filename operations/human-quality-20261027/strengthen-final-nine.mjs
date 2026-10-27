import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',target=root+'/research/final-nine-repair.json';
assert(!fs.existsSync(target));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const files=[1,2,3,4,5,6].map(partition=>({partition,file:`${root}/drafts/local-${partition}.jsonl`,rows:fs.readFileSync(`${root}/drafts/local-${partition}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse)}));
const edits=[];
function edit(route,change){const f=files.find(f=>f.rows.some(d=>d.route===route)),d=f.rows.find(d=>d.route===route),before=structuredClone(d);change(d);assert.equal(d.inputHash,before.inputHash);edits.push({route,partition:f.partition,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d),requiredFixes:['Strengthen practical task clarity with an explicit worked example; preserve factual and commercial limits.']});}
edit('/areas/greene-county/',d=>{
 d.decisions[1]={label:'Show what happens when a notice expires',body:'Fictional notice: “Tomatoes available Friday afternoon; check with the stand before a special trip.” Put the actual publication date beside it. When that notice expires, remove it or replace it with approved wording; keep tomatoes in the seasonal crop list if that remains accurate. An expired highlight should not silently become today’s stock promise.'};
 d.ownerInputs[0]='Approved crop list and one current notice with its publication and removal dates.';
 d.limits='A dated notice can clarify a visit without measuring stock. Live inventory, preorders and automated feeds require separate scope; the care FAQ below explains how ordinary updates are arranged.';
});
edit('/areas/iowa/wapello-county/',d=>{
 d.customerQuestion='We expect eighty people for a talk and a meal. What should our venue inquiry say?';
 d.decisions[0]={label:'Describe the layout change',body:'Fictional inquiry: eighty guests need a seated presentation followed by a meal. State whether people can move to another room or whether the same room must change from audience seating to tables. Eighty is an example, not a published room capacity. Bridge View Center’s theater, meeting rooms and exposition hall need their own approved layout and capacity checks.'};
 d.decisions[2]={label:'Send one workable event outline',body:'For that example, send the preferred date, talk and meal times, eighty-person estimate, and whether a room change is acceptable. Add food requirements for the catering conversation. Staff can then assess a room plan and customized menu without the organizer uploading a complete request for proposals. A shared attendance number alone leaves the transition unresolved.'};
});
edit('/areas/kansas/cloud-county/',d=>{
 d.decisions[2]={label:'Turn the first response into a research question',body:'Fictional example: the free check finds a rider’s name, but leaves their arrival location unanswered. The next request can quote the earlier response and ask specifically about that location, identifying sources already checked. Staff can decide whether a separate paid commission fits. This is a sample question, not a historical finding or a promise of further evidence. FamilySearch links lead to an external resource.'};
 d.ownerInputs[2]='Historical identifiers, the earlier response and a precise unanswered question; agree a later route for supporting documents.';
});
edit('/areas/kansas/ellsworth-county/',d=>{
 d.decisions[2]={label:'Separate a meeting package from meals and lodging',body:'Fictional request: a one-day meeting needs the listed setup, drinks and supplies, plus lunch and six overnight guest rooms. Put lunch in the meal request and send the six-room requirement through the accommodation route; neither becomes included merely because the meeting package is selected. These are invented planning quantities, not a room-capacity or availability claim. Ask staff to confirm each part before accepting the arrangement.'};
 d.ownerInputs[2]='Separate meal and overnight-room requests, with the responsible contact for each.';
});
edit('/areas/kansas/grant-county/',d=>{
 d.decisions[1]={label:'Describe the display without choosing plants automatically',body:'Fictional first message: “I own two matching planters, want them to look like a pair at the entrance, and would like to discuss flowers.” Add each container’s dimensions and any differences the customer can describe. Two is an example, not a service minimum. Staff can ask about the setting and assess suitable plants; a matching appearance does not prove the containers need identical planting.'};
 d.ownerInputs[0]='Each owned container’s dimensions and reference details, plus whether the customer wants matching or different displays.';
});
edit('/areas/kansas/greenwood-county/',d=>{
 d.decisions[1]={label:'Make the year and purpose visible before opening',body:'Illustrative link labels: “2025 auction results — archive” and “Request the current sale book.” The year is a fictional labeling example, not a report of a particular sale. A buyer looking at an old lot should see its historical status before following the current availability contact. Give private-treaty inquiries their own link rather than routing them through the archived auction report.'};
 d.ownerInputs[1]='Dated catalogs and reports, with each link marked current information or historical results.';
});
edit('/areas/kansas/haskell-county/',d=>{
 d.decisions[0]={label:'Offer two clear starting points',body:'Fictional inquiry A: “We have a proposed livestock site but no survey or plans; we want to discuss the planning work.” Inquiry B: “Our architect has drawings; we want to discuss site preparation from those plans.” Both can name the site and intended use without inventing excavation quantities. The first asks about developing information; the second identifies an existing design and professional contact.'};
 d.decisions[2]={label:'Keep the existing designer in the conversation',body:'For inquiry B, identify the current drawing revision and the architect or designer responsible for questions. Ask how the contractor wants to receive the plans later and which work it is being asked to price. A question about a drawing should reach the responsible professional; it should not silently turn into permission to redesign or start construction.'};
});
edit('/areas/kansas/stanton-county/',d=>{
 d.customerQuestion='I want to tour long-term care. Should I use the clinic appointment number or patient visiting hours?';
 d.decisions[1]={label:'Follow the tour route before planning arrival',body:'Worked administrative example: a relative wants a long-term-care tour and sees hospital visiting hours. Those hours describe patient visits; they do not confirm that a tour is arranged. Use the separately published tour extension to ask about a suitable time. The family-practice appointment route serves a different purpose. This example adds no new hours or promise that staff can give a tour on arrival.'};
});
edit('/areas/texas/knox-county/',d=>{
 d.customerQuestion='The page says MRI every other Saturday. Does that confirm an appointment this Saturday?';
 d.decisions[1]={label:'Distinguish a recurring pattern from a confirmed visit',body:'No: “every other Saturday” does not identify the next date, an available slot or walk-in permission. A useful administrative question is: “Which scheduled MRI date has been confirmed for my visit, and where will the authorized team send preparation instructions?” The staff confirmation must supply the actual date and next step. This example does not choose a test, assess urgency or establish clinical availability.'};
 d.sourceBridge='Knox County Hospital District distinguishes normal radiology hours, after-hours on-call provision and recurring mobile imaging schedules. The example uses those different schedule types to show why a calendar pattern needs a separate appointment confirmation.';
});
assert.equal(edits.length,9);
for(const f of files)if(edits.some(e=>e.partition===f.partition))fs.writeFileSync(f.file,f.rows.map(JSON.stringify).join('\n')+'\n');
fs.writeFileSync(target,JSON.stringify({date:'2026-10-27',status:'implemented-pending-independent-recheck',routes:edits.map(e=>e.route),drafts:edits,records:[],faqs:[],limits:'Existing verified factual scope unchanged. Worked examples are illustrative, with no new provider terms, dates, capacities or clinical advice. Final ratings remain for independent review.'},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/final-nine-repair-routes.json',JSON.stringify(edits.map(e=>e.route),null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({drafts:9,records:0,faqs:0,imported:false}));
