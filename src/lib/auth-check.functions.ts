import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Look up which auth providers an email is registered with.
 * Returns { exists, providers } — providers is a list like ["email"], ["google"], ["google","email"].
 * Used by the "Forgot password?" flow to tell OAuth-only users to sign in with Google/Apple
 * instead of sending a useless password-reset email.
 */
export const getEmailAuthProviders = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    // listUsers doesn't support server-side email filter reliably across versions,
    // so page through a reasonable window and match locally.
    const { data: page, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) return { exists: false, providers: [] as string[] };

    const user = page.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!user) return { exists: false, providers: [] as string[] };

    const providers = Array.from(
      new Set((user.identities ?? []).map((i) => i.provider).filter(Boolean) as string[]),
    );
    return { exists: true, providers };
  });
