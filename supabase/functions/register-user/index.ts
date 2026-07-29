import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Public form may ONLY create these roles. driver/admin are rejected server-side.
const ALLOWED_ROLES = ["customer", "provider"];

// Cloudflare Turnstile. Set TURNSTILE_SECRET_KEY as a Supabase secret for production.
// Falls back to the dummy "always passes" test secret if unset (dev only).
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

// Where the "set your password" email link lands. Must be a page in the app that
// completes the recovery flow (calls supabase.auth.updateUser({ password })).
const APP_URL = Deno.env.get("APP_URL") ?? "https://dalaman.me";
const RESET_REDIRECT = `${APP_URL}/auth/reset?new_user=true`;

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? TURNSTILE_TEST_SECRET;
  if (!Deno.env.get("TURNSTILE_SECRET_KEY")) {
    console.warn("TURNSTILE_SECRET_KEY not set — using dummy test secret. Set it before production.");
  }
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  try {
    const r = await fetch(TURNSTILE_VERIFY, { method: "POST", body: form });
    const data = await r.json();
    return data?.success === true;
  } catch (_e) {
    return false; // fail closed
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const full_name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  let role = String(body.role ?? "customer").trim().toLowerCase();
  const turnstileToken = String(body.turnstile_token ?? "").trim();

  if (!full_name) return json({ error: "name_required" }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "valid_email_required" }, 400);
  }
  if (!ALLOWED_ROLES.includes(role)) role = "customer";

  // CAPTCHA: verify before any DB work.
  if (!turnstileToken) return json({ error: "captcha_required" }, 400);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ok = await verifyTurnstile(turnstileToken, ip);
  if (!ok) return json({ error: "captcha_failed" }, 403);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Fast path: profile already exists for this email.
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return json({ error: "already_registered" }, 409);

  // Create a confirmed auth user (no confirmation email sent).
  // Random password — user sets their own via the email link below.
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (createErr || !created?.user) {
    const m = (createErr?.message ?? "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return json({ error: "already_registered" }, 409);
    }
    return json({ error: "create_failed", detail: createErr?.message ?? null }, 500);
  }

  // The on_auth_user_created trigger already inserted id/email/full_name/role.
  // Patch in phone (trigger does not set it) and re-assert name/role.
  const { error: updErr } = await admin
    .from("users")
    .update({ phone, full_name, role })
    .eq("id", created.user.id);

  if (updErr) {
    await admin.from("users").upsert(
      { id: created.user.id, email, full_name, phone, role },
      { onConflict: "id" },
    );
  }

  // Send a "set your password" link (uses the project's configured SMTP / Mailgun).
  // Non-fatal: the account is created regardless of email success.
  let emailed = true;
  try {
    const { error: mailErr } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT,
    });
    if (mailErr) { emailed = false; console.warn("set-password email failed:", mailErr.message); }
  } catch (e) {
    emailed = false;
    console.warn("set-password email threw:", String(e));
  }

  return json({ ok: true, id: created.user.id, emailed }, 200);
});
