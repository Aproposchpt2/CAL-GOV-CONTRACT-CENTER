'use strict';
// CalGCC — California Government Contracts Center
// Blends three independently-resilient, pre-scraped sources into one feed
// (a failure in any one does not affect the others):
//   1. caleprocure.json — California State Contracts Register, scraped via a
//      headless Playwright session by scripts/scrape-caleprocure.js (see
//      .github/workflows/scrape-caleprocure.yml). caleprocure.ca.gov sits
//      behind a WAF that 403s plain server-side fetch() — including its own
//      robots.txt — so this can only ever be pre-scraped, never live-fetched
//      from this function. (This replaces an earlier regex-based live-fetch
//      attempt against a URL that had gone stale/404, which was silently
//      returning a single false-positive match instead of real data.)
//   2. bids.json — the pre-scraped PlanetBids feed for CA city/county/district
//      agency portals, written by scripts/scrape.js (see .github/workflows/scrape.yml).
//   3. obas.json — DGS's monthly "Upcoming Solicitations" bulletin (not yet
//      open for bid — status 'Upcoming'), written by scripts/ingest-obas.js.
// Results are deduped and merged before being cached and returned.

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple in-process cache — avoids hammering cal eProcure
let _cache = null, _cacheAt = 0;
const TTL_MS = 5 * 60 * 1000;

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const diff = Date.parse(isoDate) - Date.now();
  return Math.ceil(diff / 86400000);
}

