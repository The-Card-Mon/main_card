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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Verify caller is admin
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

    const body = await req.json();
    const { action } = body;

    // ── Create customer ──────────────────────────────────────────────────────
    if (action === "create") {
      const { email, full_name, password } = body;
      if (!email || !password) return respond({ error: "email and password are required" }, 400);

      const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name ?? "" },
      });
      if (createErr || !authUser.user) return respond({ error: createErr?.message ?? "Failed to create user" }, 500);

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: authUser.user.id,
        email,
        full_name: full_name ?? null,
        role: "customer",
      });

      return respond({ success: true, user_id: authUser.user.id });
    }

    // ── Update customer ──────────────────────────────────────────────────────
    if (action === "update") {
      const { user_id, full_name, email } = body;
      if (!user_id) return respond({ error: "user_id required" }, 400);

      const profileUpdate: Record<string, unknown> = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (email !== undefined) {
        profileUpdate.email = email;
        await supabase.auth.admin.updateUserById(user_id, { email });
      }

      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("id", user_id);
      }

      return respond({ success: true });
    }

    // ── Delete customer ──────────────────────────────────────────────────────
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return respond({ error: "user_id required" }, 400);

      const { error: delErr } = await supabase.auth.admin.deleteUser(user_id);
      if (delErr) return respond({ error: delErr.message }, 500);

      return respond({ success: true });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    return respond({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});
