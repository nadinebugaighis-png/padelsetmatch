import { createFileRoute } from "@tanstack/react-router";
import { canAddToCalendar, matchIcs, type CalendarMatch } from "@/lib/match-calendar";

// Calendar file for one match. Phone calendars open this address directly, so
// it carries no sign-in; it returns only what the public shared-match page
// already shows (club, place, time), and only for upcoming, timed matches.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/calendar/$eventId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.eventId.replace(/\.ics$/i, "");
        if (!UUID.test(id)) return new Response("Not found", { status: 404 });
        const { createClient } = await import("@supabase/supabase-js");
        const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await db.rpc("public_match_view" as never, { _event_id: id } as never);
        const v = (error ? null : data) as (CalendarMatch & { time_tbd?: boolean; status?: string; joins_on_playtomic?: boolean }) | null;
        if (!v || !canAddToCalendar(v)) return new Response("Not found", { status: 404 });
        const origin = new URL(request.url).origin;
        const body = matchIcs(v, `${origin}/m/${id}`);
        return new Response(body, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="padelsetmatch-game.ics"',
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});
