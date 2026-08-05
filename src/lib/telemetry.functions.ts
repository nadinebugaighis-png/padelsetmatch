import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const clip = (max: number) => (s: string) => (s.length > max ? s.slice(0, max) : s);

const EventSchema = z.object({
  kind: z.enum(["crash", "error", "event", "screen"]),
  name: z.string().min(1).max(120).transform(clip(120)),
  message: z.string().max(2000).transform(clip(2000)).optional().nullable(),
  stack: z.string().max(8000).transform(clip(8000)).optional().nullable(),
  route: z.string().max(300).transform(clip(300)).optional().nullable(),
  sessionId: z.string().max(64).optional().nullable(),
  platform: z.string().max(32).optional().nullable(),
  appVersion: z.string().max(32).optional().nullable(),
  userAgent: z.string().max(300).transform(clip(300)).optional().nullable(),
  props: z.record(z.string(), z.unknown()).optional(),
  at: z.string().max(40).optional().nullable(),
});

/** Public ingest endpoint — crashes also happen while signed out. */
export const ingestAppEvents = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ events: z.array(EventSchema).min(1).max(25) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows = data.events.map((e) => ({
      kind: e.kind,
      name: e.name,
      message: e.message ?? null,
      stack: e.stack ?? null,
      route: e.route ?? null,
      session_id: e.sessionId ?? null,
      platform: e.platform ?? null,
      app_version: e.appVersion ?? null,
      user_agent: e.userAgent ?? null,
      props: (e.props ?? {}) as Record<string, unknown>,
      created_at: e.at ?? new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from("app_events").insert(rows as never);
    if (error) {
      console.error("app_events insert failed", error.message);
      return { ok: false };
    }
    return { ok: true };
  });
