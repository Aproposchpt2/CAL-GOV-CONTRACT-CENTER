'use strict';

/* Upgrade the checked-in Cal eProcure snapshot to the canonical PDAS identity
   before the live browser refresh. This allows already-verified detail records
   to enter production immediately while the slower event/package acquisition
   continues in the same workflow run. */

const fs = require('fs');
const path = require('path');
const {
  parseEventIdentity,
  buildSourceRecordId,
} = require('./lib/caleprocure-normalize');

const snapshotPath = path.join(__dirname, '..', 'caleprocure.json');

function main() {
  const payload = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const opportunities = Array.isArray(payload.opportunities) ? payload.opportunities : [];
  let resolved = 0;
  let unresolved = 0;

  opportunities.forEach(opportunity => {
    const identity = parseEventIdentity(opportunity.official_url || opportunity.url, opportunity.id);
    if (!opportunity.business_unit && identity.business_unit) {
      opportunity.business_unit = identity.business_unit;
    }
    if (!opportunity.id && identity.event_id) {
      opportunity.id = identity.event_id;
    }
    opportunity.source_record_id = buildSourceRecordId(opportunity.business_unit, opportunity.id);
    if (opportunity.source_record_id) resolved += 1;
    else unresolved += 1;
  });

  payload.business_unit_resolved_count = resolved;
  payload.business_unit_unresolved_count = unresolved;
  payload.snapshot_prepared_at = new Date().toISOString();
  fs.writeFileSync(snapshotPath, JSON.stringify(payload, null, 2));
  console.log('[prepare-caleprocure-snapshot] ' + resolved + ' canonical identities resolved; ' + unresolved + ' deferred.');
}

main();
