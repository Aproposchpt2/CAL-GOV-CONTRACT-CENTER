export const RELEASE_QA_STATUSES = new Set(['verified', 'auto_ingested']);

function usableUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function futureDeadline(value, nowMs) {
  if (!value) return false;
  const deadlineMs = Date.parse(value);
  return Number.isFinite(deadlineMs) && deadlineMs >= nowMs;
}

export function evaluateOpportunityRelease(row, now = Date.now()) {
  const nowMs = now instanceof Date ? now.valueOf() : Number(now);
  const reasons = [];
  const qaStatus = String(row?.qa_status || '').trim().toLowerCase();

  if (!String(row?.title || '').trim()) reasons.push('missing_title');
  if (!usableUrl(row?.official_source_url)) reasons.push('missing_or_invalid_official_source_url');
  if (!futureDeadline(row?.response_deadline, Number.isFinite(nowMs) ? nowMs : Date.now())) reasons.push('missing_or_expired_deadline');
  if (!RELEASE_QA_STATUSES.has(qaStatus)) reasons.push('qa_not_release_ready');

  return { release_ready: reasons.length === 0, reasons, qa_status: qaStatus || null };
}

export function filterReleaseReadyOpportunities(rows, now = Date.now()) {
  const accepted = [];
  const rejected = [];
  const rejection_summary = {};

  for (const row of Array.isArray(rows) ? rows : []) {
    const release = evaluateOpportunityRelease(row, now);
    if (release.release_ready) {
      accepted.push({ ...row, release_evidence: release });
      continue;
    }
    rejected.push({ id: row?.id || row?.source_record_id || null, reasons: release.reasons });
    for (const reason of release.reasons) rejection_summary[reason] = (rejection_summary[reason] || 0) + 1;
  }

  return { accepted, rejected, rejection_summary };
}
