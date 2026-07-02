import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listOpenEvents } from "@/lib/match-events.functions";
import { getMyProfile } from "@/lib/app.functions";
import { MapPin, Calendar, Users, Plus, Trophy } from "lucide-react";

export const Route = createFileRoute("/app/events/")({
  component: EventsPage,
  errorComponent: ({ error }) => <div className="p-6 text-center text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-center text-[var(--cream)]/70">Not found</div>,
});

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventsPage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const list = useServerFn(listOpenEvents);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const myCity = profileQ.data?.locations?.[0] || null;

  const eventsQ = useQuery({
    queryKey: ["open-events"],
    queryFn: () => list({ data: { city: null, needs: null } }),
    refetchOnWindowFocus: true,
  });

  return (
    <div className="max-w-md mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-display text-2xl tracking-wider">PLAY A MATCH</h1>
        <button
          onClick={() => navigate({ to: "/app/events/new" })}
          className="rounded-full w-11 h-11 flex items-center justify-center bg-[var(--ball)] text-[var(--court-deep)]"
          aria-label="Call a match"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm text-[var(--cream)]/60 mb-4">
        Open matches near you. Auto-join until 4 players are set.
        {myCity && <> Filtering by <span className="text-[var(--ball)]">{myCity}</span> soon.</>}
      </p>

      {eventsQ.isLoading && <div className="text-center py-10 text-[var(--cream)]/60">Loading matches…</div>}
      {eventsQ.data && eventsQ.data.events.length === 0 && (
        <div className="text-center py-10 border border-dashed border-[var(--cream)]/15 rounded-xl">
          <Trophy className="w-8 h-8 mx-auto text-[var(--ball)]/70 mb-3" />
          <p className="text-[var(--cream)]/70 mb-4">No open matches right now.</p>
          <Link
            to="/app/events/new"
            className="inline-block px-5 py-2 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold"
          >
            Call a match
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {eventsQ.data?.events.map((e: any) => (
          <Link
            key={e.id}
            to="/app/events/$eventId"
            params={{ eventId: e.id }}
            className="block rounded-xl border border-[var(--cream)]/10 bg-black/30 p-4 hover:border-[var(--ball)]/50 transition"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-sm font-medium text-[var(--cream)] truncate">{e.club_name}</div>
              <span
                className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                  e.needs === 0
                    ? "bg-[var(--cream)]/10 text-[var(--cream)]/70"
                    : "bg-[var(--ball)]/20 text-[var(--ball)]"
                }`}
              >
                {e.needs === 0 ? "Full" : `Needs ${e.needs}`}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--cream)]/60 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {fmtWhen(e.starts_at)}
              </span>
              {e.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {e.city}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {e.filled}/4
              </span>
              <span className="uppercase tracking-widest text-[10px]">
                {e.gender_rule === "mixed" ? "Mixed" : e.gender_rule === "men_only" ? "Men" : "Women"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
