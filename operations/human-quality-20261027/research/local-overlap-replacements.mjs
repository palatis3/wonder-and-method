// Individual proposals following the complete-page overlap findings.
const source=(url,label,observation)=>({url,label,observation});
export const replacements=[
 {
  route:'/areas/michigan/monroe-county/',partition:3,
  heading:'Explain enrollment before an incident and the reference used afterward.',
  intro:'A pre-measured glass-repair plan gives an enrolled business a different starting point from a new customer reporting damage. Explain both routes without turning a stored measurement into a promise of immediate replacement.',
  customerQuestion:'Are we arranging the initial survey, or reporting damage to a pane already in our plan?',
  decisions:[
   {label:'Give new customers the enrollment route',body:'Describe what the provider records during its survey and how a business asks to join. A customer without an existing reference should not have to invent a pane number to make contact. Keep the ordinary damage-reporting route available alongside the plan explanation.'},
   {label:'Use the existing reference for an enrolled site',body:'Show how an enrolled customer identifies the facility and pane from the provider’s record. A clearly labeled fictional diagram could explain the reference without publishing a customer’s building plan. Staff should be able to distinguish an existing recorded pane from an unrecorded addition or changed opening.'},
   {label:'Keep material availability beside the benefit',body:'State the stock condition where faster replacement is described. Staff still check the incident and the materials required. A website acknowledgment must not promise that a recorded pane is available or that the work will be completed in one visit.'}
  ],
  ownerInputs:['The actual enrollment and survey process.','Approved reference instructions and contact routes for enrolled and new sites.','Current wording about stock checks and who confirms the repair arrangements.'],
  sourceBridge:'Glass Doctor of Monroe offers an Advance Measurement System that records panes before damage occurs. Its local FAQ describes matching a pane reference to available supplies, with immediate repair conditional on stock. The linked program page explains the numbered facility diagram.',
  limits:'The glass professional assesses damage, specifications and repair arrangements. Public content can explain the plan without exposing facility records; record systems, dispatch and live inventory connections require separate scope.',
  coverageNote:'Glass Doctor of Monroe lists its local office at 15525 S Dixie Highway and describes this program for its commercial customers. Wonder and Method works remotely from Buffalo; the named business is a public example, not a client or partner.',
  sources:[source('https://glassdoctor.com/monroe','Glass Doctor of Monroe: local program and office','The local FAQ offers advance measurement and makes immediate repair conditional on available supplies; the page gives the local office address.'),source('https://glassdoctor.com/advance-measurement','Glass Doctor: numbered pane records','Explains the initial survey, numbered facility diagram and stock-dependent replacement process.')],
  check:'A new customer reaches enrollment or ordinary reporting without a pane ID; an enrolled customer can identify an existing pane without receiving an automatic stock or completion promise.',
  researchNote:'Local page and linked brand program read directly on October 27. The local FAQ expressly offers enrollment, so applicability is not inferred from a national navigation link alone. No actual incident, stock check or submitted form.'
 },
 {
  route:'/areas/michigan/newaygo-county/',partition:3,
  heading:'Keep the prototype quantity separate from a possible production run.',
  intro:'A buyer may need a few test pieces while considering a much larger later order. The quote request should distinguish the work being requested now from a forecast that still depends on review.',
  customerQuestion:'Am I requesting a prototype quote, a production quote, or both as separate stages?',
  decisions:[
   {label:'Name the quantity for the present request',body:'Ask whether the inquiry concerns prototype pieces or an approved production run. In an illustrative request for two test parts and a possible later order of 500, keep the two quantities separately labeled. The larger number should not silently become the quantity requested for immediate manufacture.'},
   {label:'Retain the drawing and the unresolved decision',body:'Use the shop’s approved drawing-reference instructions and let the buyer explain what the prototype is meant to help decide. Keep a revision or reference with each stage. The website should not turn a submitted drawing into acceptance of manufacturability, a test result or authorization for a later run.'},
   {label:'Distinguish the response window from completion',body:'Explain that the next response may be a quote or a request for more information. A stated reply window does not establish manufacturing lead time. Show where staff confirm the actual scope and schedule after reviewing the present request.'}
  ],
  ownerInputs:['How prototype quantities and anticipated later volumes should be described.','Accepted drawing references and the questions needed to assess the current stage.','Approved response wording and the process for confirming a manufacturing schedule.'],
  sourceBridge:'Flat-To-Form near Fremont describes one or a few prototype pieces for planning a larger job. Its quote page promises contact within 24–48 hours with a quote or further questions. That response is distinct from a production commitment.',
  limits:'The manufacturer determines technical feasibility, testing responsibilities and the accepted order. The two-and-500 scenario is hypothetical. File portals, revision control and automated production quoting require separate scope.',
  coverageNote:'Flat-To-Form lists 9577 W. 40th Street near Fremont in Newaygo County. Wonder and Method works remotely from Buffalo; this is a public planning example, not a delivered client project.',
  sources:[source('https://www.flattoform.com/services/','Flat-To-Form: small prototype batches','Describes making one or a few prototype pieces before a larger job.'),source('https://www.flattoform.com/quote-request/','Flat-To-Form: quote response','States a 24–48 hour contact window for a quote or further questions, rather than a manufacturing completion date.'),source('https://www.flattoform.com/','Flat-To-Form: shop location','Lists the Fremont-area facility at 9577 W. 40th Street.')],
  check:'A hypothetical two-piece prototype request retains a separate future-volume estimate and does not present the reply window as a delivery date.',
  researchNote:'Services, quote and home pages read directly. No form fields, file extensions, approval system or production timing inferred. Compare against Kent’s contribution/assembly task and Macomb’s supplied-specification versus design/output task.'
 },
 {
  route:'/areas/west-virginia/hardy-county/',partition:6,
  heading:'Make the workshop booking unit clear for the whole party.',
  intro:'A party organizer needs to know whether one reservation covers everyone or only one participant. Keep that unit consistent with the selected workshop and the booking service before the visitor commits.',
  customerQuestion:'Does this reservation include our whole party, and is this the right workshop for its size?',
  decisions:[
   {label:'Choose the appropriate workshop format',body:'Compare a shared project type with the more flexible group experience using the studio’s approved limits. A hypothetical party of six should see the group option before selecting a smaller workshop. Larger parties need the actual discussion route, rather than an invented extra-seat control.'},
   {label:'Resolve the reservation unit across both sites',body:'Check the workshop page, booking destination and acknowledgment with the same fictional party. Publish the operator-approved participant count and charging basis together. If an older booking page describes one person per reservation while the studio page describes a whole party, identify which route is current before repeating either instruction.'},
   {label:'Separate making the piece from receiving it',body:'Explain that the finished work needs a later collection or shipping arrangement. Let visitors planning a short stay find the relevant contact before booking. Use the studio’s confirmed readiness wording; a session end time should not become a promise that the piece can travel home immediately.'}
  ],
  ownerInputs:['Current workshop types, party limits and participation conditions.','The authoritative booking destination, reservation unit and payment sequence.','Confirmed collection or shipping instructions and the person who updates repeated wording.'],
  sourceBridge:'Dakota Glass Works’ studio page describes up to five participants making the same item, a group option for up to eight, and reservations for the full party. Its older Farms Work Wonders booking page says each reservation is for one person. Both describe later collection or shipping. This example makes reconciliation part of the website work.',
  limits:'The studio confirms the applicable booking process, participant eligibility, availability and readiness date. Its studio page requires participants to be at least eight, with adult supervision for children. No test booking or payment was submitted; booking-system changes require separate scope.',
  coverageNote:'Hardy County’s visitor bureau lists Dakota Glass Works at 273 East Main Street in Wardensville. Wonder and Method is based in Buffalo and works remotely; the studio is a public planning example.',
  sources:[source('https://dakotaglassworks.org/pages/workshops-classes','Dakota Glass Works: workshop and party options','Lists workshop capacities, full-party booking, participation conditions and later collection/shipping.'),source('https://www.farmtakeout.com/s/appointments','Farms Work Wonders: differing booking instructions','The accessible booking page describes one person per reservation, unlike the studio page. This conflict is not resolved by assuming one instruction wins.'),source('https://visithardywv.com/shop-in-town-out/','Hardy County visitor bureau: Dakota Glass Works','Lists the studio at 273 East Main Street, Wardensville.')],
  check:'An illustrative six-person party reaches the group discussion; the page-to-provider check identifies any mismatch between full-party and per-person reservations before publication.',
  researchNote:'Primary studio and older provider pages plus county visitor bureau read. Do not adopt a definite checkout unit until reconciled. Also omit conflicting 7–10 days versus business days and older class-duration summaries. A narrower content-planning task is supportable without settling those facts.'
 },
 {
  route:'/areas/west-virginia/lewis-county/',partition:6,
  heading:'Distinguish a photography visit from permission to film.',
  intro:'A ticket can provide access for one kind of visit without supplying every production permission. Explain the experience being sold and the separate contact needed for a professional recording request.',
  customerQuestion:'Does the photography tour fit my visit, or do I need a separate filming agreement?',
  decisions:[
   {label:'Describe the actual photography experience',body:'Make the semi-guided format and lack of historical narration visible before the reservation action. A visitor seeking a narrated history tour should reach the appropriate tour description instead of choosing solely by the buildings pictured.'},
   {label:'Put the recording restriction beside the ticket',body:'Keep the operator’s distinction between a photography tour and a filming agreement close to the booking choice. A person planning commercial audio or video should see the separate agreement route before treating a ticket as permission for that work. The owner supplies and approves the policy wording.'},
   {label:'Keep check-in separate from the session start',body:'Show the required early arrival alongside the reserved session. A confirmation should identify when the visitor checks in and where to ask about access. Keep office hours and general walk-in tour instructions from replacing the photography reservation’s own preparation.'}
  ],
  ownerInputs:['Accurate format and inclusions for each visitor experience.','Approved photography and recording boundaries with the responsible contact.','Current check-in, arrival and reservation instructions.'],
  sourceBridge:'The Trans-Allegheny Lunatic Asylum’s photography tour requires a reservation, provides semi-guided access without historical narration and asks visitors to check in half an hour early. The tour is not its filming agreement; commercial audio/video and professional or extended recording need the separate process.',
  limits:'This is a proposal for explaining a venue’s published offer, not legal drafting or permission to record. The venue approves access and production arrangements. Ticketing, agreements and production services require separate scope.',
  coverageNote:'West Virginia Tourism identifies this Weston venue in Lewis County. Wonder and Method works remotely from Buffalo; the venue is a public example, not an affiliated client.',
  sources:[source('https://trans-alleghenylunaticasylum.com/historic-tours/','Trans-Allegheny: photography tour and filming boundary','Describes the reserved photography experience, early check-in and separate recording agreement.'),source('https://wvtourism.com/company/trans-allegheny-lunatic-asylum-formerly-weston-state-hospital/','West Virginia Tourism: Weston venue in Lewis County','Corroborates the venue’s Lewis County location.')],
  check:'A photography visitor sees the actual experience and early check-in; a commercial recording request reaches the separate agreement discussion without treating admission as authorization.',
  researchNote:'Operator historic-tour page and state tourism listing read. Do not repeat medical-history interpretations, paranormal claims, accessibility claims, or conflicting November8/9 seasonal end dates. The task concerns the photography product, not a general tour recommendation.'
 },
 {
  route:'/areas/west-virginia/mercer-county/',partition:6,
  heading:'Count machines separately from riders when requesting a guide.',
  intro:'A private guided ride can include rental vehicles and machines the party brings. Explain the group unit and the separately arranged services so a seat count does not become a misleading guide quote.',
  customerQuestion:'How many machines are in our party, and which ones need rentals as well as a guide?',
  decisions:[
   {label:'Count the vehicles the guide will lead',body:'Keep the machine total distinct from the number of people. An illustrative party using three four-seat vehicles has three machines, even if all twelve seats are occupied. Explain the owner’s actual group limit without assuming that a stated vehicle capacity approves every rider.'},
   {label:'Identify owned and rented machines',body:'Let the organizer describe which vehicles they are bringing and which rentals they need to discuss. Show guide work, vehicle rental and trail permits as separate arrangements. A group that brings all its own machines should still have a clear guide inquiry route.'},
   {label:'Confirm the guide independently',body:'Use the current contact route for the guide and say what remains subject to personal confirmation. Choosing a rental date or seeing preplanned GPS routes should not imply that a human guide is available. Keep participation requirements and the operator’s review visible before the booking handoff.'}
  ],
  ownerInputs:['The guide’s current machine-based group limit and scope.','How the party reports owned vehicles, requested rentals and rider counts.','The guide-confirmation route and current participation requirements.'],
  sourceBridge:'Eagle ATV in Rock describes private guiding for groups of up to six machines, including owned vehicles, rentals or a mix. Its FAQ separates guide fees, rentals and trail permits and makes guiding subject to personal confirmation. The guided-tour page directs visitors to call.',
  limits:'The operator confirms guides, machines and rider eligibility. Its rental FAQ requires drivers to be at least 21 with a valid license and passengers to be at least six and meet the trail system’s size requirements. This content does not assess riding suitability; reservation and dispatch connections need separate scope.',
  coverageNote:'Mercer County’s visitor bureau lists Eagle ATV at 804 Mount Olive Road, Rock. Wonder and Method is a Buffalo studio working remotely; this is a public example rather than a client or endorsement.',
  sources:[source('https://eagleatv.com/frequently-asked-questions/','Eagle ATV: guide group and separate arrangements','Describes the six-machine group, mixed owned/rented vehicles, guide confirmation and rental participation conditions.'),source('https://eagleatv.com/guided-tours/','Eagle ATV: guided-tour contact','Welcomes owned machines and directs visitors to arrange a guide by phone.'),source('https://visitmercercounty.com/company/eagle-atv-rental-and-guided-tours/','Mercer County visitor bureau: Eagle ATV','Lists the operator at 804 Mount Olive Road in Rock.')],
  check:'A hypothetical three-machine/twelve-rider inquiry preserves both totals and does not turn a rental selection into a confirmed guide.',
  researchNote:'FAQ, guided page and county tourism entry read. FAQ mentions an inquiry form but guided page directs phone contact; no form availability assumed. No booking-flow test, safety assessment, price calculation or availability claim.'
 },
 {
  route:'/areas/west-virginia/mingo-county/',partition:6,
  heading:'Choose a permit purchase route that fits the departure date.',
  intro:'An online purchase may involve mailing a physical permit. A visitor leaving soon needs the arrival-time condition and a verified local purchase option before treating an online order as ready-to-use access.',
  customerQuestion:'Will a mailed permit arrive before our trip, or should we arrange an in-person purchase?',
  decisions:[
   {label:'Show the delivery condition before the online link',body:'Place the issuing authority’s current mailing guidance beside the purchase action. An illustrative visitor departing in five days should see the short-notice alternative before choosing shipment. Do not present a purchase receipt as an immediately usable permit unless the authority says it is one.'},
   {label:'Give local purchase its own availability check',body:'Link the authority’s current vendor list and explain that the chosen location’s hours and permit stock need confirmation. A rental shop advertising passes can be a place to ask, but the website should not infer today’s stock or extend shop hours from a trail’s operating schedule.'},
   {label:'Keep the permit year with the planned ride',body:'Show the validity period and the current authority information together. A late-year purchase should not be described as twelve months of access. Keep rental arrangements separate so collecting a machine does not silently stand in for obtaining the appropriate permit.'}
  ],
  ownerInputs:['Current official mailing and validity information.','The verified in-person purchase destinations and how visitors confirm hours and stock.','Which permit arrangements, if any, belong to the operator’s rental offer.'],
  sourceBridge:'Trailblazers Outfitters in Williamson says its rental-and-repair shop carries trail passes. Hatfield–McCoy Trails warns that online permit shipping can take 10–14 days and advises against online purchase for visits within two weeks. Its permit page also tells visitors to verify vendor hours and stock and describes calendar-year validity.',
  limits:'The trail authority determines permit terms and the seller confirms availability. This page does not establish that a particular permit is suitable or in stock. It explains a purchase decision; permit sales, fulfillment and rental integrations require separate scope.',
  coverageNote:'Trailblazers identifies its rental-and-repair location at 1705 Third Avenue in Williamson, Mingo County. Wonder and Method works remotely from Buffalo; the named operator is a public example.',
  sources:[source('https://trailblazersoutfitters.com/rental-and-repair','Trailblazers Outfitters: Williamson shop and passes','Lists the Third Avenue rental-and-repair shop and says it carries trail passes.'),source('https://trailsheaven.com/how-to-get-a-permit/','Hatfield–McCoy Trails: mailing and local permit purchase','Publishes a two-week mailing caution, vendor stock/hour caveats and the stated permit validity period.')],
  check:'A hypothetical five-day departure leads to checking a current local purchase option; no receipt, shop listing or rental booking is presented as a permit already in hand.',
  researchNote:'Operator and current authority permit pages read directly. Do not infer dealer-list membership, daily-permit eligibility, next-year release dates or exact current stock. Older authority PDFs and third-party price summaries were not adopted.'
 }
];
