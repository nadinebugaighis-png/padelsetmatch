import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listOpenEvents } from "@/lib/match-events.functions";
import { CalendarDays, Users, Plus, CalendarPlus, SlidersHorizontal, Mars, Venus, VenusAndMars } from "lucide-react";

export const Route = createFileRoute("/app/events/")({
  component: EventsPage,
  errorComponent: ({ error }) => <div className="p-6 text-center text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-center text-[var(--cream)]/70">Not found</div>,
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayLabels(base: Date, i: number) {
  const d = new Date(base);
  d.setDate(base.getDate() + i);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const month = d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const day = d.getDate();
  const top = i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : weekday;
  const bottom = `${month} ${day}`;
  return { top, bottom, date: d };
}

function GenderBadge({ rule }: { rule: "mixed" | "men_only" | "women_only" }) {
  const label = rule === "mixed" ? "MIXED" : rule === "men_only" ? "MEN" : "WOMEN";
  const Icon = rule === "mixed" ? VenusAndMars : rule === "men_only" ? Mars : Venus;
  return (
    <div className="flex flex-col items-center text-[var(--ball)]">
      <Icon className="w-5 h-5" strokeWidth={2} />
      <span className="text-[9px] uppercase tracking-widest mt-0.5">{label}</span>
    </div>
  );
}

function EventsPage() {
  const navigate = useNavigate();
  const list = useServerFn(listOpenEvents);

  const eventsQ = useQuery({
    queryKey: ["open-events"],
    queryFn: () => list({ data: { city: null, needs: null } }),
    refetchOnWindowFocus: true,
  });

  const today = startOfDay(new Date());
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => dayLabels(today, i)), [today.getTime()]);
  const [selectedIdx, setSelectedIdx] = useState<number | "all">(0);

  const filtered = useMemo(() => {
    const arr = [...(eventsQ.data?.events ?? [])];
    arr.sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
    if (selectedIdx === "all") return arr;
    const day = days[selectedIdx].date;
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return arr.filter((e: any) => {
      const t = new Date(e.starts_at);
      return t >= day && t < next;
    });
  }, [eventsQ.data, selectedIdx, days]);

  const renderCard = (e: any) => {
    const needs = e.needs ?? Math.max(0, 4 - (e.filled ?? 0));
    const filled = e.filled ?? 0;
    return (
      <div
        key={e.id}
        className="rounded-2xl border border-[var(--cream)]/10 bg-black/30 px-4 py-4 flex items-center gap-3"
      >
        {/* Time */}
        <div className="flex flex-col items-center w-14 shrink-0">
          <span className="text-display text-xl leading-none tracking-wider text-[var(--cream)]">{fmtTime(e.starts_at)}</span>
          <span className="text-[9px] uppercase tracking-widest text-[var(--cream)]/50 mt-1.5">
            {(() => {
              const t = new Date(e.starts_at);
              const diff = Math.round((startOfDay(t).getTime() - today.getTime()) / 86400000);
              if (diff === 0) return "TODAY";
              if (diff === 1) return "TMRW";
              return t.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
            })()}
          </span>
        </div>

        {/* Middle */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[var(--cream)] truncate leading-tight">{e.club_name}</div>
          <div className="text-[11px] text-[var(--cream)]/60 mt-0.5 truncate">
            {e.city ?? "Location"}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {e.level_min && (
              <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-[var(--cream)]/15 text-[var(--cream)]/80">
                {e.level_min === e.level_max ? e.level_min : `${e.level_min}–${e.level_max}`}
              </span>
            )}
          </div>
        </div>

        {/* Needs */}
        <div className="flex flex-col items-center shrink-0">
          <div className="inline-flex items-center gap-1 text-[var(--cream)] text-sm">
            <Users className="w-3.5 h-3.5" /> {filled}/4
          </div>
          <div className="text-[9px] uppercase tracking-widest text-[var(--cream)]/50 mt-1 text-center leading-tight">
            {needs === 0 ? "Full" : `${needs} player${needs === 1 ? "" : "s"}\nneeded`.split("\n").map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>

        {/* Gender + Join */}
        <div className="flex items-center gap-2 shrink-0">
          <GenderBadge rule={e.gender_rule} />
          <Link
            to="/app/events/$eventId"
            params={{ eventId: e.id }}
            className="rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
          >
            Join
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-display text-4xl tracking-wider leading-none">FIND<br />MATCHES</h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/25 text-[var(--cream)] px-4 py-2 text-[11px] uppercase tracking-widest"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
        </button>
      </div>
      <p className="text-sm text-[var(--cream)]/60 mb-5">Pick a match. Join the game.</p>

      {/* Day tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto -mx-1 px-1 no-scrollbar">
        {days.map((d, i) => {
          const active = selectedIdx === i;
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`shrink-0 rounded-full border px-3 py-2 text-center min-w-[64px] ${
                active
                  ? "border-[var(--ball)] text-[var(--ball)]"
                  : "border-transparent text-[var(--cream)]/70"
              }`}
            >
              <div className="text-[10px] uppercase tracking-widest font-semibold leading-none">{d.top}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mt-1 leading-none">{d.bottom}</div>
            </button>
          );
        })}
        <button
          onClick={() => setSelectedIdx("all")}
          className={`shrink-0 rounded-full border w-11 h-11 flex items-center justify-center ${
            selectedIdx === "all"
              ? "border-[var(--ball)] text-[var(--ball)]"
              : "border-[var(--cream)]/25 text-[var(--cream)]/70"
          }`}
          aria-label="All upcoming"
        >
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      {eventsQ.isLoading && <div className="text-center py-10 text-[var(--cream)]/60">Loading matches…</div>}
      {!eventsQ.isLoading && filtered.length === 0 && (
        <div className="text-center py-10 border border-dashed border-[var(--cream)]/15 rounded-xl text-[var(--cream)]/70 text-sm">
          No open matches for this day.
        </div>
      )}
      <div className="space-y-3">{filtered.map(renderCard)}</div>

      {/* Create match CTA */}
      <div className="mt-5 rounded-2xl border border-[var(--cream)]/15 bg-black/20 p-4 flex items-center gap-3">
        <CalendarPlus className="w-6 h-6 text-[var(--cream)]/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--cream)] font-semibold">Can't find the right match?</div>
          <div className="text-xs text-[var(--cream)]/60">Create your own and players will join you.</div>
        </div>
        <button
          onClick={() => navigate({ to: "/app/events/new" })}
          className="shrink-0 rounded-full border border-[var(--ball)] text-[var(--ball)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
        >
          Create match
        </button>
      </div>

      {/* Floating + */}
      <button
        onClick={() => navigate({ to: "/app/events/new" })}
        className="fixed left-1/2 -translate-x-1/2 bottom-20 w-14 h-14 rounded-full bg-[var(--ball)] text-[var(--court-deep)] flex items-center justify-center shadow-xl z-30"
        aria-label="Call a match"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}
