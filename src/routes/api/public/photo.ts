import { createFileRoute } from "@tanstack/react-router";

// Resized player photos. The caller must pass the exact photo address saved on
// a current, eligible player profile; anything else is refused.
//
// The resized picture is returned directly (not as a redirect to a freshly
// signed link) so each photo keeps one stable address. Phones can then keep it
// on the device and show it instantly next time. A new photo always gets a new
// address, so replaced photos never linger.
const WIDTHS = new Set([240, 480, 800]);
const PREFIX = "/storage/v1/object/sign/padel-photos/";
const DEVICE_CACHE = "private, max-age=604800"; // one week on the viewer's device

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
        // Only a picture currently saved on an eligible profile may be resized:
        // either the player's own photo or one of their kit items. Withdrawn,
        // replaced or rejected photos never match.
        const eligibleOwner = async (column: "photo_url" | "id", value: string) => {
          const { data, error } = await supabaseAdmin.from("profiles")
            .select("id").eq(column, value).is("suspended_at", null).neq("photo_moderation_status", "rejected")
            .limit(1).maybeSingle();
          return !error && !!data;
        };
        let allowed = await eligibleOwner("photo_url", raw);
        if (!allowed) {
          // Kit photos live on their own rows; the item must still belong to an
          // eligible player before its picture can be served.
          const { data: item, error: gearError } = await supabaseAdmin.from("profile_gear")
            .select("profile_id").eq("image_url", raw).limit(1).maybeSingle();
          if (!gearError && item?.profile_id) allowed = await eligibleOwner("id", item.profile_id);
        }
        if (!allowed) return new Response("Photo unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
        const { data } = await supabaseAdmin.storage
          .from("padel-photos")
          .createSignedUrl(path, 60 * 10, { transform: { width: w, height: Math.round((w * 4) / 3), resize: "cover", quality: 72 } });
        let upstream = data?.signedUrl ? await fetch(data.signedUrl) : null;
        // If resizing is unavailable, serve the original through a fresh
        // server-signed link, never by replaying the caller's saved link.
        if (!upstream?.ok) {
          const { data: plain } = await supabaseAdmin.storage.from("padel-photos").createSignedUrl(path, 60 * 10);
          upstream = plain?.signedUrl ? await fetch(plain.signedUrl) : null;
        }
        if (!upstream?.ok || !upstream.body) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
        const headers = new Headers({
          "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
          "Cache-Control": DEVICE_CACHE,
        });
        const len = upstream.headers.get("content-length");
        if (len) headers.set("Content-Length", len);
        const etag = upstream.headers.get("etag");
        if (etag) headers.set("ETag", etag);
        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
