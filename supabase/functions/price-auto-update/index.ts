import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const POKETRACE_API_KEY = Deno.env.get("POKETRACE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tier key → { source, condition, field }
const TIER_MAP: Record<string, { source: "tcgplayer" | "ebay"; condition: string; field: string }> = {
  tcgNmAvg:   { source: "tcgplayer", condition: "NEAR_MINT",       field: "avg"    },
  tcgLpAvg:   { source: "tcgplayer", condition: "LIGHTLY_PLAYED",  field: "avg"    },
  tcgNmAvg7d: { source: "tcgplayer", condition: "NEAR_MINT",       field: "avg7d"  },
  tcgNmAvg30d:{ source: "tcgplayer", condition: "NEAR_MINT",       field: "avg30d" },
  ebayNmAvg:  { source: "ebay",      condition: "NEAR_MINT",       field: "avg"    },
  ebayNmAvg7d:{ source: "ebay",      condition: "NEAR_MINT",       field: "avg7d"  },
  ebayNmLow:  { source: "ebay",      condition: "NEAR_MINT",       field: "low"    },
  ebayNmHigh: { source: "ebay",      condition: "NEAR_MINT",       field: "high"   },
};

function extractPrice(prices: any, tierKey: string): number | null {
  const tier = TIER_MAP[tierKey] ?? TIER_MAP["tcgNmAvg"];
  const val = prices?.[tier.source]?.[tier.condition]?.[tier.field];
  return typeof val === "number" ? val : null;
}

async function fetchBestPrice(name: string, tierKey: string): Promise<number | null> {
  const params = new URLSearchParams({ search: name.trim(), market: "US", limit: "5" });
  const res = await fetch(`https://api.poketrace.com/v1/cards?${params}`, {
    headers: { "X-API-Key": POKETRACE_API_KEY!, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const cards: any[] = data.data ?? [];
  if (!cards.length) return null;

  // Prefer exact name match, fall back to first result
  const exact = cards.find((c) => (c.name ?? "").toLowerCase() === name.toLowerCase());
  const card = exact ?? cards[0];
  return extractPrice(card.prices, tierKey);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!POKETRACE_API_KEY) {
    return ok({ error: "POKETRACE_API_KEY not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch all auto-priced products with a name
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, tcg_price_tier")
    .eq("use_custom_price", false)
    .not("name", "is", null);

  if (error) return ok({ error: error.message });
  if (!products?.length) return ok({ updated: 0, skipped: 0 });

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      const price = await fetchBestPrice(product.name, product.tcg_price_tier ?? "tcgNmAvg");
      if (price === null) { skipped++; continue; }

      await supabase
        .from("products")
        .update({
          tcg_price: price,
          tcg_price_updated_at: new Date().toISOString(),
          price,
        })
        .eq("id", product.id);

      updated++;
      // Respect rate limits — small delay between cards
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      skipped++;
    }
  }

  return ok({ updated, skipped, total: products.length });
});
