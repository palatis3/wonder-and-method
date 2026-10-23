# Independent review: round05 Florida and New England packets (48 records)

Reviewed October 23, 2026 by the assigned Astra reviewer. Scope: all 24 records in `florida/round-05` and all 24 in `new_england_midatlantic/round-05`. Folder names are packet ownership labels: the records cover Tennessee and Kentucky. No author, frozen, approved, site or deployment file was changed.

**Result: 44 original records pass; Morgan, Washington and Whitley pass only with the separately reviewed overrides below; Simpson is conditionally approved only with the exact review patch. Thus 47 are accepted as identified and one has a concrete integration condition. There are no remaining source-fact or geographic-evidence holds. This is content acceptance, not publication confirmation.**

The fixed comparison authority is the requested 457-record candidate plus five primary-approved round03 files containing 187 records (644 total). The site candidate does not mean all 457 were live: the primary reported 265 production records at assignment. Later approvals did not restart this review. The exact seven supplemental complete records read beyond the fixed baseline are listed in `round05-fl-ne-supplemental-comparisons.json`; comparable submitted records within these 48 were also read in full.

Review method: complete draft and assessment records; substantive first-party source bodies rather than titles, navigation, snippets or blocked pages; actual retained geographic responses and official municipality relationships; full relevant current comparison records, with stronger matches found by targeted content searches. Search similarity located comparisons and was not treated as a rejection score. A repeated industry or general principle is permitted when the source-specific content and practical tool remain useful. The general guides were read as supporting frameworks, not counted as proof of county-specific value.

## Exact replacement and conditional acceptance

| Record | Accepted draft SHA-256 | Matching assessment SHA-256 | Location |
|---|---|---|---|
| tennessee/morgan | `d06046f4c6686742d80caa68dd1b52e4892cf594595bbd6f3b25f0b5f7fe3e31` | `0338e9518f6dcfb38f52eb6dcdcb11632b5abf061ed1f5f0679e33c6e848e13f` | `primary-revisions/morgan-sequence` |
| kentucky/washington | `86d1060aef30cd677e04f031e46dc3e0a66660dfb53c83fbba0b0a3708a45231` | `d00ce0833158435a17531bb53dd20f810ef014873ce2e29bacbe0371804d1410` | `primary-revisions/washington` |
| kentucky/whitley | `b63901efa769b4988f762311ba30ab286c527105df80a1e7b3340120c4b44351` | `1a0513dcfb220f47fd48f8d484bfb650307189c272e8d56643510c0e2848ab90` | `primary-revisions/whitley` |

**Simpson:** apply the exact `fields` and `assessmentFields` in `round05-fl-ne-simpson-patch.json` to an integration copy. `round05-fl-ne-simpson-proposed-record.json` shows the complete resulting draft. The original merely repeats the file/drawing/sample distinction already treated by Duval and Cecil. The replacement makes its proposed mixed-reference case concrete: identify each reference, map it to an intended feature, retain changed/conflicting information, and leave specification precedence for human review. No claim is made that Kleencut currently uses this tool. The patch records both the original and expected merged canonical record hashes; the final manifest also records the patch file-byte hash. Until those exact edits are applied, the original Simpson worksheet remains unaccepted.

## Integrity and comparison metadata

All 376 original packet, frozen-batch and raw-evidence files in the initial manifest are unchanged. All six fixed authority files are unchanged. Exact checks are in `round05-fl-ne-integrity.json`; original per-record canonical hashes and override acceptance are in `round05-fl-ne-record-verdict-manifest.json`. The initial immutable snapshot remains in `round05-fl-ne-input-manifest.json`. Hashes certify identity; they do not replace the substantive review.

The original private assessments contain 45 noncanonical county-path references and 23 county references outside the fixed644 baseline. `round05-fl-ne-comparison-reference-map.json` maps every authored reference to the canonical path and labels baseline and supplemental status. In particular, Florida-packet references commonly omit `-county`; New York county URLs do not have a state segment. References to pending or later-approved pages are not represented as current644 authority. These are private comparison-metadata corrections; the authored files were preserved.

Geographic limits were retained rather than hidden: failed street matches use a narrower supported town/project/county relationship; Union’s directional mismatch and Washington’s Avenue/Road normalization are disclosed; Corbin and Oak Ridge rely on exact addresses; Bledsoe identifies a completed Pikeville project from a Chattanooga business; Macon identifies service coverage from Brentwood. No county service example was converted into a fictitious local office.

## Individual findings

### 1. tennessee/houston — pass

**Source and geography.** Magnum's complete process body explicitly separates tryouts/first articles and production if required. Erin address is corroborated by an exact ArcGIS point and matching Census county coordinates.

**Complete fixed-baseline comparisons.** `/areas/michigan/arenac-county/`, `/areas/ohio/ashtabula-county/`

