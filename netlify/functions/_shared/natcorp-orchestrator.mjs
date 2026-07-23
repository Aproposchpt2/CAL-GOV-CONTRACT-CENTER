import { STAGES } from './natcorp-core.mjs';
import { acquisitionAgent } from './natcorp-acquisition.mjs';
import { deliveryAgent, intelligenceAgent, matchingAgent, reportingAgent } from './natcorp-agents.mjs';
import { db, emit, ensureAgentJob, getRun, nowIso, patchJob, patchRun } from './natcorp-db.mjs';

const handlers = { acquisition: acquisitionAgent, intelligence_processing: intelligenceAgent, release_eligibility_aoie: matchingAgent, dashboard_delivery: deliveryAgent, executive_reporting: reportingAgent };

export async function runAgentStage(runId, stage, input) {
  const run = await getRun(runId);
  if (!run) throw new Error('Daily run not found.');
  let job = await ensureAgentJob(runId, stage.agent, input);
  if (job.status === 'completed') return job.output_payload || {};
  await emit(runId, stage.requested, stage.agent, input);
  let lastError;
  for (let attempt = Number(job.attempts || 0) + 1; attempt <= Number(job.max_attempts || 3); attempt++) {
    job = await patchJob(job.job_id, { status: 'running', attempts: attempt, started_at: nowIso(), completed_at: null, error_message: null, input_payload: input });
    try {
      const output = await handlers[stage.agent]({ runId, run, input });
      await patchJob(job.job_id, { status: 'completed', completed_at: nowIso(), output_payload: output, error_message: null });
      await emit(runId, stage.completed, stage.agent, output);
      return output;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      const final = attempt >= Number(job.max_attempts || 3);
      await patchJob(job.job_id, { status: final ? 'failed' : 'retry_scheduled', completed_at: final ? nowIso() : null, available_at: new Date(Date.now() + attempt * 2000).toISOString(), error_message: lastError });
      if (!final) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error(lastError || `${stage.agent} failed`);
}

export async function executeDailyRun(runId, baseUrl) {
  let run = await getRun(runId);
  if (!run) throw new Error('Daily run not found.');
  if (['completed','completed_with_failures'].includes(run.status)) return run;
  await patchRun(runId, { status: 'running', started_at: run.started_at || nowIso(), current_stage: 'acquisition', error_message: null });
  if (!run.started_at) await emit(runId, 'daily.operations.started', 'orchestrator', { base_url: baseUrl });
  let input = { base_url: baseUrl }, failures = [];
  for (const stage of STAGES) {
    await patchRun(runId, { current_stage: stage.agent });
    try { input = { ...input, ...(await runAgentStage(runId, stage, input)) }; }
    catch (e) { failures.push({ agent: stage.agent, error: e instanceof Error ? e.message : String(e) }); if (stage.agent !== 'executive_reporting') continue; }
  }
  const jobs = await db('natcorp_agent_jobs','GET',`?run_id=eq.${runId}&select=status,attempts`);
  const completed = (jobs || []).filter((j)=>j.status==='completed').length, failed = (jobs || []).filter((j)=>j.status==='failed').length;
  const briefRows = await db('natcorp_daily_briefs','GET',`?run_id=eq.${runId}&select=*&limit=1`);
  run = await patchRun(runId, { status: failed ? 'completed_with_failures' : 'completed', completed_at: nowIso(), current_stage: 'complete', total_jobs: jobs?.length || 0, completed_jobs: completed, failed_jobs: failed, summary: { failures, brief_id: briefRows?.[0]?.brief_id || null }, error_message: failures.length ? failures.map((x)=>`${x.agent}: ${x.error}`).join('; ') : null });
  return run;
}

export async function runSnapshot(runId) {
  const [run, jobs, brief, events] = await Promise.all([
    getRun(runId),
    db('natcorp_agent_jobs','GET',`?run_id=eq.${runId}&select=*&order=created_at.asc`),
    db('natcorp_daily_briefs','GET',`?run_id=eq.${runId}&select=*&limit=1`),
    db('natcorp_workflow_events','GET',`?run_id=eq.${runId}&select=*&order=created_at.asc&limit=500`),
  ]);
  return { run, jobs: jobs || [], brief: brief?.[0] || null, events: events || [] };
}
