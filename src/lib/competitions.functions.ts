import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Poster links last one hour, so a removed poster stops opening soon after. */
export const POSTER_LINK_SECONDS = 60 * 60;
const BUCKET = "competition-posters";

/** Short-lived poster links for competitions the signed-in player can see. */
export const getPosterUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return {} as Record<string, string>;
    // Read through the player's own access so hidden or deleted competitions never get a link.
    const { data: rows, error } = await context.supabase
      .from("competitions")
      .select("id, poster_path")
      .in("id", data.ids)
      .not("poster_path", "is", null);
    if (error) throw new Error(error.message);
    const list = (rows ?? []).filter((r): r is { id: string; poster_path: string } => !!r.poster_path);
    if (!list.length) return {} as Record<string, string>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(list.map((r) => r.poster_path), POSTER_LINK_SECONDS);
    const byPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
    const out: Record<string, string> = {};
    for (const r of list) {
      const url = byPath.get(r.poster_path);
      if (url) out[r.id] = url;
    }
    return out;
  });

/** Deletes a competition (organiser or admin only) and its poster file with it. */
export const deleteCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: gone, error } = await context.supabase
      .from("competitions")
      .delete()
      .eq("id", data.id)
      .select("id, poster_path");
    if (error) throw new Error(error.message);
    const row = gone?.[0];
    if (!row) throw new Error("Only the organiser or an admin can delete this competition");
    if (row.poster_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(BUCKET).remove([row.poster_path]);
    }
    return { ok: true };
  });
