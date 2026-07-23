# NAT-CORP Automation Core Rollback

## Application rollback

1. Revert the implementation commit on `main` and allow Netlify to publish the prior repository state.
2. Confirm `/dashboard` again resolves through the pre-existing static redirect and `/natcorp-command` no longer resolves.
3. Remove `NATCORP_INTERNAL_TOKEN` and `NATCORP_COMMAND_KEY` from Netlify only after the rollback deploy is healthy.

## Database rollback

The preferred rollback is non-destructive: leave run history and customer feedback intact, stop invoking the automation, and revert the application release.

For a full destructive rollback, export the five `natcorp_*` tables first, then execute:

```sql
drop function if exists public.natcorp_apply_release_gates(uuid[]);
drop function if exists public.natcorp_build_contract_dna(uuid[]);
drop function if exists public.natcorp_register_documents(uuid[]);
drop function if exists public.natcorp_touch_updated_at();

drop table if exists public.natcorp_daily_briefs cascade;
drop table if exists public.natcorp_workflow_events cascade;
drop table if exists public.natcorp_agent_jobs cascade;
drop table if exists public.natcorp_customer_feedback cascade;
drop table if exists public.natcorp_daily_runs cascade;

alter table public.state_contract_opportunities
  drop column if exists natcorp_release_status,
  drop column if exists natcorp_release_reasons,
  drop column if exists natcorp_release_evaluated_at,
  drop column if exists natcorp_released_at,
  drop column if exists natcorp_contract_dna_status,
  drop column if exists natcorp_contract_dna_updated_at;
```

Do not drop or modify PDAS, PIEE, Contract DNA, Business DNA, AOIE, Analyze Fit, or existing acquisition tables during rollback.
