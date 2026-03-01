import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bridge-secret",
};

type Provider = "telegram" | "whatsapp";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isProvider(value: string): value is Provider {
  return value === "telegram" || value === "whatsapp";
}

function routeFromPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  if (normalized.endsWith("/webhook/telegram")) return "webhook.telegram";
  if (normalized.endsWith("/webhook/whatsapp")) return "webhook.whatsapp";
  return "root";
}

async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await req.json();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  if (req.method === "POST") {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  return {};
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function getAuthenticatedUserId(
  supabaseUrl: string,
  anonKey: string,
  authorization: string | null
) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function assertClubRole(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
  clubId: string,
  role: "admin" | "member"
) {
  const roleClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const userId = (await roleClient.auth.getUser()).data.user?.id;
  if (!userId) return false;
  const rpcName = role === "admin" ? "is_club_admin" : "is_member_of_club";
  const { data } = await roleClient.rpc(rpcName, {
    _club_id: clubId,
    _user_id: userId,
  });
  return Boolean(data);
}

async function insertBridgeEvent(
  serviceClient: ReturnType<typeof createClient>,
  input: {
    connectorId: string;
    clubId: string;
    direction: "inbound" | "outbound" | "system";
    teamId?: string | null;
    payload: Record<string, unknown>;
    status: "queued" | "processed" | "failed" | "ignored";
    providerMessageId?: string | null;
    errorMessage?: string | null;
  }
) {
  const { error } = await serviceClient.from("chat_bridge_events").insert({
    connector_id: input.connectorId,
    club_id: input.clubId,
    direction: input.direction,
    team_id: input.teamId ?? null,
    message_payload: input.payload,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
    processed_at: input.status === "processed" || input.status === "failed" || input.status === "ignored" ? new Date().toISOString() : null,
  });
  if (error) console.error("chat-bridge event insert failed:", error.message);
}

async function processConnectorUpsert(
  serviceClient: ReturnType<typeof createClient>,
  req: Request,
  body: Record<string, unknown>,
  supabaseUrl: string,
  anonKey: string
) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Missing Authorization header" }, 401);

  const clubId = String(body.clubId || "");
  const providerRaw = String(body.provider || "");
  const externalChannelId = body.externalChannelId ? String(body.externalChannelId) : null;
  const displayName = body.displayName ? String(body.displayName) : null;
  const config = typeof body.config === "object" && body.config ? (body.config as Record<string, unknown>) : {};
  const status = String(body.status || "pending");
  const providedWebhookSecret = body.webhookSecret ? String(body.webhookSecret) : null;
  const bridgeUserId = body.bridgeUserId ? String(body.bridgeUserId) : null;

  if (!clubId) return json({ error: "clubId is required" }, 400);
  if (!isProvider(providerRaw)) return json({ error: "provider must be 'telegram' or 'whatsapp'" }, 400);

  const isAdmin = await assertClubRole(supabaseUrl, anonKey, authorization, clubId, "admin");
  if (!isAdmin) return json({ error: "Only club admins can configure connectors" }, 403);

  const userId = await getAuthenticatedUserId(supabaseUrl, anonKey, authorization);
  if (!userId) return json({ error: "Not authenticated" }, 401);

  const webhookSecret = providedWebhookSecret || crypto.randomUUID();
  const { data, error } = await serviceClient
    .from("chat_bridge_connectors")
    .upsert(
      {
        club_id: clubId,
        provider: providerRaw,
        status,
        display_name: displayName,
        external_channel_id: externalChannelId,
        webhook_secret: webhookSecret,
        config,
        bridge_user_id: bridgeUserId,
        created_by: userId,
        last_error: null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "club_id,provider" }
    )
    .select("id, club_id, provider, status, display_name, external_channel_id, webhook_secret, config, bridge_user_id, created_by, last_error, last_synced_at, created_at, updated_at")
    .single();

  if (error) return json({ error: error.message }, 500);

  const webhookBase = `${supabaseUrl}/functions/v1/chat-bridge/webhook/${providerRaw}`;
  return json({
    connector: data,
    webhook: {
      url: webhookBase,
      secretHeader: "x-bridge-secret",
      secretValue: webhookSecret,
      queryExample: `${webhookBase}?secret=${encodeURIComponent(webhookSecret)}`,
    },
  });
}

