export const SOURCE_CONTRACT_VERSION = 'aoie-state-local-source-v2';
export const CANONICAL_VIEW = 'aoie_opportunity_candidates_v1';
export const DIRECT_TABLE = 'state_contract_opportunities';

const GENERIC_ORG_WORDS = new Set(['the','of','and','state','city','county','department','dept','office','division','authority','district','government','public']);
const asArray = (value) => Array.isArray(value) ? value : [];

export function normalizeRegistryName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bca\b/g, ' california ')
    .replace(/\bnv\b/g, ' nevada ')
    .replace(/\baz\b/g, ' arizona ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !GENERIC_ORG_WORDS.has(token))
    .join(' ')
    .trim();
}

function tokenScore(a, b) {
  const left = new Set(normalizeRegistryName(a).split(/\s+/).filter(Boolean));
  const right = new Set(normalizeRegistryName(b).split(/\s+/).filter(Boolean));
  if (!left.size || !right.size) return 0;
  let common = 0;
  for (const token of left) if (right.has(token)) common += 1;
  return common / Math.max(left.size, right.size);
}

function sameOrContained(a, b) {
  const left = normalizeRegistryName(a);
  const right = normalizeRegistryName(b);
  return Boolean(left && right && (left === right || (Math.min(left.length, right.length) >= 8 && (left.includes(right) || right.includes(left)))));
}

export function buildRegistryIndex({ publishers = [], publisherPlatforms = [], platforms = [] } = {}) {
  const platformById = new Map(platforms.map((row) => [row.platform_id, row]));
  const publisherById = new Map(publishers.map((row) => [row.publisher_id, row]));
  const mappingsByPublisher = new Map();
  for (const mapping of publisherPlatforms) {
    if (!mappingsByPublisher.has(mapping.publisher_id)) mappingsByPublisher.set(mapping.publisher_id, []);
    mappingsByPublisher.get(mapping.publisher_id).push(mapping);
  }
  for (const mappings of mappingsByPublisher.values()) mappings.sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)));
  return { publishers, publisherPlatforms, platforms, platformById, publisherById, mappingsByPublisher };
}

function matchPublisher(row, index) {
  if (row.publisher_id && index.publisherById.has(row.publisher_id)) return { publisher: index.publisherById.get(row.publisher_id), match_type: 'publisher_id', match_score: 1 };
  const state = String(row.state_code || row.place_of_performance_state || '').toUpperCase();
  const opportunityNames = [row.issuing_organization, row.issuing_department, row.jurisdiction_name, row.organization_name].filter(Boolean);
  const candidates = index.publishers.filter((publisher) => !state || publisher.state_code === state);
  for (const publisher of candidates) {
    const registryNames = [publisher.organization_name, publisher.jurisdiction_name].filter(Boolean);
    if (opportunityNames.some((left) => registryNames.some((right) => sameOrContained(left, right)))) return { publisher, match_type: 'normalized_name', match_score: 0.95 };
  }
  let best = null;
  for (const publisher of candidates) {
    const registryNames = [publisher.organization_name, publisher.jurisdiction_name].filter(Boolean);
    const score = Math.max(0, ...opportunityNames.flatMap((left) => registryNames.map((right) => tokenScore(left, right))));
    if (score >= 0.6 && (!best || score > best.match_score)) best = { publisher, match_type: 'token_overlap', match_score: Number(score.toFixed(3)) };
  }
  return best || { publisher: null, match_type: 'unmatched', match_score: 0 };
}

