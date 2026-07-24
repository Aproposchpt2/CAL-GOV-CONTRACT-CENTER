# Procurement Knowledge Discovery Technical Specification v1.0

## 1. Purpose

This specification establishes a controlled, read-only workstream that converts the canonical PDAS procurement corpus into structured extraction records, terminology intelligence, frequency analysis, capability relationships, and versioned taxonomy recommendations.

The workstream supports AOIE and NAT-CORP but does not control procurement ingestion, AOIE scoring or ranking, the NAT-CORP user interface, or production taxonomy activation.

## 2. System Boundary

Authoritative opportunity source:

- `public.state_contract_opportunities`
- Future preferred read view: `public.aoie_opportunity_candidates_v1` when formally created and approved

Read-only enrichment sources:

- `public.pdas_publishers`
- `public.pdas_publisher_platforms`
- `public.pdas_procurement_platforms`

Explicitly excluded:

- `public.state_alert_subscribers`
- NGCC
- Federal AOIE matching
- Any source-record insert, update, delete, normalization, deduplication, or versioning operation

## 3. Controlled Architecture

```text
PDAS canonical opportunity inventory
        ↓ read-only export/query
Deterministic extraction engine
        ↓
Versioned extraction records
        ↓
Terminology, frequency, and relationship analysis
        ↓
Taxonomy recommendations
        ↓ human governance approval
AOIE/NAT-CORP consumption
```

The implementation in this branch is intentionally decoupled from the AOIE runtime. It accepts a read-only JSON export and emits extraction and report artifacts. No Supabase credential is required by the extraction runner.

## 4. Extraction Contract

Each extraction contains:

- source identity and provenance
- procurement purpose and normalized procurement type
- primary and secondary capabilities
- services
- products
- technologies
- deliverables
- requirements
- licenses
- certifications
- classification codes exactly as observed
- buyer terms
- generic-term suppression evidence
- confidence score and band
- review status and reasons
- deterministic extraction fingerprint
- extraction and taxonomy versions

## 5. Evidence Weighting

Evidence is weighted by field:

| Evidence source | Weight |
|---|---:|
| Opportunity title | 5 |
| Existing controlled keywords | 3 |
| Description/scope text | 2 |
| Classifications | 2 |
| Requirements metadata | 1 |

A capability is not created from a generic word such as `system`, `services`, `support`, `management`, or `technology`. Strong domain phrases are required.

## 6. Collision Controls

The initial collision fixture distinguishes:

- physical `Window Systems Repair`
- Microsoft Windows platform administration
- other physical systems such as fire suppression, mechanical, and electrical control systems

`Window Systems Repair` is classified as facilities/construction only when supported by physical terms such as window replacement, glazing, fenestration, demolition, roofing, or contractor licensing. Microsoft Windows support requires explicit terms such as Microsoft Windows, Windows Server, Active Directory, Windows 10, or Windows 11.

## 7. Product-Service Separation

Products and services are extracted independently. A procurement may simultaneously contain:

- product: HVAC equipment
- service: installation
- service: maintenance

The product does not collapse into the service category, and the service does not imply product supply.

## 8. Confidence and Review

| Score | Band |
|---:|---|
| 90–100 | HIGHLY VERIFIED |
| 75–89 | HIGH CONFIDENCE |
| 55–74 | MODERATE CONFIDENCE |
| 35–54 | LOW CONFIDENCE |
| 0–34 | REVIEW REQUIRED |

Records with insufficient source text, no supported capability, or generic-only terminology route to review.

## 9. Versioning and Determinism

- Extraction version: `pkd-1.0.0`
- Taxonomy proposal version: `aoie-taxonomy-proposal-1.1.0`
- Extraction fingerprints are SHA-256 values derived from source identity, source content, observed codes, version identifiers, and capability outputs.
- Only canonical latest records are processed.
- Duplicate records and superseded versions are skipped.
- Frequency uses distinct opportunity identity, not repeated phrases inside a record.

## 10. Security

- Source access is read-only.
- The runner does not contain Supabase URL or credential logic.
- Proposed tables enable RLS.
- No `anon` or `authenticated` grants are proposed.
- No `SECURITY DEFINER` function is created.
- Source opportunity records are never modified.

## 11. Operational Execution

```bash
node scripts/procurement-knowledge-pilot.js \
  --input opportunities.json \
  --output procurement-extractions.json \
  --report procurement-frequency-report.json
```

The input may be a JSON array or an object containing `records` or `data`.

## 12. Acceptance Mapping

The implementation directly addresses:

- source traceability
- service/product separation
- primary/secondary capabilities
- generic-term suppression
- buyer-language preservation
- non-fabrication of classification codes
- confidence and review routing
- distinct-opportunity frequency
- versioned recommendations
- Window Systems Repair false-positive protection
- deterministic automated tests
- zero production taxonomy activation
