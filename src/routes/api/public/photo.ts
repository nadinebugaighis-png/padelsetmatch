import { createFileRoute } from "@tanstack/react-router";

// Resized player photos. Callers must already hold a valid signed URL for the
// original photo; we confirm it works before signing a smaller variant.
const WIDTHS = new Set([240, 480, 800]);
const PREFIX = "/storage/v1/object/sign/padel-photos/";

export const Route = createFileRoute("/api/public/photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams;
        const w = Number(q.get("w"));
        const raw = q.get("u") ?? "";
        let src: URL;
        try { src = new URL(raw); } catch { return new Response("Bad URL", { status: 400 }); }
        const base = process.env.SUPABASE_URL ?? "";
        if (!WIDTHS.has(w) || !base || src.origin !== new URL(base).origin || !src.pathname.startsWith(PREFIX)) {
          return new Response("Forbidden", { status: 403 });
        }
        const check = await fetch(src.toString(), { headers: { Range: "bytes=0-0" } });
        if (!check.ok) return new Response("Not found", { status: 404 });
        const path = decodeURIComponent(src.pathname.slice(PREFIX.length));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("padel-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 7, { transform: { width: w, quality: 72 } });
        if (error || !data?.signedUrl) return Response.redirect(src.toString(), 302);
        return new Response(null, {
          status: 302,
          headers: { Location: data.signedUrl, "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
