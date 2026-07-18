import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/s/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );
        const { data } = await supabase.rpc("resolve_short_link" as never, {
          _code: params.code,
        } as never);
        const targetUrl = typeof data === "string" ? data : null;

        if (!targetUrl) {
          return new Response("Short link not found", { status: 404 });
        }
        return Response.redirect(targetUrl, 301);
      },
    },
  },
});
