# A ferry ticket, a vehicle reservation and priority boarding are different promises

Researched website-planning draft · October 22, 2026 · not published

**For:** Island accommodation, equipment-rental and service businesses whose customers depend on ferry travel.

An arrival form with a single “ferry booked” checkbox hides several different states. A guest may have paid for passenger travel while still lacking vehicle space; another may have priority boarding without a reserved departure. The business needs the uncertainty that affects its own check-in, delivery or appointment, without trying to operate the ferry reservation.

## What the sources establish

- **Ottawa County, OH:** Miller’s Put-in-Bay page says passenger and personal-vehicle reservations are not required. Vehicle and motorcycle fares exclude passengers; trailers are charged in addition to the vehicle, and bike/luggage racks cost extra. [Put-in-Bay | Miller Ferry](https://millerferry.com/put-in-bay/).
- **Washington County, RI:** Vehicle reservations are made by telephone and require vehicle and driver details. The operator asks about attachments and total height, requires vehicle check-in one hour before departure, and sells driver/passenger tickets separately. A canceled sailing cancels the vehicle reservation and customers must call to reschedule. [Vehicle Reservations | Block Island Ferry](https://www.blockislandferry.com/vehicle-reservations/).
- **Dukes County, MA:** The Steamship Authority describes vehicle standby between Woods Hole and Martha’s Vineyard except during reservation-only periods. It names holiday periods and summer Friday-through-Monday restrictions; standby vehicles are generally loaded after reserved vehicles when space remains. [Frequently Asked Questions | Steamship Authority](https://www.steamshipauthority.com/about/faqs).
- **Nantucket County, MA:** Hy-Line carries passengers, not cars. The operator says tickets must be collected 30 minutes before departure, may release places when travelers are not ticketed/in line 15 minutes before departure, and will not process changes or cancellations by email. Canceled sailings make reservations open-ended for rebooking rather than automatically refunded. [Island Ferry FAQs | Hy-Line Cruises](https://www.hylinecruises.com/faqs/).
- **Mackinac County, MI:** Enhanced boarding does not guarantee a particular departure. If capacity is reached, remaining enhanced-ticket holders wait for another boat; ordinary tickets are valid for any departure in the stated season. [Shepler's Ticket Options](https://www.sheplersferry.com/ticket-options/).

These are particular operators’ published policies as reviewed on the research date, not county-wide practices. The recommendations below are original analysis and proposed interface specifications. They do not describe a completed project, measured result, partnership, field visit or service offered by Wonder and Method.

## Ask what the booking actually secures

Start with travel mode, route and whether a vehicle is necessary for the customer’s plan. For a vehicle-dependent job, an unreserved car crossing remains a timing dependency even if the passengers have tickets. Keep operator rules attached to the selected route; none of these examples establishes a universal island policy.

## Keep two businesses’ changes separate

A ferry cancellation does not establish the accommodation’s refund policy, and an accommodation cancellation does not change a ferry booking. A disruption message should identify the action with each business, who has confirmed it, and what remains unresolved. Do not describe an email to the accommodation as a ferry change request.

## Avoid false precision

Link current fares and schedules instead of publishing a combined fare calculator without the operator’s complete rules. If a customer selects standby or enhanced boarding, show that the intended arrival is provisional. Ask for an arrival range only as planning information; do not turn it into a guaranteed sailing.

## Proposed artifact

Illustrative specification for adaptation to a real business. Bracketed text requires the responsible owner’s actual details.

| Field or state | Proposed display | Staff action |
|---|---|---|
| Travel mode | Foot passenger / bringing a vehicle / undecided | Resolve car-dependent property or delivery needs. |
| Operator and route | Select the actual service; link its current conditions | Apply that service’s rules, not an island-wide assumption. |
| Transport status | Reserved departure / vehicle standby / ticket without reserved departure / not arranged | Keep uncertain arrivals visible. |
| Party and vehicle fares | Confirm whether passenger tickets are separate from vehicle space | Do not quote one component as the full journey price. |
| Disruption | Contact the ferry operator for travel changes; contact us separately about [our arrangement] | Record both confirmations before promising a revised arrival. |

## Review case

A customer selects Shepler’s enhanced boarding and a tightly timed activity. The form must not record a guaranteed sailing. A second customer has a Block Island vehicle reservation but no passenger tickets; the checklist must still show the separate passenger step.

**Evidence still needed before using this for a business:** The business’s actual arrival flexibility, cancellation terms, supported transport routes and current operator policies. Store only travel details needed for the arrangement, never payment information for another provider.

**Why the source example matters:** The five operators supply conflicting booking semantics. A single generic “book the ferry” instruction cannot accurately cover them.

**Editorial placement:** Extend the reservation-ownership collection alongside the NY Hamilton guide; this comparison should remain one article, not five county service pages.

[Research result](../README.md) · [All source candidates](../CANDIDATES.md)
