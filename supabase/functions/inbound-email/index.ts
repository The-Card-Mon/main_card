import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Normalise inbound email payloads from common providers into a single shape.
 *
 * Supported providers:
 *  - Postmark  (application/json)
 *  - SendGrid  (multipart/form-data  OR  application/json)
 *  - Mailgun   (multipart/form-data  OR  application/x-www-form-urlencoded)
 *  - Generic   ({ from, subject, text, html })
 */
async function parseEmail(req: Request): Promise<{
  from_email: string;
  from_name: string;
  subject: string;
  body: string;
  message_id: string | null;
} | null> {
  const ct = req.headers.get("content-type") ?? "";

  let raw: Record<string, string> = {};

  if (ct.includes("application/json")) {
    raw = await req.json();
  } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") raw[k] = v;
    }
  } else {
    return null;
  }

  // --- Postmark ---
  // { From, FromName, Subject, TextBody, HtmlBody, MessageID }
  if (raw["MessageID"] !== undefined || raw["TextBody"] !== undefined) {
    const fromFull: string = raw["From"] ?? "";
    const match = fromFull.match(/^(.*?)\s*<(.+)>$/) ?? null;
    return {
      from_name: raw["FromName"] ?? (match ? match[1].trim() : fromFull.split("@")[0]),
      from_email: match ? match[2] : fromFull,
      subject: raw["Subject"] ?? "(no subject)",
      body: (raw["TextBody"] ?? raw["HtmlBody"] ?? "").trim(),
      message_id: raw["MessageID"] ?? null,
    };
  }

  // --- SendGrid Inbound Parse ---
  // { from, subject, text, html }
  if (raw["from"] !== undefined && (raw["text"] !== undefined || raw["html"] !== undefined)) {
    const fromFull: string = raw["from"] ?? "";
    const match = fromFull.match(/^(.*?)\s*<(.+)>$/) ?? null;
    return {
      from_name: match ? match[1].trim() : fromFull.split("@")[0],
      from_email: match ? match[2] : fromFull,
      subject: raw["subject"] ?? "(no subject)",
      body: (raw["text"] ?? raw["html"] ?? "").trim(),
      message_id: raw["headers"]?.match(/Message-ID:\s*(.+)/i)?.[1]?.trim() ?? null,
    };
  }

  // --- Mailgun ---
  // { sender, subject, "body-plain", "body-html", "Message-Id" }
  if (raw["sender"] !== undefined || raw["body-plain"] !== undefined) {
    const fromFull: string = raw["from"] ?? raw["sender"] ?? "";
    const match = fromFull.match(/^(.*?)\s*<(.+)>$/) ?? null;
    return {
      from_name: match ? match[1].trim() : fromFull.split("@")[0],
      from_email: match ? match[2] : fromFull,
      subject: raw["subject"] ?? "(no subject)",
      body: (raw["body-plain"] ?? raw["body-html"] ?? "").trim(),
      message_id: raw["Message-Id"] ?? null,
    };
  }

  // --- Generic fallback ---
  if (raw["from"] ?? raw["from_email"]) {
    const fromFull: string = raw["from"] ?? raw["from_email"] ?? "";
    const match = fromFull.match(/^(.*?)\s*<(.+)>$/) ?? null;
    return {
      from_name: raw["from_name"] ?? (match ? match[1].trim() : fromFull.split("@")[0]),
      from_email: match ? match[2] : fromFull,
      subject: raw["subject"] ?? "(no subject)",
      body: (raw["text"] ?? raw["body"] ?? raw["message"] ?? "").trim(),
      message_id: raw["message_id"] ?? null,
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  // Validate webhook secret (optional but strongly recommended)
  const webhookSecret = Deno.env.get("INBOUND_EMAIL_SECRET");
  if (webhookSecret) {
    const provided =
      req.headers.get("x-webhook-secret") ??
      new URL(req.url).searchParams.get("secret");
    if (provided !== webhookSecret) {
      return respond({ error: "Forbidden" }, 403);
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let email: Awaited<ReturnType<typeof parseEmail>>;
  try {
    email = await parseEmail(req);
  } catch {
    return respond({ error: "Failed to parse request body" }, 400);
  }

  if (!email || !email.from_email) {
    return respond({ error: "Could not parse email payload" }, 400);
  }

  // Deduplicate: skip if this message_id was already processed
  if (email.message_id) {
    const { count } = await supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("email_message_id", email.message_id);
    if ((count ?? 0) > 0) {
      return respond({ ok: true, duplicate: true });
    }
  }

  // Check if there's an open ticket for this sender in the last 7 days — thread it
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("customer_email", email.from_email.toLowerCase())
    .in("status", ["open", "in_progress", "waiting"])
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Thread the reply onto the existing ticket
    await supabase.from("ticket_replies").insert({
      ticket_id: existing.id,
      author_name: email.from_name || email.from_email,
      author_role: "customer",
      body: `**${email.subject}**\n\n${email.body}`,
      is_internal: false,
    });
    return respond({ ok: true, ticket_id: existing.id, threaded: true });
  }

  // Create a new ticket
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      subject: email.subject,
      customer_name: email.from_name || email.from_email.split("@")[0],
      customer_email: email.from_email.toLowerCase(),
      first_message: email.body,
      source: "email",
      email_message_id: email.message_id,
    })
    .select("id")
    .single();

  if (error || !ticket) {
    return respond({ error: error?.message ?? "Failed to create ticket" }, 500);
  }

  // Insert first reply
  await supabase.from("ticket_replies").insert({
    ticket_id: ticket.id,
    author_name: email.from_name || email.from_email.split("@")[0],
    author_role: "customer",
    body: email.body,
    is_internal: false,
  });

  return respond({ ok: true, ticket_id: ticket.id, threaded: false });
});
