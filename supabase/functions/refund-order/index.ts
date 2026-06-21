import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !caller) return respond({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") return respond({ error: "Admin access required" }, 403);

    const { order_id } = await req.json() as { order_id: string };
    if (!order_id) return respond({ error: "order_id required" }, 400);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, total, payment_status, stripe_payment_intent_id, stripe_refund_id, order_items(product_id, quantity)")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) return respond({ error: "Order not found" }, 404);
    if (order.payment_status === "refunded") return respond({ error: "Order already refunded" }, 400);
    if (!order.stripe_payment_intent_id) return respond({ error: "No Stripe payment intent on this order" }, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
    });

    // Update order status
    await supabase
      .from("orders")
      .update({
        payment_status: "refunded",
        status: "refunded",
        stripe_refund_id: refund.id,
      })
      .eq("id", order_id);

    // Restore product stock
    for (const item of (order.order_items ?? []) as { product_id: string; quantity: number }[]) {
      await supabase.rpc("increment_product_quantity", {
        p_product_id: item.product_id,
        p_qty: item.quantity,
      });
    }

    return respond({ success: true, refund_id: refund.id, amount: refund.amount });
  } catch (err: unknown) {
    return respond({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});
