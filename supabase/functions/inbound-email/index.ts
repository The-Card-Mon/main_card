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

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

/**
 * Extract email address and display name from a From header value.
 * Handles: "Name <email>", "<email>", "email", "email (Name)"
 */
function parseFrom(raw: string): { email: string; name: string } {
  raw = raw.trim();

  // "Name <email@domain>" or "<email@domain>"
  const angleMatch = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    const email = angleMatch[2].trim();
    const name = angleMatch[1].trim().replace(/^["']|["']$/g, "");
    return { email, name: name || email.split("@")[0] };
  }

  // Bare email address (contains @)
  const bareEmail = raw.match(EMAIL_RE);
  if (bareEmail) {
    return { email: bareEmail[0], name: bareEmail[0].split("@")[0] };
  }

  // Last resort: use the raw string as email (will likely fail validation later)
  return { email: raw, name: raw };
}

function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s);
}

/**
 * Normalise inbound email payloads from Postmark, SendGrid, Mailgun, or generic JSON.
 * Logs the raw payload to stderr for debugging.
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
    // Try JSON anyway as a fallback for misconfigured providers
    try {
      raw = await req.json();
    } catch {
      return null;
    }
  }

  console.log("inbound-email raw keys:", Object.keys(raw).join(", "));

  // --- Postmark ---
  // Fields: From, FromName, Subject, TextBody, HtmlBody, MessageID
  if ("MessageID" in raw || "TextBody" in raw || "HtmlBody" in raw) {
    const { email, name } = parseFrom(raw["From"] ?? "");
    return {
      from_email: email,
      from_name: raw["FromName"] || name,
      subject: raw["Subject"] || "(no subject)",
      body: stripHtml(raw["TextBody"] ?? raw["HtmlBody"] ?? ""),
      message_id: raw["MessageID"] ?? null,
    };
  }

  // --- SendGrid Inbound Parse ---
  // Fields: from, subject, text, html, headers
  if ("from" in raw && ("text" in raw || "html" in raw)) {
    const { email, name } = parseFrom(raw["from"] ?? "");
    const msgIdMatch = (raw["headers"] ?? "").match(/Message-ID:\s*(<[^>]+>)/i);
    return {
      from_email: email,
      from_name: name,
      subject: raw["subject"] || "(no subject)",
      body: stripHtml(raw["text"] ?? raw["html"] ?? ""),
      message_id: msgIdMatch ? msgIdMatch[1] : null,
    };
  }

  // --- Mailgun ---
  // Fields: sender, from, subject, body-plain, body-html, Message-Id
  if ("sender" in raw || "body-plain" in raw || "body-html" in raw) {
    const fromStr = raw["from"] ?? raw["sender"] ?? "";
    const { email, name } = parseFrom(fromStr);
    return {
      from_email: email,
      from_name: name,
      subject: raw["subject"] || "(no subject)",
      body: stripHtml(raw["body-plain"] ?? raw["body-html"] ?? ""),
      message_id: raw["Message-Id"] ?? raw["message-id"] ?? null,
    };
  }

  // --- Cloudflare / generic JSON ---
  const fromField = raw["from"] ?? raw["from_email"] ?? raw["sender"] ?? "";
  if (fromField) {
    const { email, name } = parseFrom(fromField);
    return {
      from_email: email,
      from_name: raw["from_name"] ?? name,
      subject: raw["subject"] || "(no subject)",
      body: stripHtml(raw["text"] ?? raw["body"] ?? raw["message"] ?? raw["html"] ?? ""),
      message_id: raw["message_id"] ?? raw["Message-Id"] ?? null,
    };
  }

  return null;
}

/** Strip basic HTML tags and decode common entities for plain-text storage. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const url = new URL(req.url);

  // GET → health check / connectivity test
  if (req.method === "GET") {
    return respond({
      ok: true,
      message: "inbound-email webhook is reachable",
      hint: "POST a JSON or form-data email payload to this URL to create a support ticket.",
      secret_required: !!Deno.env.get("INBOUND_EMAIL_SECRET"),
    });
  }

  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  // Optional webhook secret check
  const webhookSecret = Deno.env.get("INBOUND_EMAIL_SECRET");
  if (webhookSecret) {
    const provided =
      req.headers.get("x-webhook-secret") ??
      req.headers.get("x-inbound-secret") ??
      url.searchParams.get("secret");
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
  } catch (err) {
    console.error("parseEmail error:", err);
    return respond({ error: "Failed to parse request body" }, 400);
  }

  if (!email) {
    return respond({ error: "Could not parse email payload — unknown format" }, 400);
  }

  if (!isValidEmail(email.from_email)) {
    console.error("Invalid from_email:", email.from_email);
    return respond({ error: `Invalid sender email: ${email.from_email}` }, 400);
  }

  // Body fallback so NOT NULL is satisfied
  const body = email.body.trim() || "(no message body)";

  // Deduplicate by Message-ID
  if (email.message_id) {
    const { count } = await supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("email_message_id", email.message_id);
    if ((count ?? 0) > 0) {
      return respond({ ok: true, duplicate: true });
    }
  }

  // Thread onto an existing open ticket from same sender (within 7 days)
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
    const { error: replyErr } = await supabase.from("ticket_replies").insert({
      ticket_id: existing.id,
      author_name: email.from_name || email.from_email,
      author_role: "customer",
      body: `**Re: ${email.subject}**\n\n${body}`,
      is_internal: false,
    });
    if (replyErr) console.error("reply insert error:", replyErr);
    return respond({ ok: true, ticket_id: existing.id, threaded: true });
  }

  // Create new ticket
  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .insert({
      subject: email.subject,
      customer_name: email.from_name,
      customer_email: email.from_email.toLowerCase(),
      first_message: body,
      source: "email",
      email_message_id: email.message_id ?? null,
    })
    .select("id")
    .single();

  if (ticketErr || !ticket) {
    console.error("ticket insert error:", ticketErr);
    return respond({ error: ticketErr?.message ?? "Failed to create ticket" }, 500);
  }

  const { error: replyErr } = await supabase.from("ticket_replies").insert({
    ticket_id: ticket.id,
    author_name: email.from_name,
    author_role: "customer",
    body,
    is_internal: false,
  });

  if (replyErr) console.error("first reply insert error:", replyErr);

  return respond({ ok: true, ticket_id: ticket.id, threaded: false });
});
