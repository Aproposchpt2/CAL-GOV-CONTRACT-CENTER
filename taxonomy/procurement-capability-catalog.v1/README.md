# Procurement Capability Catalog Version 1.0

**Project:** APROPOS Opportunity Intelligence Engine  
**Date:** 2026-07-21  
**Status:** Research blueprint for Project Orchestrator review  
**Production activation:** Not authorized

## Determination

The complete canonical PDAS procurement corpus was inventoried by procurement intent. Catalog Version 1.0 identifies **131 canonical capabilities across 12 substantive domains** and provides the hierarchy, definitions, evidence frequencies, recommended NAICS families, and source-observed UNSPSC relationships required for future AOIE taxonomy design.

No extraction rule, AOIE behavior, NAT-CORP behavior, production taxonomy, database schema, or production record was changed. PR #12 remains draft and unmerged.

## Evidence scope

| Measure | Result |
|---|---:|
| Canonical opportunities inventoried | 345 |
| Domains | 12 |
| Domain/category combinations | 107 |
| Capability groups | 131 |
| Canonical capabilities | 131 |
| Records with source UNSPSC | 306 |
| Distinct source UNSPSC codes | 484 |
| Records with source NAICS | 0 |
| Records with source NIGP | 0 |
| Records with source commodity codes | 0 |

Frequency is the number of distinct opportunities supporting a capability. Counts are non-additive because procurements may support multiple capabilities.

## Hierarchy

`Domain → Category → Group → Capability → Optional Sub-capability`

Every capability has one primary location. Cross-domain meaning belongs in the relationship model rather than duplicate hierarchy placement.

## Domain inventory

| Domain | Capabilities |
|---|---:|
| Facilities and Operational Services | 32 |
| Professional and Business Services | 19 |
| Construction and Infrastructure | 18 |
| Goods, Supplies and Specialized Equipment | 13 |
| Information Technology and Digital Services | 11 |
| Transportation, Fleet and Logistics | 11 |
| Healthcare and Human Services | 8 |
| Funding and Program Opportunities | 6 |
| Workforce, Education and Training | 4 |
| Food, Hospitality and Event Services | 4 |
| Public Safety and Security | 3 |
| Real Estate and Property Services | 2 |

## Files

- `construction.csv` — 18 capabilities
- `facilities-operations-a.csv` and `facilities-operations-b.csv` — 32 capabilities
- `professional-business.csv` — 19 capabilities
- `information-technology.csv` — 11 capabilities
- `transportation-logistics.csv` — 11 capabilities
- `people-security-training.csv` — 15 capabilities
- `goods-property-programs.csv` — 25 capabilities

Each CSV row includes the capability identifier, hierarchy, canonical definition, supporting-opportunity count, confidence, recommended NAICS families, and source-observed UNSPSC codes.

## Code policy

- UNSPSC values are source-observed only.
- NAICS values are recommended 2022 families and require governance verification before activation.
- NIGP and publisher commodity codes were not populated and were not inferred.
- No mapping is official merely because it appears in this research catalog.

## Confidence

- **HIGH:** repeated clear procurement intent, generally three or more supporting opportunities.
- **MODERATE:** one or two clear supporting opportunities.
- **PROVISIONAL:** incomplete source evidence requiring document review.

Catalog Version 1.0 is suitable as the taxonomy-design blueprint. It is not an activated production taxonomy.
