import crypto from 'node:crypto';

function json(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function isSameOrigin(request) {
  const target = new URL(request.url);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (origin && origin !== target.origin) return false;
  if (referer) {
    try { if (new URL(referer).origin !== target.origin) return false; } catch { return false; }
  }
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  return origin === target.origin || Boolean(referer) || fetchSite === 'same-origin';
}

function dbHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

function codeHash(email, code, secret) {
  return crypto.createHmac('sha256', secret).update(`${email}|${code}`).digest('hex');
}

function validateChallenge(challenge, email, secret) {
  try {
    const decoded = Buffer.from(String(challenge || ''), 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return false;
    const [challengeEmail, issuedText, supplied] = parts;
    if (challengeEmail !== email) return false;
    const issuedAt = Number(issuedText);
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 10 * 60 * 1000 || issuedAt > Date.now() + 60_000) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${challengeEmail}|${issuedText}`).digest('hex');
    const left = Buffer.from(supplied, 'hex');
    const right = Buffer.from(expected, 'hex');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export default async function handler(request) {
  if (request.method !== 'POST') return json(405, { error: 'POST only' });
  if (!isSameOrigin(request)) return json(403, { error: 'Same-origin NAT-CORP access is required.' });

  const supabaseUrl = (Netlify.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  const serviceKey = Netlify.env.get('SUPABASE_SERVICE_KEY') || Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const secret = Netlify.env.get('BC_VERIFY_SECRET') || '';
  if (!supabaseUrl || !serviceKey || !secret) return json(500, { error: 'Member access is not configured.' });

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Invalid JSON.' }); }
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) return json(400, { error: 'Enter the email and 6-digit code.' });
  if (!validateChallenge(body.challenge, email, secret)) return json(401, { error: 'The login request is invalid or expired.' });

  const nowIso = new Date().toISOString();
  const codeQuery = new URLSearchParams({ select: 'id,state', email: `eq.${email}`, code: `eq.${codeHash(email, code, secret)}`, expires_at: `gt.${nowIso}`, order: 'created_at.desc', limit: '1' });
  const codeResponse = await fetch(`${supabaseUrl}/rest/v1/state_login_codes?${codeQuery}`, { headers: dbHeaders(serviceKey) });
  const codes = codeResponse.ok ? await codeResponse.json().catch(() => []) : [];
  if (!Array.isArray(codes) || !codes.length) return json(401, { error: 'That code is invalid or expired.' });

  const subscriberQuery = new URLSearchParams({ select: 'id,state,comp,business_name,keywords,commodity_codes', email: `eq.${email}`, status: 'eq.active', limit: '1' });
  const subscriberResponse = await fetch(`${supabaseUrl}/rest/v1/state_alert_subscribers?${subscriberQuery}`, { headers: dbHeaders(serviceKey) });
  const subscribers = subscriberResponse.ok ? await subscriberResponse.json().catch(() => []) : [];
  if (!Array.isArray(subscribers) || !subscribers.length) return json(403, { error: 'No active member access was found.' });

  const subscriber = subscribers[0];
  const token = `ses_${crypto.randomUUID().replace(/-/g, '')}`;
  const ttlDays = subscriber.comp === true ? 365 : 30;
  const sessionExpiresAt = new Date(Date.now() + ttlDays * 86400000).toISOString();
  const patch = await fetch(`${supabaseUrl}/rest/v1/state_alert_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`, {
    method: 'PATCH',
    headers: dbHeaders(serviceKey, { Prefer: 'return=representation' }),
    body: JSON.stringify({ session_token: token, session_expires_at: sessionExpiresAt })
  });
  const updated = patch.ok ? await patch.json().catch(() => []) : [];
  if (!Array.isArray(updated) || !updated.length) return json(500, { error: 'The member session could not be created.' });

  await fetch(`${supabaseUrl}/rest/v1/state_login_codes?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: dbHeaders(serviceKey, { Prefer: 'return=minimal' }) });

  return json(200, {
    ok: true,
    token,
    state: subscriber.state || 'US',
    business_name: subscriber.business_name || 'NAT-CORP Member',
    keywords: subscriber.keywords || [],
    commodity_codes: subscriber.commodity_codes || [],
    session_expires_at: sessionExpiresAt
  });
}
