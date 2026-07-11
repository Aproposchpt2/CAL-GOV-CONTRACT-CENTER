'use strict';
// CalGCC — California Government Contracts Center
// Scrapes Cal eProcure public solicitation listing (caleprocure.ca.gov)
// Falls back to DGS active solicitations page if needed.

const LIST_URL  = 'https://caleprocure.ca.gov/events/';
const ALT_URL   = 'https://www.dgs.ca.gov/PD/Resources/Page-Content/Procurement-Division-Resources-List-Folder/Active-Solicitations';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple in-process cache — avoids hammering cal eProcure
let _cache = null, _cacheAt = 0;
const TTL_MS = 5 * 60 * 1000;

function clean(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'));
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const diff = Date.parse(isoDate) - Date.now();
  return Math.ceil(diff / 86400000);
}

// ── Cal eProcure parser ───────────────────────────────────────────────────────
// Cal eProcure uses SAP Ariba. The public events page may render a table or
// redirect to an Ariba SourcingPublic page. We attempt to extract bid rows.
function parseCalEprocure(html) {
  const bids = [];
  // Try standard table rows with bid data
  const rowMatches = [...html.matchAll(/<tr[^>]*class="[^"]*(?:row|event)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const rm of rowMatches) {
    const cells = [...rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => clean(m[1].replace(/<[^>]+>/g, ' ')));
    if (cells.length < 2 || !cells[0]) continue;
    const title = cells[0] || cells[1] || '';
    if (title.length < 5) continue;
    // Try to extract a bid/event ID
    const idMatch = rm[1].match(/(?:eventId|bidId|Id)=([A-Z0-9\-_]{4,40})/i) || rm[1].match(/value="([A-Z0-9\-_]{6,40})"/i);
    const bid_id = idMatch ? idMatch[1] : ('CA-' + bids.length);
    bids.push({
      id: bid_id,
      bid_id,
      solicitation_no: cells[1] || bid_id,
      title: clean(title),
      bid_type: 'SOLICITATION',
      agency: cells[2] || 'California State Agency',
      issue_date: parseDate(cells[3] || ''),
      close_date: parseDate(cells[4] || cells[3] || ''),
    });
  }

  // Fallback: look for any structured bid-like content blocks
  if (!bids.length) {
    const titleMatches = [...html.matchAll(/data-title="([^"]{10,200})"/gi)];
    for (const tm of titleMatches) {
      bids.push({
        id: 'CA-' + bids.length,
        bid_id: 'CA-' + bids.length,
        solicitation_no: '',
        title: clean(tm[1]),
        bid_type: 'SOLICITATION',
        agency: 'California State Agency',
        issue_date: null,
        close_date: null,
      });
    }
  }

  return bids;
}

// ── DGS Active Solicitations parser ──────────────────────────────────────────
function parseDgsSolicitations(html) {
  const bids = [];
  // DGS page is SharePoint-based with a simple list of solicitations
  const linkMatches = [...html.matchAll(/<a[^>]*href="([^"]*(?:solicitation|bid|rfp|rfq|itb|contract)[^"]*)"[^>]*>([^<]{8,200})<\/a>/gi)];
  for (const lm of linkMatches) {
    const title = clean(lm[2]);
    if (!title || title.length < 8) continue;
    bids.push({
      id: 'DGS-' + bids.length,
      bid_id: 'DGS-' + bids.length,
      solicitation_no: '',
      title,
      bid_type: 'SOLICITATION',
      agency: 'California Dept of General Services',
      issue_date: null,
      close_date: null,
      url: lm[1],
    });
  }
  return bids;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

async function fetchCalBids() {
  // Primary: Cal eProcure
  try {
    const html = await fetchPage(LIST_URL);
    const bids = parseCalEprocure(html);
    if (bids.length > 0) return bids;
  } catch (e) {
    console.log('[cal-pipeline] Cal eProcure failed:', e.message);
  }

  // Fallback: DGS Active Solicitations
  try {
    const html = await fetchPage(ALT_URL);
    const bids = parseDgsSolicitations(html);
    if (bids.length > 0) return bids;
  } catch (e) {
    console.log('[cal-pipeline] DGS fallback failed:', e.message);
  }

  return [];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  // Serve from cache if fresh
  if (_cache && Date.now() - _cacheAt < TTL_MS) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, bids: _cache, cached: true, count: _cache.length }) };
  }

  try {
    const raw = await fetchCalBids();

    // Normalize each bid
    const bids = raw.map(b => ({
      id:             b.id || b.bid_id || '',
      bid_id:         b.bid_id || b.id || '',
      solicitation_no: b.solicitation_no || '',
      title:          b.title || '',
      bid_type:       (b.bid_type || 'SOLICITATION').toUpperCase(),
      agency:         b.agency || 'California State Agency',
      issue_date:     b.issue_date || null,
      close_date:     b.close_date || null,
      due_in_days:    daysUntil(b.close_date),
      status:         'Issued',
      url:            b.url || `https://caleprocure.ca.gov/events/`,
    })).filter(b => b.title.length > 3);

    _cache = bids;
    _cacheAt = Date.now();

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, bids, count: bids.length, source: 'live' }) };
  } catch (e) {
    const fallback = _cache || [];
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, bids: fallback, count: fallback.length, error: e.message }) };
  }
};
