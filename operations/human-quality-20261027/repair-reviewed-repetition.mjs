// Specific editorial corrections from complete-page reviews. No score changes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/human-quality-20261027/repetition-repairs');
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const files=[],byRoute=new Map(),changes=new Map();
for(let n=1;n<=6;n++){
 const file=resolve(import.meta.dirname,`drafts/local-${n}.jsonl`),drafts=(await readFile(file,'utf8')).trim().split(/\r?\n/).map(JSON.parse);
 files.push({file,drafts});for(const d of drafts)byRoute.set(d.route,d);
}
const sourceFile=resolve(root,'src/location-service-data.json'),faqFile=resolve(root,'src/service-faqs.json');
const sources=JSON.parse(await readFile(sourceFile,'utf8')),sourceByRoute=new Map(sources.map(x=>[x.path,x])),faqs=JSON.parse(await readFile(faqFile,'utf8'));
function route(state,county){return `/areas/${state?state+'/':''}${county}-county/`;}
function mark(path,reason){
 if(!byRoute.has(path))throw Error('Missing draft '+path);
 if(!changes.has(path))changes.set(path,{route:path,reasons:[],before:structuredClone({draft:byRoute.get(path),source:sourceByRoute.get(path),faq:faqs[path]??null})});
 changes.get(path).reasons.push(reason);return byRoute.get(path);
}
function set(path,key,value){const d=mark(path,'Remove repeated recommendation or internal editorial instruction: '+key);d[key]=value;}
function decision(path,index,body,label){const d=mark(path,'Give decision '+(index+1)+' its own visitor purpose');d.decisions[index].body=body;if(label)d.decisions[index].label=label;}
function removeFaq(path){mark(path,'Remove FAQ whose entire answer repeats a substantive body recommendation');if(!faqs[path]?.length)throw Error('No FAQ '+path);delete faqs[path];}
for(const [s,c] of [['iowa','allamakee'],['iowa','dallas'],['iowa','fayette'],['north-carolina','ashe'],['pennsylvania','philadelphia'],['texas','rockwall'],['california','yuba']])removeFaq(route(s,c));
set(route('iowa','franklin'),'limits','The venue confirms permitted equipment, catering and the actual event arrangement. Website descriptions do not approve a menu or appliance.');
const franklin=sourceByRoute.get(route('iowa','franklin'));
franklin.sources[1].label='Iowa DNR: Beeds Lake park address and county';
franklin.sources[1].observation='Lists Beeds Lake State Park at 1422 165th Street in Hampton and identifies Franklin as its area served.';
decision(route('michigan','kalamazoo'),2,'State actual mobile-service coverage and the useful operational context for a site discussion. Keep the inquiry route straightforward, with questions about constraints that staff has approved.');
decision(route('michigan','livingston'),2,'Identify which work took place at the customer’s facility and what must be discussed before a new assignment. Connect each example to the site task it involved, such as integrating a panel with existing equipment, without implying that the same installation work belongs in every programming request.');
decision(route('michigan','macomb'),1,'Separate manufacturing to supplied information from reproduction and any independently offered design assistance. Use approved project examples to show the business’s contribution and what another party supplied.');
decision(route('michigan','oakland'),2,'Place the business’s fitting-preparation instructions beside the existing booking or consultation route. Explain how the requested take-home date reaches the person reviewing the garment and how the customer receives the agreed next step. A fitting request should carry the deadline question into that conversation.', 'Prepare the fitting and deadline review');
set(route('michigan','oakland'),'limits','The business accepts the work and completion date after review. An appointment selection does not reserve production capacity. Live deadline calculations, rush eligibility and reminders need separate assessment.');
decision(route('michigan','otsego'),2,'Describe the actual assessment and agreement process and how to arrange the visit. A concise piece, condition, history and desired-result checklist can support the current appointment route.');
sourceByRoute.get(route('michigan','otsego')).relatedGuides=[];
decision(route('michigan','wayne'),2,'Explain post-production work available without a new shoot and the information needed for its first review. Let the buyer identify the existing footage and the outputs they want to discuss, including missing material or permissions that still need to be resolved. Staff can then assess what the supplied material supports.');
set(route('north-carolina','alleghany'),'limits','The maker confirms design, construction and dimensions. Inventory, configurators and production scheduling need separate scope.');
set(route('north-carolina','burke'),'limits','Measurements, engineering, drawings and installation decisions remain with responsible professionals. Design tools need separate scope.');
decision(route('north-carolina','craven'),2,'Distinguish delivery or installation arrangements from production decisions. State who confirms the date and next action, and keep the approved proof or specification identifiable at the handoff so the recipient knows which version the work follows.');
set(route('north-carolina','craven'),'limits','The business decides what each approval authorizes. Versioned records, signatures, production triggers and installation scheduling require separate requirements and pricing.');
set(route('north-carolina','cumberland'),'limits','The shop confirms garment arrangements and readiness. Inventory, payment, tracking and alteration-scheduling tools require separate assessment.');
set(route('pennsylvania','venango'),'limits','The preview does not confirm fit, supply or an installation date. Changing how a tool passes vehicle and design selections into an inquiry requires separate assessment.');
const nolan=mark(route('texas','nolan'),'Identify the fifty-student scenario as hypothetical, not an operator-published case');
if(!nolan.sourceBridge.includes('Its fifty-student example'))throw Error('Nolan text changed');
nolan.sourceBridge=nolan.sourceBridge.replace('Its fifty-student example','The hypothetical fifty-student group above');
set(route('','broome'),'limits','This is a proposed check, not a finding that either public example loses messages. Receipt does not confirm acceptance, travel or timing.');
set(route('california','fresno'),'limits','Staff confirm route arrangements and tour staffing. Changes to reservation systems or guide schedules require separate scope from the visitor-page content.');
decision(route('california','san-joaquin'),2,'Ask the laboratory to identify the event that starts its target and the services or restrictions involved. Keep that definition beside the analysis offer so a customer can distinguish delivery at a remote point from receipt by the laboratory.');
set(route('california','san-joaquin'),'limits','The lab supplies sample instructions and timing decisions. Live tracking, courier automation and calculated completion dates need separate assessment.');
decision(route('california','solano'),0,'Compare self-guided admission purchased at the Visitor Center with advance reservations for a small guided group. Explain what the guide adds and show the action that belongs to each choice.');
decision(route('california','solano'),2,'Keep store, café and tour hours distinct. A visitor arriving while the store is open should still be able to find the final tour departure and food-service hours before planning the rest of the visit.');
set(route('california','solano'),'sourceBridge','Jelly Belly separates self-guided and guided tour routes and describes variable weekday production and non-producing weekend tours. Its Visitor Center page gives departments their own operating hours.');
const solano=sourceByRoute.get(route('california','solano'));
solano.sources[0]={url:'https://www.jellybelly.com/factory',label:'Jelly Belly: tour formats, production and school groups',observation:'Separates self-guided admission from advance-booked guided groups and describes variable production. Its school-group section requires no advance reservations and explains splitting large parties, payment and receipt arrangements.'};
decision(route('iowa','henry'),2,'State that the museums are not climate controlled where that is the current description, and give specific-collection or group questions a staff route. A building comparison can put access, last entry and indoor conditions beside the correct museum.');
decision(route('iowa','jackson'),2,'Let the organizer describe overnight camping and the intended picnic as related but separate plans. Give unresolved group questions a staff contact and preserve the current opening information. A two-row camping/shelter comparison can show which arrangement can be reserved and which remains first-come.');
decision(route('','chautauqua'),2,'Explain whether the next action opens the established checkout or sends a quote request. Keep the product reference and the customer’s unresolved choices with that action so staff can identify the item being discussed.');
set(route('','chautauqua'),'limits','Catalog content, an existing store connection and a new commerce system are different scopes. Inventory synchronization and changes to checkout behavior need separate assessment.');
decision(route('colorado','denver'),2,'Give old lists a review or archive action and identify who updates repeated links. Keep the year visible wherever a blackout list is linked so a visitor considering a later event can find the relevant dates.');
decision(route('colorado','gunnison'),2,'Connect confirmed sessions to their own activity guidance and the provider’s preparation contact. Keep those instructions tied to the approved activity so a participant does not assume that guidance for one session applies to every lesson.', 'Prepare for the confirmed activity');
set(route('colorado','gunnison'),'sourceBridge','Adaptive Sports Center says lesson requests remain pending until staff confirmation and family grouping depends on skill and availability, with adaptive needs taking priority.');
await mkdir(out,{recursive:true});
await writeFile(resolve(out,'before.json'),JSON.stringify([...changes.values()],null,2)+'\n',{flag:'wx'});
for(const {file,drafts} of files)await writeFile(file,drafts.map(x=>JSON.stringify(x)).join('\n')+'\n');
await writeFile(sourceFile,JSON.stringify(sources,null,2)+'\n');await writeFile(faqFile,JSON.stringify(faqs,null,2)+'\n');
const records=[...changes.values()].map(x=>({route:x.route,reasons:x.reasons,beforeHash:sha(x.before),afterHash:sha({draft:byRoute.get(x.route),source:sourceByRoute.get(x.route),faq:faqs[x.route]??null}),independentRecheck:null,finalScore:null}));
await writeFile(resolve(out,'review-routes.json'),JSON.stringify(records.map(x=>x.route),null,2)+'\n');
await writeFile(resolve(import.meta.dirname,'research/repetition-repairs.json'),JSON.stringify({date:'2026-10-27',scope:'Named recommendations from earlier complete-page reviews; no generated ratings or publication approval.',sourceChecks:[{url:franklin.sources[1].url,fact:franklin.sources[1].observation},{url:solano.sources[0].url,fact:solano.sources[0].observation}],changes:records},null,2)+'\n');
console.log(JSON.stringify({revised:records.length,independentRecheckRequired:true}));
