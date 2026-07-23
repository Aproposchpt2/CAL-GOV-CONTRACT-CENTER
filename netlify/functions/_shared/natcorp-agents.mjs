import { buildExecutiveBrief } from './natcorp-core.mjs';
import { asArray, db, env, nowIso, rpc, sha256 } from './natcorp-db.mjs';

async function retrievePendingDocuments(maxDocs = 100) {
  let processed = 0, retrieved = 0, failed = 0;
  while (processed < maxDocs) {
    const docs = await rpc('piee_claim_pending_documents', { p_limit: Math.min(25, maxDocs - processed), p_ingestion_run_id: null });
    if (!Array.isArray(docs) || !docs.length) break;
    for (const doc of docs) {
      processed += 1;
      try {
        const isPdf = /\.pdf(?:$|\?)/i.test(doc.source_url);
        const response = await fetch(doc.source_url, { redirect: 'follow', headers: { 'user-agent': 'APROPOS-NATCORP-PIEE/1.0', accept: isPdf ? 'application/pdf,*/*;q=0.8' : 'text/html,text/plain,application/json,*/*;q=0.5', ...(isPdf ? { range: 'bytes=0-65535' } : {}) }, signal: AbortSignal.timeout(30000) });
        const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
        if (!response.ok && response.status !== 206) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status, mime });
        let rawText = null, length = Number(response.headers.get('content-length') || 0) || null, hash = null;
        if (isPdf || mime === 'application/pdf') {
          const bytes = new Uint8Array(await response.arrayBuffer()); length = length || bytes.length; hash = `sha256-sample:${await sha256([...bytes.slice(0, 65536)])}`;
        } else {
          const raw = await response.text(); rawText = raw.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0, 2000000); length = length || rawText.length; hash = `sha256:${await sha256(rawText)}`;
        }
        await rpc('piee_mark_document_retrieval', { p_id: doc.id, p_status: 'retrieved', p_http_status: response.status, p_mime_type: mime || null, p_content_length: length, p_content_hash: hash, p_raw_text: rawText, p_retrieval_error: null });
        retrieved += 1;
      } catch (e) {
        await rpc('piee_mark_document_retrieval', { p_id: doc.id, p_status: [401,403].includes(e.status) ? 'blocked' : 'failed', p_http_status: e.status || null, p_mime_type: e.mime || null, p_content_length: null, p_content_hash: null, p_raw_text: null, p_retrieval_error: String(e.message || e).slice(0,1000) });
        failed += 1;
      }
    }
  }
  return { documents_processed: processed, documents_retrieved: retrieved, document_failures: failed };
}

export async function intelligenceAgent({ input }) {
  const ids = asArray(input.changed_opportunity_ids);
  if (!ids.length) return { opportunities_processed: 0, documents_registered: 0, documents_retrieved: 0, piee_extractions_completed: 0, contract_dna_completed: 0, enrichment_required: 0, changed_opportunity_ids: [] };
  const registered = await rpc('natcorp_register_documents', { p_opportunity_ids: ids });
  const retrieval = await retrievePendingDocuments(Number(env('NATCORP_MAX_DOCUMENTS_PER_RUN') || 100));
  const dna = await rpc('natcorp_build_contract_dna', { p_opportunity_ids: ids });
  return { opportunities_processed: ids.length, documents_registered: registered?.documents_registered || 0, ...retrieval, piee_extractions_completed: dna?.contract_dna_completed || 0, contract_dna_completed: dna?.contract_dna_completed || 0, enrichment_required: dna?.enrichment_required || 0, changed_opportunity_ids: ids };
}

export async function matchingAgent({ run, input }) {
  const ids = asArray(input.changed_opportunity_ids);
  const gate = await rpc('natcorp_apply_release_gates', { p_opportunity_ids: ids.length ? ids : null });
  const profileRuns = await db('aoie_profile_runs', 'GET', `?started_at=gte.${encodeURIComponent(run.started_at || run.created_at)}&select=matches_returned,strong_match_count,good_match_count,possible_match_count,monitor_count&limit=1000`);
  return {
    opportunities_evaluated: (gate?.eligible || 0) + (gate?.enrichment_required || 0) + (gate?.rejected || 0),
    eligible: gate?.eligible || 0, enrichment_required: gate?.enrichment_required || 0, rejected: gate?.rejected || 0,
    strong_matches: (profileRuns || []).reduce((n,r)=>n+Number(r.strong_match_count||0),0),
    partial_matches: (profileRuns || []).reduce((n,r)=>n+Number(r.good_match_count||0),0),
    conditional_matches: (profileRuns || []).reduce((n,r)=>n+Number(r.possible_match_count||0)+Number(r.monitor_count||0),0),
    aoie_matches_generated: (profileRuns || []).reduce((n,r)=>n+Number(r.matches_returned||0),0),
    aoie_note: profileRuns?.length ? 'Visit-scoped AOIE runs observed during the daily operations window.' : 'No active visit-scoped Business DNA profile was available; the existing live AOIE remains visit-triggered.',
    changed_opportunity_ids: ids,
  };
}

export async function deliveryAgent({ input }) {
  const counts = await db('state_contract_opportunities', 'GET', '?select=natcorp_release_status&natcorp_release_evaluated_at=not.is.null&limit=10000');
  const summary = (counts || []).reduce((m,r)=>(m[r.natcorp_release_status]=(m[r.natcorp_release_status]||0)+1,m),{});
  return { released: summary.eligible || 0, removed_or_held: (summary.rejected || 0) + (summary.enrichment_required || 0), failures: 0, feed_mode: 'Existing NAT-CORP dashboard reads canonical opportunities and applies the preserved AOIE release gates; release metadata was refreshed in place.' };
}

export async function reportingAgent({ runId, run }) {
  const [jobs, feedback, inventory, sessions, acquisitionRuns] = await Promise.all([
    db('natcorp_agent_jobs','GET',`?run_id=eq.${runId}&select=*&order=created_at.asc`),
    db('natcorp_customer_feedback','GET',`?submitted_at=gte.${encodeURIComponent(run.started_at || run.created_at)}&select=*&limit=10000`),
    db('state_contract_opportunities','GET','?select=natcorp_release_status&limit=10000'),
    db('aoie_business_profiles','GET',`?created_at=gte.${encodeURIComponent(run.started_at || run.created_at)}&visit_scoped=eq.true&select=id&limit=10000`),
    Promise.resolve([]),
  ]);
  const inv = (inventory || []).reduce((m,r)=>(m.evaluated++,m[r.natcorp_release_status]=(m[r.natcorp_release_status]||0)+1,m),{evaluated:0});
  const brief = buildExecutiveBrief({ run, jobs, feedback, inventory: { evaluated: inv.evaluated, eligible: inv.eligible || 0, current_actionable: inv.eligible || 0, sessions: sessions?.length || 0 }, acquisitionRuns });
  const rows = await db('natcorp_daily_briefs','POST','?on_conflict=run_id',[{ run_id: runId, report_date: new Date().toISOString().slice(0,10), ...brief, generated_at: nowIso() }],'resolution=merge-duplicates,return=representation');
  return { brief_id: rows?.[0]?.brief_id, ...brief };
}
