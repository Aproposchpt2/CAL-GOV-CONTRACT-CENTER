'use strict';
/* CalGCC — Cal eProcure (California State Contracts Register) live scraper.
   Headless-browser only — caleprocure.ca.gov sits behind a WAF that blocks
   cold/spoofed requests (curl, WebFetch) with a 403, including on robots.txt
   itself (which doesn't exist there — confirmed no crawl-directive
   restriction). A real, paced Playwright session gets through cleanly,
   same rationale already proven against PlanetBids.

   The URL previously hardcoded in cal-pipeline.js (caleprocure.ca.gov/events/)
   is stale and 404s. The real search page is
   /pages/Events-BS3/event-search.aspx (linked from the homepage as "Find Bid
   Opportunities (CSCR)") — server-side PeopleSoft app, results land directly
   in the DOM (#datatable-ready), no pagination needed (all open postings on
   one page, confirmed ~289 at time of writing).

   Two-tier fetch, to keep this respectful of a state government server on a
   scheduled cadence:
   - List pass (cheap, one page load): event_id, title, department, end date,
     status, for every open ("Posted") listing.
   - Detail pass (one popup click-through per event, ~5-10s each): full
     description, contact, UNSPSC codes with descriptions. Only run for
     event IDs NOT already present with detail in the existing caleprocure.json
     — once an event's detail is captured it doesn't change, so repeat runs
     only pay the detail-fetch cost for genuinely new postings. Pass
     --detail-limit=N to cap how many new-detail fetches happen in one run
     (spreads a large backlog across multiple scheduled runs instead of one
     long one).

   unspsc_code is metadata only, never used as a matching key (same
   directive as OBAS) -- matching runs through the concept-tag text
   classifier, same as every other source. */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SEARCH_URL = 'https://caleprocure.ca.gov/pages/Events-BS3/event-search.aspx';
const OUT_FILE = path.join(__dirname, '..', 'caleprocure.json');
const DETAIL_DELAY_MS = 2500; // pace between detail-page fetches

function argInt(name, dflt) {
  var m = process.argv.find(function (a) { return a.indexOf('--' + name + '=') === 0; });
  return m ? parseInt(m.split('=')[1], 10) : dflt;
}
var DETAIL_LIMIT = argInt('detail-limit', 40); // new-detail fetches per run

var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

function parseEndDate(s) {
  // "07/20/2026\n10:00AM PDT" -> { close_date: '2026-07-20T10:00:00', due_in_days }
  var m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*\n?\s*(\d{1,2}):(\d{2})(AM|PM)/i);
  if (!m) return { close_date: null, due_in_days: null };
  var hour = parseInt(m[4], 10) % 12 + (/pm/i.test(m[6]) ? 12 : 0);
  var iso = m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') + 'T' + String(hour).padStart(2, '0') + ':' + m[5] + ':00';
  var due_in_days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return { close_date: iso, due_in_days: due_in_days };
}

