export default async function handler(request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return Response.json({ error: 'AOIS Advisor is not configured.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const message = String(body.message || '').trim().slice(0, 4000);
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    const opportunity = body.opportunity && typeof body.opportunity === 'object' ? body.opportunity : {};
    const page = String(body.page || '').slice(0, 120);

    if (!message) return Response.json({ error: 'Enter a question.' }, { status: 400 });

    const system = `You are the AOIS Opportunity Advisor for National Corporate Contract Exchange. Help licensed businesses understand public-sector opportunities, improve their Business DNA profile, interpret match evidence, assess readiness, and choose the next best action. Be direct, practical, and explain your reasoning. Never claim eligibility, legal compliance, award likelihood, or contract success as guaranteed. Distinguish verified data from inference. Current page: ${page}.`;

    const context = JSON.stringify({ profile, opportunity }).slice(0, 12000);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 900,
        system,
        messages: [{ role: 'user', content: `Business and opportunity context:\n${context}\n\nUser question:\n${message}` }]
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return Response.json({ error: 'The AOIS Advisor could not respond.', detail: detail.slice(0, 300) }, { status: 502 });
    }

    const data = await response.json();
    const answer = data.content?.map(part => part.text || '').join('\n').trim();
    return Response.json({ ok: true, answer: answer || 'No response was generated.' });
  } catch (error) {
    return Response.json({ error: 'The AOIS Advisor encountered an error.', detail: error.message }, { status: 500 });
  }
}

export const config = { path: '/api/aois-advisor' };
