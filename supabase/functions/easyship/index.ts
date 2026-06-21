import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EASYSHIP_BASE = "https://public-api.easyship.com";

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    // Verify admin/staff auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return respond({ error: "Unauthorized" }, 401);

    // Verify admin or staff role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
      return respond({ error: "Forbidden" }, 403);
    }

    const apiKey = Deno.env.get("EASYSHIP_API_KEY");
    if (!apiKey) {
      return respond({ error: "EASYSHIP_API_KEY not configured. Add it in your Supabase edge function secrets." }, 503);
    }

    const { action, ...payload } = await req.json() as { action: string; [key: string]: unknown };

    const easyshipFetch = async (path: string, method = "GET", body?: unknown) => {
      const res = await fetch(`${EASYSHIP_BASE}${path}`, {
        method,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    };

    // ── action: rates ──────────────────────────────────────────────────────────
    if (action === "rates") {
      const {
        destination_name,
        destination_address,
        destination_city,
        destination_state,
        destination_postal_code,
        destination_country_alpha2,
        items,
        origin_postal_code = "10001",
        origin_country_alpha2 = "US",
      } = payload as {
        destination_name: string;
        destination_address: string;
        destination_city: string;
        destination_state: string;
        destination_postal_code: string;
        destination_country_alpha2: string;
        items: { description: string; quantity: number; value: number }[];
        origin_postal_code?: string;
        origin_country_alpha2?: string;
      };

      const body = {
        origin_country_alpha2,
        origin_postal_code,
        destination_country_alpha2,
        destination_city,
        destination_state,
        destination_postal_code,
        taxes_duties_paid_by: "Sender",
        is_insured: false,
        items: items.map((item) => ({
          description: item.description,
          category: "Collectibles",
          declared_currency: "USD",
          declared_customs_value: item.value,
          actual_weight: 0.1,
          dimensions: { length: 6.5, width: 4.5, height: 0.05 },
          quantity: item.quantity,
        })),
      };

      const { ok, data } = await easyshipFetch("/rate/v1/rates", "POST", body);
      if (!ok) return respond({ error: data?.message ?? "EasyShip rates request failed", details: data }, 502);
      return respond({ rates: data?.rates ?? [] });
    }

    // ── action: create_shipment ────────────────────────────────────────────────
    if (action === "create_shipment") {
      const {
        order_id,
        destination_name,
        destination_address,
        destination_city,
        destination_state,
        destination_postal_code,
        destination_country_alpha2,
        destination_email,
        courier_service_id,
        items,
        origin_postal_code = "10001",
        origin_country_alpha2 = "US",
      } = payload as {
        order_id: string;
        destination_name: string;
        destination_address: string;
        destination_city: string;
        destination_state: string;
        destination_postal_code: string;
        destination_country_alpha2: string;
        destination_email?: string;
        courier_service_id: string;
        items: { description: string; quantity: number; value: number }[];
        origin_postal_code?: string;
        origin_country_alpha2?: string;
      };

      const body = {
        destination_name,
        destination_address_line_1: destination_address,
        destination_city,
        destination_state,
        destination_postal_code,
        destination_country_alpha2,
        destination_email: destination_email ?? undefined,
        origin_country_alpha2,
        origin_postal_code,
        courier_service_id,
        taxes_duties_paid_by: "Sender",
        is_insured: false,
        output_currency: "USD",
        items: items.map((item) => ({
          description: item.description,
          category: "Collectibles",
          declared_currency: "USD",
          declared_customs_value: item.value,
          actual_weight: 0.1,
          dimensions: { length: 6.5, width: 4.5, height: 0.05 },
          quantity: item.quantity,
        })),
      };

      const { ok, data } = await easyshipFetch("/shipment/v1/shipments", "POST", body);
      if (!ok) return respond({ error: data?.message ?? "EasyShip shipment creation failed", details: data }, 502);

      const shipment = data?.shipment ?? data;

      // Update the order with tracking info from EasyShip
      if (order_id && shipment) {
        const trackingNumber = shipment.tracking_number ?? shipment.easyship_shipment_id;
        const carrier = shipment.selected_courier?.name ?? null;
        await supabase.from("orders").update({
          tracking_number: trackingNumber ?? null,
          tracking_carrier: carrier,
          shipped_at: new Date().toISOString(),
          status: "processing",
        }).eq("id", order_id);
      }

      return respond({ shipment });
    }

    // ── action: track ──────────────────────────────────────────────────────────
    if (action === "track") {
      const { easyship_shipment_id, tracking_number } = payload as {
        easyship_shipment_id?: string;
        tracking_number?: string;
      };
      const query = easyship_shipment_id
        ? `easyship_shipment_id=${easyship_shipment_id}`
        : `tracking_number=${tracking_number}`;
      const { ok, data } = await easyshipFetch(`/track/v1/checkpoints?${query}`);
      if (!ok) return respond({ error: data?.message ?? "Tracking lookup failed" }, 502);
      return respond({ tracking: data });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return respond({ error: (err as Error).message }, 500);
  }
});
