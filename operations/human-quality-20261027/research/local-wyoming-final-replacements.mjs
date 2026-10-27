const source=(url,label,observation)=>({url,label,observation});
export const replacements=[
 {
  route:'/areas/wyoming/lincoln-county/',partition:6,
  heading:'Keep next-season booking separate from last season’s prices.',
  intro:'A seasonal attraction can reopen reservations before every page has been updated. The booking year, displayed rates and destination link need to tell the same story before someone plans a trip.',
  customerQuestion:'Am I choosing the next operating season, and which price information actually applies to that booking?',
  decisions:[
   {label:'State the season at the booking decision',body:'Place the operating-season status beside the main reservation action. A visitor arriving from a saved dig description should see whether the current season has ended and which season is being offered next. Keep an old date from looking like current availability.'},
   {label:'Label older rates until the new rates are approved',body:'Separate a historical price table from the terms for a future visit. The operator should approve replacement figures or an explicit instruction to check the current booking service. Do not silently relabel last season’s amounts or use a general change notice to imply they are the next season’s confirmed rates.'},
   {label:'Check every reservation entry point',body:'Trace the prominent button, page navigation and footer reservation link to the operator’s approved destination. If the page links to different booking providers, identify the current route before removing or promoting one. Compare the displayed season and offer description without submitting a reservation.'}
  ],
  ownerInputs:['The next operating season and the date each offer becomes available.','Approved new-season rates or wording that clearly labels older prices.','The authoritative booking destination and the list of pages that link to it.'],
  sourceBridge:'American Fossil’s homepage says its 2026 season is closed and invites 2027 bookings, while its displayed price table is labeled 2026. The page also contains booking links to two different providers. Those visible differences make season and destination reconciliation a concrete website task.',
  limits:'The operator approves current dates, prices and the booking service. Neither published link has been established here as authoritative. No booking, payment or live-inventory check was submitted.',
  coverageNote:'Fossil Basin’s promotion board identifies American Fossil near Kemmerer in Lincoln County. Wonder and Method is a Buffalo studio working remotely; the quarry is a public planning example, not a client.',
  sources:[source('https://www.fishdig.com/','American Fossil: season, rates and booking links','Shows the 2026 closure, 2027 booking invitation, a price table labeled 2026, and reservation links to Singenuity and FareHarbor.'),source('https://fossilbasin.org/2022/07/22/quarry-stories-american-fossil-quarry/','Fossil Basin: American Fossil quarry profile','Local promotion board identifies American Fossil in Lincoln County.')],
  check:'A visitor planning a 2027 dig does not mistake the 2026 price table for confirmed 2027 terms, and the owner can identify the approved destination for each booking link.',
  researchNote:'Homepage read October 27; local relationship retains the earlier primary promotion-board source. No conclusion about either booking provider is inferred. Distinct from Trego’s arrival-directions/GPS-warning task.'
 },
 {
  route:'/areas/wyoming/natrona-county/',partition:6,
  heading:'Distinguish a meeting room’s presentation features from the equipment supplied.',
  intro:'A room with a projection screen is not necessarily a room with every device a presenter needs. Explain the published features and the remaining questions before an organizer relies on them for a meeting.',
  customerQuestion:'What presentation equipment is included, and what must we arrange or confirm ourselves?',
  decisions:[
   {label:'Name the actual included item',body:'Label a screen as a screen rather than expanding it into a complete audiovisual package. A fictional organizer arriving with a laptop should see what the room description establishes and what staff still needs to confirm. Do not imply that a projector, adapters or audio equipment are supplied simply because a screen is listed.'},
   {label:'Describe capability without promising a connection',body:'Treat conference-phone capability as a question to resolve for the intended meeting. Ask the organizer whether remote participation matters and route that requirement to staff. Avoid presenting an untested connection, handset, internet service or video platform as included.'},
   {label:'Carry the agreed equipment into preparation',body:'Once the venue confirms the arrangement, record which party brings each necessary item and how a pre-event check is arranged. Keep those responsibilities with the room information. Choosing the space should not silently settle who supplies or operates presentation equipment.'}
  ],
  ownerInputs:['The exact screen, devices and accessories included in the room rental.','What conference-phone capability means in the current facility and how it is arranged.','The contact and process for confirming presenter equipment and a preparation check.'],
  sourceBridge:'Casper/Natrona County International Airport describes its Training Room as including a projector screen and having conference-phone capability. The published description does not identify a complete presentation or remote-meeting equipment package. That distinction should remain clear in the rental introduction.',
  limits:'Venue staff confirms the actual equipment and connection arrangements. Missing details are questions, not claims that equipment is unavailable. No connection, device, room layout or reservation was tested; audiovisual installation and booking integration require separate scope.',
  coverageNote:'The airport’s facility-rental page identifies the Training Room at Casper/Natrona County International Airport. Wonder and Method works online from Buffalo; this is a public planning example, not a client or inspected venue.',
  sources:[source('https://iflycasper.com/facility-rentals/','Casper/Natrona County International Airport: Training Room features','Lists use of a projector screen and conference-phone capability, with an administration contact for reservations and information.')],
  check:'A fictional laptop presenter identifies the listed screen and knows to confirm projection, sound and remote-participant needs before treating the room as fully equipped.',
  researchNote:'Facility-rental page read October 27. No projector, handset, adapter, internet connection or video platform inferred. Distinct from Kanabec’s capacity/furniture/setup comparison.'
 }
];
