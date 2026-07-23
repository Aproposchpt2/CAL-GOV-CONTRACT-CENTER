import { db, json, sameOrigin } from './_shared/natcorp-runtime.mjs';
import { normalizeFeedback } from './_shared/natcorp-core.mjs';
export default async (req) => {
  if (req.method !== 'POST') return json(405,{ok:false,error:'POST required.'});
  if (!sameOrigin(req)) return json(403,{ok:false,error:'Same-origin submission required.'});
  try {
    const payload = normalizeFeedback(await req.json());
    const rows = await db('natcorp_customer_feedback','POST','',[payload],'return=representation');
    return json(201,{ok:true,feedback_id:rows?.[0]?.feedback_id || null});
  } catch (error) { return json(400,{ok:false,error:error instanceof Error?error.message:String(error)}); }
};
export const config = { path:'/api/natcorp-feedback' };
