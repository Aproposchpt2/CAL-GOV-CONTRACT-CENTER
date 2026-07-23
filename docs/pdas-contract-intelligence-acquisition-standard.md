# PDAS Contract Intelligence Acquisition Standard

**Standard ID:** PDAS-CIAS-1.0  
**Authority:** ALEXANDER — PDAS Project Orchestrator  
**Target corpus:** `public.state_contract_opportunities`  
**Status:** Production acquisition requirement

## Mission principle

PDAS success is measured by usable procurement intelligence, not row count.

A title, solicitation number, department, deadline, and source URL establish discovery, but they do not constitute a contractor-matchable record. Every acquisition agent must inspect the reasonably accessible official procurement record and preserve the language needed to explain what the buyer requires, who issued the procurement, and who may be contacted.

## Required official-source inspection

For every discovered opportunity, inspect all reasonably accessible official sources:

- opportunity detail page;
- public description and scope page;
- solicitation and specifications;
- instructions to bidders or offerors;
- attachments, exhibits, required forms, and pricing sheets;
- addenda and amendments;
- pre-bid, pre-proposal, job-walk, and site-visit notices;
- insurance and bonding schedules;
- award, cancellation, and deadline-change notices;
- authorized external procurement portals.

Do not stop at a search-results or listing page when official detail or documents are publicly accessible.

When a document cannot be retrieved, preserve its title and URL together with the access limitation, retrieval attempt, authentication requirement, and verification timestamp.

## Mandatory issuing-entity extraction

Extract, when published:

- issuing organization;
- issuing department, division, office, or program;
- jurisdiction type and name;
- city, county, and state;
- issuing-entity address;
- official procurement website;
- authorized procurement platform;
- vendor-registration URL;
- official solicitation URL.

Normalize into the existing production fields where applicable:

- `issuing_organization`
- `issuing_department`
- `jurisdiction_type`
- `jurisdiction_name`
- `place_of_performance_city`
- `place_of_performance_county`
- `place_of_performance_state`
- `vendor_registration_url`
- `official_source_url`
- `source_platform`

Do not substitute generic labels such as `Public Agency`, `Procurement Department`, `See Official Source`, or `Unknown Agency` when the actual entity can be determined.

## Mandatory procurement-contact extraction

Search the opportunity record and documents for:

- procurement contact name, title, email, and telephone;
- technical contact name, title, email, and telephone;
- contract administrator;
- project manager;
- questions contact;
- submission-support contact;
- published department address.

Normalize the primary procurement contact into:

- `contact_name`
- `contact_email`
- `contact_phone`

Preserve additional contacts in `raw_source_payload` with contact type, department, source document, page or section, and verification timestamp.

Do not fabricate contacts or use placeholders such as `Contact Procurement`, `See Solicitation`, or `Contact Agency`. If no public contact exists after official-source inspection, record the evidence state as `unknown` and apply `MISSING_CONTACT_INFORMATION`.

## Mandatory description and scope extraction

Extract the full available procurement meaning, including:

- procurement purpose and buyer objective;
- background;
- full description and scope of work;
- services and products requested;
- tasks and deliverables;
- performance standards;
- service locations;
- contract term and renewal options;
- expected outcomes;
- technical specifications;
- quantities or estimated volumes;
- implementation, maintenance, and support requirements.

Preserve detailed buyer language. Do not reduce a specific scope to a broad label such as `Maintenance`, `Equipment`, `Construction`, or `Professional Services`.

## Mandatory requirement extraction

Store normalized, human-usable requirements in `requirements` and preserve supporting source language in `raw_source_payload`.

### Capability and service requirements

Construction; installation; replacement; maintenance; repair; rehabilitation; restoration; inspection; testing; monitoring; quality assurance; architecture; engineering; design; consulting; project, program, or construction management; technology; software; data; telecommunications; cybersecurity; transportation; fleet; logistics; training; environmental services; water and wastewater; emergency response; on-call service; rapid mobilization.

### Product and supply requirements

Equipment; machinery; vehicles; fleet units; automotive parts; materials; commodities; general supplies; construction materials; technology hardware; software licenses; SaaS subscriptions; medical products; security systems; utility equipment; replacement components.

### Eligibility requirements

Contractor and professional licenses; license class and jurisdiction; certifications; set-asides and supplier-diversity participation; vendor registration; prequalification; qualified-firm and responsible-bidder status; manufacturer authorization; security clearances; background screening.

### Financial and risk requirements

Insurance types and limits; general, professional, automobile, workers' compensation, and cyber liability; bid, payment, and performance bonds; surety; bonding capacity; financial capacity.

### Experience and performance requirements

