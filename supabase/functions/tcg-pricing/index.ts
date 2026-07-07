import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const POKETRACE_API_KEY = Deno.env.get("POKETRACE_API_KEY");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function logApiError(message: string, context?: Record<string, unknown>) {
  await supabase.from("error_logs").insert({ source: "tcg-pricing", message, context: context ?? {} });
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tcgField(prices: any, condition: string, field: string): number | null {
  const val = prices?.tcgplayer?.[condition]?.[field];
  return typeof val === "number" ? val : null;
}

function ebayField(prices: any, condition: string, field: string): number | null {
  const val = prices?.ebay?.[condition]?.[field];
  return typeof val === "number" ? val : null;
}

function toResult(card: any) {
  return {
    productId: card.id ?? String(Math.random()),
    name: card.name ?? "",
    setName: card.set?.name ?? card.setName ?? "",
    number: card.number ?? card.cardNumber ?? "",
    imageUrl: card.images?.large ?? card.images?.small ?? card.imageUrl ?? null,
    tcgUrl: `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name ?? "")}`,
    tcgNmAvg: tcgField(card.prices, "NEAR_MINT", "avg"),
    tcgLpAvg: tcgField(card.prices, "LIGHTLY_PLAYED", "avg"),
    tcgNmAvg7d: tcgField(card.prices, "NEAR_MINT", "avg7d"),
    tcgNmAvg30d: tcgField(card.prices, "NEAR_MINT", "avg30d"),
    ebayNmAvg: ebayField(card.prices, "NEAR_MINT", "avg"),
    ebayNmAvg7d: ebayField(card.prices, "NEAR_MINT", "avg7d"),
    ebayNmLow: ebayField(card.prices, "NEAR_MINT", "low"),
    ebayNmHigh: ebayField(card.prices, "NEAR_MINT", "high"),
  };
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!POKETRACE_API_KEY) {
    return ok({ error: "PokéTrace API key not configured. Add POKETRACE_API_KEY as an Edge Function secret." });
  }

  let name: string;
  let set_name: string | undefined;
  let card_number: string | undefined;

  try {
    const body = await req.json();
    name = body.name;
    set_name = body.set_name;
    card_number = body.card_number;
  } catch {
    return ok({ error: "Invalid request body" });
  }

  if (!name?.trim()) {
    return ok({ error: "Card name is required" });
  }

  const params = new URLSearchParams({ search: name.trim(), market: "US", limit: "20" });

  let res: Response;
  try {
    res = await fetch(`https://api.poketrace.com/v1/cards?${params}`, {
      headers: { "X-API-Key": POKETRACE_API_KEY, Accept: "application/json" },
    });
  } catch (err: any) {
    await logApiError(`Network error reaching PokéTrace API: ${err.message}`);
    return ok({ error: `Network error: ${err.message}` });
  }

  const rawText = await res.text();

  if (!res.ok) {
    await logApiError(`PokéTrace API error ${res.status}`, { response: rawText.slice(0, 500) });
    return ok({ error: `PokéTrace API error ${res.status}: ${rawText.slice(0, 200)}` });
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    return ok({ error: `Invalid JSON from PokéTrace: ${rawText.slice(0, 200)}` });
  }

  const cards: any[] = data.data ?? [];

  if (!cards.length) {
    return ok({ exact: null, more: [] });
  }

  const all = cards.map(toResult);

  // Try to find exact match by set name + card number
  let exact: typeof all[0] | null = null;
  let more: typeof all = [];

  if (set_name && card_number) {
    const normSet = normalize(set_name);
    const normNum = normalize(card_number);
    const idx = all.findIndex(
      (r) => normalize(r.setName) === normSet && normalize(r.number) === normNum
    );
    if (idx !== -1) {
      exact = all[idx];
      more = [...all.slice(0, idx), ...all.slice(idx + 1)];
    } else {
      // Fallback: match by set name only
      const setIdx = all.findIndex((r) => normalize(r.setName) === normSet);
      if (setIdx !== -1) {
        exact = all[setIdx];
        more = [...all.slice(0, setIdx), ...all.slice(setIdx + 1)];
      } else {
        exact = all[0];
        more = all.slice(1);
      }
    }
  } else {
    exact = all[0];
    more = all.slice(1);
  }

  return ok({ exact, more });
});
