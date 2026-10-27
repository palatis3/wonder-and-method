// One-use corrections from 100 complete candidate reviews; preserve historical evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=root+'/research/residual-i-repair.json';
assert(!fs.existsSync(receiptFile),'Repair already applied');
const file=root+'/drafts/local-3.jsonl',rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(root+'/audits/local-after-residual-i.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const sourceFile='src/location-service-data.json',sources=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),edits=[],sourceEdits=[];
const holds=reviews.filter(r=>r.requiredFixes.length);assert.equal(holds.length,21);
function edit(route,change){const d=rows.find(r=>r.route===route),r=reviews.find(r=>r.route===route);assert(d&&r?.requiredFixes.length,route);assert.equal(hash(d),r.draftSha256,route);const before=structuredClone(d);change(d);assert.equal(d.inputHash,before.inputHash);assert.equal(d.route,before.route);assert.notEqual(hash(d),hash(before));edits.push({route,partition:3,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d),requiredFixes:r.requiredFixes});}
function source(route,change,fresh=true){const s=sources.find(x=>x.path===route);assert(s);const before=structuredClone(s);change(s);if(fresh)s.checkedDate='2026-10-27';assert.notEqual(hash(s),hash(before));sourceEdits.push({route,before,after:structuredClone(s),beforeSha256:hash(before),afterSha256:hash(s)});}
function replace(d,key,from,to=''){assert(d[key].includes(from),d.route+' '+from);d[key]=d[key].replace(from,to).trim();}
function obs(s,url,text){const item=s.sources.find(x=>x.url===url);assert(item,url);item.observation=text;}
const mn=n=>`/areas/minnesota/${n}-county/`;
edit(mn('blue-earth'),d=>replace(d,'limits',' If the research steps duplicate another county example, retain the address-led preparation distinction rather than adding another generic archive checklist.'));
edit(mn('carver'),d=>{
 d.decisions[0].body='Describe the ordinary portrait-permit route using current terms. Direct commercial photography or requests for private space to the separate arrangement process.';
 d.limits='The arboretum confirms access and photography permission. A permit request is not approval for commercial or private-space use. New permit or ticket integrations require separate scope.';
});
edit(mn('clay'),d=>{
 d.decisions[2].body='A question about viewing the Hjemkomst ship or consulting archives belongs with the historical society’s visitor or research guidance. A request to hire space for a reception belongs with city Parks and Recreation. Label those choices by the visitor’s purpose, with the responsible organization and maintained contact link beside each.';
 d.limits='Each organization confirms its own services and arrangements. A shared building address does not establish that one team can approve the other’s tour, research or rental request.';
});
edit(mn('clearwater'),d=>replace(d,'limits',' If combined with another research example, preserve this newspaper-format distinction rather than repeating generic appointment advice.'));
edit(mn('cottonwood'),d=>{
 d.decisions[2]={label:'Request the seasonal tour separately',body:'Ask whether the group wants a guided visit as part of its event and identify the preferred day and time. Guided tours are arranged in advance and depend on the season and guide availability. Keep that request alongside the chosen rental spaces so staff can confirm it separately; link the confirmed visit to the correct arrival instructions.'};
});
edit(mn('dakota'),d=>{
 d.decisions[0].body='Dakota City’s Village Experience is for grades 3–6 with a maximum of 70 students; One-Room School House is for second grade and above with a maximum of 50. Both list a minimum of ten students. A 60-student class may fit the village program’s published count but exceeds the schoolhouse limit. Keep accompanying-adult numbers separate for staff planning rather than treating those student limits as total-person capacities.';
 d.decisions[1].body='One-Room School House lasts four hours and includes time for a bring-your-own picnic lunch. Village Experience lasts two hours; its optional picnic and dessert arrangement adds about 30–45 minutes. Keep that added time visible when teachers compare the visit with a fixed bus departure.';
 d.decisions[2].body='The published tour instructions require at least three weeks’ notice. Ask teachers to name the program, student grades, aggregate pupil and adult numbers, preferred date and lunch choice. Staff confirm the accepted group arrangement and complete schedule before transport is treated as settled.';
 d.sourceBridge='Dakota City Heritage Village’s tour page, checked October 27, 2026, supplies these program-specific grades, student limits and lunch arrangements. The schoolhouse and village choices change both class fit and the time needed on site.';
});
source(mn('dakota'),s=>obs(s,'https://dakotacity.org/school-field-trips-tours-and-camps/','Village Experience: grades 3–6, 10–70 students, two hours plus about 30–45 minutes for the optional picnic/dessert arrangement. One-Room School House: grade 2 and above, 10–50 students, four hours including a bring-your-own picnic. Tours require three weeks’ notice; adult arrangements are described separately.'));
edit(mn('dodge'),d=>{d.decisions[0].body='Distinguish an upcoming show with open sales, a remaining performance whose ticket sales have closed, and an ended production. The published October 9–25, 2026 dinner production is now in the ended category; its retained dates describe a past show.';});
edit(mn('kandiyohi'),d=>replace(d,'limits',' If combined with a related archive example, retain this service-and-output comparison rather than repeating a generic research checklist.'));
edit(mn('lake-of-the-woods'),d=>replace(d,'limits',' Preserve this device-and-rights distinction if the example is consolidated with other archive guidance, instead of repeating a generic request form.'));
edit(mn('nicollet'),d=>replace(d,'limits',' Existing archive guidance should be consolidated where it already explains the same task.'));
edit(mn('pine'),d=>{
 d.decisions[0].body='The public Sunday schedule lists the Little Mermaid Café from 9 a.m. to 2:30 p.m., while museum exhibits and the antique/gift shop open at noon and close at 3 p.m. A 10 a.m. breakfast therefore does not include immediate exhibit access. Noon to 2:30 p.m. is the listed overlap for those activities, subject to current opening confirmation.';
 d.decisions[1].body='The thrift store lists Saturday hours of 9 a.m. to 4 p.m. Its season is inconsistent across public pages: the homepage says mid-May to mid-October, while the shop page says May through September. Ask the owner to reconcile the season before publishing one current range; neither description makes the thrift store a Sunday option.';
 d.decisions[2].body='Ask which activities the group wants, the day and approximate attendance. The museum homepage requests contact for groups of twelve or more; the café page asks groups of ten or more to call ahead. Keep each threshold with its service and pass the meal and exhibit intentions to the appropriate contacts without implying that one request reserves both.';
 d.sourceBridge='Pine County Historical Society’s public pages, checked October 27, 2026, distinguish Sunday museum and café hours, Saturday-only thrift shopping and different group-contact thresholds. Their conflicting thrift-store seasons remain a question for the owner.';
});
source(mn('pine'),s=>{
 obs(s,'https://pinecountyhistory.org/','Lists Sunday museum/gift-shop hours of noon–3 p.m. and café hours of 9 a.m.–2:30 p.m.; thrift shopping is Saturday 9 a.m.–4 p.m., with a mid-May–mid-October season. Museum group contact starts at twelve. Official indexed text was retrieved; direct homepage fetching timed out.');
 s.sources.push({url:'https://pinecountyhistory.org/index.php/shops/',label:'Pine County Historical Society: shops',observation:'The shop page instead describes the Saturday thrift season as May–September, leaving a seasonal discrepancy with the homepage for owner clarification.'},{url:'https://pinecountyhistory.org/index.php/cafe/',label:'Pine County Historical Society: Little Mermaid Café',observation:'Repeats the Sunday 9 a.m.–2:30 p.m. café hours and asks groups of ten or more to call ahead, separately from the museum’s twelve-person threshold.'});
});
edit(mn('pipestone'),d=>replace(d,'limits','This material should join existing archive guidance where it serves the same purpose; uploads','Uploads'));
edit(mn('scott'),d=>{
 d.decisions[0].body='Pieces of the Past introduces daily life through chores, games and school for ages 4–7. What’s for Dinner serves grades 1–2 with food, farm and store activities. Then and Now uses maps, photographs and objects for grades 3–5, while the Minnesota River and Fur Trade program is for grades 6–8. Put the actual audience beside the topic so a title alone does not decide the lesson.';
 d.decisions[1].body='Then and Now asks pupils to compare earlier towns with the present through discussion, games and skits. Its third- and fourth-grade plans last 45 minutes; the fifth-grade plan lasts 50. The program can be led by a society educator or facilitated from the trunk by the borrower. Keep grade, duration and delivery format together when a teacher asks about preparation.';
 d.sourceBridge='Scott County Historical Society’s trunk overview and Then and Now details, checked October 27, 2026, supply these grade/topic choices and different program lengths. Its request form starts a staff-confirmed borrowing conversation.';
});
source(mn('scott'),s=>{
 obs(s,'https://www.scottcountyhistory.org/trunks','Lists Pieces of the Past for ages 4–7, What’s for Dinner for grades 1–2, Then and Now for grades 3–5, and Minnesota River and Fur Trade for grades 6–8. Requests receive staff confirmation.');
 s.sources.push({url:'https://www.scottcountyhistory.org/trunks-then-and-now',label:'Scott County Historical Society: Then and Now program',observation:'Uses maps, photographs and objects with discussions, games and skits. Third-/fourth-grade plans last 45 minutes and the fifth-grade plan 50; educator-led outreach and borrower-facilitated trunk formats are described.'});
});
edit(mn('stevens'),d=>{
 replace(d,'sourceBridge',' The handling distinction can enrich a shared archive-preparation guide.');
 replace(d,'limits','Consolidate overlapping archive advice where useful while retaining this attributed browsing-versus-retrieval example; new catalog','New catalog');
});
edit(mn('waseca'),d=>{
 replace(d,'sourceBridge',' That concrete exception can anchor an image-request guide.');
 replace(d,'limits','If combined with other archive advice, retain this specific identifier limitation; catalog','Catalog');
});
edit(mn('watonwan'),d=>{
 replace(d,'sourceBridge',' The separate contact and advance-payment process can serve as a specific example within broader park-event guidance.');
 replace(d,'limits','Consolidate overlapping pavilion-and-camping advice where useful while retaining these facility categories; combined inventory','Combined inventory');
});
edit('/areas/missouri/scott-county/',d=>{
 d.decisions[0].body='Scott City’s agreement allows only the reserving party into the pool area up to 30 minutes before the scheduled start. For an illustrative 6–8 p.m. party, organizer setup can begin no earlier than 5:30 p.m.; guests must wait until 6 p.m. Keep those times separate when preparing invitations.';
 d.decisions[2].body='The agreement requires everyone to leave no later than ten minutes after the scheduled end, with the pool, deck and locker rooms clean before departure. In the illustrative 6–8 p.m. party, that means leaving by 8:10 p.m., including cleanup. Keep weather or rescheduling questions with the current venue contact rather than implying extra time or an automatic refund.';
 d.sourceBridge='Scott City’s private-pool-party agreement, checked October 27, 2026, gives the organizer-only 30-minute setup allowance and ten-minute departure limit used in the example. The illustrated schedule is not a reservation or an extension of the published terms.';
});
source('/areas/missouri/scott-county/',s=>obs(s,'https://www.scottcitymo.org/DocumentCenter/View/366','The agreement permits organizer-only entry up to 30 minutes before the scheduled start; guests enter at the start. Everyone must leave within ten minutes after the end, with the pool, deck and locker rooms clean before departure. Published party slots include 6–8 p.m.'));
source('/areas/missouri/washington-county/',s=>{s.coverageNote='For website projects in Washington County, Missouri, using YMCA Trout Lodge as a public planning example. Wonder and Method is based in Buffalo, New York, and works online with Missouri businesses. Named organizations are public examples, not clients, partners or endorsements.';},false);
edit('/areas/missouri/wayne-county/',d=>replace(d,'sourceBridge',' This concrete comparison can sit alongside other cabin-preparation examples without repeating a generic lodging checklist.'));
source('/areas/missouri/worth-county/',s=>{s.coverageNote='For website projects in Worth County, using MU Extension’s courthouse office at 11 West Fourth Street as a public planning example. Wonder and Method is based in Buffalo, New York, and works online with Missouri businesses. Named organizations are public examples, not clients, partners or endorsements.';},false);
edit('/areas/nebraska/colfax-county/',d=>{
 d.decisions[2].body='The center offers a full breakfast for ten or more people requesting meals, otherwise a continental breakfast; lunch and dinner require twelve or more. In the fictional 20-person meeting with eight overnight guests, eight breakfast requests do not meet the full-breakfast threshold, while twenty dinner requests meet that meal’s count condition. Staff still confirm each sitting and the agreement; meeting attendance must not automatically become a breakfast count.';
 d.sourceBridge='Saint Benedict Center’s event page, checked October 27, 2026, distinguishes day and overnight attendance, the meal-specific counts above and a signed, returned facilities agreement as confirmation. Separate counts let staff assess the actual retreat plan.';
});
source('/areas/nebraska/colfax-county/',s=>obs(s,'https://missionmonks.squarespace.com/plan-your-event','Offers full breakfast for ten or more people requesting meals, otherwise continental breakfast; lunch and dinner require twelve or more. Distinguishes day and overnight attendance and identifies a signed, returned Facilities Reservation Agreement as confirmation.'));
assert.equal(edits.length,19);assert.equal(sourceEdits.length,7);
const routes=[...new Set([...edits,...sourceEdits].map(e=>e.route))];
assert.deepEqual(new Set(routes),new Set(holds.map(r=>r.route)));
const receipt={date:'2026-10-27',status:'implemented-pending-independent-recheck',routes,reviewEvidence:[root+'/audits/local-after-residual-i.jsonl'],drafts:edits,records:sourceEdits,faqs:[],sourceChecks:[root+'/research/residual-i-fact-recheck.json'],limits:'Twenty-one routes corrected: nineteen drafts and seven exact source records. FAQs and imported briefs unchanged. Official source checks cover named comparisons only; Pine homepage direct retrieval failed and official indexed text supplied evidence. Its seasonal conflict is retained. Independent exact-body recheck required before acceptance/import.'};
fs.writeFileSync(file,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(sourceFile,JSON.stringify(sources,null,2)+'\n');
fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/residual-i-repair-routes.json',JSON.stringify(routes,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({routes:routes.length,drafts:edits.length,sourceRecords:sourceEdits.length,imported:false}));
