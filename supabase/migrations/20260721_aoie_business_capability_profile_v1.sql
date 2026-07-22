begin;
create extension if not exists pgcrypto;

create table if not exists public.aoie_taxonomy_versions(
 id uuid primary key default gen_random_uuid(), version_number text not null unique,
 version_type text not null check(version_type in('PATCH','MINOR','MAJOR')),
 status text not null check(status in('DRAFT','REVIEW','PILOT','APPROVED','ACTIVE','SUPERSEDED','RETIRED')),
 effective_at timestamptz, retired_at timestamptz, corpus_size_analyzed integer,
 geographic_coverage jsonb not null default '[]', categories_added integer not null default 0,
 categories_modified integer not null default 0, categories_retired integer not null default 0,
 mapping_changes jsonb not null default '[]', synonym_changes jsonb not null default '[]',
 approval_authority text, change_rationale text, migration_instructions text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.aoie_taxonomy_domains(
 id uuid primary key default gen_random_uuid(), domain_code text not null unique, display_name text not null,
 description text, taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id),
 display_order integer not null default 0, active boolean not null default true, confidence_status text not null default 'APPROVED',
 effective_at timestamptz not null default now(), retired_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.aoie_taxonomy_categories(
 id uuid primary key default gen_random_uuid(), category_code text not null unique,
 domain_id uuid not null references public.aoie_taxonomy_domains(id), display_name text not null, description text,
 taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id), display_order integer not null default 0,
 active boolean not null default true, confidence_status text not null default 'APPROVED', effective_at timestamptz not null default now(),
 retired_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.aoie_taxonomy_groups(
 id uuid primary key default gen_random_uuid(), group_code text not null unique,
 category_id uuid not null references public.aoie_taxonomy_categories(id), display_name text not null, description text,
 procurement_type text not null check(procurement_type in('SERVICE','PRODUCT','CONSTRUCTION','PROFESSIONAL_SERVICE','EQUIPMENT_RENTAL','MAINTENANCE','SOFTWARE','HYBRID')),
 taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id), display_order integer not null default 0,
 active boolean not null default true, confidence_status text not null default 'APPROVED', effective_at timestamptz not null default now(),
 retired_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.aoie_taxonomy_capabilities(
 id uuid primary key default gen_random_uuid(), capability_code text not null unique,
 group_id uuid not null references public.aoie_taxonomy_groups(id), display_name text not null, description text,
 procurement_type text not null check(procurement_type in('SERVICE','PRODUCT','CONSTRUCTION','PROFESSIONAL_SERVICE','EQUIPMENT_RENTAL','MAINTENANCE','SOFTWARE','HYBRID')),
 taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id), display_order integer not null default 0,
 active boolean not null default true, confidence_status text not null default 'APPROVED', effective_at timestamptz not null default now(),
 retired_at timestamptz, replacement_capability_id uuid references public.aoie_taxonomy_capabilities(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.aoie_taxonomy_synonyms(
 id uuid primary key default gen_random_uuid(), capability_id uuid not null references public.aoie_taxonomy_capabilities(id) on delete cascade,
 synonym_text text not null, normalized_synonym text not null, synonym_type text not null,
 taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id), confidence numeric(5,2) not null default 100,
 review_status text not null default 'APPROVED', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists aoie_synonym_unique on public.aoie_taxonomy_synonyms(lower(normalized_synonym),capability_id,taxonomy_version_id);

create table if not exists public.aoie_taxonomy_code_mappings(
 id uuid primary key default gen_random_uuid(), capability_id uuid not null references public.aoie_taxonomy_capabilities(id) on delete cascade,
 code_system text not null, code_value text not null, code_description text, mapping_type text not null,
 confidence numeric(5,2) not null, source_provenance jsonb not null default '{}',
 taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists aoie_code_lookup on public.aoie_taxonomy_code_mappings(code_system,code_value);

create table if not exists public.aoie_business_profiles(
 id uuid primary key default gen_random_uuid(), session_id text not null unique, legal_business_name text not null,
 dba_name text, business_description text, website text, primary_city text, primary_state text, primary_zip text,
 service_territory jsonb not null default '[]', years_in_business numeric, employee_range text, annual_revenue_range text,
 profile_version integer not null default 1, taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id),
 completion_score numeric(5,2) not null default 0, confidence_score numeric(5,2) not null default 0,
 verification_status text not null default 'SELF_REPORTED', user_confirmed boolean not null default false,
 last_reviewed_at timestamptz, next_review_at timestamptz, source_provenance jsonb not null default '{}',
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.aoie_business_roles(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 role_code text not null, role_name text not null, is_primary boolean not null default false, years_experience numeric,
 confidence numeric(5,2), user_confirmed boolean not null default true, created_at timestamptz not null default now());
create unique index if not exists aoie_one_primary_role on public.aoie_business_roles(business_profile_id) where is_primary;

create table if not exists public.aoie_business_capabilities(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 capability_id uuid not null references public.aoie_taxonomy_capabilities(id), procurement_type text not null,
 priority integer not null default 1, proficiency text, years_experience numeric, geographic_coverage jsonb not null default '[]',
 delivery_method text, original_user_term text, resolution_method text, resolution_confidence numeric(5,2),
 evidence_score numeric(5,2), confidence_band text, user_confirmed boolean not null default true,
 taxonomy_version_id uuid not null references public.aoie_taxonomy_versions(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(business_profile_id,capability_id));

create table if not exists public.aoie_business_classification_codes(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 code_system text not null, code_value text not null, code_description text, source text, confidence numeric(5,2), verified boolean not null default false,
 created_at timestamptz not null default now());
create table if not exists public.aoie_business_qualifications(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 qualification_type text not null, qualification_name text not null, issuing_authority text, identifier text,
 issued_at date, expires_at date, verified boolean not null default false, evidence_url text, created_at timestamptz not null default now());
create table if not exists public.aoie_business_past_performance(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 client_name text, client_type text, project_title text, project_description text, contract_value numeric,
 performance_start date, performance_end date, reference_name text, reference_contact text, verified boolean not null default false,
 created_at timestamptz not null default now());
create table if not exists public.aoie_business_capacity(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null unique references public.aoie_business_profiles(id) on delete cascade,
 minimum_contract_value numeric, maximum_contract_value numeric, staffing_capacity text, equipment_capacity text,
 geographic_capacity jsonb not null default '[]', emergency_response_capable boolean, recurring_service_capable boolean,
 delivery_capacity text, prime_ready boolean, subcontractor_available boolean,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.aoie_business_match_preferences(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null unique references public.aoie_business_profiles(id) on delete cascade,
 federal_enabled boolean not null default false, state_enabled boolean not null default true, county_enabled boolean not null default true,
 city_enabled boolean not null default true, school_district_enabled boolean not null default true, university_enabled boolean not null default true,
 special_district_enabled boolean not null default true, preferred_states jsonb not null default '[]', preferred_counties jsonb not null default '[]',
 preferred_contract_types jsonb not null default '[]', preferred_set_asides jsonb not null default '[]', minimum_contract_value numeric,
 maximum_contract_value numeric, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.aoie_capability_evidence(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 business_capability_id uuid references public.aoie_business_capabilities(id) on delete cascade, evidence_type text not null,
 evidence_source text, evidence_value text, weight numeric(5,2) not null, positive boolean not null default true,
 confidence numeric(5,2), source_provenance jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.aoie_profile_change_history(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 profile_version integer not null, change_type text not null, changed_fields jsonb not null, previous_values jsonb,
 new_values jsonb, changed_by text, created_at timestamptz not null default now());
create table if not exists public.aoie_taxonomy_review_queue(
 id uuid primary key default gen_random_uuid(), original_term text not null, normalized_term text,
 suggested_capability_id uuid references public.aoie_taxonomy_capabilities(id), resolution_method text,
 confidence numeric(5,2), source_context jsonb not null default '{}', review_status text not null default 'PENDING',
 reviewed_by text, reviewed_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.aoie_unlisted_capability_submissions(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid references public.aoie_business_profiles(id) on delete set null,
 submitted_term text not null, business_description text, suggested_domain text, suggested_category text,
 suggested_procurement_type text, submission_status text not null default 'PENDING', created_at timestamptz not null default now());
create table if not exists public.aoie_profile_runs(
 id uuid primary key default gen_random_uuid(), business_profile_id uuid not null references public.aoie_business_profiles(id) on delete cascade,
 profile_version integer not null, taxonomy_version text not null, run_status text not null, started_at timestamptz not null default now(),
 completed_at timestamptz, runtime_ms integer, candidate_count integer not null default 0, matches_returned integer not null default 0,
 strong_match_count integer not null default 0, good_match_count integer not null default 0, possible_match_count integer not null default 0,
 monitor_count integer not null default 0, suppressed_count integer not null default 0, error_message text, metadata jsonb not null default '{}');

insert into public.aoie_taxonomy_versions(version_number,version_type,status,effective_at,approval_authority,change_rationale)
values('1.0','MAJOR','ACTIVE',now(),'ALEXANDER / AOIE ORCHESTRATOR','Controlled pilot baseline')
on conflict(version_number) do update set status='ACTIVE',updated_at=now();

DO $$ declare t text; begin
 foreach t in array array['aoie_taxonomy_versions','aoie_taxonomy_domains','aoie_taxonomy_categories','aoie_taxonomy_groups','aoie_taxonomy_capabilities','aoie_taxonomy_synonyms','aoie_taxonomy_code_mappings','aoie_business_profiles','aoie_business_roles','aoie_business_capabilities','aoie_business_classification_codes','aoie_business_qualifications','aoie_business_past_performance','aoie_business_capacity','aoie_business_match_preferences','aoie_capability_evidence','aoie_profile_change_history','aoie_taxonomy_review_queue','aoie_unlisted_capability_submissions','aoie_profile_runs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
commit;
