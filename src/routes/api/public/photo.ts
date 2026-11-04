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
        const path = decodeURIComponent(src.pathname.slice(PREFIX.length));
        if (path.includes("..") || path.includes("\\") || !src.searchParams.get("token")) return new Response("Forbidden", { status: 403 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Run the signed-URL check and the current-photo check in parallel.
        // A valid old signed URL is not enough: withdrawn/replaced photos
        // must never receive a new transformed URL.
        const [check, { data: profiles, error: profileError }] = await Promise.all([
          fetch(src.toString(), { headers: { Range: "bytes=0-0" } }),
          supabaseAdmin.from("profiles")
            .select("photo_url").is("suspended_at", null).neq("photo_moderation_status", "rejected").not("photo_url", "is", null),
        ]);
        if (!check.ok) return new Response("Not found", { status: 404 });
        const current = profiles?.some((p) => {
          try { return decodeURIComponent(new URL(p.photo_url ?? "").pathname) === `${PREFIX}${path}`; }
          catch { return false; }
        });
        if (profileError || !current) return new Response("Photo unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
        const { data, error } = await supabaseAdmin.storage
          .from("padel-photos")
          .createSignedUrl(path, 60 * 60, { transform: { width: w, height: Math.round((w * 4) / 3), resize: "cover", quality: 72 } });
        const destination = error || !data?.signedUrl ? src.toString() : data.signedUrl;
        return new Response(null, {
          status: 302,
          headers: { Location: destination, "Cache-Control": "private, max-age=600" },
        });
      },
    },
  },
});
