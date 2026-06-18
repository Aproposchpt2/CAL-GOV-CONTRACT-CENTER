'use strict';
/* CalStateGen — headless PlanetBids ingest.
   Loads each CA agency's PUBLIC PlanetBids portal in a real browser; the Ember app
   authenticates itself and fetches its bids from the papi JSON:API — we intercept that
   response (no guard-fighting, no DOM scraping). Normalize → bids.json for the site.
   First runs log the captured JSON:API shape so the field mapping can be tuned. */

const { chromium } = require('playwright');
const fs = require('fs');

// Seed set of major California agency portals (portalId from vendors.planetbids.com/portal/{id}/...).
// Start small to prove the pipeline, then expand the list.
const PORTALS = [
  { id: 17950, agency: 'City of San Diego' },
  { id: 27411, agency: 'Inland Empire Utilities Agency' },
];

const PORTAL_URL = id => `https://vendors.planetbids.com/portal/${id}/bo/bo-search`;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

// Best-effort JSON:API → normalized bid. Field names get corrected once run-1 logs reveal the shape.
function normalize(item, portal) {
  const a = (item && item.attributes) || item || {};
  const pick = (...keys) => { for (const k of keys) if (a[k] != null && a[k] !== '') return a[k]; return null; };
  const close = pick('bidCloseDateTime', 'bidCloseDate', 'closeDateTime', 'closeDate', 'dueDate', 'endDate', 'bidDueDate');
  const title = pick('title', 'bidName', 'projectTitle', 'name', 'description');
  if (!title) return null;
  return {
    id: String(item.id || pick('bidId', 'id') || Math.random().toString(36).slice(2)),
    title: String(title),
    solicitation_no: pick('bidNumber', 'referenceNumber', 'number', 'bidNo') || '',
    agency: pick('agencyName', 'organization') || portal.agency,
    bid_type: pick('bidType', 'type', 'category', 'bidCategory') || '—',
    close_date: close || '',
    due_in_days: daysUntil(close),
    url: PORTAL_URL(portal.id),
  };
}

async function scrapePortal(browser, portal) {
  const page = await browser.newPage();
  const captures = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (!/api-external\.prod\.planetbids\.com\/papi\//i.test(url)) return;
    if (!/bid|opportunit|solicit/i.test(url)) return;
    try {
      const ct = (res.headers()['content-type'] || '');
      if (!ct.includes('json')) return;
      const body = await res.json();
      captures.push({ url, body });
    } catch (e) { /* ignore */ }
  });

  try {
    await page.goto(PORTAL_URL(portal.id), { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000); // let the grid's bid fetch settle
  } catch (e) {
    console.log(`[${portal.id}] navigation issue: ${e.message}`);
  }
  await page.close();

  // Pick the capture whose body has the largest data array (the bid list).
  let best = null;
  for (const c of captures) {
    const data = c.body && (Array.isArray(c.body.data) ? c.body.data : Array.isArray(c.body) ? c.body : null);
    const n = data ? data.length : 0;
    if (!best || n > best.n) best = { url: c.url, data: data || [], n };
  }

  console.log(`[${portal.id}] ${portal.agency}: captured ${captures.length} papi response(s); best bid array = ${best ? best.n : 0}`);
  if (best && best.data[0]) {
    console.log(`[${portal.id}] sample attribute keys: ${JSON.stringify(Object.keys(best.data[0].attributes || best.data[0]))}`);
    console.log(`[${portal.id}] sample item: ${JSON.stringify(best.data[0]).slice(0, 600)}`);
  }
  const bids = (best ? best.data : []).map(it => normalize(it, portal)).filter(Boolean);
  return bids;
}

(async () => {
  const browser = await chromium.launch();
  let all = [];
  for (const portal of PORTALS) {
    try { all = all.concat(await scrapePortal(browser, portal)); }
    catch (e) { console.log(`[${portal.id}] failed: ${e.message}`); }
  }
  await browser.close();

  all = all
    .filter(b => b.due_in_days === null || b.due_in_days >= 0)
    .sort((a, b) => (a.due_in_days ?? 9999) - (b.due_in_days ?? 9999));

  const payload = {
    source: 'planetbids',
    state: 'CA',
    scanMode: all.length ? 'live' : 'sample',
    generatedAt: new Date().toISOString(),
    count: all.length,
    bids: all,
  };

  if (all.length) {
    fs.writeFileSync('bids.json', JSON.stringify(payload, null, 2));
    console.log(`WROTE bids.json with ${all.length} bids across ${PORTALS.length} portals.`);
  } else {
    console.log('No bids normalized — leaving existing bids.json untouched (check the logged shape above to fix field mapping).');
  }
})();
