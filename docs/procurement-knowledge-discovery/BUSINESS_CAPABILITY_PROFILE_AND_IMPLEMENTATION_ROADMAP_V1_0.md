# Business Capability Profile and Implementation Roadmap v1.0

## 1. Business Capability Profile objective

The Business Capability Profile should describe what a business can actually supply, perform, operate, install, maintain, design, or deliver. It should not rely on a company name, generic keywords, or a NAICS list alone.

The profile becomes the contractor-side counterpart to the Procurement Capability Catalog.

## 2. Recommended profile structure

### Business identity

- legal business name;
- public business name;
- service geography;
- operating locations;
- business size and employee range;
- years in operation;
- public-sector experience.

### Primary capability

Each business should select one primary canonical capability for profile organization. The primary capability does not limit matching to that capability.

### Additional capabilities

The profile should permit multiple approved capabilities, each with:

- canonical capability ID;
- user-facing label;
- capability description;
- lifecycle actions performed;
- geographic coverage;
- evidence strength;
- years of experience;
- relevant projects;
- related products and services.

### Lifecycle actions

For each capability, capture whether the business:

- manufactures;
- distributes or supplies;
- rents or leases;
- designs or consults;
- constructs or installs;
- operates or administers;
- maintains or repairs;
- inspects, tests, or certifies;
- transports, stores, or fulfills;
- trains or educates;
- removes, remediates, recycles, or disposes.

### Products

Capture specific products, brands, equipment classes, materials, and authorized-reseller relationships separately from service capabilities.

### Services

Capture service verbs and the asset or subject to which each service applies. `Maintenance` alone is insufficient; `HVAC maintenance` or `medical-equipment maintenance` is valid.

### Technologies

Capture explicit platforms, environments, tools, and technical systems, including version or specialization when relevant.

### Licenses

Store professional and contractor licenses as structured records:

- license type;
- jurisdiction;
- license number when voluntarily provided;
- status;
- expiration date;
- verification source;
- capability relationships.

### Certifications and set-asides

Separate:

- diversity and socioeconomic certifications;
- quality certifications;
- security certifications;
- professional certifications;
- manufacturer authorizations;
- contract-specific eligibility programs.

Contractor-license codes must never be stored as supplier certifications.

### Classification codes

Store codes with status:

- business-provided;
- source-verified;
- approved catalog mapping;
- inferred and review required;
- rejected or retired.

### Past performance and evidence

Capability claims should be supported by optional evidence:

- project description;
- customer type;
- contract value range;
- completion date;
- performance location;
- products delivered;
- services performed;
- deliverables completed;
- reference availability.

## 3. Profile-to-opportunity explanation

Every AOIE match should be explainable through a chain such as:

`Business capability → recognized synonym or related service → procurement capability → supporting requirement or buyer term`

The user should see:

- capability alignment;
- product alignment;
- service alignment;
- technology alignment;
- license or certification alignment;
- geographic alignment;
- exclusions or missing qualifications;
- source evidence from the opportunity.

## 4. Profile quality levels

### Level 1 — Self-described

Business selected capabilities and entered descriptive information.

### Level 2 — Structured

Capabilities, products, services, technologies, licenses, and certifications are normalized to catalog entities.

### Level 3 — Evidence-supported

Past performance, documents, registrations, or verified credentials support the capability claims.

### Level 4 — Procurement-validated

The capability profile has demonstrated alignment with actual procurement opportunities, proposals, awards, or verified contract performance.

Profile quality must influence explanation and review—not silently exclude a business from discovery.

## 5. Recommended implementation roadmap

### Phase A — Catalog governance

1. Review and approve the 12-domain architecture.
2. Review 131 canonical definitions.
3. Resolve provisional capabilities.
4. Approve naming and identifier standards.
5. Assign taxonomy owner and reviewers.
6. Freeze Catalog Version 1.0 as a governed baseline.

### Phase B — Corpus annotation

1. Create a read-only annotation plan for all 345 canonical opportunities.
2. Assign primary and secondary catalog capabilities.
3. Record products, services, technologies, deliverables, licenses, and certifications.
4. Preserve source terminology and source codes.
5. Capture conflicts and reviewer decisions.
6. Calculate inter-reviewer agreement.

### Phase C — Code-mapping governance

1. Validate recommended 2022 NAICS families.
2. Create approved UNSPSC-to-capability relationships from source evidence.
3. Add NIGP only when official evidence or an approved mapping source is available.
4. Keep publisher commodity codes source-specific.
5. Version and audit every mapping.

### Phase D — Service Selection Tree prototype

1. Build a non-production prototype from approved catalog nodes.
2. Test plain-language labels with business users.
3. Test ambiguity and collision prompts.
4. Measure completion time and selection accuracy.
5. Validate multi-capability selection.
6. Obtain governance approval before NAT-CORP integration.

### Phase E — Business Capability Profile prototype

1. Implement structured capability selection in a non-production environment.
2. Add lifecycle actions, products, services, technologies, and credentials.
3. Add capability-evidence fields.
4. Test profile generation with representative businesses.
5. Compare user selections with analyst-coded capabilities.

### Phase F — Extraction-rule design

Only after Catalog Version 1.0 approval:

1. derive extraction rules from approved catalog definitions;
2. create positive and negative evidence patterns;
3. design product/service and domain collision tests;
4. design confidence thresholds;
5. build representative fixtures from the annotated corpus;
6. rerun full-corpus validation.

### Phase G — Knowledge Graph and AOIE evaluation

1. Load approved entities and relationships into an isolated candidate layer.
2. evaluate semantic matching against known opportunities;
3. test explainability;
4. measure false positives and false negatives;
5. complete security and migration review;
6. request separate production authorization.

## 6. Acceptance gates

Production consideration should require:

- catalog governance approval;
- complete corpus annotation;
- approved terminology and code mappings;
- collision-control test suite;
- documented review workflow;
- security review;
- migration approval;
- AOIE evaluation results;
- NAT-CORP product approval;
- Project Orchestrator authorization.

## 7. Current determination

The Business Capability Profile and implementation roadmap are ready for design review. No profile builder, Service Selection Tree, extraction rule, database migration, AOIE behavior, or production interface has been changed.
