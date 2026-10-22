# Show the check-in time, ticket step and time zone before the booking handoff

Researched website-planning draft · October 22, 2026 · not published

**For:** Experience sellers and accommodation businesses assembling itineraries around timed activities.

A departure time is not always the time a visitor should arrive, and an order confirmation is not always the ticket used to board. A useful itinerary preserves those distinctions across the website, the external booking system and the customer’s confirmation.

## What the sources establish

- **Hocking County, OH:** The operator requires arrival 30 minutes before the reserved tour and says late arrivals cannot join or receive a refund. It distinguishes the base tour from a SuperZip bundle; group rates are weekday-only and obtained by calling. [The Original Canopy Tour | Hocking Hills Canopy Tours](https://www.hockinghillscanopytours.com/tour-overview/).
- **Lower Connecticut River Valley Planning Region, CT:** The operator offers a one-hour train-only trip or a roughly two-and-a-half-hour train-and-boat trip. It requires ticket-window check-in 30 minutes before departure and states tickets are not mailed or emailed; advance purchase is suggested, with walk-up availability not guaranteed. [Train & Boat | Essex Steam Train & Riverboat](https://essexsteamtrain.com/train-boat/).
- **Edmonson County, KY:** NPS states that cave entry requires a tour ticket, options range from wheelchair-accessible to crawling tours, and the park operates in Central Time. [Mammoth Cave Tours](https://www.nps.gov/maca/planyourvisit/cave-tours.htm).

These are particular operators’ published policies as reviewed on the research date, not county-wide practices. The recommendations below are original analysis and proposed interface specifications. They do not describe a completed project, measured result, partnership, field visit or service offered by Wonder and Method.

## Keep preparation on the selected product

Hocking Hills Canopy Tours has an earlier arrival requirement and a separate group-rate contact path. Essex Steam Train distinguishes the train-only and train-and-boat products, and requires physical ticket collection. Product selection should carry its duration, inclusions, check-in and booking channel into the handoff.

## Name the time zone

Mammoth Cave operates in Central Time. Display the zone alongside the event time in both the itinerary and confirmation; do not assume a visitor’s device time or another Kentucky stop uses the same zone. Only calculate a travel plan after the actual starting point and selected activities are known.

## Model entitlement separately from inventory

A membership, pass or daytime admission can be different from a timed reservation or special-event ticket. The supporting cases below are useful tests for this same guide, rather than six reasons to create more articles. A group booking also needs the group route, not advice intended for an individual walk-up.

## Proposed artifact

Illustrative specification for adaptation to a real business. Bracketed text requires the responsible owner’s actual details.

| Proposed booking card | Display or behavior | Review rule |
|---|---|---|
| Selected experience | Exact product, duration and inclusions from the operator | A bundle must remain distinct from its base option. |
| Time | Departure or entry: [time] [named zone] | Do not silently convert without retaining the operator’s zone. |
| Earlier action | Check in or collect tickets: [deadline and location] | Put this before the departure in chronological order. |
| Proof | Physical ticket collection / downloaded ticket / other operator instruction | Do not call every email a boarding ticket. |
| Booking status | Requested / confirmed by [operator] / separate admission still needed | Only the actual confirmation establishes a reservation. |
| Special channel | Group or other arrangement: contact [operator route] | Preserve a telephone or group-only route when required. |

## Review case

A visitor schedules a second activity immediately after the shorter Essex train-only trip but selects train-and-boat during purchase. The itinerary must be reviewed for the changed duration. A Mammoth Cave reservation must retain Central Time even when the visitor planned the trip elsewhere.

**Evidence still needed before using this for a business:** The selected operator’s current check-in instructions, late-arrival policy, product duration and ticket proof. Confirm any group or member entitlement before using a custom booking flow.

**Why the source example matters:** These cases expose different objects in a booking flow: product, arrival deadline, departure time, time zone, proof and entitlement. Each can be tested independently.

**Editorial placement:** Extend the NY Essex and Hamilton separate-reservation guides. Supporting cases should be short examples within the collection, not separate county essays.

## Supporting checks for the same design

- **Southeastern Connecticut Planning Region, CT:** An accommodation concierge or package page should branch member entry from guest-ticket purchase, avoid a stale fixed price, and distinguish the accommodation booking from timed attraction entry. [Source and limits](../CANDIDATES.md#connecticut-southeastern-connecticut).
- **Grafton County, NH:** A local itinerary or lodging page should avoid presenting the gorge as a flexible quick stop. Plan the full walking route and arrival window before scheduling another paid experience. [Source and limits](../CANDIDATES.md#new-hampshire-grafton).
- **Hancock County, ME:** A lodging concierge page should distinguish park entry from road access and include offline proof preparation before guests leave their accommodation. [Source and limits](../CANDIDATES.md#maine-hancock).
- **Page County, VA:** A local holiday package page should distinguish event access from daytime attraction access and state exactly which ticket the customer must buy. [Source and limits](../CANDIDATES.md#virginia-page).
- **District of Columbia, DC:** A group-tour or itinerary seller should secure the group route separately rather than presenting individual walk-up advice as a fallback for an entire coach party. [Source and limits](../CANDIDATES.md#district-of-columbia-district-of-columbia).
- **Buncombe County, NC:** A lodging concierge or package page should separate estate gate arrival from House entry time and clarify that a pass is not itself a House time reservation. [Source and limits](../CANDIDATES.md#north-carolina-buncombe).

[Research result](../README.md) · [All source candidates](../CANDIDATES.md)
