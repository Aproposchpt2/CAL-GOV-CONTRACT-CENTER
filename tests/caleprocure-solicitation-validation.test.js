'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractSolicitationNumber } = require('../scripts/lib/caleprocure-normalize');

test('rejects narrative words after an RFI or RFP label', () => {
  assert.equal(extractSolicitationNumber('Market research', 'This RFI specifically requests information.'), null);
  assert.equal(extractSolicitationNumber('Market research', 'The RFP information is available online.'), null);
});

test('retains numeric and alphanumeric solicitation identifiers', () => {
  assert.equal(extractSolicitationNumber('Request for Information - RFI 18369', ''), '18369');
  assert.equal(extractSolicitationNumber('Outreach Services, RFP # 26CROB-037S', ''), '26CROB-037S');
  assert.equal(extractSolicitationNumber('', 'IFB Number S25-33335 seeks qualified vendors.'), 'S25-33335');
});
