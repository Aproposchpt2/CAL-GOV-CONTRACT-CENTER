begin;
-- The approved AOIE v1.0 taxonomy is already populated by the catalog workstream.
-- This seed is intentionally additive and only strengthens approved synonym resolution.
with v as(select id from public.aoie_taxonomy_versions where version='1.0' limit 1),
c as(select id,capability_code from public.aoie_taxonomy_capabilities)
insert into public.aoie_taxonomy_synonyms(capability_id,synonym,normalized_value,synonym_type,source,confidence,active_status,taxonomy_version_id)
select c.id,x.term,lower(x.term),x.typ,'AOIE controlled pilot',x.conf,true,v.id
from v
cross join(values
 ('CAP-JANITORIAL','commercial cleaning','COMMON_TERM',96),
 ('CAP-JANITORIAL','office cleaning','COMMON_TERM',94),
 ('CAP-JANITORIAL','facility cleaning','COMMON_TERM',94),
 ('CAP-JANITORIAL','custodial','PROCUREMENT_TERM',98),
 ('CAP-CYBER','cyber security','COMMON_TERM',96),
 ('CAP-SOFTWARE','systems integration','PROCUREMENT_TERM',93),
 ('CAP-HVAC','air conditioning repair','COMMON_TERM',92),
 ('CAP-STAFFING','temp staffing','ABBREVIATION',96),
 ('CAP-EV','electric vehicle charger installation','COMMON_TERM',96),
 ('CAP-CONSULTING','strategy consulting','COMMON_TERM',92)
)as x(cap,term,typ,conf)
join c on c.capability_code=x.cap
where not exists(
 select 1 from public.aoie_taxonomy_synonyms s
 where s.capability_id=c.id and s.normalized_value=lower(x.term) and s.taxonomy_version_id=v.id
);
commit;
