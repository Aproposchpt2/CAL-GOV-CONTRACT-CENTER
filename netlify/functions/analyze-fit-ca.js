'use strict';
// CalGCC — California Bid Analyze Fit
// POST { bid, profile } → { ok, provider, analysis }
// Uses OpenAI first and Anthropic only as an automatic fallback.

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (statusCode, payload) => ({
  statusCode,
  headers: HEADERS,
  body: JSON.stringify(payload),
});

function buildPrompt(bid, profile) {
  const businessName = profile.business_name || profile.entity_name || 'the business';
  const keywords = Array.isArray(profile.keywords) ? profile.keywords.filter(Boolean) : [];
  const naics = Array.isArray(profile.naics_codes) ? profile.naics_codes.filter(Boolean) : [];
  const services = keywords.length
    ? keywords.join(', ')
    : 'Technology, software development, IT services, and computer networking';

  return `You are a California public-procurement bid/no-bid analyst.

BUSINESS PROFILE
Business: ${businessName}
Services and capabilities: ${services}
NAICS codes: ${naics.join(', ') || 'Not provided'}
Certifications: ${profile.certifications || profile.business_certifications || 'Not provided'}
Location: ${profile.city || ''} ${profile.state || 'California'}

BID OPPORTUNITY
Title: ${bid.title}
Agency: ${bid.agency || 'California public agency'}
Type: ${bid.bid_type || 'Solicitation'}
Solicitation number: ${bid.solicitation_no || bid.id || 'Not provided'}
Deadline: ${bid.close_date || bid.deadline || 'Not provided'}
Days remaining: ${bid.due_in_days != null ? bid.due_in_days : bid.daysToClose != null ? bid.daysToClose : 'Unknown'}
Description: ${(bid.description || 'Not provided').slice(0, 2400)}

Evaluate actual fit. Do not invent credentials, certifications, licenses, bonding, past performance, staffing, or experience. Treat undocumented items as requiring verification.

Apply California-specific checks where relevant: SB/MB, DVBE, prevailing wage, CSLB licensing, bonding, insurance, CARB, CalRecycle, local geography, mandatory pre-bid meetings, and deadline feasibility.

A confirmed mandatory eligibility failure must result in NO-GO regardless of capability alignment.

Return only the requested structured result.`;
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'recommendation', 'summary', 'strengths', 'risks', 'requirements', 'next_steps'],
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    recommendation: { type: 'string', enum: ['GO', 'REVIEW', 'NO-GO'] },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    risks: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    requirements: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    next_steps: { type: 'string' },
  },
};

function normalizeAnalysis(value) {
  const analysis = value && typeof value === 'object' ? value : {};
  let score = Number.isFinite(Number(analysis.score)) ? Math.round(Number(analysis.score)) : 50;
  score = Math.max(0, Math.min(100, score));

  let recommendation = ['GO', 'REVIEW', 'NO-GO'].includes(analysis.recommendation)
    ? analysis.recommendation
    : score >= 70 ? 'GO' : score >= 40 ? 'REVIEW' : 'NO-GO';

  if (recommendation === 'GO' && score < 70) score = 70;
  if (recommendation === 'REVIEW') score = Math.max(40, Math.min(69, score));
  if (recommendation === 'NO-GO' && score > 39) score = 39;

  return {
    score,
    recommendation,
    summary: String(analysis.summary || 'Additional review is required before making a bid decision.'),
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 4).map(String) : [],
    risks: Array.isArray(analysis.risks) ? analysis.risks.slice(0, 4).map(String) : [],
    requirements: Array.isArray(analysis.requirements) ? analysis.requirements.slice(0, 6).map(String) : [],
    next_steps: String(analysis.next_steps || 'Verify all mandatory solicitation requirements before proceeding.'),
  };
}

async function analyzeWithOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You produce conservative, evidence-aware California government contract fit analyses. Mandatory eligibility failures override technical fit.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'california_contract_fit',
          strict: true,
          schema: ANALYSIS_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 240)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI returned an empty analysis.');
  return normalizeAnalysis(JSON.parse(text));
}

async function analyzeWithAnthropic(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nReturn valid JSON with keys score, recommendation, summary, strengths, risks, requirements, and next_steps.`,
      }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Anthropic ${response.status}: ${detail.slice(0, 240)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Anthropic returned an invalid analysis.');
  return normalizeAnalysis(JSON.parse(match[0]));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST only' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json(400, { ok: false, error: 'Invalid JSON request.' });
  }

  const bid = body.bid || {};
  const profile = body.profile || {};
  if (!bid.title) return json(400, { ok: false, error: 'Bid title required.' });

  const openAIKey = process.env.OPENAI_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  if (!openAIKey && !anthropicKey) {
    return json(503, { ok: false, error: 'AI analysis is not configured.' });
  }

  const prompt = buildPrompt(bid, profile);
  const providerErrors = [];

  if (openAIKey) {
    try {
      const analysis = await analyzeWithOpenAI(prompt, openAIKey);
      return json(200, { ok: true, provider: 'openai', analysis });
    } catch (error) {
      console.error('[analyze-fit-ca] OpenAI failure:', error.message);
      providerErrors.push(error.message);
    }
  }

  if (anthropicKey) {
    try {
      const analysis = await analyzeWithAnthropic(prompt, anthropicKey);
      return json(200, { ok: true, provider: 'anthropic', analysis });
    } catch (error) {
      console.error('[analyze-fit-ca] Anthropic failure:', error.message);
      providerErrors.push(error.message);
    }
  }

  return json(502, {
    ok: false,
    error: 'The AI providers could not complete the analysis. Please try again shortly.',
    diagnostic: providerErrors.join(' | ').slice(0, 500),
  });
};
