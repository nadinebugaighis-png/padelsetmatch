import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const getPlayerCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { count, error } = await supabase
      .from("profiles" as never)
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });
