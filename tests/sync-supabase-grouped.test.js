'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { groupRowsByKeySet } = require('../scripts/sync-supabase-grouped');

test('groups PostgREST upsert rows by identical object keys', () => {
  const groups = groupRowsByKeySet([
    { source_platform: 'caleprocure', source_record_id: '1', title: 'One' },
    { source_platform: 'caleprocure', source_record_id: '2', title: 'Two' },
    { source_platform: 'caleprocure', source_record_id: '3', title: 'Three', description: 'Detail' },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(group => group.length).sort(), [1, 2]);
  groups.forEach(group => {
    const expected = Object.keys(group[0]).sort().join('|');
    group.forEach(row => assert.equal(Object.keys(row).sort().join('|'), expected));
  });
});
