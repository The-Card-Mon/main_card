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

function parseFrom(raw: string): { email: string; name: string } {
  raw = raw.trim();
  const angleMatch = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    const email = angleMatch[2].trim();
    const name = angleMatch[1].trim().replace(/^["']|["']$/g, "");
    return { email, name: name || email.split("@")[0] };
  }
  const bareEmail = raw.match(EMAIL_RE);
  if (bareEmail) {
    return { email: bareEmail[0], name: bareEmail[0].split("@")[0] };
  }
  return { email: raw, name: raw };
}

function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s);
}

type ParsedEmail = {
  from_email: string;
  from_name: string;
  subject: string;
  body: string;
  message_id: string | null;
};

async function parseEmail(req: Request): Promise<ParsedEmail | null> {
  const ct = req.headers.get("content-type") ?? "";
  // deno-lint-ignore no-explicit-any
  let raw: Record<string, any> = {};

  if (ct.includes("application/json")) {
    raw = await req.json();
  } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") raw[k] = v;
    }
  } else {
    try {
      raw = await req.json();
    } catch {
      return null;
    }
  }

  console.log("inbound-email raw keys:", Object.keys(raw).join(", "));
  console.log("inbound-email raw:", JSON.stringify(raw).slice(0, 500));

  // --- Zoho Mail outgoing webhook ---
  // Fields: event, from, fromName (or fromDisplayName), to, subject,
  //         messageId, summary, receivedTime, accountId, folderId
  if ("event" in raw || "receivedTime" in raw || "accountId" in raw || "folderId" in raw) {
    const fromStr: string = raw["from"] ?? raw["fromAddress"] ?? "";
    const { email, name } = parseFrom(fromStr);
    const displayName: string = raw["fromName"] ?? raw["fromDisplayName"] ?? raw["senderName"] ?? name;
    const body = stripHtml(
      raw["content"] ?? raw["text"] ?? raw["html"] ?? raw["summary"] ?? raw["snippet"] ?? ""
    );
    return {
      from_email: email,
      from_name: displayName,
      subject: raw["subject"] ?? "(no subject)",
      body,
      message_id: raw["messageId"] ?? raw["MessageId"] ?? raw["message_id"] ?? null,
    };
  }

  // --- Postmark ---
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

  // --- Generic / Cloudflare Workers ---
  const fromField = raw["from"] ?? raw["from_email"] ?? raw["sender"] ?? raw["fromAddress"] ?? "";
  if (fromField) {
    const { email, name } = parseFrom(String(fromField));
    return {
      from_email: email,
      from_name: raw["from_name"] ?? raw["fromName"] ?? name,
      subject: raw["subject"] ?? "(no subject)",
      body: stripHtml(
        raw["text"] ?? raw["body"] ?? raw["message"] ?? raw["html"] ?? raw["summary"] ?? ""
      ),
      message_id: raw["message_id"] ?? raw["messageId"] ?? raw["Message-Id"] ?? null,
    };
  }

  return null;
}

function stripHtml(html: string): string {
  return String(html)
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

  if (req.method === "GET") {
    return respond({
      ok: true,
      message: "inbound-email webhook is reachable",
      hint: "POST a JSON or form-data email payload to this URL to create a support ticket.",
      secret_required: !!Deno.env.get("INBOUND_EMAIL_SECRET"),
    });
  }

  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

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

  let email: ParsedEmail | null;
  try {
    email = await parseEmail(req);
  } catch (err) {
    console.error("parseEmail error:", err);
    // Return 200 so providers like Zoho don't mark the webhook as failing
    return respond({ ok: false, error: "Failed to parse request body" });
  }

  if (!email) {
    console.error("Could not detect email format");
    // Return 200 — unknown format should not cause the provider to disable the webhook
    return respond({ ok: false, error: "Could not parse email payload — unknown format" });
  }

  if (!isValidEmail(email.from_email)) {
    console.error("Invalid from_email extracted:", email.from_email);
    return respond({ ok: false, error: `Invalid sender email: ${email.from_email}` });
  }

  const body = email.body.trim() || "(no message body)";

  if (email.message_id) {
    const { count } = await supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("email_message_id", email.message_id);
    if ((count ?? 0) > 0) {
      return respond({ ok: true, duplicate: true });
    }
  }

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
    // Still return 200 so the provider doesn't retry/disable
    return respond({ ok: false, error: ticketErr?.message ?? "Failed to create ticket" });
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