async function processConnectorList(
  serviceClient: ReturnType<typeof createClient>,
  req: Request,
  body: Record<string, unknown>,
  supabaseUrl: string,
  anonKey: string
) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Missing Authorization header" }, 401);
  const clubId = String(body.clubId || "");
  if (!clubId) return json({ error: "clubId is required" }, 400);

  const isAdmin = await assertClubRole(supabaseUrl, anonKey, authorization, clubId, "admin");
  if (!isAdmin) return json({ error: "Only club admins can view connectors" }, 403);

  const { data, error } = await serviceClient
    .from("chat_bridge_connectors")
    .select("id, club_id, provider, status, display_name, external_channel_id, webhook_secret, config, bridge_user_id, created_by, last_error, last_synced_at, created_at, updated_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ connectors: data || [] });
}

async function processDispatch(
  serviceClient: ReturnType<typeof createClient>,
  req: Request,
  body: Record<string, unknown>,
  supabaseUrl: string,
  anonKey: string
) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Missing Authorization header" }, 401);

  const clubId = String(body.clubId || "");
  const providerRaw = String(body.provider || "");
  const teamId = body.teamId ? String(body.teamId) : null;
  const content = String(body.content || "").trim();

  if (!clubId || !content) return json({ error: "clubId and content are required" }, 400);
  if (!isProvider(providerRaw)) return json({ error: "provider must be 'telegram' or 'whatsapp'" }, 400);

  const isMember = await assertClubRole(supabaseUrl, anonKey, authorization, clubId, "member");
  if (!isMember) return json({ error: "Only club members can dispatch bridge messages" }, 403);

  const { data: connector, error: connectorError } = await serviceClient
    .from("chat_bridge_connectors")
    .select("*")
    .eq("club_id", clubId)
    .eq("provider", providerRaw)
    .eq("status", "connected")
    .maybeSingle();

  if (connectorError) return json({ error: connectorError.message }, 500);
  if (!connector) return json({ error: `No connected ${providerRaw} connector found for this club` }, 404);

  await insertBridgeEvent(serviceClient, {
    connectorId: connector.id,
    clubId,
    direction: "outbound",
    teamId,
    payload: { content, teamId, requested_at: new Date().toISOString() },
    status: "queued",
  });

  const config = (connector.config || {}) as Record<string, unknown>;
  let delivered = false;
  let providerMessageId: string | null = null;
  let dispatchError: string | null = null;

  try {
    if (providerRaw === "telegram") {
      const botToken = String(config.bot_token || "");
      const chatId = connector.external_channel_id;
      if (botToken && chatId) {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: content }),
        });
        const data = await response.json();
        if (response.ok && data?.ok) {
          delivered = true;
          providerMessageId = String(data?.result?.message_id || "");
        } else {
          dispatchError = data?.description || "Telegram send failed";
        }
      } else {
        dispatchError = "Missing telegram config: bot_token and external_channel_id are required";
      }
    }

    if (providerRaw === "whatsapp") {
      const apiBaseUrl = String(config.api_base_url || "");
      const accessToken = String(config.access_token || "");
      const fromNumber = String(config.from_number || "");
      const to = connector.external_channel_id || "";
      if (apiBaseUrl && accessToken && fromNumber && to) {
        const response = await fetch(`${apiBaseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            from: fromNumber,
            to,
            type: "text",
            text: { body: content },
          }),
        });
        const data = await response.json();
        if (response.ok) {
          delivered = true;
          providerMessageId = String(data?.messages?.[0]?.id || "");
        } else {
          dispatchError = data?.error?.message || "WhatsApp send failed";
        }
      } else {
        dispatchError =
          "Missing whatsapp config: api_base_url, access_token, from_number and external_channel_id are required";
      }
    }
  } catch (error) {
    dispatchError = error instanceof Error ? error.message : "Dispatch failed";
  }

  await insertBridgeEvent(serviceClient, {
    connectorId: connector.id,
    clubId,
    direction: "outbound",
    teamId,
    payload: { content, teamId, delivered },
    status: delivered ? "processed" : "failed",
    providerMessageId,
    errorMessage: dispatchError,
  });

  if (!delivered) {
    await serviceClient
      .from("chat_bridge_connectors")
      .update({ last_error: dispatchError, last_synced_at: new Date().toISOString() })
      .eq("id", connector.id);
  }

  return json({
    delivered,
    providerMessageId,
    warning: dispatchError || null,
  });
}

async function processWebhook(
  serviceClient: ReturnType<typeof createClient>,
  provider: Provider,
  req: Request
) {
  const url = new URL(req.url);
  const webhookSecret = req.headers.get("x-bridge-secret") || url.searchParams.get("secret");
  if (!webhookSecret) return json({ error: "Missing webhook secret" }, 401);

  const { data: connector, error: connectorError } = await serviceClient
    .from("chat_bridge_connectors")
    .select("*")
    .eq("provider", provider)
    .eq("webhook_secret", webhookSecret)
    .neq("status", "disabled")
    .maybeSingle();

  if (connectorError) return json({ error: connectorError.message }, 500);
  if (!connector) return json({ error: "Invalid webhook secret" }, 401);

  const payload = await parseBody(req);
  const config = (connector.config || {}) as Record<string, unknown>;
  const teamId = (config.team_id as string | undefined) || null;

  let textContent = "";
  let providerMessageId: string | null = null;

  if (provider === "telegram") {
    const message = (payload as Record<string, unknown>).message as Record<string, unknown> | undefined;
    const edited = (payload as Record<string, unknown>).edited_message as Record<string, unknown> | undefined;
    const source = message || edited || {};
    textContent = String(source?.text || "").trim();
    providerMessageId = source?.message_id ? String(source.message_id) : null;
  }

  if (provider === "whatsapp") {
    const jsonPayload = payload as Record<string, unknown>;
    const directBody = String(jsonPayload.Body || jsonPayload.body || "").trim();
    if (directBody) {
      textContent = directBody;
      providerMessageId = jsonPayload.MessageSid ? String(jsonPayload.MessageSid) : null;
    } else {
      const entry = (jsonPayload.entry as Array<Record<string, unknown>> | undefined)?.[0];
      const changes = (entry?.changes as Array<Record<string, unknown>> | undefined)?.[0];
      const value = (changes?.value as Record<string, unknown> | undefined) || {};
      const messages = (value.messages as Array<Record<string, unknown>> | undefined) || [];
      const first = messages[0] || {};
      textContent = String(((first.text as Record<string, unknown> | undefined)?.body || "")).trim();
      providerMessageId = first.id ? String(first.id) : null;
    }
  }

  if (!textContent) {
    await insertBridgeEvent(serviceClient, {
      connectorId: connector.id,
      clubId: connector.club_id,
      direction: "inbound",
      teamId,
      payload: payload as Record<string, unknown>,
      status: "ignored",
      providerMessageId,
      errorMessage: "No text content found in webhook payload",
    });
    return json({ ok: true, ignored: true });
  }

  const senderId = connector.bridge_user_id || connector.created_by;
  const { error: messageError } = await serviceClient.from("messages").insert({
    club_id: connector.club_id,
    team_id: teamId,
    sender_id: senderId,
    content: textContent,
  });

  if (messageError) {
    await insertBridgeEvent(serviceClient, {
      connectorId: connector.id,
      clubId: connector.club_id,
      direction: "inbound",
      teamId,
      payload: payload as Record<string, unknown>,
      status: "failed",
      providerMessageId,
      errorMessage: messageError.message,
    });
    await serviceClient
      .from("chat_bridge_connectors")
      .update({ last_error: messageError.message, last_synced_at: new Date().toISOString() })
      .eq("id", connector.id);
    return json({ error: messageError.message }, 500);
  }

  await insertBridgeEvent(serviceClient, {
    connectorId: connector.id,
    clubId: connector.club_id,
    direction: "inbound",
    teamId,
    payload: payload as Record<string, unknown>,
    status: "processed",
    providerMessageId,
  });

  await serviceClient
    .from("chat_bridge_connectors")
    .update({ last_error: null, last_synced_at: new Date().toISOString() })
    .eq("id", connector.id);

  return json({ ok: true });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const route = routeFromPath(new URL(req.url).pathname);

    if (route === "webhook.telegram" && req.method === "POST") {
      return await processWebhook(serviceClient, "telegram", req);
    }
    if (route === "webhook.whatsapp" && req.method === "POST") {
      return await processWebhook(serviceClient, "whatsapp", req);
    }

    if (req.method === "GET") {
      return json({
        ok: true,
        service: "chat-bridge",
        routes: [
          "POST /functions/v1/chat-bridge (action: connector.upsert | connector.list | dispatch)",
          "POST /functions/v1/chat-bridge/webhook/telegram",
          "POST /functions/v1/chat-bridge/webhook/whatsapp",
        ],
      });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = (await parseBody(req)) as Record<string, unknown>;
    const action = String(body.action || "");

    if (action === "connector.upsert") {
      return await processConnectorUpsert(serviceClient, req, body, supabaseUrl, anonKey);
    }
    if (action === "connector.list") {
      return await processConnectorList(serviceClient, req, body, supabaseUrl, anonKey);
    }
    if (action === "dispatch") {
      return await processDispatch(serviceClient, req, body, supabaseUrl, anonKey);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("chat-bridge error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
