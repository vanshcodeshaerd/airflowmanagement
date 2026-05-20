import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AdminCredentialSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

function getClaimEmail(claims: unknown) {
  if (!claims || typeof claims !== "object" || !("email" in claims)) return "";
  const email = (claims as { email?: unknown }).email;
  return typeof email === "string" ? email.toLowerCase() : "";
}

export const ensureAdminRoleForCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AdminCredentialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const email = data.email.toLowerCase();
    const claimEmail = getClaimEmail(context.claims);

    if (claimEmail !== email || !email.startsWith("admin_") || !data.password.endsWith("!ADMIN2024")) {
      throw new Error("Forbidden: admin credential verification failed");
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Missing backend auth configuration");

    const verifier = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (verifyError) throw new Error("Forbidden: admin credential verification failed");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);

    return { ok: true };
  });