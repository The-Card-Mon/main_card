import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_INVENTORY_URL = "https://api.ebay.com/sell/inventory/v1";
const POKEMON_CATEGORY_ID = "183454";

// eBay condition IDs for Trading Cards
const CONDITION_MAP: Record<string, string> = {
  "Mint": "1000",
  "Near Mint": "2750",
  "Excellent": "4000",
  "Lightly Played": "5000",
  "Good": "6000",
};

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: [
        "https://api.ebay.com/oauth/api_scope/sell.inventory",
        "https://api.ebay.com/oauth/api_scope/sell.account",
      ].join(" "),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("eBay OAuth returned no access token");
  return data.access_token;
}

async function upsertInventoryItem(token: string, product: Record<string, any>): Promise<void> {
  const sku = `tcm-${product.id}`;
  const conditionId = CONDITION_MAP[product.condition ?? ""] ?? "3000";

  const aspects: Record<string, string[]> = {};
  if (product.set_name) aspects["Set"] = [product.set_name];
  if (product.card_type) aspects["Type"] = [product.card_type];
  if (product.rarity) aspects["Rarity"] = [product.rarity];
  if (product.card_number) aspects["Card Number"] = [product.card_number];
  if (product.hp) aspects["HP"] = [String(product.hp)];

  const title = product.name.slice(0, 80);
  const description = [
    product.description,
    product.set_name ? `Set: ${product.set_name}` : null,
    product.card_number ? `Card #${product.card_number}` : null,
    product.condition ? `Condition: ${product.condition}` : null,
    `Rarity: ${product.rarity ?? "Unknown"}`,
  ].filter(Boolean).join("\n\n");

  const body = {
    availability: {
      shipToLocationAvailability: { quantity: Math.max(1, product.quantity ?? 1) },
    },
    condition: conditionId,
    product: {
      title,
      description,
      imageUrls: product.image_url ? [product.image_url] : [],
      aspects,
    },
  };

  const res = await fetch(`${EBAY_INVENTORY_URL}/inventory_item/${encodeURIComponent(sku)}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Inventory item creation failed (${res.status}): ${text}`);
  }
}

async function createOffer(
  token: string,
  productId: string,
  price: number,
  fulfillmentPolicyId: string,
  paymentPolicyId: string,
  returnPolicyId: string,
): Promise<string> {
  const sku = `tcm-${productId}`;
  const body = {
    sku,
    marketplaceId: "EBAY_US",
    format: "FIXED_PRICE",
    availableQuantity: 1,
    categoryId: POKEMON_CATEGORY_ID,
    listingPolicies: { fulfillmentPolicyId, paymentPolicyId, returnPolicyId },
    pricingSummary: {
      price: { currency: "USD", value: price.toFixed(2) },
    },
  };

  const res = await fetch(`${EBAY_INVENTORY_URL}/offer`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create offer failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.offerId;
}

async function publishOffer(token: string, offerId: string): Promise<string> {
  const res = await fetch(`${EBAY_INVENTORY_URL}/offer/${offerId}/publish`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Publish offer failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.listingId;
}

async function withdrawOffer(token: string, offerId: string): Promise<void> {
  const res = await fetch(`${EBAY_INVENTORY_URL}/offer/${offerId}/withdraw`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`End listing failed (${res.status}): ${text}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let product_id: string | undefined;

  try {
    const body = await req.json();
    const action: string = body.action;
    product_id = body.product_id;

    const clientId = Deno.env.get("EBAY_CLIENT_ID") ?? "";
    const clientSecret = Deno.env.get("EBAY_CLIENT_SECRET") ?? "";
    const refreshToken = Deno.env.get("EBAY_REFRESH_TOKEN") ?? "";

    if (!clientId || !clientSecret || !refreshToken) {
      return respond({
        error: "eBay credentials not configured. Add EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, and EBAY_REFRESH_TOKEN as Supabase Edge Function secrets.",
      }, 400);
    }

    // Test connection only
    if (action === "check") {
      const token = await getAccessToken(clientId, clientSecret, refreshToken);
      return respond({ connected: !!token });
    }

    if (!product_id) return respond({ error: "product_id required" }, 400);

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (pErr || !product) return respond({ error: "Product not found" }, 404);

    const token = await getAccessToken(clientId, clientSecret, refreshToken);

    if (action === "create") {
      const fulfillmentPolicyId = Deno.env.get("EBAY_FULFILLMENT_POLICY_ID") ?? "";
      const paymentPolicyId = Deno.env.get("EBAY_PAYMENT_POLICY_ID") ?? "";
      const returnPolicyId = Deno.env.get("EBAY_RETURN_POLICY_ID") ?? "";

      if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
        return respond({
          error: "eBay business policies not configured. Add EBAY_FULFILLMENT_POLICY_ID, EBAY_PAYMENT_POLICY_ID, and EBAY_RETURN_POLICY_ID as Supabase secrets.",
        }, 400);
      }

      await upsertInventoryItem(token, product);
      const offerId = await createOffer(token, product_id, product.price, fulfillmentPolicyId, paymentPolicyId, returnPolicyId);
      const listingId = await publishOffer(token, offerId);
      const listingUrl = `https://www.ebay.com/itm/${listingId}`;

      await supabase.from("products").update({
        ebay_listing_id: listingId,
        ebay_offer_id: offerId,
        ebay_listing_status: "active",
        ebay_listing_url: listingUrl,
        ebay_listed_at: new Date().toISOString(),
        ebay_listing_error: null,
      }).eq("id", product_id);

      return respond({ success: true, listingId, listingUrl });

    } else if (action === "revise") {
      // Push updated price/details to existing listing
      await upsertInventoryItem(token, product);
      return respond({ success: true });

    } else if (action === "end") {
      const offerId = product.ebay_offer_id;
      if (!offerId) return respond({ error: "No eBay offer ID on this product" }, 400);

      await withdrawOffer(token, offerId);

      await supabase.from("products").update({
        ebay_listing_status: "ended",
        ebay_listing_error: null,
      }).eq("id", product_id);

      return respond({ success: true });

    } else {
      return respond({ error: `Unknown action: ${action}` }, 400);
    }

  } catch (err: any) {
    console.error("ebay-listing error:", err.message);

    if (product_id) {
      await supabase.from("products").update({
        ebay_listing_status: "error",
        ebay_listing_error: err.message ?? "Unknown error",
      }).eq("id", product_id).catch(() => {});
    }

    return respond({ error: err.message ?? "Unknown error" }, 500);
  }
});
