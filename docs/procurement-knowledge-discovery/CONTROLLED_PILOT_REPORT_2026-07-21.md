# Controlled Pilot Findings — 2026-07-21

## Executive Determination

The current PDAS state procurement inventory is sufficient to begin controlled extraction and taxonomy discovery, but it is not yet sufficiently complete for autonomous taxonomy activation.

No source records were modified. No production taxonomy changes were activated.

## Corpus Baseline

| Metric | Result |
|---|---:|
| Total records | 346 |
| Canonical latest records | 345 |
| Records with at least 80 characters of description | 305 |
| Low-information records | 41 |
| Records with existing keywords | 303 |
| Records with UNSPSC codes | 307 |
| Records without UNSPSC codes | 39 |
| Records with NAICS codes | 0 |
| Records with NIGP codes | 0 |
| Records with future deadlines | 317 |

Corpus observation window:

- first record created: 2026-07-20
- most recent corpus update observed: 2026-07-21

## Source Concentration

| Source platform | Distinct canonical records |
|---|---:|
| Cal eProcure | 303 |
| NGEM | 20 |
| California Energy Commission solicitations | 11 |
| CalPERS bid opportunities | 3 |
| OBAS | 3 |
| PlanetBids | 3 |
| HCD direct | 2 |

The corpus is currently highly concentrated in Cal eProcure. Taxonomy recommendations must therefore be treated as California-state-heavy until additional publisher and geographic coverage is available.

## Existing Procurement-Type Distribution

| Procurement type | Records |
|---|---:|
| services | 158 |
| goods | 94 |
| construction | 36 |
| null/unclassified | 26 |
| information_technology | 9 |
| grant funding opportunity | 8 |
| market_research | 6 |
| other source-specific values | 14 |

The field contains both normalized and source-native values. A controlled normalization layer is required rather than direct use as a governed taxonomy field.

## Existing Keyword Frequency

Top existing controlled keywords by distinct opportunity:

| Keyword | Frequency |
|---|---:|
| construction_general | 153 |
| transportation_logistics | 121 |
| facility_maintenance | 109 |
| security_safety | 86 |
| paving_concrete | 68 |
| legal | 58 |
| printing_publishing | 53 |
| healthcare | 38 |
| financial_accounting | 33 |
| environmental | 29 |
| it_services | 27 |
| training_education | 26 |
| professional_consulting | 25 |
| software | 22 |
| staffing_hr | 21 |
| computer_hardware | 18 |
| engineering | 18 |
| electrical | 17 |
| marketing_pr | 16 |
| plumbing_hvac | 14 |

Existing keyword frequency is evidence, not a final taxonomy. Several records carry broad cross-domain keywords due to source text and boilerplate, so extraction must preserve evidence while suppressing generic or incidental matches.

## Evidence-Based Pilot Labels

A read-only corpus query applying strong phrase rules produced the following distinct-opportunity counts:

| Pilot label | Distinct opportunities |
|---|---:|
| construction | 212 |
| transportation | 127 |
| professional services | 24 |
| HVAC | 19 |
| engineering | 17 |
| information technology | 16 |
| janitorial | 15 |
| medical supplies | 8 |
| electrical | 7 |
| software | 3 |
| staffing | 2 |
| physical window systems | 2 |
| cybersecurity | 1 |
| human services | 1 |
| training | 1 |

These values are pilot signals only. They are not approved production taxonomy counts.

## Window Systems Repair Collision

Two canonical records represent the required test scenario:

1. `25-322011.PMDB.Window Systems Repair`
   - construction scope includes demolition, excavation, window replacement, roofing, wiring, and related work
   - Class B contractor license
   - payment and performance bonds
   - mandatory prebid site inspection
   - UNSPSC `72154032`

2. `Window Systems Repair - School for the Blind`
   - OBAS forecast record
   - no description
   - facility-maintenance and construction keywords
   - UNSPSC `72152400`

Both records are physical construction/facility opportunities. Neither has explicit Microsoft Windows, Windows Server, Active Directory, computer, network, cloud, software, or cybersecurity evidence.

## Generic “System” Risk

| Metric | Result |
|---|---:|
| Records using `system` or `systems` | 63 |
| Records using `system(s)` without strong IT evidence | 43 |
| Records with strong IT phrases under the strict pilot query | 1 |

This confirms that `system`, `services`, `support`, `management`, and `technology` cannot function as strong matching evidence independently.

## Initial Taxonomy Recommendations

1. Add a dedicated `Building Envelope → Windows and Glazing → Window Systems Repair and Replacement` capability.
2. Require explicit Microsoft or computing context for Windows platform support.
3. Preserve separate nodes for product supply, installation, maintenance, and repair.
4. Keep buyer terms and business-friendly display terms as separate fields.
5. Mark all code mappings as source-assigned, approved, inferred, or conflicting.
6. Route the 41 low-information records to review or document enrichment.
7. Delay autonomous NAICS/NIGP recommendations until evidence or approved mapping standards are available.
8. Treat corpus-wide frequency as state/publisher scoped until national coverage improves.

## False-Positive / False-Negative Findings

### False-positive risks

- physical `systems` misclassified as information technology
- agency boilerplate contributing health, legal, financial, transportation, or security keywords
- product names collapsed into maintenance or installation services
- publisher/agency names interpreted as capabilities
- repeated phrases inside one opportunity inflating frequency

### False-negative risks

- low-information forecast records
- missing attachment text
- absent NAICS/NIGP metadata
- specialized buyer terminology not present in the initial rule dictionary
- requirements embedded only in linked documents
- acronym-only references without contextual expansion

## Production-Readiness Determination

**NOT READY FOR PRODUCTION TAXONOMY ACTIVATION**

The extraction specification, data contract, schema proposal, deterministic engine, and QA fixtures are ready for review. A production pilot requires:

- an approved read-only opportunity export or candidate view
- attachment-text availability from PIEE
- review workflow ownership
- migration approval
- AOIE taxonomy governance approval
- expanded geographic and publisher coverage
