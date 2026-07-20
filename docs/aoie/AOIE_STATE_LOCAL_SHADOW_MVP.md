# AOIE State & Local Shadow MVP

## Status

Protected development implementation for NAT-CORP live testing. It does not replace the existing dashboard matcher.

## Purpose

The state/local AOIE adapter evaluates business capability profiles against the canonical `state_contract_opportunities` table using:

- Exact UNSPSC alignment
- Exact and related commodity-code alignment
- Business service and product terminology
- Versioned capability-family ontology
- State service area
- Certification and licensing requirements
- Contract-capacity evidence
- Deadline hard constraints

## Components

1. `netlify/functions/_shared/aoie-state-local.mjs`
   - Versioned state/local ontology
   - Business profile expansion
   - Opportunity feature extraction
   - Explainable hybrid scoring
   - Hard disqualifiers

2. `netlify/functions/aoie-state-shadow.mjs`
   - Protected endpoint at `/api/aoie-state-shadow`
   - Accepts an existing NAT-CORP member session or `AOIE_INTERNAL_TOKEN`
   - Reads only canonical state/local opportunities
   - Returns shadow results without modifying the current dashboard

3. `aoie-lab.html`
   - Authenticated live test interface
   - Uses the current NAT-CORP profile when available
   - Shows score evidence and verification requirements

4. `tests/aoie-state-local.test.mjs`
   - Exact UNSPSC match
   - Related commodity family match
   - Unrelated false-positive suppression
   - Expiration disqualification
   - Geography disqualification
   - Certification disqualification
   - License disqualification
   - Capacity disqualification

## Versions

- Engine: `aoie-state-local-mvp-1`
- Ontology: `state-local-general-v1`
- Scoring: `state-local-hybrid-v1`
- Profile: `state-local-capability-profile-v1`

## Safety Boundaries

- Existing dashboard matching remains unchanged.
- The lab is not linked from the public homepage.
- No database schema change is required.
- No opportunity record is modified.
- No score is presented as proof of eligibility.
- Expired opportunities and explicit hard-constraint mismatches are not recommended.
- Full solicitation review remains mandatory before pursuit.

## Promotion Gates

The state/local engine should not replace the existing matcher until:

1. Fixture tests pass.
2. Live session authentication is verified.
3. At least 20 business profiles are tested.
4. False-positive and false-negative results are reviewed.
5. California and Nevada data coverage is adequate.
6. Licensing and certification detection is calibrated.
7. The Project Owner separately authorizes dashboard integration.