function matchPlatform(row, publisherMatch, index) {
  if (row.platform_id && index.platformById.has(row.platform_id)) return { platform: index.platformById.get(row.platform_id), mapping: null, match_type: 'platform_id' };
  const mappings = publisherMatch.publisher ? (index.mappingsByPublisher.get(publisherMatch.publisher.publisher_id) || []) : [];
  if (mappings.length) {
    const source = normalizeRegistryName(row.source_platform || row.procurement_platform || '');
    const chosen = mappings.find((mapping) => {
      const platform = index.platformById.get(mapping.platform_id);
      return source && platform && [platform.platform_name, platform.technology_vendor].some((name) => sameOrContained(source, name));
    }) || mappings.find((mapping) => mapping.is_primary) || mappings[0];
    return { platform: index.platformById.get(chosen.platform_id) || null, mapping: chosen, match_type: chosen.is_primary ? 'publisher_primary_mapping' : 'publisher_mapping' };
  }
  const source = row.source_platform || row.procurement_platform || '';
  const platform = index.platforms.find((candidate) => [candidate.platform_name, candidate.technology_vendor].some((name) => sameOrContained(source, name))) || null;
  return { platform, mapping: null, match_type: platform ? 'source_platform_name' : 'unmatched' };
}

function urlChoice(candidates) {
  for (const [value, origin] of candidates) if (typeof value === 'string' && value.trim()) return { value: value.trim(), origin };
  return { value: null, origin: null };
}

export function enrichOpportunity(row, index, sourceRelation = DIRECT_TABLE) {
  const publisherMatch = matchPublisher(row, index);
  const platformMatch = matchPlatform(row, publisherMatch, index);
  const publisher = publisherMatch.publisher;
  const mapping = platformMatch.mapping;
  const platform = platformMatch.platform;
  const official = urlChoice([
    [row.official_source_url, 'opportunity.official_source_url'],
    [row.source_url, 'opportunity.source_url'],
    [row.registry_public_search_url, 'canonical_view.registry_public_search_url'],
    [mapping?.public_search_url, 'pdas_publisher_platforms.public_search_url'],
    [platform?.public_search_url, 'pdas_procurement_platforms.public_search_url'],
    [publisher?.procurement_search_url, 'pdas_publishers.procurement_search_url'],
    [publisher?.official_procurement_website, 'pdas_publishers.official_procurement_website'],
  ]);
  const registration = urlChoice([
    [row.vendor_registration_url, 'opportunity.vendor_registration_url'],
    [row.registry_vendor_registration_url, 'canonical_view.registry_vendor_registration_url'],
    [mapping?.vendor_registration_url, 'pdas_publisher_platforms.vendor_registration_url'],
    [platform?.vendor_registration_url, 'pdas_procurement_platforms.vendor_registration_url'],
    [publisher?.vendor_registration_url, 'pdas_publishers.vendor_registration_url'],
  ]);
  return {
    ...row,
    official_source_url: official.value,
    vendor_registration_url: registration.value,
    publisher_id: row.publisher_id || publisher?.publisher_id || null,
    procurement_platform: row.procurement_platform || platform?.platform_name || row.source_platform || null,
    technology_vendor: row.technology_vendor || platform?.technology_vendor || null,
    publisher_evidence: publisher ? {
      registry_verified: publisher.research_status === 'verified',
      publisher_id: publisher.publisher_id,
      organization_name: publisher.organization_name,
      organization_type: publisher.organization_type,
      jurisdiction_name: publisher.jurisdiction_name || null,
      confidence_level: publisher.confidence_level || null,
      research_status: publisher.research_status || null,
      match_type: publisherMatch.match_type,
      match_score: publisherMatch.match_score,
      last_verified_at: publisher.last_verified_at || null,
    } : { registry_verified: false, publisher_id: null, match_type: publisherMatch.match_type, match_score: publisherMatch.match_score },
    procurement_platform_evidence: platform ? {
      platform_id: platform.platform_id,
      platform_name: platform.platform_name,
      technology_vendor: platform.technology_vendor || null,
      platform_status: platform.platform_status || null,
      platform_role: mapping?.platform_role || null,
      is_primary: mapping?.is_primary ?? null,
      registration_required: mapping?.registration_required ?? publisher?.registration_required ?? null,
      authentication_required: mapping?.authentication_required ?? platform.authentication_required ?? publisher?.authentication_required ?? null,
      match_type: platformMatch.match_type,
      last_verified_at: mapping?.last_verified_at || platform.last_verified_at || null,
    } : null,
    source_evidence: {
      source_relation: `public.${sourceRelation}`,
      official_source_url_origin: official.origin,
      vendor_registration_url_origin: registration.origin,
      registry_enriched: Boolean(publisher || platform),
    },
  };
}

