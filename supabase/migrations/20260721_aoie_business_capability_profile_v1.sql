begin;
create extension if not exists pgcrypto;

-- Preserve the AOIE taxonomy and profile schema already created by the AOIE workstream.
-- Add only visit-scoped integration and observability fields required by NAT-CORP.
alter table public.aoie_business_profiles add column if not exists session_id text;
alter table public.aoie_business_profiles add column if not exists visit_scoped boolean not null default true;
alter table public.aoie_business_profiles add column if not exists source_provenance jsonb not null default '{}';
create unique index if not exists aoie_business_profiles_session_id_uq
  on public.aoie_business_profiles(session_id) where session_id is not null;

create unique index if not exists aoie_business_roles_one_primary
  on public.aoie_business_roles(business_profile_id) where is_primary;
create unique index if not exists aoie_business_capability_unique
  on public.aoie_business_capabilities(business_profile_id,capability_id);
create unique index if not exists aoie_business_capacity_profile_uq
  on public.aoie_business_capacity(business_profile_id);
create unique index if not exists aoie_business_preferences_profile_uq
  on public.aoie_business_match_preferences(business_profile_id);
create index if not exists aoie_synonym_normalized_lookup
  on public.aoie_taxonomy_synonyms(normalized_value) where active_status=true;
create index if not exists aoie_capability_type_lookup
  on public.aoie_taxonomy_capabilities(procurement_type) where active_status=true;

create table if not exists public.aoie_profile_runs(
 id uuid primary key default gen_random_uuid(),
 business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 profile_version integer not null,
 taxonomy_version text not null,
 run_status text not null,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 runtime_ms integer,
 candidate_count integer not null default 0,
 matches_returned integer not null default 0,
 strong_match_count integer not null default 0,
 good_match_count integer not null default 0,
 possible_match_count integer not null default 0,
 monitor_count integer not null default 0,
 suppressed_count integer not null default 0,
 error_message text,
 metadata jsonb not null default '{}'
);
create index if not exists aoie_profile_runs_profile_started
  on public.aoie_profile_runs(business_profile_id,started_at desc);

alter table public.aoie_profile_runs enable row level security;
revoke all on public.aoie_profile_runs from anon,authenticated;
grant select,insert,update,delete on public.aoie_profile_runs to service_role;

-- Reassert protection on profile-bearing tables without changing existing data.
DO $$ declare t text; begin
 foreach t in array array['aoie_business_profiles','aoie_business_roles','aoie_business_capabilities','aoie_business_classification_codes','aoie_business_qualifications','aoie_business_past_performance','aoie_business_capacity','aoie_business_match_preferences','aoie_capability_evidence','aoie_capability_confidence_scores','aoie_profile_change_history','aoie_taxonomy_review_queue','aoie_unlisted_capability_submissions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
commit;
