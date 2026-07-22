begin;
with v as(select id from public.aoie_taxonomy_versions where version_number='1.0')
insert into public.aoie_taxonomy_domains(domain_code,display_name,description,taxonomy_version_id,display_order)
select x.code,x.name,x.description,v.id,x.ord from v cross join(values
('CONSTRUCTION','Construction and Infrastructure','Construction, public works and infrastructure delivery',1),
('IT','Information Technology and Software','Technology, cybersecurity, software and digital services',2),
('PROFESSIONAL','Professional and Consulting Services','Advisory, management and specialized professional services',3),
('FACILITIES','Facilities and Maintenance','Building operations, repair, custodial and maintenance services',4),
('PRODUCTS','Products, Supplies and Distribution','Commodities, equipment, materials and distribution',5),
('TRANSPORTATION','Transportation and Logistics','Transportation, fleet, freight and logistics',6),
('STAFFING','Staffing and Workforce Services','Temporary staffing, recruitment and workforce support',7),
('HEALTH','Healthcare and Human Services','Healthcare, behavioral health and human services',8),
('ENGINEERING','Engineering and Technical Services','Engineering, design, inspection and technical services',9),
('TRAINING','Training and Education','Training, curriculum and educational services',10),
('ENVIRONMENT','Environmental and Energy Services','Environmental, sustainability, utilities and energy services',11),
('ADMIN','Administrative and Business Support','Administrative, financial, communications and business operations',12)
)as x(code,name,description,ord)
on conflict(domain_code) do nothing;

with v as(select id from public.aoie_taxonomy_versions where version_number='1.0'),d as(select id,domain_code from public.aoie_taxonomy_domains)
insert into public.aoie_taxonomy_categories(category_code,domain_id,display_name,taxonomy_version_id,display_order)
select x.code,d.id,x.name,v.id,x.ord from v join d on d.domain_code=x.domain cross join(values
('IT_MANAGED','IT','Managed IT and Infrastructure',1),('IT_CYBER','IT','Cybersecurity',2),('IT_SOFTWARE','IT','Software and Systems',3),
('FAC_CUSTODIAL','FACILITIES','Custodial and Building Services',1),('FAC_MECH','FACILITIES','Mechanical Systems Maintenance',2),
('CON_GENERAL','CONSTRUCTION','General Construction',1),('CON_TRADES','CONSTRUCTION','Specialty Trades',2),
('PRO_ADVISORY','PROFESSIONAL','Management and Advisory',1),('PRO_LEGAL_FIN','PROFESSIONAL','Legal and Financial',2),
('PROD_TECH','PRODUCTS','Technology Products',1),('PROD_FAC','PRODUCTS','Facilities Products',2),('PROD_MED','PRODUCTS','Medical Products',3),
('STAFF_GENERAL','STAFFING','Staffing and Recruitment',1),('TRANS_FLEET','TRANSPORTATION','Fleet and Transportation',1),
('ENG_DESIGN','ENGINEERING','Engineering and Design',1),('TRAIN_GENERAL','TRAINING','Training Services',1),
('HEALTH_SERVICES','HEALTH','Healthcare Services',1),('ENV_ENERGY','ENVIRONMENT','Energy and Environmental',1),
('ADMIN_SUPPORT','ADMIN','Administrative Support',1)
)as x(code,domain,name,ord)
on conflict(category_code) do nothing;

with v as(select id from public.aoie_taxonomy_versions where version_number='1.0'),c as(select id,category_code from public.aoie_taxonomy_categories)
insert into public.aoie_taxonomy_groups(group_code,category_id,display_name,procurement_type,taxonomy_version_id,display_order)
select x.code,c.id,x.name,x.pt,v.id,x.ord from v join c on c.category_code=x.category cross join(values
('IT_MSP','IT_MANAGED','Managed IT Services','SERVICE',1),('IT_CLOUD','IT_MANAGED','Cloud and Infrastructure','SERVICE',2),
('CYBER_SERVICES','IT_CYBER','Cybersecurity Services','PROFESSIONAL_SERVICE',1),('SOFTWARE_DEV','IT_SOFTWARE','Software Development and Integration','SOFTWARE',1),
('JANITORIAL','FAC_CUSTODIAL','Janitorial and Custodial Services','SERVICE',1),('HVAC_SERVICE','FAC_MECH','HVAC Services','MAINTENANCE',1),
('GENERAL_BUILDING','CON_GENERAL','General Building Construction','CONSTRUCTION',1),('ELECTRICAL','CON_TRADES','Electrical Services','CONSTRUCTION',1),('WINDOW_SYSTEMS','CON_TRADES','Window and Glazing Systems','CONSTRUCTION',2),
('MGMT_CONSULTING','PRO_ADVISORY','Management Consulting','PROFESSIONAL_SERVICE',1),
('TECH_PRODUCTS','PROD_TECH','Technology Hardware and Products','PRODUCT',1),('HVAC_PRODUCTS','PROD_FAC','HVAC Equipment and Parts','PRODUCT',1),('MED_SUPPLIES','PROD_MED','Medical Supplies and Equipment','PRODUCT',1),
('TEMP_STAFF','STAFF_GENERAL','Temporary Staffing','SERVICE',1),('TRANSPORT_SERVICES','TRANS_FLEET','Transportation Services','SERVICE',1),
('ENG_CONSULTING','ENG_DESIGN','Engineering Consulting','PROFESSIONAL_SERVICE',1),('WORKFORCE_TRAINING','TRAIN_GENERAL','Workforce Training','SERVICE',1),
('HEALTH_PROVIDER','HEALTH_SERVICES','Healthcare Provider Services','SERVICE',1),('ENERGY_SERVICES','ENV_ENERGY','Energy and Sustainability Services','PROFESSIONAL_SERVICE',1),
('ADMIN_SERVICES','ADMIN_SUPPORT','Administrative Support Services','SERVICE',1)
)as x(code,category,name,pt,ord)
on conflict(group_code) do nothing;

