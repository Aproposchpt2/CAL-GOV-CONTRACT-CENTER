import { executeDailyRun, internalAuthorized } from './_shared/natcorp-runtime.mjs';
export default async (req) => {
  if (!internalAuthorized(req)) return;
  let body = {}; try { body = await req.json(); } catch {}
  if (!body.run_id || !body.base_url) return;
  try { await executeDailyRun(body.run_id, body.base_url); }
  catch (error) { console.error('[natcorp-orchestrator]', error); }
};
