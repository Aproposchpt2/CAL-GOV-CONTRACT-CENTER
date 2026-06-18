'use strict';
/* CalStateGen — headless PlanetBids ingest (DIAGNOSTIC MODE).
   Logs every PlanetBids/api-external network call + DOM state so we can see exactly how the
   public portal loads its bids, then lock in the capture. Normalizes whatever JSON data array
   it finds into bids.json. */

const { chromium } = require('playwright');
const fs = require('fs');

const PORTALS = [
  { id: 17950, agency: 'City of San Diego' },
];

const PORTAL_URL = id => `https://vendors.planetbids.com/portal/${id}/bo/bo-search`;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

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
  const jsonCaptures = [];
  const allUrls = [];

  page.on('response', async (res) => {
    const url = res.url();
    if (!/planetbids\.com|api-external/i.test(url)) return;
    allUrls.push(`${res.status()} ${res.request().method()} ${url.slice(0, 130)}`);
    if (!/api-external\.prod\.planetbids\.com/i.test(url)) return;
    try {
      const ct = (res.headers()['content-type'] || '');
      if (!ct.includes('json')) return;
      const body = await res.json();
      const data = body && (Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : null);
      jsonCaptures.push({ url, len: data ? data.length : 0, sample: data && data[0] });
    } catch (e) { /* ignore */ }
  });

  try {
    await page.goto(PORTAL_URL(portal.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(12000); // give the Ember app time to boot + fetch on a cold runner
  } catch (e) {
    console.log(`[${portal.id}] nav issue: ${e.message}`);
  }

  let title = '', bodyLen = 0, rowGuess = 0;
  try {
    title = await page.title();
    bodyLen = await page.evaluate(() => (document.body ? document.body.innerText.length : 0));
    rowGuess = await page.evaluate(() => document.querySelectorAll('tr,[role="row"],.ember-view li').length);
  } catch (e) {}
  await page.close();

  console.log(`[${portal.id}] title="${title}" bodyTextLen=${bodyLen} domRowish=${rowGuess}`);
  console.log(`[${portal.id}] ${allUrls.length} planetbids/api responses:`);
  allUrls.slice(0, 45).forEach(u => console.log('   ' + u));
  console.log(`[${portal.id}] api-external JSON captures: ${jsonCaptures.length}`);
  jsonCaptures.sort((a, b) => b.len - a.len);
  jsonCaptures.slice(0, 8).forEach(c => console.log(`   data[${c.len}] <- ${c.url.slice(0, 120)}`));
  const best = jsonCaptures[0];
  if (best && best.sample) {
    console.log(`[${portal.id}] biggest-array sample keys: ${JSON.stringify(Object.keys(best.sample.attributes || best.sample))}`);
    console.log(`[${portal.id}] sample: ${JSON.stringify(best.sample).slice(0, 700)}`);
  }
  return (best && best.len ? [] : []); // diagnostic run: don't overwrite bids.json yet
}

(async () => {
  const browser = await chromium.launch();
  for (const portal of PORTALS) {
    try { await scrapePortal(browser, portal); }
    catch (e) { console.log(`[${portal.id}] failed: ${e.message}`); }
  }
  await browser.close();
  console.log('DIAGNOSTIC run complete — inspect logged URLs/shape above.');
})();
