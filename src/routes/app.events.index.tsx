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

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function EventsPage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const list = useServerFn(listOpenEvents);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const myCity = profileQ.data?.locations?.[0] || null;

  const [sort, setSort] = useState<"date" | "needs">("date");

  const eventsQ = useQuery({
    queryKey: ["open-events"],
    queryFn: () => list({ data: { city: null, needs: null } }),
    refetchOnWindowFocus: true,
  });

  const sorted = useMemo(() => {
    const arr = [...(eventsQ.data?.events ?? [])];
    if (sort === "needs") {
      arr.sort((a: any, b: any) => (b.needs ?? 0) - (a.needs ?? 0) || a.starts_at.localeCompare(b.starts_at));
    } else {
      arr.sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
    }
    return arr;
  }, [eventsQ.data, sort]);

  const grouped = useMemo(() => {
    if (sort !== "date") return null;
    const map = new Map<string, any[]>();
    for (const e of sorted) {
      const k = dayKey(e.starts_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [sorted, sort]);

  const renderCard = (e: any) => (
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
          <Calendar className="w-3.5 h-3.5" />
          {sort === "date" ? fmtTime(e.starts_at) : fmtWhen(e.starts_at)}
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
  );

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

      <p className="text-sm text-[var(--cream)]/60 mb-3">
        Open matches near you. Call as many as you like — different days, times or genders.
        {myCity && <> Filtering by <span className="text-[var(--ball)]">{myCity}</span> soon.</>}
      </p>

      {(sorted.length > 0 || eventsQ.isLoading) && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50">Sort</span>
          {([
            { v: "date" as const, l: "Date & time" },
            { v: "needs" as const, l: "Most needed" },
          ]).map((o) => (
            <button
              key={o.v}
              onClick={() => setSort(o.v)}
              className={`text-[11px] uppercase tracking-widest px-3 py-1 rounded-full border ${
                sort === o.v
                  ? "border-[var(--ball)] text-[var(--ball)] bg-[var(--ball)]/10"
                  : "border-[var(--cream)]/15 text-[var(--cream)]/60"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      )}

      {eventsQ.isLoading && <div className="text-center py-10 text-[var(--cream)]/60">Loading matches…</div>}
      {eventsQ.data && sorted.length === 0 && (
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

      {sort === "date" && grouped ? (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-2 px-1">
                {day} · {items.length} match{items.length === 1 ? "" : "es"}
              </div>
              <div className="space-y-3">{items.map(renderCard)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">{sorted.map(renderCard)}</div>
      )}
    </div>
  );
}
