import assert from 'node:assert/strict';
import {
  expandBusinessProfile,
  scoreStateLocalMatch,
} from '../netlify/functions/_shared/aoie-state-local.mjs';

function test(name, fn) {
  try {
    fn();
    console.log('PASS', name);
  } catch (error) {
    console.error('FAIL', name);
    throw error;
  }
}

const profile = expandBusinessProfile({
  business_name: 'Apropos Test Technologies LLC',
  keywords: ['cybersecurity', 'network infrastructure', 'managed services', 'project management'],
  core_competencies: ['systems integration', 'cloud security'],
  naics_codes: ['541512', '541519'],
  commodity_codes: ['20900'],
  unspsc_codes: ['81111801'],
  certifications: ['SBE', 'MBE'],
  licenses: [],
  service_states: ['CA', 'NV'],
  max_contract_value: 2_000_000,
});

const future = '2099-08-15T17:00:00-07:00';

test('exact UNSPSC and capability language produce a strong match', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'Managed Cybersecurity and Network Infrastructure Services',
    description: 'Systems integration, cloud security, monitoring, and managed services.',
    state_code: 'CA',
    unspsc_codes: ['81111801'],
    commodity_codes: ['20900'],
    response_deadline: future,
    estimated_value_max: 900000,
  });
  assert.equal(result.match_status, 'Strong Match');
  assert.ok(result.fit_score >= 80, JSON.stringify(result));
  assert.equal(result.hard_disqualifier, null);
});

test('related commodity family and semantic evidence produce a reviewable match', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'Enterprise Software Implementation and Technical Support',
    description: 'Implementation, data migration, help desk, and application support.',
    state_code: 'NV',
    commodity_codes: ['20910'],
    response_deadline: future,
  });
  assert.ok(result.fit_score >= 35, JSON.stringify(result));
  assert.notEqual(result.match_status, 'Not Recommended');
});

test('unrelated landscaping work is not recommended', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'Landscape Maintenance and Tree Trimming',
    description: 'Mowing, irrigation, and arborist services.',
    state_code: 'CA',
    commodity_codes: ['92000'],
    response_deadline: future,
  });
  assert.equal(result.match_status, 'Not Recommended');
});

test('expired opportunities are hard-disqualified', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'Cybersecurity Services',
    state_code: 'CA',
    commodity_codes: ['20900'],
    response_deadline: '2020-01-01',
  });
  assert.equal(result.hard_disqualifier, 'EXPIRED');
  assert.equal(result.fit_score, 0);
});

test('explicit geography outside declared service area is hard-disqualified', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'Network Infrastructure Services',
    state_code: 'AZ',
    commodity_codes: ['20900'],
    response_deadline: future,
  });
  assert.equal(result.hard_disqualifier, 'OUTSIDE_SERVICE_AREA');
});

test('exclusive certification requirement blocks an ineligible profile', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'DVBE Only Network Cabling Services',
    description: 'Participation is reserved exclusively for certified DVBE firms.',
    state_code: 'CA',
    commodity_codes: ['20900'],
    response_deadline: future,
  });
  assert.equal(result.hard_disqualifier, 'CERTIFICATION_REQUIREMENT_MISMATCH');
});

test('explicit contractor license requirement is flagged as a hard mismatch', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'Low Voltage Network Installation',
    description: 'Bidder must possess a valid C-7 contractor license.',
    state_code: 'CA',
    commodity_codes: ['20900'],
    response_deadline: future,
  });
  assert.equal(result.hard_disqualifier, 'LICENSE_REQUIREMENT_MISMATCH');
});

test('declared capacity prevents over-sized opportunity recommendations', () => {
  const result = scoreStateLocalMatch(profile, {
    title: 'Statewide Cybersecurity Operations Center',
    description: 'Managed security operations and systems integration.',
    state_code: 'CA',
    commodity_codes: ['20900'],
    response_deadline: future,
    estimated_value_max: 10_000_000,
  });
  assert.equal(result.hard_disqualifier, 'CAPACITY_EXCEEDED');
});

console.log('AOIE state/local matcher fixture suite complete.');