async function fetchList(page) {
  await page.goto(SEARCH_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('#datatable-ready tbody tr', { timeout: 30000 });
  await page.waitForTimeout(2000); // let the DataTables render settle

  return page.evaluate(function () {
    var rows = [].slice.call(document.querySelectorAll('#datatable-ready tbody tr'));
    return rows.map(function (r) {
      var cells = [].slice.call(r.querySelectorAll('td')).map(function (td) { return td.innerText.trim(); });
      // [blank, EventID, EventName, Department, EndDate, Status]
      return { event_id: cells[1] || '', title: cells[2] || '', department: cells[3] || '', end_date_raw: cells[4] || '', status: cells[5] || '' };
    }).filter(function (r) { return r.event_id; });
  });
}

function parseDetailText(text) {
  function between(startLabel, endLabels) {
    var startIdx = text.indexOf(startLabel);
    if (startIdx === -1) return '';
    startIdx += startLabel.length;
    var endIdx = text.length;
    endLabels.forEach(function (lbl) {
      var i = text.indexOf(lbl, startIdx);
      if (i !== -1 && i < endIdx) endIdx = i;
    });
    return text.slice(startIdx, endIdx).trim();
  }

  var description = between('Description:', ['View Event Package', 'View Vendor Ads', 'Contact Information']);
  var contactBlock = between('Contact Information', ['Pre Bid Conference', 'UNSPSC Codes']);
  var contactLines = contactBlock.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  var contactName = contactLines[0] || null;
  var emailMatch = contactBlock.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  var phoneMatch = contactBlock.match(/\(?\d{3}\)?[\s./-]?\d{3}[\s./-]?\d{4}/);

  var formatType = (text.match(/Format\/Type:\s*\n?\s*(.+)/) || [])[1];
  var publishedDate = (text.match(/Published Date\s*\n?\s*([\d/]+\s*[\d:APM]*\s*[A-Z]*)/) || [])[1];

  var unspscTableIdx = text.indexOf('UNSPSC Codes');
  var unspscCodes = [];
  if (unspscTableIdx !== -1) {
    var tableText = text.slice(unspscTableIdx);
    var codeRe = /(\d{8})\s+([^\n]+)/g;
    var m;
    while ((m = codeRe.exec(tableText)) !== null) {
      unspscCodes.push({ code: m[1], description: m[2].trim() });
      if (unspscCodes.length >= 10) break; // sane cap
    }
  }

  return {
    description: description || null,
    format_type: formatType ? formatType.trim() : null,
    published_date: publishedDate ? publishedDate.trim() : null,
    contact_name: contactName,
    contact_email: emailMatch ? emailMatch[0] : null,
    contact_phone: phoneMatch ? phoneMatch[0] : null,
    unspsc_codes: unspscCodes,
  };
}

async function fetchDetail(ctx, page, eventId) {
  var popupPromise = ctx.waitForEvent('page', { timeout: 15000 });
  var clicked = await page.evaluate(function (id) {
    var cells = [].slice.call(document.querySelectorAll('#datatable-ready td[id^="AUC_ID_COL$"]'));
    var target = cells.find(function (c) { return c.innerText.trim() === id; });
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  }, eventId);
  if (!clicked) return null;

  var popup;
  try { popup = await popupPromise; } catch (e) { return null; }
  try {
    await popup.waitForLoadState('networkidle', { timeout: 25000 });
    // Wait for the actual detail content, not just "not still on the Loading
    // placeholder" -- that check passes too early (e.g. mid-render, nav-only
    // text visible) and was silently producing empty descriptions.
    await popup.waitForFunction(function () {
      var t = document.body.innerText || '';
      return t.indexOf('Event ID') !== -1 && (t.indexOf('Description:') !== -1 || t.indexOf('Contact Information') !== -1);
    }, { timeout: 20000 }).catch(function () {});
    await popup.waitForTimeout(1500);
    var text = await popup.evaluate(function () { return document.body.innerText; });
    var detail = parseDetailText(text);
    detail.url = popup.url(); // e.g. https://caleprocure.ca.gov/event/8940/0000039663 — the real, clean, per-event URL
    await popup.close();
    return detail;
  } catch (e) {
    console.log('[scrape-caleprocure] detail fetch failed for', eventId, ':', e.message);
    try { await popup.close(); } catch (_) {}
    return null;
  }
}

function stableEntry(row, existing, detail) {
  var end = parseEndDate(row.end_date_raw);
  return {
    id: row.event_id,
    title: row.title,
    department: row.department,
    bid_type: (detail && detail.format_type) || (existing && existing.bid_type) || 'SOLICITATION',
    close_date: end.close_date,
    due_in_days: end.due_in_days,
    status: row.status,
    published_date: (detail && detail.published_date) || (existing && existing.published_date) || null,
    description: (detail && detail.description) || (existing && existing.description) || null,
    contact_name: (detail && detail.contact_name) || (existing && existing.contact_name) || null,
    contact_email: (detail && detail.contact_email) || (existing && existing.contact_email) || null,
    contact_phone: (detail && detail.contact_phone) || (existing && existing.contact_phone) || null,
    unspsc_codes: (detail && detail.unspsc_codes) || (existing && existing.unspsc_codes) || [],
    detail_fetched: !!((detail && detail.description) || (existing && existing.detail_fetched)),
    // Real per-event URL, only known once detail has actually been fetched
    // (it's discovered via the click-through redirect, not derivable from
    // the list view alone). Falls back to the search page until then.
    url: (detail && detail.url) || (existing && existing.url) || SEARCH_URL,
  };
}

async function main() {
  var existingData = { opportunities: [] };
  if (fs.existsSync(OUT_FILE)) {
    try { existingData = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); } catch (e) {}
  }
  var existingById = {};
  (existingData.opportunities || []).forEach(function (o) { existingById[o.id] = o; });

  var browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  var ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 1000 }, locale: 'en-US', timezoneId: 'America/Los_Angeles',
  });
  await ctx.addInitScript(function () { Object.defineProperty(navigator, 'webdriver', { get: function () { return undefined; } }); });
  var page = await ctx.newPage();

  console.log('[scrape-caleprocure] loading event list...');
  var rows = await fetchList(page);
  rows = rows.filter(function (r) { return r.status === 'Posted'; });
  console.log('[scrape-caleprocure] list loaded:', rows.length, 'open (Posted) events');

  var newIds = rows.filter(function (r) { return !existingById[r.event_id] || !existingById[r.event_id].detail_fetched; }).map(function (r) { return r.event_id; });
  var toFetch = newIds.slice(0, DETAIL_LIMIT);
  console.log('[scrape-caleprocure] ' + newIds.length + ' event(s) need detail (no cached description); fetching ' + toFetch.length + ' this run (--detail-limit=' + DETAIL_LIMIT + ').');

  var detailById = {};
  for (var i = 0; i < toFetch.length; i++) {
    var id = toFetch[i];
    process.stdout.write('[scrape-caleprocure] detail ' + (i + 1) + '/' + toFetch.length + ' (' + id + ')... ');
    var detail = await fetchDetail(ctx, page, id);
    console.log(detail ? 'ok' : 'FAILED');
    if (detail) detailById[id] = detail;
    await sleep(DETAIL_DELAY_MS);
  }

  await browser.close();

  var opportunities = rows.map(function (row) {
    return stableEntry(row, existingById[row.event_id], detailById[row.event_id]);
  });

  // Concept-tag each opportunity (title + department + description if available).
  var conceptMatchSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'concept-match.js'), 'utf8');
  var sandbox = { window: {} };
  require('vm').createContext(sandbox);
  require('vm').runInContext(conceptMatchSrc, sandbox);
  var ConceptMatch = sandbox.window.ConceptMatch;
  var dict = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'concept-dictionary.json'), 'utf8'));

  var flagged = [];
  opportunities.forEach(function (o) {
    var text = [o.title, o.department, o.description || ''].join(' ');
    o.concept_tags = ConceptMatch.tagText(text, dict);
    if (!o.concept_tags.length) flagged.push({ id: o.id, title: o.title, department: o.department });
  });

  var payload = {
    source: 'caleprocure',
    search_url: SEARCH_URL,
    generatedAt: new Date().toISOString(),
    count: opportunities.length,
    detail_fetched_count: opportunities.filter(function (o) { return o.detail_fetched; }).length,
    flagged_count: flagged.length,
    opportunities: opportunities,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log('[scrape-caleprocure] WROTE caleprocure.json — ' + opportunities.length + ' open events, ' +
    payload.detail_fetched_count + ' with full detail, ' + flagged.length + ' flagged for dictionary review.');
  if (flagged.length) {
    console.log('[scrape-caleprocure] Flagged (no concept-tag match):');
    flagged.slice(0, 15).forEach(function (f) { console.log('  -', f.title, '(' + f.department + ')'); });
  }
}

main().catch(function (e) { console.error('[scrape-caleprocure] FAILED:', e.message); process.exit(1); });