// Cal eProcure (California State Contracts Register) — pre-scraped by
// scripts/scrape-caleprocure.js. Detail fields (description, contact,
// unspsc_codes) are populated incrementally across scheduled runs — new
// postings start with list-level fields only (detail_fetched: false) until
// a later run fetches their detail page, so callers should treat description/
// contact/unspsc_codes as "may be empty" rather than always-present.
async function fetchCaleprocureBids(siteUrl) {
  try {
    const res = await fetch(`${siteUrl}/caleprocure.json`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const arr = Array.isArray(data.opportunities) ? data.opportunities : [];
    return arr.map(o => ({
      id:              o.id || '',
      bid_id:          o.id || '',
      solicitation_no: o.id || '',
      title:           o.title || '',
      bid_type:        o.bid_type || 'SOLICITATION',
      agency:          o.department || 'California State Agency',
      issue_date:      o.published_date || null,
      close_date:      o.close_date || null,
      due_in_days:     o.due_in_days != null ? o.due_in_days : daysUntil(o.close_date),
      status:          o.status || 'Posted',
      url:             o.url || 'https://caleprocure.ca.gov/pages/Events-BS3/event-search.aspx',
      category_ids:    [],
      description:         o.description || null,
      unspsc_codes:        Array.isArray(o.unspsc_codes) ? o.unspsc_codes : [],
      contact_name:        o.contact_name || null,
      contact_email:       o.contact_email || null,
      contact_phone:       o.contact_phone || null,
      _source:         'caleprocure',
    })).filter(b => b.title.length > 3);
  } catch (e) {
    console.log('[cal-pipeline] Cal eProcure caleprocure.json fetch failed (non-fatal):', e.message);
    return [];
  }
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

// ── PlanetBids (pre-scraped) ─────────────────────────────────────────────────
// bids.json is written daily by scripts/scrape.js — a scheduled, rate-limit-aware
// Playwright scraper (PlanetBids' API sits behind a WAF-style limiter, so it is
// never queried live from this function). If the file is missing or unreachable
// (e.g. before the first scheduled run on a fresh deploy), this degrades to an
// empty array rather than failing the whole response.
async function fetchPlanetBidsBids(siteUrl) {
  try {
    const res = await fetch(`${siteUrl}/bids.json`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const arr = Array.isArray(data.bids) ? data.bids : [];
    return arr.map(b => ({
      id:              b.id || '',
      bid_id:          b.id || '',
      solicitation_no: b.solicitation_no || '',
      title:           b.title || '',
      bid_type:        b.bid_type || 'SOLICITATION',
      agency:          b.agency || 'California Local Agency',
      issue_date:      null,
      close_date:      b.close_date || null,
      due_in_days:     b.due_in_days != null ? b.due_in_days : daysUntil(b.close_date),
      status:          'Open',
      url:             b.url || '',
      category_ids:    Array.isArray(b.category_ids) ? b.category_ids : [],
      _source:         'planetbids',
    })).filter(b => b.title.length > 3);
  } catch (e) {
    console.log('[cal-pipeline] PlanetBids bids.json fetch failed (non-fatal):', e.message);
    return [];
  }
}

// OBAS "Upcoming Solicitations" bulletin — DGS contracts anticipated to be
// released soon but not yet open for bid. Pre-parsed monthly by
// scripts/ingest-obas.js into obas.json (same file-based pattern as
// bids.json). status is 'Upcoming', not 'Open' — these aren't biddable yet.
// unspsc_code is metadata only, never used for matching (per directive,
// extract-profile-ca.js's NAICS/UNSPSC-crosswalk-out-of-scope decision
// stands) — matching runs through the same concept-tag text classifier as
// every other source, via title/agency text.
async function fetchObasBids(siteUrl) {
  try {
    const res = await fetch(`${siteUrl}/obas.json`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const arr = Array.isArray(data.opportunities) ? data.opportunities : [];
    return arr.map(o => ({
      id:              o.id || '',
      bid_id:          o.id || '',
      solicitation_no: '',
      title:           o.title || '',
      bid_type:        o.category || 'SOLICITATION',
      agency:          'DGS (OBAS bulletin)' + (o.location ? ' — ' + o.location : ''),
      issue_date:      null,
      close_date:      null,
      due_in_days:     null,
      status:          'Upcoming',
      url:             data.bulletin_url || '',
      category_ids:    [],
      unspsc_code:         o.unspsc_code || null,
      anticipated_release_date: o.anticipated_release_date || null,
      contract_estimate:   o.contract_estimate != null ? o.contract_estimate : null,
      contact:             o.contact || null,
      _source:         'obas',
    })).filter(b => b.title.length > 3);
  } catch (e) {
    console.log('[cal-pipeline] OBAS obas.json fetch failed (non-fatal):', e.message);
    return [];
  }
}

// Dedupe on solicitation_no when present (most reliable key), else title+agency.
// Cal eProcure covers state agencies and PlanetBids' configured portals are all
// cities/counties/districts, so overlap should be rare — this is cheap insurance.
function dedupe(bids) {
  const seen = new Set();
  const out = [];
  for (const b of bids) {
    const key = (b.solicitation_no && b.solicitation_no.trim())
      ? `sol:${b.solicitation_no.trim().toLowerCase()}`
      : `ta:${(b.title || '').trim().toLowerCase()}|${(b.agency || '').trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  // Serve from cache if fresh
  if (_cache && Date.now() - _cacheAt < TTL_MS) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, bids: _cache, cached: true, count: _cache.length }) };
  }

  try {
    const siteUrl = process.env.URL || process.env.DEPLOY_URL || `https://${event.headers.host}`;

    // Run all sources concurrently; each is independently resilient (all three
    // catch their own errors and resolve to [] rather than throwing), so one
    // source failing never blocks the others.
    const [calBids, planetBidsBids, obasBids] = await Promise.all([
      fetchCaleprocureBids(siteUrl),
      fetchPlanetBidsBids(siteUrl),
      fetchObasBids(siteUrl),
    ]);

    const bids = dedupe([...calBids, ...planetBidsBids, ...obasBids])
      .sort((a, b) => (a.due_in_days ?? 9999) - (b.due_in_days ?? 9999));

    _cache = bids;
    _cacheAt = Date.now();

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        ok: true, bids, count: bids.length,
        source: { caleprocure: calBids.length, planetbids: planetBidsBids.length, obas: obasBids.length },
      }),
    };
  } catch (e) {
    const fallback = _cache || [];
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, bids: fallback, count: fallback.length, error: e.message }) };
  }
};