Minimum experience; comparable projects; past performance; public-sector experience; references; staffing and key personnel; professional disciplines; equipment and fleet; mobilization; emergency response; response-time standards; quality control; safety programs; regulatory and specification compliance.

### Participation and submission requirements

Mandatory meetings, site visits, and job walks; event date, time, location, registration, and attendance rules; submission method and portal; question deadline; required forms, volumes, sections, file formats, signatures, pricing submissions, addenda acknowledgements, and special instructions.

### Evaluation requirements

Evaluation criteria and weights; technical and price factors; qualifications; experience; past performance; interviews; presentations; demonstrations; best-value considerations; responsiveness requirements.

## Requirement evidence contract

Each requirement should retain, when technically feasible:

- canonical requirement ID;
- requirement class;
- normalized requirement name;
- original source language;
- extracted value;
- mandatory or optional status;
- jurisdiction;
- effective and expiration dates;
- source document, page or section, and URL;
- extraction confidence;
- verification status;
- extraction timestamp.

Every field must use one evidence state:

- `known`
- `unknown`
- `not_applicable`
- `conflicting`

Missing information must not be silently converted to `false`.

The following do not qualify as substantive requirements by themselves:

- an empty object or array;
- `contractor_license = null`;
- `response_method = "See official event package"`;
- `mandatory_prebid = true` without an event date, time, location, or usable official evidence;
- generic portal instructions;
- lifecycle metadata;
- a title copied into the description field.

## Document capture

Classify and retain official links for:

- main solicitation;
- scope of work;
- technical specifications;
- bidder or offeror instructions;
- addenda and amendments;
- exhibits and attachments;
- required forms;
- pricing sheets;
- insurance and bonding forms;
- pre-bid and site-visit notices;
- award notices.

Store document references in `document_urls` and supporting metadata in `raw_source_payload`.

## Contractor-matching language

Preserve the exact public-buyer language describing work, products, trades, professional disciplines, performance conditions, eligibility, operational requirements, submission conditions, and buyer intent. Broad classifications may supplement this evidence but must not replace it.

The preserved language is the source for Contract DNA and its comparison with Business DNA.

## Customer-release standard

A record may remain in the production corpus for research or enrichment, but it must not be released to the contractor-facing dashboard unless it has:

- an eligible lifecycle status;
- a future response deadline;
- a valid official or authorized source URL;
- an identifiable issuing organization;
- a meaningful description, scope, or solicitation evidence;
- at least one substantive capability, product, eligibility, performance, compliance, participation, or submission requirement;
- a positive requirement-extraction confidence;
- an approved QA status;
- no unresolved critical conflict.

Records that fail this standard must be held from matching and classified for enrichment.

### QA reason codes

- `MISSING_DESCRIPTION`
- `MISSING_SCOPE`
- `MISSING_REQUIREMENTS`
- `MISSING_DOCUMENTS`
- `MISSING_OFFICIAL_SOURCE`
- `MISSING_ISSUING_ENTITY`
- `MISSING_CONTACT_INFORMATION`
- `DOCUMENT_ACCESS_BLOCKED`
- `EXTRACTION_LOW_CONFIDENCE`
- `EXTRACTION_REVIEW_REQUIRED`
- `CONFLICTING_SOURCE_EVIDENCE`

## Required run reporting

Every acquisition run must report database ingestion and Contract Intelligence coverage separately.

At minimum return:

- records discovered, inserted, updated, deduplicated, and closed;
- mission-attributable net growth;
- records with meaningful descriptions and substantive scope;
- records with substantive requirements;
- records with solicitation documents and addenda;
- issuing-organization and issuing-department coverage;
- procurement-contact name, email, and telephone coverage;
- technical-contact coverage;
- vendor-registration and official-source coverage;
- records approved for contractor matching;
- records held for enrichment;
- records excluded from contractor-facing release;
- requirement-category coverage;
- at least five evidence-complete sample records.

## Required final statuses

Report independently:

- `DATABASE ACQUISITION STATUS`
- `DATABASE WRITE STATUS`
- `CONTRACT INTELLIGENCE EXTRACTION STATUS`
- `ISSUING-ENTITY EXTRACTION STATUS`
- `CONTACT EXTRACTION STATUS`
- `DOCUMENT RETRIEVAL STATUS`
- `CUSTOMER-RELEASE STATUS`
- `PDAS PUBLISHER STATUS`

## Prohibited completion claims

Do not report `Critical Field Failures: 0`, `Extraction Confidence: 100%`, `All Records Verified`, or `Mission Complete` unless scope, requirements, documents, contacts, and source evidence support the claim.

Metadata ingestion success and Contract Intelligence completeness are different measurements.