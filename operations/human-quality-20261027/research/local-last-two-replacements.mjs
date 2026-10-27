const source=(url,label,observation)=>({url,label,observation});
export const replacements=[
 {
  route:'/areas/wyoming/sweetwater-county/',partition:6,
  heading:'Match a reproduction request to the right format and quantity unit.',
  intro:'A photograph, a scanned document and a paper copy can be priced in different ways. Help the researcher identify the output they need and the number of images or pages involved before asking staff for a total.',
  customerQuestion:'Am I requesting a print, a digital photograph or document pages, and how should I describe the quantity?',
  decisions:[
   {label:'Choose the output before reading the price row',body:'Group photographic prints, digital photographs, digital documents and photocopies under clear labels. A researcher wanting a document scan should reach that category without interpreting photographic print dimensions. Keep the item reference with the selected output so staff can check the right material.'},
   {label:'Keep pages distinct from files and images',body:'Show the quantity unit beside each relevant price category. In a fictional request for ten document pages, putting them in one PDF would not turn the description into one photographic image. Ask for the requested pages or image references and let staff confirm how they will supply and charge for the copies.'},
   {label:'Explain what a no-use-fee statement covers',body:'Keep the policy for personal or nonprofit use separate from the reproduction categories. A reader should not mistake no use fee for a promise that producing the chosen copy costs nothing. Give staff the format, quantity and purpose together so they can explain the applicable charges without an unsupported instant-price calculator.'}
  ],
  ownerInputs:['Current reproduction formats and the references needed to identify the requested material.','The unit used for each category, plus any file-quality or format adjustments.','Approved wording about reproduction charges, use fees and staff confirmation.'],
  sourceBridge:'Sweetwater County Historical Museum’s linked schedule prices photographic prints by size, digital photographs per image, and digital documents and photocopies per page. Its separate policy says personal or nonprofit use has no use fee. That makes format and quantity labeling important to a useful request.',
  limits:'Museum staff confirms available formats, applicable charges and permissions. The ten-page example is hypothetical; the page does not promise a particular file package, calculate an amount or grant reuse rights. No copy or payment was ordered.',
  coverageNote:'Sweetwater County Historical Museum lists its address in Green River. Wonder and Method works online from Buffalo; the museum is a public planning example, not a client or partner.',
  sources:[source('https://www.sweetwatermuseum.org/explore/research','Sweetwater County Historical Museum: research and reproduction route','Links its reproduction fee schedule and identifies the museum in Green River.'),source('https://www.sweetwatermuseum.org/images/swchm_fee_schedule.pdf','Sweetwater County Historical Museum: reproduction fees and procedures (PDF)','Separates reproduction formats and commercial service fees; states that personal/nonprofit use has no use fee and that copies and additional uses need staff approval.')],
  check:'A fictional researcher requesting ten document pages preserves the page count even when asking about one PDF, and does not interpret no use fee as free reproduction.',
  researchNote:'Research page and both PDF pages read October 27. Revised after comparison with Nicollet: removes the publication-permission and later-reuse sequence, concentrating on output categories and per-page/per-image/print-size units. Exact amounts and unclear commercial thresholds are omitted; staff confirms the total.'
 },
 {
  route:'/areas/wyoming/washakie-county/',partition:6,
  heading:'Put an event exclusion at the form’s own entrance.',
  intro:'A visitor can reach a rental form without reading the venue’s main rental page. If a type of event is not offered, explain that before asking the organizer to assemble dates, room choices and technical needs.',
  customerQuestion:'Is my type of event eligible before I spend time completing this rental request?',
  decisions:[
   {label:'State the excluded event before the fields',body:'Put the venue’s approved event-type limitation at the start of the request page. A visitor using a saved link should encounter the same rule as someone entering through the rental overview. Keep the wording plain enough to distinguish an excluded event from an unavailable date.'},
   {label:'Keep eligible requests easy to describe',body:'For supported events, explain that the form begins a staff conversation about dates, rooms and requirements. A fictional business workshop can continue with the ordinary request details. An unusual event should have a question route rather than being encouraged to choose a misleading event description.'},
   {label:'Maintain the rule across entry points',body:'Check the overview, standalone form and any downloadable rental information whenever accepted event types change. Put one person in charge of the approved wording. Removing an old invitation from the main page is incomplete if a direct form or shared document still implies the former offer.'}
  ],
  ownerInputs:['Current supported event types and the exact excluded-event wording.','The question route for an event that does not clearly fit the listed categories.','All rental entry points, downloadable information and the person responsible for updates.'],
  sourceBridge:'Washakie Museum’s rental landing page says wedding rentals are unavailable. Its linked standalone request page asks for organization, dates, event description, rooms and technical needs without repeating that exclusion in the extracted form text. A visitor can therefore encounter the form separately from the rule.',
  limits:'The venue decides which events it accepts and confirms each request. This proposal concerns consistent eligibility information; no form submission or booking was tested. It does not infer a hidden validation defect or quote the dated equipment and rate document as current terms.',
  coverageNote:'Washakie Museum and Cultural Center lists its address at 2200 Big Horn Avenue in Worland. Wonder and Method works remotely from Buffalo; the museum is a public planning example, not a client engagement.',
  sources:[source('https://www.washakiemuseum.org/facility-rental.html','Washakie Museum: current rental exclusion','The landing page excludes wedding rentals and links a separate request form.'),source('https://www.washakiemuseum.org/rental-request-form.html','Washakie Museum: standalone request introduction','Describes staff follow-up and asks for event, room and technical details; the extracted page does not repeat the wedding exclusion.')],
  check:'A fictional visitor entering directly on the request page sees the excluded event type before preparing the form, while an eligible workshop can describe its needs without an implied reservation.',
  researchNote:'Both current HTML pages read October 27 including all extracted form text. No claims about unseen validation or actual submission. The dated 2023 equipment PDF is excluded from the new factual brief. Distinct from Lemhi’s room-change, audiovisual and kitchen-use comparison.'
 }
];
