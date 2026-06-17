import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const POKETRACE_API_KEY = Deno.env.get("POKETRACE_API_KEY");

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// API structure: prices.tcgplayer.NEAR_MINT.avg / avg7d / avg30d etc.
// prices.ebay.NEAR_MINT.avg / avg7d / low / high etc.
function tcgField(prices: any, condition: string, field: string): number | null {
  const val = prices?.tcgplayer?.[condition]?.[field];
  return typeof val === "number" ? val : null;
}

function ebayField(prices: any, condition: string, field: string): number | null {
  const val = prices?.ebay?.[condition]?.[field];
  return typeof val === "number" ? val : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!POKETRACE_API_KEY) {
    return ok({ error: "PokéTrace API key not configured. Add POKETRACE_API_KEY as an Edge Function secret." });
  }

  let name: string;
  try {
    const body = await req.json();
    name = body.name;
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
    return ok({ error: `Network error: ${err.message}` });
  }

  const rawText = await res.text();

  if (!res.ok) {
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
    return ok({ results: [] });
  }

  const results = cards.map((card: any) => ({
    productId: card.id ?? String(Math.random()),
    name: card.name ?? "",
    setName: card.set?.name ?? card.setName ?? "",
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
  }));

  return ok({ results });
});
