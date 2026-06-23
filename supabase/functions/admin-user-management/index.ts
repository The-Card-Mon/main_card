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
    // Verify caller is admin using their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !caller) return respond({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, email")
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

      await supabase.from("profiles").upsert({
        id: authUser.user.id,
        email,
        full_name: full_name ?? null,
        role: "customer",
      });

      return respond({ success: true, user_id: authUser.user.id });
    }

    // ── Invite staff (sends email invite) ────────────────────────────────────
    if (action === "invite-staff") {
      const { email, role } = body;
      if (!email) return respond({ error: "email is required" }, 400);
      if (!["admin", "staff"].includes(role)) return respond({ error: "role must be admin or staff" }, 400);

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user already has an account — promote them directly
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        if (existingProfile.id === caller.id) {
          return respond({ error: "Cannot change your own role" }, 400);
        }
        // Service role can update directly without RLS/auth.uid() check
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", existingProfile.id);
        if (updateErr) return respond({ error: updateErr.message }, 500);
        return respond({
          action: "promoted",
          email: existingProfile.email,
          name: existingProfile.full_name,
        });
      }

      // No existing account — cancel any existing pending invite then create a new one
      await supabase
        .from("staff_invitations")
        .update({ status: "cancelled" })
        .ilike("email", normalizedEmail)
        .eq("status", "pending");

      const { error: insertErr } = await supabase.from("staff_invitations").insert({
        email: normalizedEmail,
        role,
        invited_by: caller.id,
        invited_by_email: callerProfile.email,
        status: "pending",
      });
      if (insertErr) return respond({ error: insertErr.message }, 500);

      // Send invite email through Supabase Auth
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: { invited_role: role },
        redirectTo: `${Deno.env.get("SITE_URL") ?? ""}/auth?invited=1`,
      });

      if (inviteErr) {
        console.error("Failed to send invite email:", inviteErr.message);
        return respond({
          action: "invited",
          email: normalizedEmail,
          emailSent: false,
          emailError: inviteErr.message,
        });
      }

      return respond({ action: "invited", email: normalizedEmail, emailSent: true });
    }

    // ── Resend staff invite email ────────────────────────────────────────────
    if (action === "resend-invite") {
      const { invite_id } = body;
      if (!invite_id) return respond({ error: "invite_id required" }, 400);

      const { data: invitation, error: fetchErr } = await supabase
        .from("staff_invitations")
        .select("email, role")
        .eq("id", invite_id)
        .eq("status", "pending")
        .single();

      if (fetchErr || !invitation) return respond({ error: "Pending invitation not found" }, 404);

      const siteUrl = Deno.env.get("SITE_URL") ?? "";

      // Try inviteUserByEmail first — works for users who haven't confirmed yet.
      // If the auth user is already confirmed (clicked the original link), this
      // will fail with "already registered". In that case fall back to a recovery
      // email so the user gets a fresh link to set their password.
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(invitation.email, {
        data: { invited_role: invitation.role },
        redirectTo: `${siteUrl}/auth?invited=1`,
      });

      if (!inviteErr) {
        return respond({ success: true, email: invitation.email, method: "invite" });
      }

      // Auth user already confirmed — send a recovery/password-reset email instead.
      // The recovery link lands on /auth?invited=1 with #type=recovery which our
      // AuthPage already handles with the "set password" form.
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(invitation.email, {
        redirectTo: `${siteUrl}/auth?invited=1`,
      });

      if (resetErr) {
        return respond({ error: resetErr.message }, 500);
      }

      return respond({ success: true, email: invitation.email, method: "recovery" });
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
