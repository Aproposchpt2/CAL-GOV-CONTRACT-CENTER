# Phase 2 Procurement Capability Catalog Execution Report

**To:** Alexander, PDAS Project Orchestrator  
**Agent:** Procurement Knowledge Discovery Agent  
**Project:** APROPOS Opportunity Intelligence Engine  
**Mission:** Procurement Capability Catalog Version 1.0  
**Status:** Completed for Project Orchestrator review

## Executive determination

The Procurement Capability Catalog Version 1.0 research phase is complete.

The complete canonical procurement corpus was inventoried by purchasing intent rather than by raw keyword frequency. The resulting catalog identifies:

- **345 canonical procurement opportunities reviewed**;
- **12 substantive procurement domains**;
- **107 domain/category combinations**;
- **131 capability groups**;
- **131 canonical capabilities**;
- **306 records with source-assigned UNSPSC**;
- **484 distinct source-assigned UNSPSC codes**.

The catalog materially expands the known capability universe beyond the 16-rule controlled extraction baseline. It establishes the authoritative research blueprint for taxonomy governance, corpus annotation, Service Selection Tree design, Business Capability Profile design, Knowledge Graph development, and later extraction-rule engineering.

## Governing methodology

The analysis prioritized the question:

> What is the government entity actually purchasing, funding, leasing, operating, maintaining, or commissioning?

The catalog did not treat source keywords, generic nouns, or procurement-type fields as authoritative on their own.

Analysis considered:

- opportunity title;
- substantive description;
- issuing organization;
- source platform;
- procurement type;
- source keywords;
- source-assigned UNSPSC;
- requirements;
- licenses and set-asides;
- repeated buyer terminology;
- products, services, technologies, and deliverables;
- recurring procurement combinations;
- known collision cases.

Ambiguous or abbreviated titles were reviewed against descriptions, requirements, classifications, and source codes. Provisional status is retained where the source remains insufficient.

## Catalog architecture

Every capability has one primary location:

`Domain → Category → Group → Capability → Optional Sub-capability`

Related meanings are connected through governed relationships rather than duplicated across the hierarchy.

The twelve domains are:

1. Construction and Infrastructure
2. Facilities and Operational Services
3. Professional and Business Services
4. Information Technology and Digital Services
5. Transportation, Fleet, and Logistics
6. Healthcare and Human Services
7. Public Safety and Security
8. Workforce, Education, and Training
9. Goods, Supplies, and Specialized Equipment
10. Food, Hospitality, and Event Services
11. Real Estate and Property Services
12. Funding and Program Opportunities

## Principal discoveries

### Lifecycle is a core taxonomy dimension

A product or asset may be procured through different capabilities:

- supply;
- rental;
- installation;
- construction;
- operation;
- maintenance;
- repair;
- inspection;
- testing;
- certification;
- replacement;
- removal or disposal.

The catalog separates these lifecycle intents instead of collapsing them into one generic category.

### Construction and facility operations must remain separate

Examples include:

- roof replacement versus roof maintenance;
- HVAC installation versus HVAC maintenance;
- elevator modernization versus elevator maintenance;
- fire-system installation versus monitoring and repair;
- water infrastructure construction versus treatment-system operations.

### Professional design is not construction execution

Architecture, engineering, construction management, environmental consulting, transportation planning, and due diligence require dedicated professional-service capabilities distinct from physical work.

### Healthcare is not staffing

Occupational health, medical examinations, medical professionals, provider-network administration, and medical-equipment maintenance require healthcare-specific placement. The phrase `personnel services` cannot independently create a staffing classification.

### Technology must distinguish software, operations, equipment, and physical systems

The catalog separates:

- enterprise software implementation;
- application maintenance and operations;
- software licensing;
- cloud productivity services;
- cybersecurity;
- hardware support;
- SCADA;
- emergency communications;
- monitoring equipment;
- physical building and security systems.

### Funding opportunities require project-capability relationships

Funding programs are represented as a separate domain. A grant opportunity must also connect to the capabilities needed to deliver the funded project, such as EV charging construction, hydrogen project development, broadband deployment, or energy-efficiency implementation.

## Frequency findings

Highest-frequency catalog capabilities include:

- General Building Construction and Renovation — 12
- Roadway Construction and Rehabilitation — 11
- Specialized Equipment Maintenance and Repair — 10
- Waste Collection, Recycling, Destruction, and Disposal — 10
- Janitorial and Custodial Services — 9
- Traffic Signals, Lighting, Barriers, and Roadside Safety — 9
- Protective Clothing and Operational Supplies Rental — 8
- Government Office and Facility Leasing — 7
- Windows, Doors, and Accessibility Improvements — 7
- Architecture and Engineering Services — 6
- Enterprise Software Implementation and Integration — 6
- Septic Pumping, Inspection, and Maintenance — 6
- Water and Wastewater Infrastructure Construction — 6

Frequency counts represent distinct supporting opportunities and are non-additive because multi-capability procurements are preserved.

## Recurring relationship findings

The most common procurement bundles were:

- equipment maintenance plus inspection — 53 opportunities;
- equipment supply plus installation — 31;
- architecture/engineering plus construction delivery — 8;
- protective clothing plus rental/service — 8;
- septic or sewer plus pumping/cleaning — 8;
- water operations plus testing/remediation — 6;
- EV charging plus electrical construction — 5;
- security monitoring plus system maintenance — 5;
- software plus implementation/support — 5;
- towing plus impound storage — 5.

