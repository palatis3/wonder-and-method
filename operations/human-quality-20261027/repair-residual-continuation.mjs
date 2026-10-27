// One-use repairs for four specific findings from the current-copy reviews.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=root+'/research/residual-continuation-repair.json';
assert(!fs.existsSync(receiptFile),'Do not repeat this applied repair.');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const partitions=[1,2].map(p=>({p,file:`${root}/drafts/local-${p}.jsonl`,rows:fs.readFileSync(`${root}/drafts/local-${p}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse)}));
const edits=[];
function edit(route,guard,change){
 const group=partitions.find(p=>p.rows.some(d=>d.route===route)),d=group.rows.find(d=>d.route===route),before=structuredClone(d);
 assert(JSON.stringify(d).includes(guard),route+' expected prior text');change(d);
 assert.equal(d.route,before.route);assert.equal(d.inputHash,before.inputHash);
 edits.push({route,partition:group.p,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d)});
}
edit('/areas/florida/liberty-county/','A stronger published example should',d=>{
 d.decisions[1].body='Invite one record for each requested size, its quantity and any custom requirement. Fictional request with placeholders: “Listed item: [supplier’s published size label], quantity 40. Custom item: [requested dimensions, order and units], quantity 15; please review whether this size can be supplied.” The quantities illustrate two separate lines, not minimum-order terms. Leave unknown dimensions visible for staff to clarify.';
 d.limits='The supplier verifies specifications, quantities and fulfillment. Use the supplier’s approved dimension labels when completing the illustrative request. Automatic estimates, live stock counts and delivery scheduling need separate scope; a prepared list can support ordinary contact.';
});
edit('/areas/florida/manatee-county/','An owner-approved example would make',d=>{
 d.decisions[1].body='Distinguish keeping an existing item in service from changing protection, shade or seating. Fictional comparison: “The seam has opened on this storage cover; can you assess a repair?” asks about an existing function. “I want an enclosure for a different use” asks about a new result. Label examples by the function involved so the first request does not silently become the second.';
 d.decisions[2].body='Explain how to discuss boat access and what happens after an inquiry. In the fictional repair request, an overall photograph identifies the cover and a close-up shows the reported seam. Neither establishes the fabric’s remaining life or whether a pattern can be reused; those decisions need the fabricator’s assessment.';
 d.limits='The comparison is fictional, not an account of KTM’s completed work. Pattern suitability, material condition and fitting remain specialist decisions. Automated boat-fit recommendations and job tracking require separate scope; preparation guidance can support the current contact route.';
});
edit('/areas/florida/palm-beach-county/','a real approved project example would',d=>{
 d.decisions[1].body='Retain each address, existing conditions, requested change and local contact. Fictional request: “Both sites use the approved logo. Site A is a new opening with no existing sign; please review the proposed location. Site B needs its existing sign replaced; please assess what can remain.” Keep each property’s photographs, access contact and requested date with its own record. The shared logo does not establish identical site requirements.';
 d.sourceBridge='West Palm Beach Signs describes site surveys, sign acquisition and installation, including coordination across multiple locations. Its contact page identifies West Palm Beach. Those services support the distinction between a shared brand program and the conditions at each property.';
 d.limits='The two-property request is fictional, not a completed client project or the operator’s standard sequence. The sign company and project professionals establish requirements at each property. Live dashboards, permit tracking and production scheduling require separate scope.';
});
edit('/areas/massachusetts/plymouth-county/','cited summary alone does not establish a new custom-furniture offer',d=>{
 d.heading='Choose how to discuss the fabric and the room it will sit in';
 d.intro='Browsing fabric can help a customer identify a preference while leaving questions about an existing piece and its room. An upholstery website should explain showroom and in-home consultation routes so customers can ask which discussion fits their needs.';
 d.customerQuestion='Should I start by browsing fabrics, visit the showroom or ask about a consultation at home?';
 d.decisions=[
  {label:'Keep the fabric reference with the existing piece',body:'Explain how the business identifies a fabric the customer has seen online and what initial item details are useful. Keep a style preference separate from confirmation that the material suits the proposed work. A photograph of a fabric is a starting reference, not a verified match for an existing chair.'},
  {label:'Make the two consultation routes clear',body:'Describe current showroom visiting arrangements and how to request an in-home consultation. A fictional inquiry makes the choice concrete: “I have an existing chair and a fabric reference. Would a showroom discussion be a useful first step, or should I ask about seeing the chair in its room?” Staff can explain what they need before arranging either route; the example does not establish a required sequence.'},
  {label:'Explain what needs confirmation before a visit',body:'Ask the owner to supply the preparation instructions, consultation coverage and appointment terms that apply. Tell customers whether to send initial photographs or wait for staff guidance, using the actual process. Keep the requested visit distinct from a confirmed appointment, and leave inspection, measurements and final fabric choices with the business.'}
 ];
 d.ownerInputs=['Current fabric-reference and initial item-description guidance.','Showroom visiting arrangements and in-home consultation coverage.','Approved preparation instructions, appointment terms and confirmation route.'];
 d.sourceBridge='Plymouth Upholstery & Decor invites fabric browsing, showroom visits and requests for an in-home consultation. Those documented routes support helping a customer choose how to discuss an existing piece and fabric preference. The inquiry above is fictional, not the business’s published form or a client project.';
 d.limits='The business confirms accepted work, visit coverage, fit, measurements and final selections. The example does not promise a home visit or establish consultation charges. Photo uploads, appointment tools and calculated custom prices need separate website assessment.';
});
assert.equal(edits.length,4);
for(const p of partitions)fs.writeFileSync(p.file,p.rows.map(d=>JSON.stringify(d)).join('\n')+'\n');
fs.writeFileSync(receiptFile,JSON.stringify({date:'2026-10-27',status:'implemented-pending-independent-recheck',routes:edits.map(e=>e.route),reviewEvidence:[root+'/audits/local-after-residual-a.jsonl',root+'/audits/local-after-residual-b.jsonl'],drafts:edits,limits:'Drafts only. Source records, FAQs and imported briefs unchanged; exact recheck required before import.'},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/residual-continuation-routes.json',JSON.stringify(edits.map(e=>e.route),null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({draftsRepaired:4,imported:false,independentRecheckPending:true}));
