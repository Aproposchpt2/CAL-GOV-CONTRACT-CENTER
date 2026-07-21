# Security Review and Rollback Procedure

## Security Review

### Controls implemented

- no Supabase service-role credentials in source
- no direct database connection in the pilot runner
- source opportunity table remains read-only
- proposed public-schema tables enable RLS
- `anon` and `authenticated` privileges are explicitly revoked
- no public policies are created
- no `SECURITY DEFINER` functions are created
- source provenance is mandatory
- production taxonomy activation is absent
- duplicate and non-latest records are skipped
- classification codes are preserved, not fabricated

### Supabase platform considerations

Supabase changed new-table API exposure defaults in 2026. The migration therefore uses explicit privilege revocation and does not assume that creation in `public` implies intentional Data API exposure.

### Residual risks

- rules may overfit the California-heavy corpus
- attachment text may contain material requirements not present in the opportunity record
- low-information records may not support reliable extraction
- broad existing keywords may contain incidental matches
- future code mappings require subject-matter review

## Rollback Procedure

The migration is a proposal and is not applied by this branch.

If later applied and rollback is authorized:

1. stop all knowledge-extraction writers
2. export any approved knowledge records for audit retention
3. verify AOIE does not depend on the proposed tables
4. drop indexes
5. drop tables in dependency order:
   - `piee_capability_relationships`
   - `piee_taxonomy_recommendations`
   - `piee_procurement_terms`
   - `piee_opportunity_extractions`
   - `piee_extraction_runs`
6. confirm `public.state_contract_opportunities` row count and checksums are unchanged
7. restore the prior approved taxonomy version
8. document the rollback in the PDAS decision log

The source opportunity inventory is not part of the rollback because this workstream never modifies it.
