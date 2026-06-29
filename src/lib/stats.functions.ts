import { createServerFn } from "@tanstack/react-start";

export const getPlayerCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("profiles" as never)
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });
