import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const getPlayerCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase.rpc("get_player_count" as never);
    if (error) throw new Error(error.message);
    return { count: (data as unknown as number) ?? 0 };
  });
