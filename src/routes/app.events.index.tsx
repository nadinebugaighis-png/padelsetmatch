import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { levelRangeLabel } from "@/lib/level-label";
import { genderRuleLabel, matchCardAction, matchDuration, playtomicJoinLink } from "@/lib/match-rules";
import { openExternal } from "@/lib/native";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listOpenEvents,
  joinMatchEvent,
  leaveMatchEvent,
  deleteMatchEvent,
  duplicateMatchEvent,
  cancelMatchEvent,
  listEventMessages,
  sendEventMessage,
} from "@/lib/match-events.functions";
import { getMyProfile } from "@/lib/app.functions";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, X, Trash2, Clock, Users, Send, Plus, SlidersHorizontal, ExternalLink } from "lucide-react";
import { FriendSlot } from "@/components/FriendSlot";
import { CourtViewCard } from "@/components/CourtViewCard";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { photoSrc } from "@/lib/photo-src";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { AlertsSheet } from "@/components/AlertsSheet";
import { MatchFiltersSheet } from "@/components/MatchFiltersSheet";
import { feedAreas, eventInArea } from "@/lib/feed-areas";
import { activeFilterCount, passesFilters, restoreFilters, NO_FILTERS, MATCH_FILTERS_STORAGE_KEY, type MatchFilters } from "@/lib/match-filters";
import { Button } from "@/components/ui/button";
import { CreateMatchChooser } from "@/components/CreateMatchChooser";
import { defaultMatchDays, groupByDay, toggleMatchDay, MATCH_DAYS_STORAGE_KEY, restoreMatchDays, serializeMatchDays } from "@/lib/match-date-selection";

export const Route = createFileRoute("/app/events/")({
  head: () => ({
    meta: [
      { title: "Find a Padel Match | PadelSetMatch" },
      { name: "description", content: "Find local padel matches, meet neighbourhood players and join a game with PadelSetMatch." },
      { property: "og:title", content: "Find a Padel Match | PadelSetMatch" },
      { property: "og:description", content: "Find local padel matches, meet neighbourhood players and join a game with PadelSetMatch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-[var(--cream)]/70">{error instanceof Error ? error.message : String(error)}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-center text-[var(--cream)]/70">—</div>,
});

const LEVEL_INDEX: Record<string, number> = {
  "just starting": 0,
  casual: 1,
  intermediate: 2,
  advanced: 3,
  competitive: 4,
};

const DAY_COUNT = 45;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type EventLite = {
  id: string;
  starts_at: string;
  time_tbd?: boolean | null;
  filled: number;
  needs: number;
  extra_confirmed?: number | null;
  iAmHost: boolean;
  iAmParticipant: boolean;
  iAmPlaying?: boolean;
  status: string;
  club_name: string;
  city?: string | null;
  club_address?: string | null;
  gender_rule: string;
  level_min?: string;
  level_max?: string;
  note?: string | null;
  tag?: string | null;
  court_booked?: boolean;
  is_private_court?: boolean;
  free_court?: boolean;
  joins_on_playtomic?: boolean;
  playtomic_link?: string | null;
  is_class?: boolean;
  class_students?: number | null;
  class_fee?: string | null;
  duration_minutes?: number | null;
  capacity?: number;
  host?: { first_name?: string } | null;
  participants?: Array<{ profile_id?: string; profiles?: { first_name?: string; photo_url?: string | null; is_coach?: boolean | null } | null } | null>;
  guests?: Array<{ id: string; display_name: string; level?: string | null }>;
};

function EventsPage() {
  const [chooser, setChooser] = useState(false);
  const navigate = useNavigate();
  const tr = useTr();
  const { lang, label } = useI18n();
  const qc = useQueryClient();

  const list = useServerFn(listOpenEvents);
  const join = useServerFn(joinMatchEvent);
  const leave = useServerFn(leaveMatchEvent);
  const cancel = useServerFn(cancelMatchEvent);
  const deleteFn = useServerFn(deleteMatchEvent);
  const duplicate = useServerFn(duplicateMatchEvent);
  const getProfile = useServerFn(getMyProfile);

  const [mode, setMode] = useState<"find" | "mine">("find");
  // The Competitions page's "My matches" tab asks for this tab once.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("psm-matches-tab") === "mine") setMode("mine");
      sessionStorage.removeItem("psm-matches-tab");
    } catch { /* storage unavailable */ }
  }, []);

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
    retry: false,
  });
  // Players see their own areas; anyone without an area (e.g. World) sees every game.
  const myLocations = ((profileQ.data as { locations?: string[] | null } | undefined)?.locations) ?? [];
  const myAreasOnly = myLocations.length > 0;
  const myLevel = (profileQ.data as { level?: string | null } | undefined)?.level ?? null;
  const areas = useMemo(() => feedAreas(myLocations), [myLocations.join("\n")]);

  // Filters: area chips (players with two or more areas) and the Filters sheet.
  const [areaKeys, setAreaKeys] = useState<Set<string>>(new Set());
  const [filters, setFiltersState] = useState<MatchFilters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  useEffect(() => {
    try { setFiltersState(restoreFilters(sessionStorage.getItem(MATCH_FILTERS_STORAGE_KEY))); } catch { /* storage unavailable */ }
  }, []);
  function setFilters(next: MatchFilters) {
    setFiltersState(next);
    try { sessionStorage.setItem(MATCH_FILTERS_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
  function toggleArea(key: string) {
    setAreaKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next.size === areas.length ? new Set() : next;
    });
  }
  const filterCount = activeFilterCount(filters);

  const eventsQ = useQuery({
    queryKey: ["open-events", myAreasOnly],
    queryFn: () => list({ data: { city: null, needs: null, myLocations: myAreasOnly } }),
    enabled: !profileQ.isPending,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  // Realtime: keep the feed live when other players join/leave or matches change.
  useEffect(() => {
    const ch = supabase
      .channel("open-events-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, () => {
        qc.invalidateQueries({ queryKey: ["open-events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_event_participants" }, () => {
        qc.invalidateQueries({ queryKey: ["open-events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_participants" }, () => {
        qc.invalidateQueries({ queryKey: ["open-events"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const today = startOfDay(new Date());
  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    }),
    [today.getTime()],
  );

  // Filters
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => {
    const keys: string[] = [];
    for (let i = 0; i < DAY_COUNT; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      keys.push(dayKey(d));
    }
    return defaultMatchDays(keys);
  });
  const allDates = selectedDays.size === days.length;

  // Bring back the days chosen earlier in this session (e.g. after opening a match).
  useEffect(() => {
    try {
      const restored = restoreMatchDays(sessionStorage.getItem(MATCH_DAYS_STORAGE_KEY), days.map(dayKey));
      if (restored) setSelectedDays(restored);
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseDays(next: Set<string>) {
    setSelectedDays(next);
    try {
      sessionStorage.setItem(MATCH_DAYS_STORAGE_KEY, serializeMatchDays(next, days.map(dayKey)));
    } catch { /* storage unavailable */ }
  }

  function toggleDay(k: string) {
    chooseDays(toggleMatchDay(selectedDays, k, days.map(dayKey)));
  }

  const all = (eventsQ.data?.events ?? []) as EventLite[];

  const filtered = useMemo(() => {
    const chosen = areas.filter((a) => areaKeys.has(a.key));
    return all
      .filter((e) => selectedDays.has(dayKey(new Date(e.starts_at))))
      .filter((e) => chosen.length === 0 || chosen.some((a) => eventInArea(e, a)))
      .filter((e) => passesFilters(e, filters, myLevel))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [all, selectedDays, areas, areaKeys, filters, myLevel]);


  const myEvents = useMemo(
    () => all
      .filter((e) => e.iAmParticipant)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [all],
  );
  const mineCount = useMemo(() => all.filter((e) => e.iAmParticipant).length, [all]);

  // Within one calendar day, rotate card colours by the match's start-time order
  // (computed from the unfiltered feed so filtering/reordering cannot shift a
  // card's colour). Each day still anchors on its own base colour.
  const dayToneSlots = useMemo(() => {
    const byDay = new Map<string, EventLite[]>();
    for (const e of all) {
      const key = dayKey(new Date(e.starts_at));
      const list = byDay.get(key);
      if (list) list.push(e);
      else byDay.set(key, [e]);
    }
    const slots = new Map<string, number>();
    for (const list of byDay.values()) {
      list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      list.forEach((e, i) => slots.set(e.id, i));
    }
    return slots;
  }, [all]);

  const [pending, setPending] = useState<string | null>(null);
  const [myMatchSheet, setMyMatchSheet] = useState<EventLite | null>(null);

  function refetch() {
    return qc.invalidateQueries({ queryKey: ["open-events"] });
  }

  // Reflect a leave on screen immediately so the card doesn't linger (and
  // invite repeat taps) while the server and feed refresh catch up.
  function markLeftLocally(id: string) {
    qc.setQueriesData({ queryKey: ["open-events"] }, (old: any) => {
      if (!old?.events) return old;
      return {
        ...old,
        events: old.events.map((ev: EventLite) =>
          ev.id === id && ev.iAmParticipant
            ? { ...ev, iAmParticipant: false, filled: Math.max(0, (ev.filled ?? 1) - 1), needs: (ev.needs ?? 0) + 1 }
            : ev,
        ),
      };
    });
  }

  async function instantJoin(e: EventLite) {
    setPending(e.id);
    try {
      const res = await join({ data: { id: e.id } });
      await refetch();
      toast.success(tr("You're in!", "¡Estás dentro!", "C'est bon !"), {
        duration: 10000,
        description: res?.becameHost
          ? tr("You joined first, so you're the host: you can edit it and share it.", "Llegaste primero, así que organizas tú: puedes editarlo y compartirlo.", "Tu es arrivé·e en premier, tu organises : tu peux le modifier et le partager.")
          : tr("Joined by mistake? Tap Leave.", "¿Te uniste por error? Toca Salir.", "Rejoint par erreur ? Touche Quitter."),
        action: {
          label: tr("Leave", "Salir", "Quitter"),
          onClick: async () => {
            try { await leave({ data: { id: e.id } }); markLeftLocally(e.id); void refetch(); } catch { /* ignore */ }
          },
        },
        cancel: {
          label: tr("View", "Ver", "Voir"),
          onClick: () => navigate({ to: "/app/events/$eventId", params: { eventId: e.id } }),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not join", "No se pudo unir", "Impossible de rejoindre"));
    } finally {
      setPending(null);
    }
  }

  async function instantLeave(e: EventLite) {
    if (pending === e.id) return;
    setPending(e.id);
    try {
      await qc.cancelQueries({ queryKey: ["open-events"] });
      await leave({ data: { id: e.id } });
      markLeftLocally(e.id);
      void refetch();
      toast(tr("You left the match", "Has salido del partido", "Tu as quitté le match"), {
        duration: 8000,
        action: {
          label: tr("Undo — rejoin", "Deshacer — volver", "Annuler — rejoindre"),
          onClick: async () => { try { await join({ data: { id: e.id } }); refetch(); } catch {/* ignore */} },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not leave", "No se pudo salir", "Impossible de quitter"));
    } finally { setPending(null); }
  }

  async function hostCancel(e: EventLite) {
    setPending(e.id);
    try {
      if ((e.filled ?? 0) <= 1) {
        await deleteFn({ data: { id: e.id } });
        toast.success(tr("Match removed", "Partido eliminado", "Match supprimé"));
      } else {
        await cancel({ data: { id: e.id } });
        toast.success(tr("Match cancelled", "Partido cancelado", "Match annulé"));
      }
      await refetch();
      setMyMatchSheet(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not cancel", "No se pudo cancelar", "Impossible d'annuler"));
    } finally { setPending(null); }
  }

  async function hostExtend(e: EventLite, hoursAhead: number) {
    const target = new Date(e.starts_at);
    target.setHours(target.getHours() + hoursAhead, 0, 0, 0);
    setPending(e.id);
    try {
      const { id } = await duplicate({ data: { id: e.id, starts_at: target.toISOString() } });
      await refetch();
      setMyMatchSheet(null);
      toast.success(tr(`Copied to +${hoursAhead}h`, `Copiado a +${hoursAhead}h`, `Copié à +${hoursAhead}h`), {
        duration: 10000,
        action: {
          label: tr("View", "Ver", "Voir"),
          onClick: () => navigate({ to: "/app/events/$eventId", params: { eventId: id } }),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not copy", "No se pudo copiar", "Impossible de copier"));
    } finally { setPending(null); }
  }

  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : undefined;

  return (
    <div className="programme-page match-feed-page min-h-[calc(100vh-4rem)]">
      <CreateMatchChooser open={chooser} onClose={() => setChooser(false)} />
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-4 pb-24">
        <h1 className="text-serif text-[28px] sm:text-5xl leading-none tracking-normal text-foreground pt-1">
          {tr("Matches", "Partidos", "Matchs")}
        </h1>

        <div className="mt-4 mb-1 -mx-4 sm:mx-0 px-4 sm:px-0 flex items-center justify-between gap-2 border-b border-border">
          <div role="tablist" aria-label={tr("Matches", "Partidos", "Matchs")} className="flex min-w-0 gap-5 sm:gap-7">
            {(["find", "mine"] as const).map((value) => (
              <Button key={value} role="tab" aria-selected={mode === value} variant="ghost" onClick={() => setMode(value)}
                className={`h-10 rounded-none px-0 text-[14px] sm:text-[15px] font-normal shadow-none border-b-[1.5px] -mb-px hover:bg-transparent ${mode === value ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                {value === "find" ? tr("Find a match", "Buscar partido", "Trouver un match") : tr("My matches", "Mis partidos", "Mes matchs")}
                {value === "mine" && mineCount > 0 && <span className="text-muted-foreground">{mineCount}</span>}
              </Button>
            ))}
            <Button role="tab" aria-selected={false} variant="ghost" onClick={() => navigate({ to: "/app/competitions" })}
              className="h-10 rounded-none px-0 text-[14px] sm:text-[15px] font-normal shadow-none border-b-[1.5px] -mb-px border-transparent text-muted-foreground hover:bg-transparent">
              {tr("Competitions", "Competiciones", "Compétitions")}
            </Button>
          </div>
          {mode === "find" && (
            <Button variant="ghost" size="sm" aria-label={tr("Filters", "Filtros", "Filtres")} onClick={() => setFiltersOpen(true)}
              className={`shrink-0 h-9 gap-1.5 px-1.5 text-xs hover:bg-transparent ${filterCount > 0 ? "text-primary" : "text-muted-foreground"}`}>
              <SlidersHorizontal className="size-4" />
              {filterCount > 0 && <span>{filterCount}</span>}
            </Button>
          )}
        </div>

        {mode === "find" && (
          <div className="flex items-stretch justify-between gap-1 overflow-x-auto no-scrollbar pt-3 pb-1" aria-label={tr("Match dates", "Fechas de partidos", "Dates des matchs")}>
            {days.map((d, i) => {
              const k = dayKey(d);
              const active = !allDates && selectedDays.has(k);
              const weekday = d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
              return (
                <button key={k} type="button" aria-pressed={active} aria-label={d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                  onClick={() => toggleDay(k)}
                  className="shrink-0 min-w-11 flex-1 flex flex-col items-center gap-1 py-1 active:opacity-70">
                  <span className={`text-[10px] uppercase tracking-[0.18em] leading-none ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/84"}`}>{i === 0 ? tr("Today", "Hoy", "Auj.") : weekday}</span>
                  <span className={`text-serif text-[20px] sm:text-[24px] leading-none tracking-normal ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/78"}`}>{d.getDate()}</span>
                  <span aria-hidden className={`h-px w-6 ${active ? "bg-[var(--gold)]" : "bg-transparent"}`} />
                </button>
              );
            })}
            <button type="button" aria-pressed={allDates}
              onClick={() => chooseDays(new Set(days.map(dayKey)))}
              className="shrink-0 min-w-11 flex-1 flex flex-col items-center gap-1 py-1 active:opacity-70">
              <span className={`text-[10px] uppercase tracking-[0.18em] leading-none ${allDates ? "text-[var(--ink)]" : "text-[var(--ink)]/84"}`}>{tr("All", "Todas", "Toutes")}</span>
              <span className={`text-serif italic text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] ${allDates ? "text-[var(--ink)]" : "text-[var(--ink)]/78"}`}>{tr("dates", "fechas", "dates")}</span>
              <span aria-hidden className={`h-px w-6 ${allDates ? "bg-[var(--gold)]" : "bg-transparent"}`} />
            </button>
          </div>
        )}

        {mode === "find" && areas.length >= 2 && (
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pt-1 pb-1" aria-label={tr("Areas", "Zonas", "Zones")}>
            <button type="button" aria-pressed={areaKeys.size === 0} onClick={() => setAreaKeys(new Set())}
              className={`shrink-0 h-9 text-[13px] border-b transition ${areaKeys.size === 0 ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--ink)]/86"}`}>
              {tr("All my areas", "Todas mis zonas", "Toutes mes zones")}
            </button>
            {areas.map((a) => {
              const on = areaKeys.has(a.key);
              return (
                <button key={a.key} type="button" aria-pressed={on} onClick={() => toggleArea(a.key)}
                  className={`shrink-0 h-9 text-[13px] border-b transition ${on ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--ink)]/86"}`}>
                  {a.label}
                </button>
              );
            })}
          </div>
        )}

        <MatchFiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} value={filters} onChange={setFilters}
          myLevelLabel={myLevel ? label(myLevel).replace(/^./, (c) => c.toUpperCase()) : null} resultCount={filtered.length} onAlerts={() => setAlertsOpen(true)} />
        <AlertsSheet open={alertsOpen} onClose={() => setAlertsOpen(false)} />

        {mode === "find" ? (
          <>
            {eventsQ.isPending ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--ink)]/30 bg-white card-lift p-4 space-y-2.5">
                    <div className="h-3.5 w-1/3 rounded bg-[var(--ink)]/8 animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-[var(--ink)]/8 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-[var(--ink)]/6 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyFeed
                onClearFilters={filterCount > 0 || areaKeys.size > 0 ? () => { setFilters(NO_FILTERS); setAreaKeys(new Set()); } : undefined}
                onResetDays={() =>
                  chooseDays(new Set(days.slice(0, 7).map((d) => dayKey(d))))
                }
                onCreate={() => setChooser(true)}
              />
            ) : (
              <div className="mt-5 space-y-4">
                {filtered.length > 0 && (
                  <FeedSection
                    title={tr("Open matches", "Partidos abiertos", "Matches ouverts")}
                    events={filtered}
                    daySlots={dayToneSlots}
                    locale={locale}
                    pending={pending}
                    onOpen={(id) => navigate({ to: "/app/events/$eventId", params: { eventId: id } })}
                    onJoin={instantJoin}
                    onManage={(e) => navigate({ to: "/app/events/$eventId", params: { eventId: e.id } })}
                    tr={tr}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <MyMatchesList
            events={myEvents}
            lang={lang}
            tr={tr}
            pending={pending}
            onOpen={(id) => navigate({ to: "/app/events/$eventId", params: { eventId: id } })}
            onManage={(e) => navigate({ to: "/app/events/$eventId", params: { eventId: e.id } })}
            onLeave={instantLeave}
            onFind={() => setMode("find")}
          />
        )}

        {myMatchSheet && (
          <MyMatchSheet
            event={myMatchSheet}
            pending={pending}
            onClose={() => setMyMatchSheet(null)}
            onOpen={() => navigate({ to: "/app/events/$eventId", params: { eventId: myMatchSheet.id } })}
            onCancel={() => hostCancel(myMatchSheet)}
            onExtend={(h) => hostExtend(myMatchSheet, h)}
          />
        )}


      </div>
    </div>
  );
}

// ---------- Feed section ----------

function FeedSection({
  title,
  subtitle,
  events,
  daySlots,
  locale,
  pending,
  onOpen,
  onJoin,
  onManage,
  tr,
  highlight,
}: {
  title: string;
  subtitle?: string;
  events: EventLite[];
  daySlots: Map<string, number>;
  locale: string | undefined;
  pending: string | null;
  onOpen: (id: string) => void;
  onJoin: (e: EventLite) => void;
  onManage: (e: EventLite) => void;
  tr: ReturnType<typeof useTr>;
  highlight?: boolean;
}) {
  const groups = groupByDay(events, (e) => dayKey(new Date(e.starts_at)));
  const todayKey = dayKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dayKey(tomorrow);

  function dayHeading(d: Date, key: string): { main: string; sub: string } {
    const weekday = d.toLocaleDateString(locale, { weekday: "long" });
    const full = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
    if (key === todayKey) return { main: tr("Today", "Hoy", "Aujourd'hui"), sub: full };
    if (key === tomorrowKey) return { main: tr("Tomorrow", "Mañana", "Demain"), sub: full };
    return { main: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`, sub: d.toLocaleDateString(locale, { day: "numeric", month: "long" }) };
  }

  return (
    <section aria-label={title}>
      {subtitle && <p className="text-xs text-[var(--ink)]/78 mt-1">{subtitle}</p>}
      <div className="space-y-9">
        {groups.map((group) => {
          const first = new Date(group.items[0].starts_at);
          const heading = dayHeading(first, group.key);
          return (
            <div key={group.key}>
              <h2 className="flex items-baseline gap-3 pb-2 border-b border-[var(--gold)]/40">
                <span className="text-serif text-[20px] sm:text-[26px] leading-none text-[var(--ink)]">{heading.main}</span>
                <span className="font-sans font-medium text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink)]/86 truncate">{heading.sub}</span>
              </h2>
              <ul className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2 lg:items-start">
                {group.items.map((e, i) => {
                  const prev = i > 0 ? group.items[i - 1] : null;
                  const slotChanged = prev !== null && !e.time_tbd && !prev.time_tbd &&
                    Math.floor(new Date(prev.starts_at).getHours() / 12) !== Math.floor(new Date(e.starts_at).getHours() / 12);
                  return (
                    <li key={e.id} className={`lazy-row ${slotChanged ? "pt-1 lg:pt-0" : ""}`}>
                      <MatchCard
                        e={e}
                        locale={locale}
                        daySlot={daySlots.get(e.id) ?? 0}
                        pending={pending}
                        onOpen={onOpen}
                        onJoin={onJoin}
                        onManage={onManage}
                        tr={tr}
                        highlight={highlight}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}


// ---------- Match card (Playtomic-style, brand-styled) ----------

function MatchCard({
  e,
  locale,
  daySlot,
  pending,
  onOpen,
  onJoin,
  onManage,
  tr,
  highlight,
}: {
  e: EventLite;
  locale: string | undefined;
  daySlot: number;
  pending: string | null;
  onOpen: (id: string) => void;
  onJoin: (e: EventLite) => void;
  onManage: (e: EventLite) => void;
  tr: ReturnType<typeof useTr>;
  highlight?: boolean;
}) {
  const isPending = pending === e.id;
  const start = new Date(e.starts_at);
  const weekday = start.toLocaleDateString(locale, { weekday: "short" });
  const dayNum = start.toLocaleDateString(locale, { day: "numeric" });
  const monthShort = start.toLocaleDateString(locale, { month: "short" });
  // No hour picked yet: the card simply says "Time" until a player sets one.
  const time = e.time_tbd
    ? tr("Time", "Hora", "Heure")
    : start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  const hour = start.getHours();
  const timeOfDay: "morning" | "afternoon" | "evening" =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const accent =
    timeOfDay === "morning"
      ? { bar: "bg-[var(--ball)]", chip: "bg-[var(--ball)]/25 text-[var(--ink)]", label: tr("Morning", "Mañana", "Matin") }
      : timeOfDay === "afternoon"
        ? { bar: "bg-[var(--clay)]", chip: "bg-[var(--clay)]/25 text-[var(--ink)]", label: tr("Afternoon", "Tarde", "Après-midi") }
        : { bar: "bg-[var(--plum)]", chip: "bg-[var(--plum)]/15 text-[var(--plum)]", label: tr("Evening", "Noche", "Soir") };

  // Open matches carry no gender tag on the card; only deliberate restrictions show.
  const genderLabel = e.gender_rule === "open" ? null : genderRuleLabel(e.gender_rule, tr);
  const lvlName = (l: string) => ({
    "just starting": tr("Beginner", "Iniciación", "Débutant"),
    casual: tr("Casual", "Casual", "Loisir"),
    intermediate: tr("Intermediate", "Intermedio", "Intermédiaire"),
    advanced: tr("Advanced", "Avanzado", "Avancé"),
    competitive: tr("Competitive", "Competición", "Compétition"),
  } as Record<string, string>)[l] ?? l;
  const lvlLo = LEVEL_INDEX[e.level_min ?? ""];
  const levelWord = e.level_min == null || lvlLo == null ? null
    : lvlLo <= 1 ? tr("Casual", "Iniciación", "Loisir")
    : lvlLo === 2 ? tr("Inter.", "Intermedio", "Inter.")
    : lvlName(e.level_min);
  const levelLabel = levelRangeLabel(e.level_min, e.level_max, tr);
  const mine = e.iAmHost || e.iAmParticipant;
  // Your own matches are managed only from the Manage button, so a stray tap
  // on the card never takes you somewhere you didn't mean to go.
  const openFromCard = e.iAmHost ? undefined : () => onOpen(e.id);
  const playing = e.iAmPlaying ?? (mine && !e.iAmHost);
  const cardAction = matchCardAction({ ...e, capacity: e.capacity ?? 4 });
  // Shared from Playtomic: every join opens the organiser's Playtomic match.
  const ptLink = playtomicJoinLink(e);
  const joinCard = () => {
    if (ptLink) {
      window.__lovableEvents?.track?.("project.playtomic_match_join_clicked", { placement: "play_card" });
      void openExternal(ptLink);
    } else onJoin(e);
  };
  const capacity = e.capacity ?? 4;
  const full = e.filled >= capacity;

  // Order: app players, link guests, then friends the host already has coming
  // (extra_confirmed). Whatever is left is a place that still needs a player.
  // In a class, a verified coach always sits first so players see who teaches.
  const orderedParticipants = e.is_class
    ? [...(e.participants ?? [])].sort((a, b) => Number(!!b?.profiles?.is_coach) - Number(!!a?.profiles?.is_coach))
    : e.participants ?? [];
  const playerSlots: SlotData[] = [
    ...orderedParticipants.map((participant) => ({ participant })),
    ...(e.guests ?? []).map((guest) => ({ guest })),
    ...Array.from({ length: e.extra_confirmed ?? 0 }, () => ({ friend: true as const })),
  ];
  const slots = Array.from({ length: capacity }, (_, i) => playerSlots[i] ?? null);

  // Today / Tomorrow badge for the date block
  const today = startOfDay(new Date());
  const isToday = start.getTime() >= today.getTime() && start.getTime() < today.getTime() + 24 * 60 * 60 * 1000;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = start.getTime() >= tomorrow.getTime() && start.getTime() < tomorrow.getTime() + 24 * 60 * 60 * 1000;
  const dateBadge = isToday ? tr("Today", "Hoy", "Auj.") : isTomorrow ? tr("Tomorrow", "Mañana", "Demain") : null;

  const whenLabel = dateBadge ?? weekday;
  // Day base colour + rotation within the day, so same-day matches alternate
  // lavender / green / gold instead of all sharing one tone. Local calendar
  // components and start-time order (not list position) keep colours stable
  // across DST changes, filtering and reordering.
  const calendarDay = Math.floor(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) / 86_400_000);
  const dayTone = (((calendarDay % 3) + (daySlot % 3)) % 3 + 3) % 3;
  const toneClass = ["bg-match-lavender", "bg-match-green", "bg-match-gold"][dayTone];

  // Four-player matches read as two pairs facing each other; classes and other
  // sizes sit in one row (coach first).
  const asPairs = !e.is_class && capacity === 4;
  const coachFirst = !!e.is_class && !!slots[0]?.participant?.profiles?.is_coach;
  const renderSlot = (s: SlotData | null, i: number) => (
    <SlotAvatar
      key={i}
      slot={s}
      tr={tr}
      // A "+" only ever joins — hosts who stepped out included.
      onJoin={() => {
        if (playing) { toast(tr("You're already in this match", "Ya estás en este partido", "Tu es déjà dans ce match")); return; }
        if (!full) joinCard();
      }}
      canJoin={!full}
      isPending={isPending}
      playtomic={!!ptLink}
    />
  );
  const endTime = new Date(start.getTime() + matchDuration(e) * 60_000)
    .toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  // Skip the place line when it would only repeat the title.
  const rawPlace = e.city || e.club_address || "";
  const placeLine = rawPlace.trim() && (e.club_name ?? "").toLowerCase().includes(rawPlace.trim().toLowerCase()) ? "" : rawPlace;

  const placesText = full
    ? tr("Full", "Completo", "Complet")
    : e.needs === 1
      ? tr("One place open", "Queda una plaza", "Une place libre")
      : e.needs === 2
        ? tr("Two places open", "Quedan dos plazas", "Deux places libres")
        : e.needs === 3
          ? tr("Three places open", "Quedan tres plazas", "Trois places libres")
          : e.needs === 4
            ? tr("Four places open", "Quedan cuatro plazas", "Quatre places libres")
            : tr(`${e.needs} places open`, `Quedan ${e.needs} plazas`, `${e.needs} places libres`);
  const details: ReactNode[] = [];
  if (e.is_class) details.push(<span key="class" className="text-[var(--ink)]">{tr("Class", "Clase", "Cours")}{e.class_fee ? ` ${e.class_fee}` : ""}</span>);
  if (levelLabel) details.push(<span key="lvl">{levelLabel.charAt(0).toUpperCase() + levelLabel.slice(1).toLowerCase()}</span>);
  if (genderLabel) details.push(<span key="g">{genderLabel}</span>);
  if (e.free_court) details.push(<span key="fc" className="text-[var(--ink)]">🎾 {tr("Free court", "Pista gratis", "Terrain gratuit")}</span>);
  if (ptLink) details.push(<span key="pt">Playtomic</span>);
  else if (e.court_booked) details.push(<span key="cb">{tr("Court booked", "Pista reservada", "Court réservé")}</span>);
  if (e.is_private_court) details.push(<span key="pv">{tr("Private", "Privada", "Privé")}</span>);
  if (mine) details.push(<span key="me" className="text-[var(--ink)]">{e.iAmHost ? tr("Host", "Anfitrión", "Hôte") : tr("You're in", "Estás dentro", "Inscrit")}</span>);

  return (
    <div
      className={`relative h-full rounded-2xl bg-white overflow-hidden card-lift ${
        highlight ? "ring-1 ring-[var(--plum)]/45" : "border border-[var(--ink)]/30"
      }`}
    >
      {/* The day's colour lives only in a thin edge */}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${toneClass}`} />

      {/* Header: when, places open, where */}
      <button type="button" onClick={openFromCard} className="block w-full text-left pl-4 pr-3.5 pt-3 sm:pl-5 sm:pr-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-serif font-medium text-[19px] sm:text-[24px] leading-none text-[var(--ink)] whitespace-nowrap">
              {e.time_tbd ? time : <>{time}<span className="text-[var(--ink)]/68"> – </span>{endTime}</>}
            </span>
            <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--ink)]/88 whitespace-nowrap">
              {e.time_tbd ? tr("To be set", "Por fijar", "À fixer") : `${matchDuration(e)} min`}
            </span>
          </div>
          <span className={`text-serif italic font-medium text-[14px] whitespace-nowrap ${full ? "text-[var(--ink)]/88" : "text-[var(--plum)]"}`}>
            {placesText}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 min-w-0">
          <span className="min-w-0 truncate text-[14px] sm:text-[16px] font-medium text-[var(--ink)]">
            {e.club_name || tr("Location TBD", "Ubicación por definir", "Lieu à définir")}
          </span>
          {placeLine && (
            <span className="shrink-0 max-w-[45%] truncate text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--ink)]/88">{placeLine}</span>
          )}
        </div>
        {e.tag && (
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">{e.tag}</div>
        )}
      </button>

      {/* Players: two pairs facing each other, kept close together */}
      <div className="ml-4 mr-3.5 sm:ml-5 sm:mr-4 mt-2.5 border-t border-[var(--ink)]/28 pt-2 pb-2">
        {asPairs ? (
          <div className="mx-auto grid max-w-[380px] grid-cols-[1fr_auto_1fr] items-start">
            <div>
              <div className="mb-1 text-center text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--ink)]/85">{tr("Team A", "Equipo A", "Équipe A")}</div>
              <div className="flex justify-center gap-2 sm:gap-3">{slots.slice(0, 2).map((s, i) => renderSlot(s, i))}</div>
            </div>
            <span className="mt-[30px] px-1.5 sm:px-3 text-serif italic text-[13px] text-[var(--ink)]/70">vs</span>
            <div>
              <div className="mb-1 text-center text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--ink)]/85">{tr("Team B", "Equipo B", "Équipe B")}</div>
              <div className="flex justify-center gap-2 sm:gap-3">{slots.slice(2, 4).map((s, i) => renderSlot(s, i + 2))}</div>
            </div>
          </div>
        ) : coachFirst ? (
          // Class: the coach stands apart, students share the court.
          <div className="mx-auto flex max-w-[420px] items-start justify-center">
            <div className="flex shrink-0 justify-center pr-2 sm:pr-3">{renderSlot(slots[0] ?? null, 0)}</div>
            <span aria-hidden className="mt-1 h-11 w-px shrink-0 bg-[var(--ink)]/25" />
            <div className="flex flex-1 justify-center gap-1 sm:gap-2 pl-2 sm:pl-3">{slots.slice(1).map((s, i) => renderSlot(s, i + 1))}</div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[420px] items-start justify-center gap-2 sm:gap-3">{slots.map((s, i) => renderSlot(s, i))}</div>
        )}
      </div>

      {/* Quiet footer: details and the one action */}
      <div className="ml-4 mr-3.5 sm:ml-5 sm:mr-4 border-t border-[var(--ink)]/28 py-1.5 flex items-center gap-3">
        <div className="flex-1 min-w-0 text-[12.5px] leading-snug font-medium text-[var(--ink)]/88 truncate">
          {details.map((d, i) => (
            <span key={i}>{i > 0 && <span className="text-[var(--ink)]/62"> · </span>}{d}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            // Players in the game manage it; everyone else joins in one tap
            // (or views it when full). Tapping the card still opens any game
            // so every player can edit it.
            if (cardAction === "join") joinCard();
            else if (e.iAmHost) onManage(e);
            else onOpen(e.id);
          }}
          disabled={isPending}
          className="relative before:absolute before:-inset-y-2 before:-inset-x-1 before:content-[''] shrink-0 inline-flex items-center rounded-full border border-[var(--ink)]/40 text-[var(--ink)] text-[10.5px] font-semibold uppercase tracking-[0.12em] px-4 py-1.5 active:bg-[var(--ink)]/[0.05] disabled:opacity-50"
        >
          {cardAction === "join" && ptLink
            ? <>{tr("Join on Playtomic", "Unirme en Playtomic", "Rejoindre sur Playtomic")}<ExternalLink className="ml-1 w-3 h-3" /></>
            : cardAction === "join"
            ? isPending ? "…" : e.is_class ? tr("Join class", "Unirme", "Rejoindre") : tr("Join", "Unirme", "Rejoindre")
            : cardAction === "view"
              ? tr("View", "Ver", "Voir")
              : tr("Manage", "Gestionar", "Gérer")}
        </button>
      </div>
    </div>
  );
}

type SlotData = {
  participant?: NonNullable<EventLite["participants"]>[number];
  guest?: NonNullable<EventLite["guests"]>[number];
  friend?: true;
};

function SlotAvatar({
  slot,
  tr,
  onJoin,
  canJoin,
  isPending,
  playtomic = false,
}: {
  slot: SlotData | null;
  tr: ReturnType<typeof useTr>;
  onJoin: () => void;
  canJoin: boolean;
  isPending: boolean;
  /** Shared from Playtomic: held places were taken there, not by a friend. */
  playtomic?: boolean;
}) {
  const name = slot?.participant?.profiles?.first_name ?? slot?.guest?.display_name;
  const photo = slot?.participant?.profiles?.photo_url;
  const isCoach = !!slot?.participant?.profiles?.is_coach;
  const seed = slot?.participant?.profile_id ?? slot?.guest?.id ?? name;
  const caption = "mt-1.5 block w-[58px] truncate text-center text-[12px] font-medium leading-tight";

  if (slot?.friend) {
    return (
      <div className="flex w-[58px] flex-col items-center">
        <FriendSlot size="xl" label={playtomic ? tr("Taken on Playtomic", "Ocupada en Playtomic", "Prise sur Playtomic") : tr("Friend already coming", "Amigo ya confirmado", "Ami déjà confirmé")} />
        <span className={`${caption} text-[var(--ink)]/82`}>{playtomic ? tr("Taken", "Ocupada", "Prise") : tr("Friend", "Amigo", "Ami")}</span>
      </div>
    );
  }

  if (!slot) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={(ev) => { ev.stopPropagation(); onJoin(); }}
        aria-label={tr("Player needed", "Falta jugador", "Joueur recherché")}
        title={tr("Player needed", "Falta jugador", "Joueur recherché")}
        className={`group flex w-[58px] flex-col items-center ${isPending ? "opacity-50" : ""}`}
      >
        <span
          className={`w-[46px] h-[46px] rounded-full border border-dashed grid place-items-center transition ${
            canJoin
              ? "border-[var(--ink)]/45 text-[var(--ink)]/88 group-hover:bg-[var(--ink)]/[0.03] group-active:scale-95"
              : "border-[var(--ink)]/28 text-[var(--ink)]/62"
          }`}
        >
          <Plus className="w-4 h-4" strokeWidth={1.25} />
        </span>
        <span className={`${caption} text-[9.5px] uppercase tracking-[0.12em] font-semibold ${canJoin ? "text-[var(--plum)]" : "text-[var(--ink)]/82"}`}>
          {tr("Open", "Libre", "Libre")}
        </span>
      </button>
    );
  }

  return (
    <div
      className="flex w-[58px] flex-col items-center"
      title={isCoach ? `${name ?? ""} · ${tr("Coach", "Profesor", "Coach")}` : name ?? ""}
    >
      <div
        className={`w-[46px] h-[46px] rounded-full overflow-hidden bg-[var(--paper-2)] ${
          isCoach ? "ring-2 ring-[var(--plum)] ring-offset-2 ring-offset-white" : "border border-[var(--ink)]/32"
        }`}
      >
        {photo ? (
          <PlayerPhoto src={photoSrc(photo, 240)} seed={seed} alt={name ?? ""} loading={isCoach ? "eager" : "lazy"} decoding="async" className="w-full h-full object-cover" />
        ) : (
          <CourtViewCard seed={seed} name={name} role="img" className="w-full h-full" letterClassName="text-[16px]" />
        )}
      </div>
      <span className={`${caption} text-[var(--ink)]`}>{name ?? "?"}</span>
      {isCoach && (
        <span className="text-[9px] uppercase tracking-[0.16em] font-semibold text-[var(--plum)] leading-none mt-0.5">
          {tr("Coach", "Profesor", "Coach")}
        </span>
      )}
    </div>
  );
}

// ---------- Empty state ----------

function EmptyFeed({
  onResetDays,
  onCreate,
  onClearFilters,
}: {
  onResetDays: () => void;
  onCreate: () => void;
  onClearFilters?: () => void;
}) {
  const tr = useTr();
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[var(--ink)]/28 bg-white p-6 text-center">
      <div className="text-serif text-xl text-[var(--ink)]">
        {tr("No matches found", "Sin partidos", "Aucun match")}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-[var(--ink)]/28 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
          >
            {tr("Clear filters", "Borrar filtros", "Effacer les filtres")}
          </button>
        )}
        <button
          type="button"
          onClick={onResetDays}
          className="rounded-full border border-[var(--ink)]/28 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
        >
          {tr("Show whole week", "Ver toda la semana", "Voir toute la semaine")}
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-full bg-[var(--plum)] text-white text-[11px] uppercase tracking-widest font-bold px-4 py-2"
        >
          {tr("Start a match", "Convocar partido", "Lancer un match")}
        </button>
      </div>
    </div>
  );
}

// ---------- My matches list (unchanged behaviour, restyled slightly) ----------

function MyMatchesList({
  events,
  lang,
  tr,
  pending,
  onOpen,
  onManage,
  onLeave,
  onFind,
}: {
  events: EventLite[];
  lang: string;
  tr: ReturnType<typeof useTr>;
  pending: string | null;
  onOpen: (id: string) => void;
  onManage: (e: EventLite) => void;
  onLeave: (e: EventLite) => void;
  onFind: () => void;
}) {
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : undefined;

  if (events.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/28 bg-white p-8 text-center">
        <div className="text-[var(--ink)]/88 text-base font-semibold mb-1">
          {tr("No matches yet", "Sin partidos aún", "Aucun match pour l'instant")}
        </div>
        <div className="mb-4" />
        <button
          type="button"
          onClick={onFind}
          className="rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-widest font-bold px-5 py-2.5"
        >
          {tr("Find a match", "Buscar partido", "Trouver un match")}
        </button>
      </div>
    );
  }

  const groups = new Map<string, EventLite[]>();
  for (const e of events) {
    const d = new Date(e.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })();
  const tomorrowKey = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })();

  return (
    <div className="mt-5 space-y-5">
      {Array.from(groups.entries()).map(([key, list]) => {
        const first = new Date(list[0].starts_at);
        const label = key === todayKey ? tr("Today", "Hoy", "Aujourd'hui")
          : key === tomorrowKey ? tr("Tomorrow", "Mañana", "Demain")
          : first.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" });
        return (
          <div key={key}>
            <h2 className="mb-3 pb-2 border-b border-[var(--gold)]/40 text-serif text-[20px] sm:text-[24px] leading-none text-[var(--ink)] first-letter:uppercase">{label}</h2>
            <ul className="space-y-2">
              {list.map((e) => {
                const isPending = pending === e.id;
                const filled = e.filled ?? 0;
                const time = e.time_tbd
                  ? tr("Time", "Hora", "Heure")
                  : new Date(e.starts_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
                return (
                  <li key={e.id} onClick={() => onOpen(e.id)} className="lazy-row rounded-2xl bg-white border border-[var(--ink)]/20 pl-5 pr-4 py-4 flex items-center gap-4 cursor-pointer active:bg-[var(--paper-2)]/40 transition">
                    <span className="text-serif text-[20px] sm:text-[26px] leading-none text-[var(--ink)] shrink-0 min-w-[56px] sm:min-w-[64px]">{time}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-serif text-[15px] sm:text-[17px] leading-tight text-[var(--ink)] truncate">
                        {e.club_name || tr("Match", "Partido", "Match")}
                      </div>
                      <div className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink)]/86">
                        {e.iAmHost ? tr("Host", "Anfitrión", "Hôte") : tr("Joined", "Unido", "Inscrit")} · {filled}/{e.capacity ?? 4}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      {e.iAmHost ? (
                        <button type="button" onClick={() => onManage(e)} className="min-h-9 rounded-full border border-[var(--ink)]/45 text-[var(--ink)] text-[10px] uppercase tracking-[0.2em] px-4 py-2">
                          {tr("Manage", "Gestionar", "Gérer")}
                        </button>
                      ) : (
                        <button type="button" onClick={() => onOpen(e.id)} className="min-h-9 rounded-full border border-[var(--ink)]/45 text-[var(--ink)] text-[10px] uppercase tracking-[0.2em] px-4 py-2">
                          {tr("Manage", "Gestionar", "Gérer")}
                        </button>
                      )}
                      {!e.iAmHost && (
                        <button type="button" disabled={isPending} onClick={() => onLeave(e)} className="min-h-9 px-3 py-2 text-[var(--destructive)] text-[10px] uppercase tracking-[0.2em] disabled:opacity-50">
                          {isPending ? "…" : tr("Leave", "Salir", "Quitter")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Host management sheet ----------

function MyMatchSheet({
  event,
  pending,
  onClose,
  onOpen,
  onCancel,
  onExtend,
}: {
  event: EventLite;
  pending: string | null;
  onClose: () => void;
  onOpen: () => void;
  onCancel: () => void;
  onExtend: (h: number) => void;
}) {
  const tr = useTr();
  const busy = pending === event.id;
  const when = new Date(event.starts_at).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--ink)]/40" onClick={onClose}>
      <div
        onClick={(ev) => ev.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--paper)] border-t sm:border sm:rounded-2xl border-[var(--ink)]/30 p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--plum)]">
              {event.iAmHost ? tr("Your match", "Tu partido", "Ton match") : tr("You're in", "Estás dentro", "Vous êtes dedans")}
            </div>
            <div className="text-serif text-2xl tracking-tight text-[var(--ink)] mt-0.5">{when}</div>
            <div className="text-xs text-[var(--ink)]/80 mt-1 truncate">
              {event.club_name || tr("No club yet", "Sin club aún", "Pas de club")}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ink)]/82 hover:text-[var(--ink)] shrink-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onOpen}
          disabled={busy}
          className="w-full rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-widest font-bold py-3 inline-flex items-center justify-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> {tr("Open match & chat", "Abrir partido y chat", "Ouvrir match & chat")}
        </button>

        {event.iAmHost && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/78 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {tr("Extend / copy", "Extender / copiar", "Prolonger / copier")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  onClick={() => onExtend(h)}
                  disabled={busy}
                  className="rounded-full border border-[var(--plum)]/50 text-[var(--plum)] text-[11px] uppercase tracking-widest font-bold py-2.5 disabled:opacity-50"
                >
                  +{h}h
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--ink)]/86 mt-1.5 leading-relaxed">
              {tr("Creates a copy at the next hour with same players and details.", "Crea una copia en la hora siguiente con los mismos jugadores y detalles.", "Crée une copie à l'heure suivante avec mêmes joueurs.")}
            </p>
          </div>
        )}

        {event.iAmHost && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full rounded-full border border-red-400/50 text-red-500 text-[11px] uppercase tracking-widest font-bold py-2.5 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {tr("Delete match", "Eliminar partido", "Supprimer")}
          </button>
        )}

        {(event.iAmHost || event.iAmParticipant) && <InlineMatchChat eventId={event.id} />}
      </div>
    </div>
  );
}

function InlineMatchChat({ eventId }: { eventId: string }) {
  const tr = useTr();
  const qc = useQueryClient();
  const listMsgs = useServerFn(listEventMessages);
  const sendMsg = useServerFn(sendEventMessage);
  const meFn = useServerFn(getMyProfile);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const msgsQ = useQuery({
    queryKey: ["event-msgs", eventId],
    queryFn: () => listMsgs({ data: { id: eventId } }),
  });

  useEffect(() => {
    const ch = supabase
      .channel(`ev-msgs-sheet-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_event_messages", filter: `match_event_id=eq.${eventId}` }, () => {
        qc.invalidateQueries({ queryKey: ["event-msgs", eventId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgsQ.data]);

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      await sendMsg({ data: { id: eventId, body } });
      qc.invalidateQueries({ queryKey: ["event-msgs", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Send failed", "No se pudo enviar", "Échec de l'envoi"));
    }
  };

  const messages = (msgsQ.data as any)?.messages ?? [];
  const myId = (meQ.data as any)?.id;

  return (
    <div className="rounded-xl border border-[var(--ink)]/32 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--ink)]/32 text-[10px] uppercase tracking-widest text-[var(--ink)]/82">
        {tr("Match chat", "Chat del partido", "Chat du match")}
      </div>
      <div ref={scrollRef} className="max-h-60 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-xs text-[var(--ink)]/86 py-4">
            {tr("No messages yet. Say hi 👋", "Aún no hay mensajes. Saluda 👋", "Pas encore de messages. Dis bonjour 👋")}
          </div>
        )}
        {messages.map((m: any) => {
          const mine = myId ? m.sender_profile_id === myId : false;
          const name = m.sender?.first_name ?? "";
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-[var(--ink)] text-[var(--paper)] rounded-br-sm" : "bg-[var(--paper-2)]/70 text-[var(--ink)] rounded-bl-sm border border-[var(--ink)]/32"}`}>
                {!mine && name && <div className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">{name}</div>}
                <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                <div className={`text-[9px] mt-0.5 ${mine ? "text-[var(--paper)]/60" : "text-[var(--ink)]/86"}`}>{time}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
        className="flex gap-2 p-2 border-t border-[var(--ink)]/32 bg-[var(--paper-2)]/40"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr("Message the group…", "Escribe al grupo…", "Message au groupe…")}
          className="flex-1 rounded-full border border-[var(--ink)]/30 bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--ink)]/30"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-full bg-[var(--ink)] text-[var(--paper)] px-3 py-1.5 disabled:opacity-40"
          aria-label={tr("Send", "Enviar", "Envoyer")}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
