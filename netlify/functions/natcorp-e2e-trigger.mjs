const env = (name) => globalThis.Netlify?.env?.get(name) || process.env[name] || '';
export default async (req) => {
  const url = new URL(req.url);
  if (req.method !== 'GET') return new Response('GET required',{status:405});
  if (!env('NATCORP_E2E_NONCE') || url.searchParams.get('nonce') !== env('NATCORP_E2E_NONCE')) return new Response('Unauthorized',{status:401});
  const feedbackResponse = await fetch(`${url.origin}/api/natcorp-feedback`, {
    method:'POST',
    headers:{'content-type':'application/json','origin':url.origin,'referer':`${url.origin}/dashboard`},
    body:JSON.stringify({session_id:`e2e-${Date.now()}`,relevance_rating:'very_relevant',experience_rating:'excellent',improvement_comment:'Automated end-to-end validation response',opportunities_viewed:3,analyze_fit_count:1,completed_stage:'dashboard'}),
    signal:AbortSignal.timeout(20000),
  });
  const feedback = await feedbackResponse.json().catch(()=>({error:'feedback response unreadable'}));
  if (!feedbackResponse.ok) return Response.json({ok:false,stage:'feedback',status:feedbackResponse.status,feedback},{status:feedbackResponse.status});
  const runResponse = await fetch(`${url.origin}/api/natcorp-daily-operations`, {
    method:'POST',
    headers:{'content-type':'application/json','origin':url.origin,'referer':`${url.origin}/natcorp-command`,'x-natcorp-command-key':env('NATCORP_COMMAND_KEY')},
    body:JSON.stringify({action:'begin'}),
    signal:AbortSignal.timeout(20000),
  });
  const run = await runResponse.json().catch(()=>({error:'run response unreadable'}));
  return Response.json({ok:runResponse.ok,feedback,run},{status:runResponse.status,headers:{'cache-control':'no-store'}});
};
export const config = { path:'/api/natcorp-e2e-trigger', preferStatic:false };
