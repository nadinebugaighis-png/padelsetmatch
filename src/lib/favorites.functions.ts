import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function myProfileId(context: any): Promise<string | null> {
  const { data } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export const listMyFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await myProfileId(context);
    if (!me) return { ids: [] as string[] };
    const { data } = await context.supabase.from("favorites").select("favorite_profile_id").eq("profile_id", me);
    return { ids: (data ?? []).map((r) => r.favorite_profile_id as string) };
  });

const toggleSchema = z.object({ favoriteProfileId: z.string().uuid() });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const me = await myProfileId(context);
    if (!me) throw new Error("No profile");
    if (me === data.favoriteProfileId) throw new Error("Cannot favorite yourself");
    const { data: existing } = await context.supabase
      .from("favorites")
      .select("id")
      .eq("profile_id", me)
      .eq("favorite_profile_id", data.favoriteProfileId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("favorites").delete().eq("id", existing.id);
      return { favorited: false };
    }
    await context.supabase.from("favorites").insert({ profile_id: me, favorite_profile_id: data.favoriteProfileId });
    return { favorited: true };
  });