These findings support explicit Knowledge Graph edges rather than flattened keyword matching.

## Classification-code findings

- Source-assigned NAICS: 0 records.
- Source-assigned NIGP: 0 records.
- Source commodity codes: 0 records.
- Source-assigned UNSPSC: 306 records.
- Distinct source UNSPSC: 484.

Catalog NAICS values are recommended **2022 NAICS families** and require governance verification. They are not represented as source assignments.

UNSPSC values in the catalog are source-observed only.

No NIGP or publisher commodity code was fabricated.

## License and certification findings

Nineteen distinct California contractor-license labels were observed in structured requirements. C-10 was the most frequent with 11 opportunities.

Forty-five opportunities also stored contractor-license codes in the certification field. This is a source-normalization conflict. Catalog governance must separate:

- contractor and professional licenses;
- diversity and socioeconomic set-asides;
- quality and technical certifications;
- manufacturer authorizations;
- contract-specific qualifications.

Source set-asides included DVBE in 13 records and SB in 11 records.

## Required deliverables completed

1. **Procurement Capability Catalog Version 1.0** — completed as seven domain CSV files and catalog index.
2. **Domain hierarchy** — completed.
3. **Category hierarchy** — completed.
4. **Capability hierarchy** — completed.
5. **Canonical capability definitions** — completed in catalog CSV rows.
6. **Synonym dictionary** — completed through six terminology CSV files covering all catalog capabilities.
7. **Buyer terminology dictionary** — completed in the dictionaries and frequency report.
8. **Capability relationship model** — completed with relationship types and recurring bundle frequencies.
9. **Frequency analysis** — completed for capabilities, buyer terms, services, products, technologies, deliverables, roles, licenses, set-asides, and relationships.
10. **Taxonomy gap report** — completed.
11. **Service Selection Tree recommendations** — completed.
12. **Business Capability Profile recommendations** — completed.
13. **Recommended implementation roadmap** — completed.

## Artifact register

### Authoritative catalog

- `taxonomy/procurement-capability-catalog.v1/README.md`
- `taxonomy/procurement-capability-catalog.v1/construction.csv`
- `taxonomy/procurement-capability-catalog.v1/facilities-operations-a.csv`
- `taxonomy/procurement-capability-catalog.v1/facilities-operations-b.csv`
- `taxonomy/procurement-capability-catalog.v1/professional-business.csv`
- `taxonomy/procurement-capability-catalog.v1/information-technology.csv`
- `taxonomy/procurement-capability-catalog.v1/transportation-logistics.csv`
- `taxonomy/procurement-capability-catalog.v1/people-security-training.csv`
- `taxonomy/procurement-capability-catalog.v1/goods-property-programs.csv`

### Terminology dictionary

- `terminology-construction.csv`
- `terminology-facilities.csv`
- `terminology-professional.csv`
- `terminology-digital-logistics.csv`
- `terminology-people-security.csv`
- `terminology-goods-programs-property.csv`

### Analytical and design reports

- `CATALOG_DICTIONARIES_RELATIONSHIPS_FREQUENCY_V1_0.md`
- `TAXONOMY_GAP_AND_SERVICE_SELECTION_TREE_V1_0.md`
- `BUSINESS_CAPABILITY_PROFILE_AND_IMPLEMENTATION_ROADMAP_V1_0.md`
- `PHASE_2_PROCUREMENT_CAPABILITY_CATALOG_EXECUTION_REPORT.md`

## Limitations and review items

- Attachment-only scope and deliverables remain incomplete.
- Some source titles are abbreviated and require document-level confirmation.
- Fuel Supply remains provisional because the title is only a procurement identifier and the capability is inferred from source UNSPSC.
- Fair-Time Services and Public Facility Concession Opportunities require additional document detail before sub-capability activation.
- Recommended NAICS families require formal mapping review.
- Capability support counts are corpus-specific and currently California-state-heavy.
- A row-level reviewed annotation register should be created in the next controlled research phase before extraction rules are expanded.

## Recommended next authorization

The next phase should be:

**CATALOG GOVERNANCE AND CORPUS ANNOTATION**

Objectives:

1. approve or revise the 12-domain structure;
2. review all 131 canonical definitions;
3. resolve provisional capabilities;
4. create a reviewable row-level annotation register for all canonical opportunities;
5. approve synonym and buyer-term relationships;
6. validate recommended NAICS families;
7. assign taxonomy ownership and review roles;
8. freeze an approved catalog version;
9. only then authorize extraction-rule design.

## Boundary confirmation

This phase performed research, discovery, organization, and recommendation only.

It did not:

- modify extraction rules;
- modify AOIE;
- modify production taxonomy;
- modify NAT-CORP;
- modify Analyze Fit;
- apply a migration;
- modify production records;
- merge PR #12;
- deploy production code.

## Final determination

**Procurement Capability Catalog Version 1.0: COMPLETED FOR PROJECT ORCHESTRATOR REVIEW**

**Production taxonomy activation: NOT AUTHORIZED**

**Extraction-rule expansion: NOT AUTHORIZED**

**PR #12 merge: NOT AUTHORIZED**