export function buildCandidateQuery({ states, nowIso, canonical = false, from = 0, pageSize = 1000 }) {
  const select = canonical ? '*' : [
    'id','pdas_record_id','state_code','jurisdiction_type','jurisdiction_name','issuing_organization','issuing_department','source_platform','source_record_id','source_url','official_source_url','vendor_registration_url','solicitation_number','title','description','procurement_type','notice_type','status','posted_at','response_deadline','prebid_datetime','question_deadline','place_of_performance_city','place_of_performance_county','place_of_performance_state','place_of_performance_zip','estimated_value_min','estimated_value_max','currency','contact_name','contact_email','contact_phone','naics_codes','nigp_codes','unspsc_codes','commodity_codes','set_asides','certifications_required','keywords','document_urls','classifications','requirements','amendment_number','amendment_count','is_latest_version','duplicate_of','last_verified_at','data_quality_score','qa_status'
  ].join(',');
  const query = new URLSearchParams({
    select,
    state_code: `in.(${states.join(',')})`,
    is_latest_version: 'eq.true',
    duplicate_of: 'is.null',
    status: 'in.(open,upcoming,posted,active)',
    or: `(response_deadline.is.null,response_deadline.gte.${nowIso})`,
    order: 'response_deadline.asc.nullslast,posted_at.desc',
  });
  return { query, range: `${from}-${from + pageSize - 1}` };
}

export function isMissingCanonicalRelation(status, bodyText = '') {
  const text = String(bodyText || '').toLowerCase();
  return status === 404 || text.includes('pgrst205') || text.includes('42p01') || text.includes('could not find the table') || text.includes('does not exist');
}

export function publicOpportunity(row) {
  return {
    id: row.opportunity_id || row.source_record_id || row.pdas_record_id || row.id,
    solicitation_number: row.solicitation_number || row.source_record_id || '',
    title: row.title || '',
    description: row.description || null,
    agency: row.organization_name || row.issuing_organization || row.issuing_department || 'Public Agency',
    state_code: row.state_code || row.place_of_performance_state || null,
    procurement_type: row.procurement_type || row.notice_type || null,
    status: row.normalized_status || row.status || null,
    posted_at: row.posted_at || null,
    response_deadline: row.response_deadline || null,
    prebid_datetime: row.prebid_datetime || row.pre_bid_date || null,
    question_deadline: row.question_deadline || null,
    place_of_performance_city: row.place_of_performance_city || null,
    place_of_performance_county: row.place_of_performance_county || null,
    place_of_performance_state: row.place_of_performance_state || row.state_code || null,
    estimated_value_min: row.estimated_value_min ?? null,
    estimated_value_max: row.estimated_value_max ?? null,
    currency: row.currency || 'USD',
    naics_codes: asArray(row.naics_codes),
    nigp_codes: asArray(row.nigp_codes),
    unspsc_codes: asArray(row.unspsc_codes),
    commodity_codes: asArray(row.commodity_codes),
    set_asides: asArray(row.set_asides),
    certifications_required: asArray(row.certifications_required || row.required_certifications),
    keywords: asArray(row.keywords),
    document_urls: row.document_urls || row.attachment_urls || [],
    requirements: row.requirements || {},
    amendment_number: row.amendment_number || null,
    amendment_count: Number(row.amendment_count || 0),
    official_source_url: row.official_source_url || null,
    vendor_registration_url: row.vendor_registration_url || null,
    source_platform: row.source_platform || null,
    procurement_platform: row.procurement_platform || null,
    technology_vendor: row.technology_vendor || null,
    contact_name: row.contact_name || null,
    contact_email: row.contact_email || null,
    contact_phone: row.contact_phone || null,
    publisher_id: row.publisher_id || null,
    publisher_evidence: row.publisher_evidence || null,
    procurement_platform_evidence: row.procurement_platform_evidence || null,
    source_evidence: row.source_evidence || null,
    data_quality_score: row.data_quality_score ?? null,
    qa_status: row.qa_status || null,
  };
}
