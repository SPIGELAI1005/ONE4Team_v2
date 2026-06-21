import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import { enforceLlmRateLimitOrResponse, PayloadTooLargeError, readJsonBodyLimited } from "../_shared/edge_guard.ts";
import {
  assertClubMember,
  createSupabaseAdmin,
  fetchClubLlmSettings,
  getUserIdFromRequest,
  resolveLlmCredentials,
} from "../_shared/llm.ts";
import { clubHasPlanFeature } from "../_shared/plan_entitlements.ts";
import {
  assertClubTrainer,
  assertClubAdmin,
  buildProposalFromIntent,
  buildResultLinks,
  executeProposalStep,
  intentRequiresAdmin,
  parseAgentIntent,
  type AgentIntent,
  type AgentPageContext,
  type AgentProposalPayload,
} from "../_shared/ai4team_agent_tools.ts";
import { interpretAgentMessage, loadClubAgentContext } from "../_shared/ai4team_agent_interpret.ts";
import { detectObviousOffScope, parseAiLanguage } from "../_shared/ai4team_scope.ts";
import { logStructured, resolveCorrelationId } from "../_shared/request_context.ts";

const MAX_BODY_BYTES = 120_000;
const PROPOSAL_TTL_HOURS = 24;

serve(async (req) => {
  const corsHeaders = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = resolveCorrelationId(req);
  logStructured("info", "ai4team-agent request", {
    correlationId,
    facet: "ai4team_agent",
    method: req.method,
  });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userId = await getUserIdFromRequest(req, supabaseUrl, serviceKey);
    if (!userId) {
      return jsonResponse({ error: "Sign in required." }, 401, corsHeaders);
    }

    let body: Record<string, unknown>;
    try {
      body = await readJsonBodyLimited(req, MAX_BODY_BYTES);
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        return jsonResponse({ error: "Request body too large." }, 413, corsHeaders);
      }
      return jsonResponse({ error: "Invalid JSON body." }, 400, corsHeaders);
    }

    const clubId = body.club_id;
    if (!clubId || typeof clubId !== "string") {
      return jsonResponse({ error: "club_id is required." }, 400, corsHeaders);
    }

    const mode = body.mode;
    if (mode !== "propose" && mode !== "execute" && mode !== "interpret") {
      return jsonResponse({ error: "mode must be propose, interpret, or execute." }, 400, corsHeaders);
    }

    const admin = createSupabaseAdmin();
    const member = await assertClubMember(admin, userId, clubId);
    if (!member) {
      return jsonResponse({ error: "Not a member of this club." }, 403, corsHeaders);
    }

    const planCheck = await clubHasPlanFeature(admin, clubId, "ai");
    if (!planCheck.allowed) {
      return jsonResponse({ error: planCheck.detail ?? "Plan does not include AI." }, 402, corsHeaders);
    }

    const rateLimited = await enforceLlmRateLimitOrResponse(admin, userId, clubId, corsHeaders);
    if (rateLimited) return rateLimited;

    const language = parseAiLanguage(body.language, "");

    if (mode === "interpret") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message) {
        return jsonResponse({ error: "message is required." }, 400, corsHeaders);
      }

      const isTrainer = await assertClubTrainer(admin, userId, clubId);
      const isClubAdmin = await assertClubAdmin(admin, userId, clubId);
      if (!isTrainer && !isClubAdmin) {
        return jsonResponse({ error: "Trainer or admin access required." }, 403, corsHeaders);
      }

      if (detectObviousOffScope(message).blocked) {
        return jsonResponse({ error: "Request is outside AI4Team club scope." }, 400, corsHeaders);
      }

      const clubRow = await fetchClubLlmSettings(admin, clubId);
      const creds = resolveLlmCredentials(clubRow);
      if (!creds) {
        return jsonResponse(
          { error: "LLM is not configured. Add keys under Settings or OPENAI_API_KEY on the project." },
          503,
          corsHeaders,
        );
      }

      const ctx = await loadClubAgentContext(admin, clubId);
      const timezone =
        typeof body.timezone === "string" && body.timezone.trim()
          ? body.timezone.trim()
          : "Europe/Berlin";
      const interpreted = await interpretAgentMessage(creds, message, ctx, language, {
        timezone,
        isAdmin: isClubAdmin,
      });

      if (interpreted.kind === "chat") {
        return jsonResponse({ kind: "chat" }, 200, corsHeaders);
      }
      if (interpreted.kind === "error") {
        return jsonResponse({ error: interpreted.message }, 502, corsHeaders);
      }

      return jsonResponse(
        {
          kind: "workflow",
          intent: interpreted.intent,
          params: interpreted.params,
          confidence: interpreted.confidence,
        },
        200,
        corsHeaders,
      );
    }

    if (mode === "propose") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      let intent = parseAgentIntent(body.intent);
      let params: Record<string, unknown> =
        typeof body.params === "object" && body.params !== null && !Array.isArray(body.params)
          ? (body.params as Record<string, unknown>)
          : {};

      if (!intent && message) {
        const isTrainer = await assertClubTrainer(admin, userId, clubId);
        const isClubAdmin = await assertClubAdmin(admin, userId, clubId);
        if (!isTrainer && !isClubAdmin) {
          return jsonResponse({ error: "Trainer or admin access required for workflows." }, 403, corsHeaders);
        }

        if (detectObviousOffScope(message).blocked) {
          return jsonResponse({ error: "Request is outside AI4Team club scope." }, 400, corsHeaders);
        }

        const clubRow = await fetchClubLlmSettings(admin, clubId);
        const creds = resolveLlmCredentials(clubRow);
        if (!creds) {
          return jsonResponse(
            { error: "LLM is not configured. Add keys under Settings or OPENAI_API_KEY on the project." },
            503,
            corsHeaders,
          );
        }

        const ctx = await loadClubAgentContext(admin, clubId);
        const timezone =
          typeof body.timezone === "string" && body.timezone.trim()
            ? body.timezone.trim()
            : "Europe/Berlin";
        const interpreted = await interpretAgentMessage(creds, message, ctx, language, {
          timezone,
          isAdmin: isClubAdmin,
        });
        if (interpreted.kind === "chat") {
          return jsonResponse({ kind: "chat" }, 200, corsHeaders);
        }
        if (interpreted.kind === "error") {
          return jsonResponse({ error: interpreted.message }, 502, corsHeaders);
        }

        intent = interpreted.intent;
        params = interpreted.params;
      } else if (!intent) {
        return jsonResponse({ error: "intent or message is required." }, 400, corsHeaders);
      }

      if (intentRequiresAdmin(intent)) {
        const isClubAdmin = await assertClubAdmin(admin, userId, clubId);
        if (!isClubAdmin) {
          return jsonResponse({ error: "Admin access required for this workflow." }, 403, corsHeaders);
        }
      } else {
        const isTrainer = await assertClubTrainer(admin, userId, clubId);
        if (!isTrainer) {
          return jsonResponse({ error: "Trainer or admin access required for workflows." }, 403, corsHeaders);
        }
      }

      if (message && intent) {
        const offScope = detectObviousOffScope(message);
        if (offScope.blocked) {
          return jsonResponse({ error: "Request is outside AI4Team club scope." }, 400, corsHeaders);
        }
      }

      let proposal: AgentProposalPayload;
      try {
        proposal = buildProposalFromIntent(intent, params, language);
      } catch (e) {
        return jsonResponse(
          { error: e instanceof Error ? e.message : "Invalid proposal parameters." },
          400,
          corsHeaders,
        );
      }

      const pageContext: AgentPageContext =
        typeof body.page_context === "object" && body.page_context !== null && !Array.isArray(body.page_context)
          ? (body.page_context as AgentPageContext)
          : {};

      const expiresAt = new Date(Date.now() + PROPOSAL_TTL_HOURS * 60 * 60 * 1000).toISOString();
      const conversationId =
        typeof body.conversation_id === "string" && body.conversation_id.trim()
          ? body.conversation_id.trim()
          : null;

      const { data: inserted, error: insertError } = await admin
        .from("ai_agent_runs")
        .insert({
          club_id: clubId,
          user_id: userId,
          status: "proposed",
          intent,
          page_context: pageContext,
          proposal,
          expires_at: expiresAt,
          conversation_id: conversationId,
        })
        .select("id, status, expires_at")
        .single();

      if (insertError || !inserted) {
        console.error("ai_agent_runs insert:", insertError?.message);
        return jsonResponse({ error: "Could not save proposal." }, 500, corsHeaders);
      }

      return jsonResponse(
        {
          kind: "workflow",
          run_id: inserted.id,
          status: inserted.status,
          summary: proposal.summary,
          proposal,
          expires_at: inserted.expires_at,
        },
        200,
        corsHeaders,
      );
    }

    // execute
    const runId = typeof body.run_id === "string" ? body.run_id : "";
    const idempotencyKey = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
    if (!runId) {
      return jsonResponse({ error: "run_id is required." }, 400, corsHeaders);
    }
    if (!idempotencyKey) {
      return jsonResponse({ error: "idempotency_key is required." }, 400, corsHeaders);
    }

    const { data: existingIdem } = await admin
      .from("ai_agent_runs")
      .select("id, status, execution_result")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingIdem && existingIdem.status === "executed") {
      return jsonResponse(
        {
          run_id: existingIdem.id,
          status: "executed",
          result: existingIdem.execution_result,
          idempotent: true,
        },
        200,
        corsHeaders,
      );
    }

    const { data: run, error: runError } = await admin
      .from("ai_agent_runs")
      .select("*")
      .eq("id", runId)
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle();

    if (runError || !run) {
      return jsonResponse({ error: "Workflow run not found." }, 404, corsHeaders);
    }

    const runIntent = parseAgentIntent(run.intent);
    if (!runIntent) {
      return jsonResponse({ error: "Invalid workflow intent." }, 400, corsHeaders);
    }

    if (intentRequiresAdmin(runIntent)) {
      const isClubAdmin = await assertClubAdmin(admin, userId, clubId);
      if (!isClubAdmin) {
        return jsonResponse({ error: "Admin access required." }, 403, corsHeaders);
      }
    } else {
      const isTrainer = await assertClubTrainer(admin, userId, clubId);
      if (!isTrainer) {
        return jsonResponse({ error: "Trainer or admin access required." }, 403, corsHeaders);
      }
    }

    if (run.status !== "proposed") {
      return jsonResponse({ error: `Run is not pending (status: ${run.status}).` }, 409, corsHeaders);
    }

    if (run.expires_at && new Date(run.expires_at).getTime() < Date.now()) {
      await admin.from("ai_agent_runs").update({ status: "expired" }).eq("id", runId);
      return jsonResponse({ error: "Proposal expired. Create a new one." }, 410, corsHeaders);
    }

    const proposal = run.proposal as AgentProposalPayload;
    const steps = Array.isArray(proposal?.steps) ? proposal.steps : [];

    await admin
      .from("ai_agent_runs")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        idempotency_key: idempotencyKey,
      })
      .eq("id", runId);

    const stepResults: Record<string, unknown>[] = [];
    try {
      for (const step of steps) {
        const result = await executeProposalStep(admin, clubId, userId, step);
        stepResults.push(result);
      }

      const executionResult = {
        steps: stepResults,
        links: buildResultLinks(runIntent, language),
      };

      await admin
        .from("ai_agent_runs")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          execution_result: executionResult,
          error_message: null,
        })
        .eq("id", runId);

      return jsonResponse(
        {
          run_id: runId,
          status: "executed",
          result: executionResult,
        },
        200,
        corsHeaders,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Execution failed.";
      await admin
        .from("ai_agent_runs")
        .update({
          status: "failed",
          error_message: msg,
          execution_result: { steps: stepResults },
        })
        .eq("id", runId);

      return jsonResponse({ error: msg, run_id: runId, status: "failed" }, 500, corsHeaders);
    }
  } catch (e) {
    console.error("ai4team-agent error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500, corsHeaders);
  }
});

function jsonResponse(payload: Record<string, unknown>, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
