import { createServerFn } from "@tanstack/react-start";

export const getPlayerCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_player_count" as never);
    if (error) throw new Error(error.message);
    return { count: (data as unknown as number) ?? 0 };
  });
