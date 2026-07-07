import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SS_BASE = "https://ssapi.shipstation.com";

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdminOrStaff = profile?.role === "admin" || profile?.role === "staff";

    const apiKey = Deno.env.get("SHIPSTATION_API_KEY") ?? "S15/7VgfyANdgMB5eX4O0Bd02ysHZRtxB+Qt85PyB9k";
    if (!apiKey) return respond({ error: "SHIPSTATION_API_KEY not configured." }, 503);

    const ssAuth = `Basic ${btoa(apiKey.includes(":") ? apiKey : `${apiKey}:`)}`;

    const { action, ...payload } = await req.json() as { action: string; [key: string]: unknown };

    const ssFetch = async (path: string, method = "GET", body?: unknown) => {
      const res = await fetch(`${SS_BASE}${path}`, {
        method,
        headers: {
          "Authorization": ssAuth,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const contentType = res.headers.get("content-type") ?? "";
      let data: unknown;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        const preview = text.replace(/<[^>]*>/g, "").trim().slice(0, 200);
        data = { message: preview || `HTTP ${res.status}` };
      }
      return { ok: res.ok, status: res.status, data };
    };

    // ── action: rates — available to any authenticated user (used at checkout) ──
    if (action === "rates") {
      const {
        toCity = "",
        toState = "",
        toPostalCode = "",
        toCountry = "US",
        fromPostalCode = "10001",
        items = [],
      } = payload as {
        toCity?: string;
        toState?: string;
        toPostalCode?: string;
        toCountry?: string;
        fromPostalCode?: string;
        items?: { quantity: number }[];
      };

      const totalQty = (items as { quantity: number }[]).reduce((s, i) => s + i.quantity, 0);
      const weightOz = Math.max(2, totalQty * 2);

      const rateBody = {
        serviceCode: null,
        packageCode: null,
        fromPostalCode,
        toState: toState.toUpperCase(),
        toCountry: toCountry.toUpperCase(),
        toPostalCode,
        toCity,
        weight: { value: weightOz, units: "ounces" },
        dimensions: { units: "inches", length: 6.5, width: 4.5, height: 0.5 },
        confirmation: "none",
        residential: true,
      };

      const { ok: cOk, data: cData } = await ssFetch("/carriers");
      if (!cOk) return respond({ error: (cData as { message?: string })?.message ?? "Failed to fetch carriers", details: cData }, 502);

      const carriers = (Array.isArray(cData) ? cData : []) as { code: string; name: string }[];
      if (carriers.length === 0) {
        return respond({ rates: [], warning: "No carriers are connected to your ShipStation account." });
      }

      const rateResults = await Promise.all(
        carriers.map(async (carrier) => {
          try {
            const { ok, data } = await ssFetch("/shipments/getrates", "POST", {
              ...rateBody,
              carrierCode: carrier.code,
            });
            if (!ok || !Array.isArray(data)) return [];
            // ShipStation omits carrierCode from rate responses — inject it back
            return (data as Record<string, unknown>[]).map((r) => ({ ...r, carrierCode: carrier.code }));
          } catch {
            return [];
          }
        })
      );

      return respond({ rates: rateResults.flat() });
    }

    // All other actions require admin or staff
    if (!isAdminOrStaff) return respond({ error: "Forbidden" }, 403);

    // ── action: list_carriers ─────────────────────────────────────────────────
    if (action === "list_carriers") {
      const { ok, data } = await ssFetch("/carriers");
      if (!ok) return respond({ error: (data as { message?: string })?.message ?? "Failed to fetch carriers", details: data }, 502);
      return respond({ carriers: Array.isArray(data) ? data : [] });
    }

    // ── action: create_label ──────────────────────────────────────────────────
    if (action === "create_label") {
      const {
        order_id,
        carrierCode,
        serviceCode,
        toName = "Customer",
        toStreet1,
        toCity,
        toState,
        toPostalCode,
        toCountry = "US",
        fromName = "The Card Mon",
        fromStreet1 = "123 Main St",
        fromCity = "New York",
        fromState = "NY",
        fromPostalCode = "10001",
        fromCountry = "US",
        fromPhone = "555-000-0000",
        items = [],
      } = payload as {
        order_id?: string;
        carrierCode: string;
        serviceCode: string;
        toName?: string;
        toStreet1?: string;
        toCity?: string;
        toState?: string;
        toPostalCode?: string;
        toCountry?: string;
        fromName?: string;
        fromStreet1?: string;
        fromCity?: string;
        fromState?: string;
        fromPostalCode?: string;
        fromCountry?: string;
        fromPhone?: string;
        items?: { quantity: number }[];
      };

      const totalQty = (items as { quantity: number }[]).reduce((s, i) => s + i.quantity, 0);
      const weightOz = Math.max(2, totalQty * 2);

      const body = {
        carrierCode,
        serviceCode,
        packageCode: "package",
        shipDate: new Date().toISOString().split("T")[0],
        weight: { value: weightOz, units: "ounces" },
        dimensions: { units: "inches", length: 6.5, width: 4.5, height: 0.5 },
        shipFrom: {
          name: fromName, street1: fromStreet1, city: fromCity,
          state: fromState, postalCode: fromPostalCode, country: fromCountry, phone: fromPhone,
        },
        shipTo: {
          name: toName, street1: toStreet1 ?? "", city: toCity ?? "",
          state: toState ?? "", postalCode: toPostalCode ?? "", country: toCountry, residential: true,
        },
        confirmation: "none",
        testLabel: false,
      };

      const { ok, data } = await ssFetch("/shipments/createlabel", "POST", body);
      if (!ok) {
        const d = data as Record<string, unknown>;
        const errMsg = (d["Message"] as string) || (d["message"] as string) || (d["ExceptionMessage"] as string) || "Failed to create label";
        const modelState = d["ModelState"] as Record<string, string[]> | undefined;
        const validationErrors = modelState ? Object.entries(modelState).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : undefined;
        return respond({ error: validationErrors ? `${errMsg} — ${validationErrors}` : errMsg, details: data }, 502);
      }

      if (order_id && (data as { trackingNumber?: string })?.trackingNumber) {
        await supabase.from("orders").update({
          tracking_number: (data as { trackingNumber: string }).trackingNumber,
          tracking_carrier: carrierCode,
          shipped_at: new Date().toISOString(),
          status: "processing",
        }).eq("id", order_id);
      }

      return respond({ label: data });
    }

    // ── action: track ─────────────────────────────────────────────────────────
    if (action === "track") {
      const { tracking_number } = payload as { tracking_number?: string };
      const { ok, data } = await ssFetch(`/shipments?trackingNumber=${encodeURIComponent(tracking_number ?? "")}`);
      if (!ok) return respond({ error: (data as { message?: string })?.message ?? "Tracking lookup failed" }, 502);
      return respond({ shipments: (data as { shipments?: unknown })?.shipments ?? data });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = (err as Error).message ?? "Unknown error";
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("error_logs").insert({ source: "shipstation", message: msg, context: {} });
    } catch { /* best-effort */ }
    return respond({ error: msg }, 500);
  }
});