with v as(select id from public.aoie_taxonomy_versions where version_number='1.0'),g as(select id,group_code from public.aoie_taxonomy_groups)
insert into public.aoie_taxonomy_capabilities(capability_code,group_id,display_name,description,procurement_type,taxonomy_version_id,display_order)
select x.code,g.id,x.name,x.description,x.pt,v.id,x.ord from v join g on g.group_code=x.grp cross join(values
('MANAGED_IT','IT_MSP','Managed IT Services','Ongoing infrastructure, help desk and systems administration','SERVICE',1),
('CLOUD_MIGRATION','IT_CLOUD','Cloud Migration and Management','Cloud architecture, migration and managed cloud operations','SERVICE',1),
('CYBER_ASSESSMENT','CYBER_SERVICES','Cybersecurity Assessment and Compliance','Security assessment, risk, compliance and vulnerability services','PROFESSIONAL_SERVICE',1),
('SOFTWARE_INTEGRATION','SOFTWARE_DEV','Software Development and Systems Integration','Custom software, application integration and systems implementation','SOFTWARE',1),
('JANITORIAL_SERVICES','JANITORIAL','Janitorial and Custodial Services','Commercial cleaning, custodial, sanitation and floor care','SERVICE',1),
('HVAC_MAINTENANCE','HVAC_SERVICE','Commercial HVAC Maintenance','Preventive maintenance, repair and service of HVAC systems','MAINTENANCE',1),
('GENERAL_CONSTRUCTION','GENERAL_BUILDING','General Building Construction','General contracting, renovation and building construction','CONSTRUCTION',1),
('ELECTRICAL_INSTALL','ELECTRICAL','Commercial Electrical Installation','Electrical construction, upgrades and installation','CONSTRUCTION',1),
('EV_CHARGING','ELECTRICAL','EV Charging Station Installation','Electric vehicle charging equipment installation','HYBRID',2),
('WINDOW_REPAIR','WINDOW_SYSTEMS','Window Systems Repair and Replacement','Physical window, glazing, frame and building-envelope repair','CONSTRUCTION',1),
('MANAGEMENT_CONSULTING','MGMT_CONSULTING','Management and Strategy Consulting','Organizational, operational and strategic consulting','PROFESSIONAL_SERVICE',1),
('IT_HARDWARE','TECH_PRODUCTS','Computer Hardware and Peripherals','Computers, servers, networking equipment and peripherals','PRODUCT',1),
('HVAC_EQUIPMENT','HVAC_PRODUCTS','HVAC Equipment and Replacement Parts','Supply and distribution of HVAC equipment and parts','PRODUCT',1),
('MEDICAL_SUPPLIES','MED_SUPPLIES','Medical Supplies and Equipment','Medical, clinical and healthcare supplies','PRODUCT',1),
('TEMPORARY_STAFFING','TEMP_STAFF','Temporary Staffing Services','Temporary, contract and contingent workforce services','SERVICE',1),
('TRANSPORTATION_PROVIDER','TRANSPORT_SERVICES','Transportation and Delivery Services','Passenger, freight, courier and delivery services','SERVICE',1),
('ENGINEERING_CONSULTING','ENG_CONSULTING','Engineering Consulting Services','Engineering, design, inspection and technical advisory','PROFESSIONAL_SERVICE',1),
('PROFESSIONAL_TRAINING','WORKFORCE_TRAINING','Professional Training Services','Instructor-led, virtual and workforce training','SERVICE',1),
('HEALTHCARE_SERVICES','HEALTH_PROVIDER','Healthcare Provider Services','Clinical and healthcare service delivery','SERVICE',1),
('ENERGY_CONSULTING','ENERGY_SERVICES','Energy and Sustainability Consulting','Energy efficiency, sustainability and clean-energy advisory','PROFESSIONAL_SERVICE',1),
('ADMIN_SUPPORT','ADMIN_SERVICES','Administrative Support Services','Clerical, office, records and administrative support','SERVICE',1)
)as x(code,grp,name,description,pt,ord)
on conflict(capability_code) do nothing;

with v as(select id from public.aoie_taxonomy_versions where version_number='1.0'),c as(select id,capability_code from public.aoie_taxonomy_capabilities)
insert into public.aoie_taxonomy_synonyms(capability_id,synonym_text,normalized_synonym,synonym_type,taxonomy_version_id,confidence)
select c.id,x.term,lower(x.term),x.typ,v.id,x.conf from v join c on c.capability_code=x.cap cross join(values
('JANITORIAL_SERVICES','commercial cleaning','COMMON_TERM',96),('JANITORIAL_SERVICES','office cleaning','COMMON_TERM',94),('JANITORIAL_SERVICES','custodial','PROCUREMENT_TERM',98),
('MANAGED_IT','IT support','COMMON_TERM',95),('MANAGED_IT','managed services provider','COMMON_TERM',95),('CYBER_ASSESSMENT','cyber security','COMMON_TERM',96),
('SOFTWARE_INTEGRATION','systems integration','PROCUREMENT_TERM',97),('HVAC_MAINTENANCE','air conditioning repair','COMMON_TERM',92),
('HVAC_EQUIPMENT','HVAC parts','COMMON_TERM',95),('TEMPORARY_STAFFING','temp staffing','ABBREVIATION',96),
('WINDOW_REPAIR','glazing repair','PROCUREMENT_TERM',96),('EV_CHARGING','electric vehicle charger installation','COMMON_TERM',96)
)as x(cap,term,typ,conf)
on conflict do nothing;
commit;
