#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  EXTRACTION_VERSION,
  TAXONOMY_VERSION,
  processRecords,
} = require('./lib/procurement-knowledge');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function readInput(filename) {
  if (!filename || filename === '-') {
    const raw = fs.readFileSync(0, 'utf8');
    return JSON.parse(raw);
  }
  return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
}

function normalizeInput(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.records)) return payload.records;
  if (payload && Array.isArray(payload.data)) return payload.data;
  throw new Error('Input must be a JSON array or an object with records/data array.');
}

function writeJson(filename, payload) {
  const content = JSON.stringify(payload, null, 2) + '\n';
  if (!filename || filename === '-') process.stdout.write(content);
  else fs.writeFileSync(path.resolve(filename), content, 'utf8');
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write([
      'Procurement Knowledge Discovery controlled-pilot runner',
      '',
      'Usage:',
      '  node scripts/procurement-knowledge-pilot.js --input opportunities.json --output extractions.json --report report.json',
      '  cat opportunities.json | node scripts/procurement-knowledge-pilot.js --input -',
      '',
      'The runner is read-only. It never connects to or modifies Supabase.',
      '',
    ].join('\n'));
    return;
  }

  const records = normalizeInput(readInput(args.input));
  const startedAt = new Date();
  const result = processRecords(records);
  const completedAt = new Date();

  const output = {
    extraction_version: EXTRACTION_VERSION,
    taxonomy_version: TAXONOMY_VERSION,
    generated_at: completedAt.toISOString(),
    source_mode: 'read_only_json_export',
    extractions: result.extractions,
  };

  const report = {
    run_version: EXTRACTION_VERSION,
    taxonomy_version: TAXONOMY_VERSION,
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    runtime_ms: completedAt.getTime() - startedAt.getTime(),
    records_considered: result.records_considered,
    records_processed: result.records_processed,
    records_skipped: result.records_skipped,
    records_failed: result.records_failed,
    review_required: result.review_required,
    frequency: result.frequency_report,
    controls: {
      source_records_modified: false,
      production_taxonomy_activated: false,
      database_writes_performed: false,
    },
  };

  writeJson(args.output || '-', output);
  if (args.report) writeJson(args.report, report);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Procurement knowledge pilot failed: ${error.message}\n`);
  process.exitCode = 1;
}
