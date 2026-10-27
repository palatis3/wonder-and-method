import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=`${root}/research/residual-c-known-repair.json`;
assert(!fs.existsSync(receiptFile),'Already applied');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const file=`${root}/drafts/local-3.jsonl`,rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(`${root}/audits/local-after-residual-c.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse),edits=[],sourceChanges=[],faqChanges=[];
const data=JSON.parse(fs.readFileSync('src/location-service-data.json','utf8')),faqs=JSON.parse(fs.readFileSync('src/service-faqs.json','utf8'));
function edit(route,change){const d=rows.find(x=>x.route===route),r=reviews.find(x=>x.route===route);assert(d&&r);assert.equal(hash(d),r.draftSha256,route);const before=structuredClone(d);change(d);assert.equal(d.route,before.route);assert.equal(d.inputHash,before.inputHash);edits.push({route,partition:3,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d)});}
function source(route,change){const d=data.find(x=>x.path===route);assert(d);const before=structuredClone(d);change(d);sourceChanges.push({route,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d)});}
function dropFaq(route,question){const before=structuredClone(faqs[route]);assert.equal(before.length,1);assert.equal(before[0].question,question);delete faqs[route];faqChanges.push({route,before,after:null,beforeSha256:hash(before),afterSha256:hash(null)});}
dropFaq('/areas/missouri/bates-county/','Should a hall rental page also promise access to the museum exhibits?');
edit('/areas/missouri/butler-county/',d=>{
 d.decisions[0].body='The public yearbooks are free searchable PDF downloads, with a warning that files are large. Label each download with its school, year, format and actual file-size information where available.';
 d.decisions[2].body='Label Ancestry Library Edition as in-library access and distinguish databases using a library-card sign-in. Put those conditions next to the relevant link so a home researcher understands which resources can be used remotely and which require a visit.';
});
edit('/areas/missouri/clay-county/',d=>{
 d.decisions[2].body='Keep Paradise Pointe and Sailboat Cove information attached to their own locations. The published Sailboat Cove guidance permits public access except to its docks, mooring buoys and dry-storage facility. Use an approved map and clear labels so waterfront access does not imply permission to enter those facilities or transfer Sailboat Cove’s restriction to another marina.';
});
source('/areas/missouri/clay-county/',d=>{d.checkedDate='2026-10-27';d.sources[0].observation='Camp Branch lists seasonal fishing-boat and pontoon rental, overnight slips and six-month leases. Paradise Pointe has separate slip information. The public-access exception for docks, mooring buoys and dry storage is specifically in the Sailboat Cove section.';});
edit('/areas/missouri/gasconade-county/',d=>{
 d.limits='The operator confirms transport and meeting arrangements. Booking-message automation requires separate assessment.';
});
dropFaq('/areas/missouri/gasconade-county/','How should a changed meeting point reach customers who have already booked?');
edit('/areas/missouri/greene-county/',d=>{
 d.decisions[0].body='The October 27 source check found at least two weeks’ notice for school trips and three days for general groups of ten or more paying visitors. Keep those advance-request periods separate from reply timing. The school overview says three to five business days for follow-up, while its request form says three; the general-group information says two business days. Have the museum reconcile the school wording before using one response promise across the page and form.';
 d.decisions[1].body='The school guidance calls for one accompanying adult per five students. Ask for aggregate student and adult totals so staff can review that arrangement. General-group inquiries need their own attendance and contact questions rather than a school chaperone checklist.';
 d.sourceBridge='History Museum on the Square in Springfield publishes different school and general-group notice periods and separately arranged lunch space. Its school overview and form showed different follow-up windows when checked on October 27, 2026. That dated mismatch illustrates why advance notice, expected reply and confirmed arrangements need separate labels.';
 d.limits='Museum staff confirm the visit, supervision and lunch arrangements. An inquiry does not reserve a place or reconcile the published reply windows. New scheduling tools require separate scope.';
});
source('/areas/missouri/greene-county/',d=>{
 d.checkedDate='2026-10-27';
 d.sources=[
 {url:'https://historymuseumonthesquare.org/field-trips/',label:'History Museum: school field trips',observation:'Checked October 27: at least two weeks’ notice, one adult per five students and separately arranged lunch space. The overview gives three to five business days for follow-up.'},
 {url:'https://historymuseumonthesquare.org/group-reservations/',label:'History Museum: general-group reservations',observation:'Official search-page evidence on October 27 describes groups of ten or more paying visitors, three days’ notice and a two-business-day reply window. Direct retrieval returned an access error.'},
 {url:'https://historymuseumonthesquare.org/school-and-youth-field-trip-reservation/',label:'History Museum: school request form',observation:'Official search-page evidence on October 27 gives three business days for follow-up, differing from the school overview; it repeats the supervision and separately requested lunch arrangements.'},
 {url:'https://historymuseumonthesquare.org/contact-us/',label:'History Museum: Springfield address and group contact',observation:'Lists 154 Park Central Square in Springfield and repeats the general-group minimum and three-day notice.'}
 ];
});
edit('/areas/missouri/harrison-county/',d=>{
 d.decisions[0].body='The published Hidden Acres inventory lists Gobbler for two guests with a kitchenette, Elk for four with a full kitchen and washer/dryer, and Bear and Caribou for six each with full kitchens and washer/dryers. A fictional four-person group wanting laundry can ask about Elk, Bear or Caribou rather than assume Gobbler’s kitchenette description covers the same facilities. The list compares published features; it does not establish availability or imply that unlisted features are absent.';
 d.decisions[1].body='The policy permits fishing but prohibits swimming in the pond. The BBQ pavilion is first-come, first-served. Put those rules beside the shared-facility descriptions so a pavilion photograph does not imply exclusive use and fishing access does not imply swimming permission.';
 d.decisions[2].body='The cabins use 2208 Hub Club Drive in Bethany, separate from the company’s vehicle-rental office and event space. Keep the selected cabin name with its directions and existing booking route. Dates, party size and essential kitchen or laundry needs help staff review the actual unit.';
 d.sourceBridge='NL Holdings’ Hidden Acres pages name four cabins with different guest counts and kitchen/laundry features, plus shared pond and pavilion rules. The fictional guest comparison above uses those published distinctions without describing a completed booking.';
 d.limits='The owner confirms current features, availability and permitted use. A shared-facility description does not reserve private access. Live inventory or shared-space booking needs separate scope.';
});
source('/areas/missouri/harrison-county/',d=>{
 d.checkedDate='2026-10-27';d.sources=[
 {url:'https://www.nlholdingscompany.com/cabins',label:'NL Holdings: named Hidden Acres cabins',observation:'Lists Gobbler for two with kitchenette, Elk for four with full kitchen and washer/dryer, and Bear and Caribou for six each with full kitchen and washer/dryer; gives the cabin address at 2208 Hub Club Drive, Bethany.'},
 {url:'https://www.nlholdingscompany.com/cabins-policies',label:'NL Holdings: shared property rules',observation:'Permits pond fishing, prohibits swimming and makes the BBQ pavilion first-come, first-served.'}
 ];
});
edit('/areas/missouri/hickory-county/',d=>{
 d.decisions[0].body='The property lists eleven cabins and excludes pets from Cabin 11. Keep that named exception with the selected unit instead of applying a general pet-friendly label to every cabin. A guest bringing a pet needs staff to review another suitable option; the policy alone does not establish capacity or availability.';
 d.decisions[1].body='The published minimum is two nights, with Friday and Saturday required for a weekend stay. Memorial Day, July 4 and Labor Day require three nights. Show the applicable rule beside the requested dates. Guest, slip and pet adjustments are handled at check-in under the published payment terms, so a preliminary amount should not be treated as the final total.';
 d.sourceBridge='Hickory Grove Hideaway near Pittsburg names Cabin 11’s no-pet rule, ordinary and holiday minimum stays, and separately reservable boat slips. These unit and date distinctions change the guest’s request without proving either reservation is available.';
 d.limits='The owner confirms dates, charges and both reservations. A request does not establish availability or automatically price exceptions. Live inventory or combined booking needs separate assessment.';
});
source('/areas/missouri/hickory-county/',d=>{
 d.checkedDate='2026-10-27';d.sources=[
 {url:'https://www.hickorygrovehideaway.com/',label:'Hickory Grove Hideaway: cabins and slips',observation:'Lists eleven cabins and separately reservable boat slips.'},
 {url:'https://www.hickorygrovehideaway.com/policies',label:'Hickory Grove Hideaway: unit and stay rules',observation:'Cabin 11 excludes pets. General stays require two nights; weekends include Friday and Saturday; Memorial Day, July 4 and Labor Day require three nights. Guest, slip and pet adjustments are handled at check-in. Reservations use phone or online; email can be an inquiry.'}
 ];
});
edit('/areas/missouri/lewis-county/',d=>{
 d.limits='The park confirms current access, carts and availability. A map or site description does not reserve a pitch. Inventory or cart-booking tools require separate scope.';
});
edit('/areas/new-hampshire/grafton-county/',d=>{
 d.decisions[2].label='Connect current choices to consultation';
 d.decisions[2].body='Identify the maintained route for checking today’s material selection and who updates it. Keep the customer’s piece, preferred example and unresolved material question together when they contact the shop. A gallery can prepare that discussion without acting as a live inventory catalogue.';
});
edit('/areas/new-hampshire/hillsborough-county/',d=>{
 d.decisions[2].body='Explain how the shop wants customers to send their garment breakdown and available artwork through its existing route. Keep a general question option for unresolved garment or design choices, with enough context for staff to discuss the intended result before selecting production methods.';
});
edit('/areas/new-hampshire/strafford-county/',d=>{
 d.decisions[2].label='Coordinate return with property readiness';
 d.decisions[2].body='Cleaning completion does not by itself mean the property is ready for delivery. Show the business’s return contact and readiness process, including who confirms the receiving arrangement. Keep the belongings’ status separate from the work still needed at the property.';
});
edit('/areas/new-jersey/monmouth-county/',d=>{
 d.decisions[2].body='Use approved participation details and identify who updates or archives them. Keep the event date and confirmed participation with the announcement. When it expires, the business’s ordinary offer and current buying or inquiry route should remain easy to find.';
});
source('/areas/new-jersey/monmouth-county/',d=>{d.coverageNote='Website planning for Monmouth County businesses, using Made in Monmouth’s public directory as an example. Wonder and Method works online from Buffalo, New York. Listed organizations are public examples, not studio clients or partners.';});
assert.equal(edits.length,11);assert.equal(sourceChanges.length,5);assert.equal(faqChanges.length,2);
fs.writeFileSync(file,rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync('src/location-service-data.json',JSON.stringify(data,null,2)+'\n');
fs.writeFileSync('src/service-faqs.json',JSON.stringify(faqs,null,2)+'\n');
const routes=[...new Set([...edits,...sourceChanges,...faqChanges].map(x=>x.route))];
assert.equal(routes.length,12);
fs.writeFileSync(receiptFile,JSON.stringify({date:'2026-10-27',status:'implemented-pending-independent-recheck',routes,drafts:edits,sourceChanges,faqChanges,limits:'Drafts not imported; exact independent recheck and guarded source/FAQ acceptance layer pending. Historical holds preserved.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({routes:routes.length,drafts:edits.length,sourceChanges:sourceChanges.length,faqRemoved:faqChanges.length,imported:false}));
