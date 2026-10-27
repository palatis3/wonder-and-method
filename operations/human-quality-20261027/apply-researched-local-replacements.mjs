import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const sha=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const proposals=await read('operations/human-quality-20261027/research/local-holds.json');
const sourceCheck=await read('operations/human-quality-20261027/research/local-holds-root-check.json');
if(sourceCheck.status!=='primary-source-check-complete-pending-integration-and-candidate-review')throw Error('Source review missing');
const entries=await read('src/location-service-data.json');
const briefs=await read('src/human-location-briefs.json');
const batches=[];
for(let i=1;i<=6;i++)batches.push({path:`operations/human-quality-20261027/drafts/local-${i}.jsonl`,rows:(await readFile(resolve(root,`operations/human-quality-20261027/drafts/local-${i}.jsonl`),'utf8')).trim().split(/\r?\n/).map(JSON.parse)});
const additions={
 '/areas/niagara-county/': {
  description:'Web design for Niagara County, NY. Plan a clear comparison of experience formats, participation requirements and booking handoffs.',
  coverageNote:'Whirlpool Jet Boat Tours lists its American departure at 115 S. Water Street in Lewiston. Niagara County’s municipal directory identifies both the Town and Village of Lewiston within the county.',
  scopes:[{title:'An experience comparison and booking handoff',pages:['Named format and departure','Format-specific participation conditions','Onsite checks and operator questions','Existing booking link'],request:'Help a family compare the relevant conditions before selecting an experience; keep the selected format with its booking route.',supplies:'Current operator-approved requirements, departure details, booking links and the person who resolves uncertain participation questions.',check:'A hypothetical 42-inch child is compared against the dry and ordinary wet height requirements without treating the result as full participation approval.'}],
  scopeTrigger:'Automated eligibility decisions, live seat availability, payments and new booking integrations need a separate assessment.'
 },
 '/areas/missouri/jackson-county/': {
  description:'Web design for Jackson County, MO. Help teachers compare museum visits with a prepared historical simulation and its own booking arrangements.',
  coverageNote:'The Truman Library’s visitor venue is in Independence, Jackson County. The Institute’s separate administrative address is not the student visit location. The historical library release is cited for county context only.',
  scopes:[{title:'A program choice and teacher-preparation page',pages:['Tour and simulation activities','Chosen scenario and classroom preparation','Program-specific arrangement request'],request:'Choose the learning activity and carry its scenario, grade range, group count and preferred dates into the appropriate inquiry.',supplies:'Approved program descriptions, preparation materials, actual group limits and the staff confirmation route.',check:'A teacher can distinguish the simulation from an ordinary museum tour without importing the tour’s rates, notice periods or admission rules.'}],
  scopeTrigger:'Registration, student records, curriculum hosting and learning-platform integrations require a separate scope.'
 },
 '/areas/florida/walton-county/': {
  description:'Web design for Walton County, FL. Keep capacity exceptions, emergency closures and overnight-arrival preparation clear on visitor pages.',
  coverageNote:'Florida State Parks identifies Grayton Beach State Park in Walton County at its Santa Rosa Beach address. This example does not place the park in Freeport. County context and normal instructions do not establish current operating status.',
  scopes:[{title:'Dated closure and arrival instructions',pages:['Operating notice and date','Visitor categories and the applicable exception','Advance contact deadline for late arrival','Current operator-status link'],request:'Check the closure type before relying on an entry exception, then arrange any late arrival through the operator’s current instructions.',supplies:'Approved notices, their dates, visitor-category definitions, arrival instructions and a named update owner.',check:'A reserved camper’s capacity exception does not override an emergency closure, and arrival after sunset does not replace the earlier contact deadline.'}],
  scopeTrigger:'Live alerts, automated access control, reservation changes and real-time status feeds require a separate assessment.'
 },
 '/areas/monroe-county/': {
  description:'Web design for Monroe County, NY. Explain show-category membership benefits separately from date-specific tickets, seating and sales cutoffs.',
  coverageNote:'RMSC lists the Strasenburgh Planetarium at 657 East Avenue in Rochester. Its official historical fact sheet corroborates the Monroe County relationship; its separate Naples nature center is not the example used here.',
  scopes:[{title:'Show selection and membership-benefit guidance',pages:['Official show category','Applicable member benefit','Selected show and date handoff','Seating and sales-cutoff instructions'],request:'Identify the selected show’s benefit before following its ticket route, without treating membership as a completed reservation.',supplies:'Current show categories, membership terms, ticket links, seating rules and staff-contact instructions.',check:'A Star Show and a Laser Show retain their different member benefits; the online-sales cutoff establishes neither sold-out status nor a seat at the door.'}],
  scopeTrigger:'Membership validation, seat allocation, ticket inventory and new sales integrations need a separate scope.'
 }
};
const backup=[],changes=[];
for(const proposal of proposals.routes){
 const index=entries.findIndex(entry=>entry.path===proposal.route);
 if(index<0||entries[index].areaId!==proposal.sourceEntryOverride.key)throw Error('Source identity mismatch '+proposal.route);
 const batch=batches.find(batch=>batch.rows.some(row=>row.route===proposal.route));
 const draftIndex=batch?.rows.findIndex(row=>row.route===proposal.route),oldDraft=batch?.rows[draftIndex];
 if(!oldDraft||oldDraft.inputHash!==proposal.baselineRenderedSha256)throw Error('Missing or stale reviewed draft '+proposal.route);
 if(oldDraft.researchResolution==='local-holds-root-check-20261027')throw Error('Replacement already applied '+proposal.route);
 backup.push({route:proposal.route,source:entries[index],draft:oldDraft,importedBrief:briefs.find(row=>row.route===proposal.route)||null});
 const patch=Object.fromEntries(['checkedDate','decisionTitle','lead','decision','coverageNote','sources','quoteQuestions','relatedGuides'].map(key=>[key,proposal.sourceEntryOverride[key]]));
 const entry={...entries[index],...patch,...additions[proposal.route]};
 delete entry.planningTable;
 if(entry.legacyWorksheet)entry.legacyWorksheetRetired=true;
 if(proposal.route==='/areas/missouri/jackson-county/')entry.sources.push({url:'https://www.trumanlibrary.gov/library-closure',label:'Truman Library: historical Jackson County location context',observation:'The dated 2021 release locates the institution’s local conditions in Jackson County. It is not current operating-status evidence.'});
 const draft={...proposal.proposedBrief,route:proposal.route,inputHash:proposal.baselineRenderedSha256,researchResolution:'local-holds-root-check-20261027',status:'replacement-awaiting-independent-review'};
 if(proposal.route==='/areas/monroe-county/')draft.sourceBridge=draft.sourceBridge.replace('RMSC\'s official institutional material corroborates its Monroe County relationship.','');
 entries[index]=entry;batch.rows[draftIndex]=draft;
 const briefIndex=briefs.findIndex(row=>row.route===proposal.route);
 if(briefIndex<0)briefs.push(draft);else briefs[briefIndex]=draft;
 changes.push({route:proposal.route,previousSourceSha256:sha(backup.at(-1).source),sourceSha256:sha(entry),previousDraftSha256:sha(oldDraft),draftSha256:sha(draft),baselineRenderedSha256:proposal.baselineRenderedSha256,status:'integrated-locally-awaiting-independent-page-review'});
}
const backupDir=resolve(root,'output/human-quality-20261027/researched-replacements');
await mkdir(backupDir,{recursive:true});
await writeFile(resolve(backupDir,'before.json'),JSON.stringify(backup,null,2)+'\n',{flag:'wx'});
await writeFile(resolve(root,'src/location-service-data.json'),JSON.stringify(entries,null,2)+'\n');
await writeFile(resolve(root,'src/human-location-briefs.json'),JSON.stringify(briefs.sort((a,b)=>a.route.localeCompare(b.route)),null,2)+'\n');
for(const batch of batches.filter(batch=>changes.some(change=>batch.rows.some(row=>row.route===change.route))))await writeFile(resolve(root,batch.path),batch.rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
await writeFile(resolve(import.meta.dirname,'research/local-holds-integration.json'),JSON.stringify({recordedAt:new Date().toISOString(),changes,unchangedRouteCount:entries.length-changes.length,originalAuditFindingsPreserved:true,sourceCheck:'research/local-holds-root-check.json',remaining:'Independent full candidate/sibling review, final visual/accessibility checks and release checks.'},null,2)+'\n');
console.log(JSON.stringify({integrated:changes.length,importedBriefs:briefs.length,unchangedSources:entries.length-changes.length}));
