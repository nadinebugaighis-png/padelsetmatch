import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { isAllowedShortLinkTarget } from "@/lib/qa-safety";

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
            global: { fetch: (input, init) => {
              const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            } },
          },
        );
        const { data } = await supabase.rpc("resolve_short_link" as never, {
          _code: params.code,
        } as never);
        const targetUrl = typeof data === "string" ? data : null;

        if (!targetUrl || !isAllowedShortLinkTarget(targetUrl)) {
          return new Response("Short link not found", { status: 404 });
        }
        if ((request.headers.get("accept") ?? "").includes("application/json")) {
          return Response.json(
            { url: targetUrl },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
        return new Response(null, { status: 302, headers: { Location: targetUrl, "Cache-Control": "no-store" } });
      },
    },
  },
});
