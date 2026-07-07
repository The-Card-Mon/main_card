import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  let message: string;
  let context: Record<string, unknown>;
  try {
    const body = await req.json();
    message = String(body.message ?? "Unknown error").slice(0, 2000);
    context = typeof body.context === "object" && body.context ? body.context : {};
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("modal_config")
    .select("discord_webhook_errors")
    .eq("id", 1)
    .maybeSingle();

  const webhookUrl = data?.discord_webhook_errors;
  if (!webhookUrl) return respond({ ok: true });

  const fields = [
    { name: "Error", value: message, inline: false },
  ];
  if (context.page)  fields.push({ name: "Page",       value: String(context.page).slice(0, 100),  inline: true });
  if (context.url)   fields.push({ name: "URL",        value: String(context.url).slice(0, 200),   inline: true });
  if (context.stack) fields.push({ name: "Stack",      value: ("```\n" + String(context.stack).slice(0, 500) + "\n```"), inline: false });

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title:     ":warning: Frontend Error",
        color:     16776960,
        fields,
        footer:    { text: "The Card Mon · Frontend Monitor" },
        timestamp: new Date().toISOString(),
      }],
    }),
  });

  return respond({ ok: res.ok });
});