**Added value and overlap.** Arenac already separates tooling and trial parts; Houston adds the purpose and stopping point of a run, including a die-repair tryout that is not a production order. The staged worksheet is useful without engineering or quantity promises.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Magnum Manufacturing: project stages](https://magnumtn.com/our-process).

### 2. tennessee/humphreys — pass

**Source and geography.** Complete Tennessee River Graphics services and homepage explicitly offer customer-pressed gang sheets separately from decorated apparel. Exact Waverly address matches Humphreys County.

**Complete fixed-baseline comparisons.** `/areas/florida/okaloosa-county/`, `/areas/vermont/rutland-county/`

**Added value and overlap.** Okaloosa addresses item sourcing and Rutland decoration-method preparation. Humphreys identifies the transferred physical output and pressing responsibility, with separate garment and sheet quantities.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Tennessee River Graphics: printing and gang sheets](https://www.tnrivergraphics.com/services), [Tennessee River Graphics: apparel and location](https://www.tnrivergraphics.com/).

### 3. tennessee/jackson — pass

**Source and geography.** Jordan Creek courses describes individual instruction and group readiness; homepage explicitly identifies Jackson County, corroborated by Census. The draft appropriately leaves placement to the instructor despite inconsistent skill-level language elsewhere.

**Complete fixed-baseline comparisons.** `/areas/florida/levy-county/`

**Added value and overlap.** Levy organizes horse ownership and lesson location; this draft adds the level of individual instructional support and the beginner-with-a-friend acceptance case.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Jordan Creek Farm: riding formats](https://www.jordancreekfarm.com/courses), [Jordan Creek Farm: location and services](https://www.jordancreekfarm.com/).

### 4. tennessee/jefferson — pass

**Source and geography.** The complete Best Kitchens article asks for appliance lists/model numbers, retained appliances and notice of changes; its homepage gives the Dandridge showroom address, matched to Jefferson County.

**Complete fixed-baseline comparisons.** `/areas/kentucky/bullitt-county/`, `/areas/clinton-county/`, `/areas/tennessee/bedford-county/`

**Added value and overlap.** Bullitt and Clinton already retain appliance constraints, but this draft develops four information states and an explicit old-versus-new model-change case. It avoids copying the article's technical and warranty advice.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Best Kitchens of Tennessee: appliance planning](https://www.bestkitchenstn.com/blog/appliance-planning-what-to-know-before-buying-appliances-for-your-new-kitchen), [Best Kitchens of Tennessee: showroom and project information](https://www.bestkitchenstn.com/).

### 5. tennessee/johnson — pass

**Source and geography.** The saved substantive web About capture contains the international telephone-order exception and Mountain City address. The normal direct capture is a challenge page and is not used as evidence. Census matches Johnson County.

**Complete fixed-baseline comparisons.** `/areas/kentucky/breathitt-county/`

**Added value and overlap.** Breathitt separates sympathy destinations; Johnson adds sender location versus recipient destination and the resulting online-versus-direct-contact route.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [House of Flowers: delivery area and ordering guidance](https://www.houseofflowersmountaincitytn.com/about-us).

### 6. tennessee/lake — pass

**Source and geography.** Boyette's complete homepage says it helps arrange local guides when a guest reserves; lodging page describes accommodation and telephone reservations. Exact address matches Lake County.

**Complete fixed-baseline comparisons.** `/areas/virginia/bath-county/`

**Added value and overlap.** Bath separates nearby third-party activities from lodging. This draft adds the host's coordination role and a lodging party that differs from activity participants, without claiming authority to confirm the guide.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Boyette’s Resort: stays and local-guide assistance](https://boyettesresort.com/), [Boyette’s Resort: accommodation choices](https://boyettesresort.com/lodging/).

### 7. tennessee/lauderdale — pass

**Source and geography.** Mont's substantive wedding text specifically names heirloom jewelry and brooch embellishments; About and Census corroborate Ripley. Proposed handling and return questions are explicitly left for owner agreement.

**Complete fixed-baseline comparisons.** `/areas/kentucky/boyd-county/`, `/areas/kentucky/breathitt-county/`

**Added value and overlap.** Boyd covers preserving meaningful jewelry; this draft adds actual keepsake versus visual reference within a bouquet and the separate event handoff. No attachment or object-acceptance guarantee is inferred.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Mont’s Flower Shop: wedding personalization](https://www.montsflowers.com/wedding-flowers), [Mont’s Flower Shop: Ripley location](https://www.montsflowers.com/about_us.php).

### 8. tennessee/lawrence — pass

**Source and geography.** Pro Rac's complete page explicitly discusses finishing-line context, samples, prototypes, new and refurbished racks. Census corroborates the listed Lawrenceburg contact address; the draft does not assign its county-line plant to one county.

**Complete fixed-baseline comparisons.** `/areas/michigan/hillsdale-county/`, `/areas/maine/york-county/`

**Added value and overlap.** Hillsdale explains tooling purpose and York line context; Lawrence develops the relation of supplied part samples, existing racks and the finishing operation, including refurbishment for a changed part family.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Pro Rac: tooling services, process and contact location](https://www.prorac.biz/).

### 9. tennessee/lewis — pass

**Source and geography.** Complete Oliver service and technical-support pages explicitly distinguish operation/feature questions from repair/parts/warranty service. Hohenwald address matches Lewis County.

**Complete fixed-baseline comparisons.** `/areas/kentucky/pulaski-county/`

**Added value and overlap.** Pulaski separates faults from desired upgrades. This draft adds a product-understanding question that need not imply any fault, while preserving an uncertainty route and follow-up reference.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Oliver Travel Trailers: service requests](https://olivertraveltrailers.com/service/), [Oliver Travel Trailers: product support](https://olivertraveltrailers.com/technical-support/).

### 10. tennessee/lincoln — pass

**Source and geography.** Norman Furniture's repair body explicitly describes parts waits and delay communication; exact Fayetteville address matches Lincoln County. Numerical waits and warranty language are not adopted.

**Complete fixed-baseline comparisons.** `/areas/tennessee/shelby-county/`, `/areas/florida/sumter-county/`

**Added value and overlap.** Shelby addresses access and arrangements; Sumter distinguishes pickup, repair and return. Lincoln adds which event a timing statement describes: component arrival, repair completion or handoff.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Norman Furniture: repair work and parts delays](https://www.norman-furniture.com/furniture-repair-service/).

### 11. tennessee/macon — pass

**Source and geography.** 615 Garage Designs explicitly lists Lafayette service and describes workbenches/craft stations, drawers and cabinetry. The draft correctly identifies its Brentwood base rather than inventing local premises.

**Complete fixed-baseline comparisons.** `/areas/tennessee/sullivan-county/`, `/areas/delaware/kent-county/`

**Added value and overlap.** Sullivan already begins with storage activities. Macon's active work surface versus nearby stored supplies is a concrete extension, with retained garage uses and an activity-specific acceptance case.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [615 Garage Designs: cabinets and workspaces](https://www.615garagedesigns.com/garage-cabinets).

### 12. tennessee/marion — pass

**Source and geography.** Nickajack's complete contact body requests boat and diagram-location preferences; wet-slip body explicitly says Marion County outside Jasper city limits. ArcGIS coordinates checked in Census corroborate the county.

**Complete fixed-baseline comparisons.** `/areas/virginia/hopewell-city/`, `/areas/michigan/muskegon-county/`

**Added value and overlap.** Hopewell reviews rack dimensions and Muskegon storage inclusions. This draft adds an intelligible diagram preference without presenting a labeled space as available or assigned.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Nickajack Shores Marina: leasing inquiry](https://www.nickajackshoresmarina.com/contact), [Nickajack Shores Marina: wet-slip location](https://www.nickajackshoresmarina.com/wetslips).

### 13. tennessee/marshall — pass

**Source and geography.** PakFab corporate retrofit page explicitly describes reusing existing assets for a new product or process; Lewisburg capability/address capture and Census corroborate the local example.

**Complete fixed-baseline comparisons.** `/areas/ohio/brown-county/`, `/areas/florida/wakulla-county/`

**Added value and overlap.** Adds retained packaging asset, altered part/process and reuse review, beyond Brown application specifications or Wakulla design readiness.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [PakFab: packaging modifications](https://pakfab.com/services/retro-fit-and-modifications/), [PakFab: custom dunnage](https://pakfab.com/products/custom_dunnage/), [PakFab: Tennessee facility](https://pakfab.com/contact/usa-tennessee/).

### 14. tennessee/mcminn — pass

**Source and geography.** AIM substantive packing body explicitly accepts unpacked and partly boxed items and separates carrier shipping; Athens address matches McMinn.

**Complete fixed-baseline comparisons.** `/areas/massachusetts/middlesex-county/`, `/areas/massachusetts/suffolk-county/`

**Added value and overlap.** Middlesex already separates packing from shipping, but McMinn adds the present packing state and customer/supplier packaging contribution for a partially prepared parcel.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [AIM Athens: packing and shipping services](https://www.aimmailcenters.com/shipping/athens/110), [AIM Athens: packing materials and custom boxes](https://www.aimmailcenters.com/packing-materials/athens/110).

### 15. tennessee/mcnairy — pass

**Source and geography.** ProFab services explicitly describes site information, digital rendering and confirmation before fabrication. Selmer address matches McNairy.

**Complete fixed-baseline comparisons.** `/areas/kentucky/adair-county/`, `/areas/florida/wakulla-county/`, `/areas/north-carolina/jones-county/`

**Added value and overlap.** Adair is the stronger overlap: image purpose and proof review already exist. The remaining useful addition is stage/version identity across initial rendering, requested changes, accepted version and finished sign. This is a narrow pass, supported by the second scope and corrections row, not a claim that proof review itself is new.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [ProFab TN: custom-sign process](https://www.profabtn.com/services), [ProFab TN: Selmer location](https://www.profabtn.com/).

### 16. tennessee/meigs — pass

**Source and geography.** Hornsby Hollow describes water/electric sites, dump station, office-arranged pumping and office hotspot. Census corroborates Meigs.

**Complete fixed-baseline comparisons.** `/areas/virginia/dickenson-county/`, `/areas/vermont/essex-county/`

**Added value and overlap.** Adds where/how a facility is obtained: connection at the site, shared facility or separately arranged service, beyond comparing individual site categories and room equipment.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Hornsby Hollow: facilities and amenities](https://hornsbyhollowcampground.com/our-campground), [Hornsby Hollow: property location](https://hornsbyhollowcampground.com/).

### 17. tennessee/monroe — pass

**Source and geography.** Saved substantive Valley Building Supply delivery text explicitly discusses staged delivery and placing a load where needed; Madisonville geography matches Monroe.

**Complete fixed-baseline comparisons.** `/areas/florida/holmes-county/`, `/areas/virginia/fluvanna-county/`, `/areas/connecticut/capitol-planning-region/`

**Added value and overlap.** Adds distinct project-stage loads and changed receiving conditions for a later delivery. Holmes/Fluvanna already connect material with fulfillment but do not develop staged load handoffs.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Valley Building Supply: jobsite delivery](https://valleybuildingsupplytn.com/index.php/delivery/).

### 18. tennessee/moore — pass

**Source and geography.** Taylor Leatherwear explicitly asks for try-on before personal additions and describes return limitations. Retail Lynchburg and wholesale Tullahoma roles are distinguished. Wrong-direction Census match is excluded; exact South-address ArcGIS point resolves to Moore.

**Complete fixed-baseline comparisons.** `/areas/kentucky/hardin-county/`, `/areas/west-virginia/kanawha-county/`

**Added value and overlap.** Hardin already joins fitting and embroidery; Moore adds the specific try-on-before-personalization decision and preservation of unresolved fit before permanent details are requested.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Taylor’s Leatherwear: fit and customization FAQ](https://taylorsleatherwear.com/pages/faq), [Taylor’s Leatherwear: retail and mailing locations](https://taylorsleatherwear.com/pages/contact-us).

### 19. tennessee/morgan — pass-with-reviewed-override

**Source and geography.** Substantive saved normal-web service bodies support maintenance versus diagnostic work; direct challenge is excluded. Wartburg exact address matches Morgan.

**Complete fixed-baseline comparisons.** `/areas/kentucky/breckinridge-county/`, `/areas/ohio/wood-county/`, `/areas/kentucky/pulaski-county/`

**Supplemental complete comparisons.** `virginia/winchester-city` (later-approved or pending; exact status in supplemental manifest).

**Added value and overlap.** Original routine-care-plus-fault worksheet duplicates Breckinridge. Independently read complete primary revision: separate first/later occurrences, changes and post-visit observations with explicit approximate/unknown details are a substantive observation-sequence tool. The unchanged source supports diagnosis as an offered service; the proposed inquiry tool is expressly original analysis and makes no causal or remedy claim.

**Required correction.** Use only independently reviewed override at recorded hashes; preserve original frozen packet.

**Sources read.** [Ray Varner Ford Used Cars: service and diagnostic work](https://rayvarnerfordusedcars.com/service/comprehensive-auto-service-repairs/), [Ray Varner Ford Used Cars: service choices](https://rayvarnerfordusedcars.com/service/).

### 20. tennessee/obion — pass

**Source and geography.** Discovery Park event FAQ explicitly distinguishes venue furniture, client decor, outside rental chairs, setup and cleanup. Union City and exact ArcGIS/Census county evidence agree.

**Complete fixed-baseline comparisons.** `/areas/virginia/louisa-county/`

**Added value and overlap.** Adds item ownership/source to a responsibility matrix within the same furnished room, beyond Louisa requested placement/layout and collection readiness.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Discovery Park of America: event responsibilities](https://discoveryparkofamerica.com/visit/faqs/), [Discovery Park of America: event spaces](https://discoveryparkofamerica.com/venue-rentals/party-planners/).

### 21. tennessee/overton — pass

**Source and geography.** Bows product body names several blooming plants and a handled basket; Browns independently names dish gardens. Both Livingston addresses match Overton. Sold-out text is preserved as a limitation.

**Complete fixed-baseline comparisons.** `/areas/virginia/halifax-county/`, `/areas/putnam-county/`

**Added value and overlap.** Adds the internal plant-assortment/container composition and actual-gift handoff beyond material choice or service-route selection. No species or care advice inferred.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Bows Petals ’n Lace: dish-garden composition](https://bowspetalsnlace.com/products/color-crush-dishgarden-standard-prd-c29-5197s), [Browns Flower Shop: plants and dish gardens](https://www.brownsflowershoptn.com/about/).

### 22. tennessee/perry — pass

**Source and geography.** Clearwater body names rentals, own-boat shuttle and rental-only inclusion list; Linden exact ArcGIS point resolves through Census to Perry.

**Complete fixed-baseline comparisons.** `/areas/virginia/warren-county/`, `/areas/pennsylvania/clinton-county/`

**Added value and overlap.** Warren is stronger than listed matches and already includes mixed owned/rented equipment. Perry retains a narrower useful acceptance case: a shuttle-only customer must not inherit the paddle/PFD inclusion list of a rental. Avoid treating mixed equipment alone as novel.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Clearwater Kayak Rental: rental and shuttle offers](https://clearwaterkayakrentals.com/).

### 23. tennessee/pickett — pass

**Source and geography.** Eagle Cove Bigfoot Chalet substantive description explicitly distributes bedrooms two upper/two lower/one middle and shared living space main level. Address matches Pickett. Conflicting capacity numbers are not used.

**Complete fixed-baseline comparisons.** `/areas/north-carolina/currituck-county/`, `/areas/vermont/essex-county/`

**Added value and overlap.** Adds within-house spatial relationship of sleeping and shared rooms, beyond access to the home or room-specific meal equipment.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Safe Harbor Eagle Cove: lodging layouts](https://safeharborrentals.com/location/safe-harbor-eagle-cove/).

### 24. tennessee/polk — pass

**Source and geography.** Saved OAR tubing body and FAQ explicitly describe individual tubes with kayak guide versus shared guide-steered raft and mixed preferences. Benton address matches Polk.

**Complete fixed-baseline comparisons.** `/areas/pennsylvania/clinton-county/`

**Added value and overlap.** Adds craft-sharing and guide role within the same river section, beyond party/boat counts or section/release selection. No safety or eligibility generalization.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Outdoor Adventure Rafting: Lower Ocoee formats](https://ocoee.com/ocoee-river-tubing/), [Outdoor Adventure Rafting: ride-format questions](https://ocoee.com/frequently-asked-questions/).

### 25. kentucky/scott — pass

**Source and geography.** Fine Art Editions explicitly offers in-house framing and separate hanging/installation. Exact Georgetown address corroborates Scott.

**Complete fixed-baseline comparisons.** `/areas/virginia/fauquier-county/`, `/areas/new-hampshire/cheshire-county/`

**Added value and overlap.** Adds placement of an already-framed object and its destination contact, beyond artwork selection and coordinated display design.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Fine Art Editions: framing and installation](https://www.finearteditions.net/framing/).

### 26. kentucky/shelby — pass

**Source and geography.** Kile Signs explicitly distinguishes wall plaques from freestanding awards and selection support. Exact address corroborates Shelby.

**Complete fixed-baseline comparisons.** `/areas/indiana/tippecanoe-county/`, `/areas/kentucky/fayette-county/`

**Added value and overlap.** Adds display setting before object and inscription choice; Tippecanoe addresses order identity/destinations and Fayette supplied-object suitability.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Kile Signs: award forms and engraving](https://kilesigns.com/awards-engraving/).

### 27. kentucky/simpson — conditional

**Source and geography.** Kleencut laser-cutting body explicitly accepts CAD, drawings, prints and samples; company confirms Franklin. Town geography corroborates Simpson, without claiming failed street matches succeeded.

**Complete fixed-baseline comparisons.** `/areas/florida/duval-county/`, `/areas/maryland/cecil-county/`, `/areas/ohio/holmes-county/`

**Added value and overlap.** Original file/drawing/sample/output worksheet overlaps Duval and Cecil. The exact review patch maps each reference to the feature it establishes, preserves conflicting or superseded information, and hands unresolved requirements to staff; that realizes the useful mixed-reference case already present in scope two.

**Required correction.** Apply exact fields from round05-fl-ne-simpson-patch.json; original worksheet alone is not accepted.

**Sources read.** [Kleencut Technologies: cutting inquiry inputs](https://kleencuttechnologies.com/capabilities/laser-cutting/), [Kleencut Technologies: Franklin operation](https://kleencuttechnologies.com/company/), [Kleencut Technologies: current contact](https://kleencuttechnologies.com/contact/).

### 28. kentucky/spencer — pass

**Source and geography.** Full Taylorsville Lake Marina rental capture separately describes rentals, hired captains and lessons. Census and explicit county statement corroborate Spencer.

**Complete fixed-baseline comparisons.** `/areas/new-jersey/ocean-county/`, `/areas/virginia/accomack-county/`

**Added value and overlap.** Three different purposes—boat access, operating help, and learning—remain distinguishable. Ocean compares rental choices; the lesson-versus-captained-outing case adds useful preparation.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Taylorsville Lake Marina: rentals, captain hire and lessons](https://www.taylorsvillelakemarina.com/boatrentals).

### 29. kentucky/taylor — pass

**Source and geography.** Campbellsville Industries source explains reproduction from old drawings, photographs and dimensions, including a removed original; preliminary design precedes inspection. Exact address corroborates Taylor.

**Complete fixed-baseline comparisons.** `/areas/virginia/albemarle-county/`, `/areas/pennsylvania/cambria-county/`, `/areas/florida/miami-dade-county/`

**Added value and overlap.** Adds absent-original historical evidence, unknown dimensions and present-building context. Generic preview/restoration content does not replace this missing-feature worksheet.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Campbellsville Industries: planning and reproduction evidence](https://cvilleindustries.com/planning.html).

### 30. kentucky/todd — pass

**Source and geography.** Silver Creek identifies its calculator as a round-bin contents estimate at varying fill heights and offers storage construction. Census normalizes 1003 White to 1003 B White in Todd.

**Complete fixed-baseline comparisons.** `/areas/kentucky/harrison-county/`, `/areas/virginia/fluvanna-county/`

**Added value and overlap.** The contents estimate versus new construction brief is materially different from a material-order quantity estimate or a construction-component request. It does not calculate or validate grain quantities.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Silver Creek Construction: calculator purpose](https://silvercreekllc.net/grain-bin-calculator/), [Silver Creek Construction: grain-storage services](https://silvercreekllc.net/about/), [Silver Creek Construction: Elkton contact](https://silvercreekllc.net/contact/).

### 31. kentucky/trigg — pass

**Source and geography.** Prizer Point lodging body groups unlike accommodations by sleeping capacity. Cadiz-Trigg official tourism county-map text independently names Prizer Point; no failed street geocode is promoted to a match.

**Complete fixed-baseline comparisons.** `/areas/vermont/essex-county/`, `/areas/virginia/page-county/`

**Supplemental complete comparisons.** `michigan/ontonagon` (later-approved or pending; exact status in supplemental manifest).

**Added value and overlap.** Adds comparison of unlike named units under one shared capacity heading. Page already compares stay types; Trigg makes the capacity grouping and retained unit identity concrete.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Prizer Point: lodging choices and reservation handoffs](https://prizerpoint.com/rentals/).

### 32. kentucky/trimble — pass

**Source and geography.** Richwood expressly makes Tasha dependent on Richwood Suite and explains their shared bathroom. Exact Milton address corroborates Trimble.

**Complete fixed-baseline comparisons.** `/areas/vermont/essex-county/`

**Supplemental complete comparisons.** `michigan/ontonagon` (later-approved or pending; exact status in supplemental manifest).

**Added value and overlap.** Adds whether a named room can be reserved independently, beyond layout and shared-amenity comparisons. The dependent-room acceptance case is concrete.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Richwood on the River: room relationships](https://richwoodontheriver.com/lodging-amenities-2026/), [Richwood on the River: Milton property](https://richwoodontheriver.com/contact/).

### 33. kentucky/union — pass

**Source and geography.** H&R Morganfield substantive service copy explicitly accepts construction brands it does not sell and identifies Union coverage. East/west Census mismatch is disclosed and not used as parcel proof.

**Complete fixed-baseline comparisons.** `/areas/kentucky/madison-county/`

**Supplemental complete comparisons.** `kentucky/henry` (later-approved or pending; exact status in supplemental manifest).

**Added value and overlap.** Separates positive repair coverage from sales logos; the actual machine and work still require review. Henry handles manufacturer component responsibility, not this wider service offer.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [H&R Agri-Power: Morganfield repair coverage](https://www.hragripower.com/locations/kentucky/morganfield-construction-equipment-repair-service).

### 34. kentucky/washington — pass-with-reviewed-override

**Source and geography.** Barber source supports Springfield manufacturing and separate regional showrooms. Census confirms Washington with Avenue/Road normalization disclosed.

**Override evidence.** The complete new Barber door/finish body explicitly permits combining choices, explains lighting and natural grain variation, and invites showroom sample viewing. Existing Springfield geography remains valid.

**Complete fixed-baseline comparisons.** `/areas/north-carolina/caldwell-county/`, `/areas/maine/lincoln-county/`, `/areas/florida/citrus-county/`, `/areas/florida/columbia-county/`, `/areas/ohio/holmes-county/`

**Supplemental complete comparisons.** `indiana/adams` (later-approved or pending; exact status in supplemental manifest), `ohio/miami` (later-approved or pending; exact status in supplemental manifest).

**Added value and overlap.** Original location-purpose table duplicates Caldwell. The reviewed override instead gives two explicit comparisons: retain the door while comparing finishes, and retain the finish while comparing doors. This produces an unresolved sample question rather than only preserving a selected pair. Full Adams and Lincoln comparisons are close but do not provide that one-change sequence. Actual Barber body supports mixed choices, lighting/grain variation and showroom samples; the tool is expressly proposed analysis.

**Required correction.** Use only independently reviewed override at recorded hashes; preserve original frozen packet.

**Sources read.** [Barber Cabinet Company: door styles, finishes and sample guidance](https://barbercabinetco.com/door-styles-finishes/), [Barber Cabinet Company: Springfield production](https://barbercabinetco.com/about/).

### 35. kentucky/wayne — pass

**Source and geography.** Star Houseboat company body ties feasible renovation ideas to existing construction and offers design/furnishing work. Monticello town relationship supports Wayne; unmatched street variants are disclosed.

**Complete fixed-baseline comparisons.** `/areas/rhode-island/bristol-county/`, `/areas/michigan/charlevoix-county/`, `/areas/florida/indian-river-county/`

**Supplemental complete comparisons.** `maryland/somerset` (later-approved or pending; exact status in supplemental manifest).

**Added value and overlap.** Adds construction uncertainty behind a desired houseboat layout, distinct from phased refit planning and project attribution. Unknown constraints remain questions, not approved conversions.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Star Houseboat: renovation review and interiors](https://starhouseboat.com/), [Star Houseboat: Monticello location](https://starhouseboat.com/company/), [Star Houseboat: contact](https://starhouseboat.com/contact/).

### 36. kentucky/webster — pass

**Source and geography.** Phoenix body explicitly describes container replacement on retained towers, raising/lowering and relocation. Specific Sebree contact-section address matches Webster; conflicting footer address is not published.

**Complete fixed-baseline comparisons.** `/areas/north-carolina/cabarrus-county/`

**Added value and overlap.** Uses the existing-asset retention principle for container versus tower and changed position/location. The industrial modification brief keeps those actual alternatives distinct without engineering promises.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Phoenix Fabricators: tank modifications](https://phoenixtank.com/capabilities/tank-modifications/), [Phoenix Fabricators: Kentucky facility](https://phoenixtank.com/contact/).

### 37. kentucky/whitley — pass-with-reviewed-override

**Source and geography.** Alan Galleries supplies separate frame styles and colors, ready-made/custom offers and Corbin address. Exact Census match resolves Whitley despite the multi-county city.

**Override evidence.** Fresh complete mats, traditional-framing and contact bodies establish the relevant service and discussion route; exact `107 S MAIN ST, CORBIN` Census match returns Whitley GEOID 21235. Signature/caption scenarios are clearly proposed analysis.

**Complete fixed-baseline comparisons.** `/areas/virginia/galax-city/`, `/areas/north-carolina/catawba-county/`, `/areas/michigan/emmet-county/`, `/areas/florida/monroe-county/`, `/areas/ohio/athens-county/`, `/areas/virginia/fauquier-county/`, `/areas/connecticut/western-connecticut-planning-region/`

**Supplemental complete comparisons.** `indiana/boone` (later-approved or pending; exact status in supplemental manifest).

**Added value and overlap.** Original style/color/context/supply matrix repeats existing framing tools. The reviewed override uses whole-piece versus image-only evidence and an important signature/caption outside the main image, then preserves conflict with a preferred tight-border example. Monroe already handles visible canvas edges; this complete flat-piece and inscription preparation case adds useful work without claiming a unique general principle. Actual mats, framing-help and contact bodies support the service context; no mounting method, material performance, opening dimensions or alteration permission is inferred.

**Required correction.** Use only independently reviewed override at recorded hashes; preserve original frozen packet.

**Sources read.** [Alan Galleries: mat options](https://www.alangalleries.com/new-page-1), [Alan Galleries: framing discussion](https://www.alangalleries.com/new-page), [Alan Galleries: shop address](https://www.alangalleries.com/contact).

### 38. kentucky/wolfe — pass

**Source and geography.** Complete Southeast Mountain Guides web bodies explicitly contrast unguided-but-supervised Via Ferrata after orientation with private guided climbing. Exact Campton address confirms Wolfe.

**Complete fixed-baseline comparisons.** `/areas/north-carolina/jackson-county/`, `/areas/north-carolina/dare-county/`

**Added value and overlap.** Adds the nature of instructor involvement—course supervision versus personal guiding—while retaining each activity’s conditions. It does not offer climbing safety or eligibility advice.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Southeast Mountain Guides: Via Ferrata format](https://www.southeastmountainguides.com/our-services/via-ferrata), [Southeast Mountain Guides: private guided climbing](https://www.southeastmountainguides.com/our-services/red-river-gorge-climbing-guide).

### 39. tennessee/anderson — pass

**Source and geography.** Tennessee Tool production body identifies bar, castings, forgings and extrusions plus assembly when required. Exact Oak Ridge address resolves Anderson.

**Complete fixed-baseline comparisons.** `/areas/ohio/crawford-county/`, `/areas/ohio/guernsey-county/`

**Added value and overlap.** Adds identification of an existing formed blank as input rather than a finished sample and keeps material supply responsibility open. Crawford emphasizes operations included in the finished component.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Tennessee Tool and Engineering: production inputs](https://www.tenntool.com/production-machining-assembly/), [Tennessee Tool and Engineering: Oak Ridge operation](https://www.tenntool.com/).

### 40. tennessee/benton — pass

**Source and geography.** Badge Frame explicitly sizes perpetual plaques for anticipated recipients and retains nameplate styles for reorders; contact and About corroborate Benton.

**Complete fixed-baseline comparisons.** `/areas/michigan/delta-county/`

**Supplemental complete comparisons.** `kentucky/shelby` (another submitted record in these 48).

**Added value and overlap.** Adds planned recipient growth and later single-nameplate requests to a persistent main display, beyond swapping a sign panel or selecting the initial award object.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Badge Frame: perpetual plaques](https://badgeframe.us/services/perpetual), [Badge Frame: Camden shop](https://badgeframe.us/contact).

### 41. tennessee/bledsoe — pass

**Source and geography.** Olive Branch detailed project body documents a Pikeville slat wall with concealed cellar door, adjacent finishes and lighting; Chattanooga headquarters is explicitly disclosed. Pikeville’s official county relationship supports Bledsoe.

**Complete fixed-baseline comparisons.** `/areas/north-carolina/burke-county/`

**Added value and overlap.** Adds a working opening hidden in the closed decorative photograph. Burke explains surroundings; Bledsoe requires both closed appearance and operating access to remain visible.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Olive Branch Woodworking: Pikeville feature wall](https://www.olivebranchwoodworking.us/featured-projects/statement-wall-hidden-cellar-door-pikeville-tn).

### 42. tennessee/campbell — pass

**Source and geography.** Rogers Bros substantive services body supports custom design/cuts, swatches and shop/mobile fitting. Current inquiry asks vessel and requested work; saved first-party capture corroborates LaFollette, whose official county relationship supports Campbell.

**Complete fixed-baseline comparisons.** `/areas/ohio/clark-county/`, `/areas/maine/hancock-county/`

**Added value and overlap.** Clark is a stronger overlap than the author lists: it already maps vehicle, coverage and design. Campbell remains a useful tailored application because a selected floor area, swatch versus cut geometry, and fitting location form the actual flooring discussion. No claim that generic partial coverage is new.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Rogers Bros. Marine: flooring options](https://www.rogersbrosdetailing.com/services), [Rogers Bros. Marine: contact and vessel inquiry](https://www.rogersbrosdetailing.com/contact-us).

### 43. tennessee/cannon — pass

**Source and geography.** After Hours Supply body explicitly distinguishes trade sheet-metal products, homeowner system work and named partner responsibilities; it names Woodbury and Cannon County.

**Complete fixed-baseline comparisons.** `/areas/indiana/lake-county/`, `/areas/virginia/chesterfield-county/`, `/areas/pennsylvania/indiana-county/`

**Added value and overlap.** Lake already separates direct/trade roles, but its trade customer seeks installation of a supplied sign. Cannon’s trade customer seeks fabricated components while the property owner seeks installed-system service through the partner network. That source-specific reversal and responsibility are useful.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [After Hours Supply: trade fabrication and system services](https://afterhourssupply.com/).

### 44. tennessee/carroll — pass

**Source and geography.** The Dixie artist body expressly instructs intake after event confirmation and links specifications; home body gives Huntingdon address, matched by Census to Carroll. Restricted intake itself was not read or used to assert fields.

**Complete fixed-baseline comparisons.** `/areas/north-carolina/cleveland-county/`

**Added value and overlap.** Adds the timing and intended user of post-confirmation performer preparation, rather than the venue’s initial room/production rental scope. The open-question route is proposed content.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [The Dixie: artist preparation](https://www.dixiepac.net/for-artists), [The Dixie: venue and contact](https://www.dixiepac.net/).

### 45. tennessee/cheatham — pass

**Source and geography.** Full Stoltz web bodies ask Desired Build Location Address and describe requirements/project management; both list Pleasant View, officially within Cheatham. Direct 403 responses are not treated as evidence.

**Complete fixed-baseline comparisons.** `/areas/florida/orange-county/`, `/areas/florida/calhoun-county/`, `/areas/indiana/vanderburgh-county/`

**Added value and overlap.** Shares the contact-versus-worksite principle with Orange but makes an unsettled proposed building site explicit. The tentative location and unknown status add a useful early-project case without implying assessment or accepted coverage.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Stoltz Co.: proposed build location](https://www.stoltzco.com/contact), [Stoltz Co.: project discussion](https://www.stoltzco.com/our-process).

### 46. tennessee/chester — pass

**Source and geography.** Spiritual Blessings homepage explicitly offers logos/event artwork; printing body offers refinement, print-ready files and placement guidance. Exact Henderson address confirms Chester.

**Complete fixed-baseline comparisons.** `/areas/michigan/chippewa-county/`, `/areas/vermont/rutland-county/`, `/areas/ohio/auglaize-county/`

**Added value and overlap.** Adds the expected reusable artwork handoff versus setup for one physical print job. No file ownership, license, format entitlement or deliverable package is inferred.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Spiritual Blessings Boutique: design and retail services](https://boutiquehenderson.com/), [Spiritual Blessings Boutique: printing and artwork preparation](https://boutiquehenderson.com/custom_t-shirt_printing).

### 47. tennessee/claiborne — pass

**Source and geography.** Craft Cache full event FAQ limits engraving to agreed package objects and states guests choose personalization while the operator runs equipment. Contact policy explicitly identifies Harrogate; official town geography corroborates Claiborne.

**Complete fixed-baseline comparisons.** `/areas/kentucky/fayette-county/`, `/areas/north-carolina/onslow-county/`

**Added value and overlap.** Adds a closed, host-agreed object range for live guests, not simply organizer/participant choices or an open supplied-item assessment. The guest bringing an unlisted object is a useful concrete case.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [The Craft Cache Workshop: live engraving package](https://thecraftcache.com/pages/live-laser-engraving-experience), [The Craft Cache Workshop: contact location](https://thecraftcache.com/policies/contact-information).

### 48. tennessee/clay — pass

**Source and geography.** Dale Hollow lodging body explicitly calls the floating cabin tethered; houseboat body assigns rental to Cedar Hill; homepage explicitly places both marinas in Clay County. Conflicting bed/fleet and copied pontoon details are excluded.

**Complete fixed-baseline comparisons.** `/areas/virginia/page-county/`, `/areas/north-carolina/madison-county/`

**Added value and overlap.** Adds stationary floating accommodation versus a boat the guest operates and preserves the corresponding marina. Unit identity and amenity comparison alone do not answer the mobility/responsibility question.

**Required correction.** None to the reader-facing copy; apply private comparison-reference normalization when assembling review metadata.

**Sources read.** [Dale Hollow Marina: floating cabin](https://dalehollowmarinas.com/stay-at-dale-hollow-marina/), [Dale Hollow Marinas: houseboat location](https://dalehollowmarinas.com/houseboats/), [Dale Hollow Marinas: two marinas in Clay County](https://dalehollowmarinas.com/).

## Review artifacts

- `round05-fl-ne-findings.json`: 48 individual verdicts and explanations.
- `round05-fl-ne-record-verdict-manifest.json`: original record identity, accepted overrides and Simpson condition.
- `round05-fl-ne-comparison-reference-map.json`: every original comparison reference and its status.
- `round05-fl-ne-supplemental-comparisons.json`: exact complete supplemental inputs.
- `round05-fl-ne-geography-check.json`: extracted actual address/coordinate results and mismatches.
- `round05-fl-ne-integrity.json`: final recomputation of all initially frozen input hashes.
- `round05-fl-ne-simpson-patch.json` and `round05-fl-ne-simpson-proposed-record.json`: exact conditional integration content.
