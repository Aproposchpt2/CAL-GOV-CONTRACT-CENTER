# AOIE State & Local Shadow MVP

Protected development implementation for NAT-CORP live testing. It does not replace the existing dashboard matcher.

## Approved data contract

- Authoritative opportunity inventory: `public.state_contract_opportunities`
- Enrichment: `public.pdas_publishers`, `public.pdas_publisher_platforms`, `public.pdas_procurement_platforms`
- Authentication and limited fallback only: `public.state_alert_subscribers`
- Preferred long-term relation: `public.aoie_opportunity_candidates_v1`
- AOIE remains read-only and separate from acquisition, ingestion, normalization, versioning, amendments, and deduplication.

## Source precedence

AOIE first attempts `public.aoie_opportunity_candidates_v1`. When that relation is absent, it uses `public.state_contract_opportunities` with PDAS registry enrichment. Only a missing-relation condition activates the fallback; other canonical-source failures are surfaced.

The future view must expose stable filter aliases for `state_code`, `status`, `response_deadline`, `is_latest_version`, `duplicate_of`, and `posted_at`. AOIE also preserves `normalized_status` when present.

## Candidate controls

Retrieval applies requested-state, latest-version, duplicate-exclusion, normalized-status, and non-expired-deadline controls before scoring.

## Registry enrichment

Opportunity URLs remain authoritative when present. Missing values are filled from the publisher-platform mapping, procurement-platform registry, and publisher registry, in that order.

Each result includes publisher identity, organization type, registry status, match evidence, platform, technology vendor, registration indicators, and URL provenance.

## Components

- `netlify/functions/_shared/aoie-state-local.mjs`: ontology, profile, scoring, and source exports
- `netlify/functions/_shared/aoie-state-source.mjs`: canonical-view detection, direct fallback, retrieval filters, registry enrichment, result normalization
- `netlify/functions/aoie-state-shadow.mjs`: protected read-only endpoint at `/api/aoie-state-shadow`
- `aoie-lab.html`: authenticated live test interface with source and registry evidence
- `tests/aoie-state-local.test.mjs`: matcher fixtures
- `tests/aoie-state-source.test.mjs`: source-contract fixtures

## Versions

- Engine: `aoie-state-local-mvp-1`
- Ontology: `state-local-general-v1`
- Scoring: `state-local-hybrid-v1`
- Profile: `state-local-capability-profile-v1`
- Source contract: `aoie-state-local-source-v2`

## Safety boundaries

- Existing dashboard matching remains unchanged.
- The lab is not linked from the public homepage.
- PR #7 creates no database schema and performs no database mutation.
- Results are not proof of eligibility.
- Full solicitation review remains mandatory.
- NGCC remains unchanged.

## Promotion gates

1. Matcher and source-contract fixtures pass.
2. Deploy Preview builds successfully.
3. Live session authentication is verified.
4. Direct-table retrieval and registry enrichment are verified.
5. At least 20 business profiles are tested.
6. False positives and false negatives are reviewed.
7. California and Nevada coverage is adequate.
8. Licensing and certification detection is calibrated.
9. The Project Owner separately authorizes dashboard integration and production merge.
