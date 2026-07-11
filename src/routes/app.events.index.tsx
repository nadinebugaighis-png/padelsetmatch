import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { MapPin, Search, X, Trash2, Clock, Users, Send, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { AlertsButton } from "@/components/AlertsSheet";

export const Route = createFileRoute("/app/events/")({
  component: EventsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-[var(--cream)]/70">{error.message}</div>
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

const DAY_COUNT = 10;

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
  filled: number;
  needs: number;
  iAmHost: boolean;
  iAmParticipant: boolean;
  status: string;
  club_name: string;
  city?: string | null;
  club_address?: string | null;
  gender_rule: "mixed" | "men_only" | "women_only";
  level_min?: string;
  level_max?: string;
  note?: string | null;
  court_booked?: boolean;
  host?: { first_name?: string } | null;
  participants?: Array<{ profile_id?: string; profiles?: { first_name?: string; photo_url?: string | null } | null } | null>;
};

type TimeOfDay = "all" | "morning" | "afternoon" | "evening";

function EventsPage() {
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

  const [worldwide, setWorldwide] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"find" | "mine">("find");
  const myAreasOnly = !worldwide;

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
    retry: false,
  });
  const myLevel: string | undefined = (profileQ.data as any)?.level;

  const eventsQ = useQuery({
    queryKey: ["open-events", myAreasOnly],
    queryFn: () => list({ data: { city: null, needs: null, myLocations: myAreasOnly } }),
    refetchOnWindowFocus: true,
  });

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
    const s = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      s.add(dayKey(d));
    }
    return s;
  });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("all");
  const [levelOnly, setLevelOnly] = useState(false);

  function toggleDay(k: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      if (next.size === 0) next.add(k); // never leave empty
      return next;
    });
  }

  const searchLower = search.trim().toLowerCase();
  function eventMatchesName(e: EventLite) {
    if (!searchLower) return true;
    const hostName = e.host?.first_name ?? "";
    if (hostName.toLowerCase().includes(searchLower)) return true;
    if (e.club_name?.toLowerCase().includes(searchLower)) return true;
    if (e.city?.toLowerCase().includes(searchLower)) return true;
    if (e.club_address?.toLowerCase().includes(searchLower)) return true;
    return e.participants?.some((p) => p?.profiles?.first_name?.toLowerCase().includes(searchLower)) ?? false;
  }
  function eventMatchesTime(iso: string) {
    if (timeOfDay === "all") return true;
    const h = new Date(iso).getHours();
    if (timeOfDay === "morning") return h < 12;
    if (timeOfDay === "afternoon") return h >= 12 && h < 17;
    return h >= 17;
  }
  function eventMatchesLevel(e: EventLite) {
    if (!myLevel) return true;
    const my = LEVEL_INDEX[myLevel];
    const lo = LEVEL_INDEX[e.level_min ?? "casual"] ?? 0;
    const hi = LEVEL_INDEX[e.level_max ?? "advanced"] ?? 4;
    return my >= lo && my <= hi;
  }

  const all = (eventsQ.data?.events ?? []) as EventLite[];

  const filtered = useMemo(
    () => all
      .filter(eventMatchesName)
      .filter((e) => selectedDays.has(dayKey(new Date(e.starts_at))))
      .filter((e) => eventMatchesTime(e.starts_at))
      .filter((e) => !levelOnly || eventMatchesLevel(e))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [all, searchLower, selectedDays, timeOfDay, levelOnly, myLevel],
  );

  const forYourLevel = useMemo(
    () => (myLevel ? filtered.filter(eventMatchesLevel) : []),
    [filtered, myLevel],
  );
  const others = useMemo(
    () => (myLevel ? filtered.filter((e) => !eventMatchesLevel(e)) : filtered),
    [filtered, myLevel],
  );

  const myEvents = useMemo(
    () => all
      .filter((e) => e.iAmHost || e.iAmParticipant)
      .filter(eventMatchesName)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [all, searchLower],
  );
  const mineCount = useMemo(() => all.filter((e) => e.iAmHost || e.iAmParticipant).length, [all]);

  const [pending, setPending] = useState<string | null>(null);
  const [myMatchSheet, setMyMatchSheet] = useState<EventLite | null>(null);

  function refetch() {
    qc.invalidateQueries({ queryKey: ["open-events"] });
  }

  async function instantJoin(e: EventLite) {
    setPending(e.id);
    try {
      await join({ data: { id: e.id } });
      await refetch();
      toast.success(tr("You're in!", "¡Estás dentro!", "C'est bon !"), {
        duration: 10000,
        description: tr("Joined by mistake? Tap Leave.", "¿Te uniste por error? Toca Salir.", "Rejoint par erreur ? Touche Quitter."),
        action: {
          label: tr("Leave", "Salir", "Quitter"),
          onClick: async () => {
            try { await leave({ data: { id: e.id } }); refetch(); } catch { /* ignore */ }
          },
        },
        cancel: {
          label: tr("Open", "Abrir", "Ouvrir"),
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
    setPending(e.id);
    try {
      await leave({ data: { id: e.id } });
      await refetch();
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
          label: tr("Open", "Abrir", "Ouvrir"),
          onClick: () => navigate({ to: "/app/events/$eventId", params: { eventId: id } }),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not copy", "No se pudo copiar", "Impossible de copier"));
    } finally { setPending(null); }
  }

  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : undefined;

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-serif text-2xl sm:text-4xl lg:text-5xl tracking-tight leading-none text-[var(--ink)]">
              {tr("MATCHES", "PARTIDOS", "MATCHES")}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setWorldwide((v) => !v)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-widest ${
              worldwide
                ? "border-[var(--plum)] text-[var(--plum)]"
                : "border-[var(--ink)]/25 text-[var(--ink)]/80"
            }`}
          >
            <MapPin className="w-3 h-3" />
            {worldwide ? tr("World", "Mundo", "Monde") : tr("Around me", "Cerca de mí", "Autour de moi")}
          </button>
        </div>

        {/* Mode switch */}
        <div className="mt-4 mb-3 inline-flex items-center rounded-full border border-[var(--ink)]/15 bg-[var(--ink)]/[0.03] p-1 text-[11px] uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setMode("find")}
            className={`px-3.5 py-1.5 rounded-full transition-colors ${
              mode === "find" ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink)]/70"
            }`}
          >
            {tr("Find a match", "Buscar partido", "Trouver un match")}
          </button>
          <button
            type="button"
            onClick={() => setMode("mine")}
            className={`px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors ${
              mode === "mine" ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink)]/70"
            }`}
          >
            {tr("My matches", "Mis partidos", "Mes matchs")}
            {mineCount > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                mode === "mine" ? "bg-[var(--paper)] text-[var(--ink)]" : "bg-[var(--plum)] text-[var(--paper)]"
              }`}>{mineCount}</span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/50 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("Search club, address, city, name…", "Buscar club, dirección, ciudad, nombre…", "Rechercher club, adresse, ville, nom…")}
            className="w-full rounded-full bg-[var(--ink)]/[0.04] border border-[var(--ink)]/15 pl-9 pr-9 py-2.5 text-sm text-[var(--ink)] placeholder:italic placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--ink)]/40 focus:ring-1 focus:ring-[var(--ink)]/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/50 hover:text-[var(--ink)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {mode === "find" ? (
          <>
            {/* Filter chip row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              <AlertsButton />
              <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--ink)]/15 text-[var(--ink)]/70">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <button
                type="button"
                onClick={() => setLevelOnly((v) => !v)}
                disabled={!myLevel}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-widest font-semibold whitespace-nowrap transition ${
                  levelOnly
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "bg-white border border-[var(--ink)]/15 text-[var(--ink)]/75 hover:border-[var(--ink)]/35"
                } disabled:opacity-40`}
              >
                {tr("For my level", "Para mi nivel", "Pour mon niveau")}
                {myLevel && <span className="opacity-70 normal-case tracking-normal">· {label(myLevel as any)}</span>}
              </button>
              {(["all", "morning", "afternoon", "evening"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTimeOfDay(v)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-widest font-semibold whitespace-nowrap transition ${
                    timeOfDay === v
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "bg-white border border-[var(--ink)]/15 text-[var(--ink)]/75 hover:border-[var(--ink)]/35"
                  }`}
                >
                  {v === "all" && tr("All day", "Todo el día", "Toute la journée")}
                  {v === "morning" && tr("Morning", "Mañana", "Matin")}
                  {v === "afternoon" && tr("Afternoon", "Tarde", "Après-midi")}
                  {v === "evening" && tr("Evening", "Noche", "Soir")}
                </button>
              ))}
            </div>

            {/* Day chip row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 mt-2 pb-2">
              {days.map((d, i) => {
                const k = dayKey(d);
                const active = selectedDays.has(k);
                const weekday = d.toLocaleDateString(locale, { weekday: "short" });
                const dayNum = d.getDate();
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleDay(k)}
                    className={`shrink-0 rounded-2xl px-3 py-2 min-w-[54px] text-center transition ${
                      active
                        ? "bg-[var(--plum)] text-white shadow-sm"
                        : "bg-white border border-[var(--ink)]/15 text-[var(--ink)]/75 hover:border-[var(--ink)]/35"
                    }`}
                  >
                    <div className={`text-[9px] uppercase tracking-widest font-bold leading-none ${active ? "text-white/80" : "text-[var(--ink)]/55"}`}>
                      {i === 0 ? tr("Today", "Hoy", "Auj.") : weekday}
                    </div>
                    <div className="text-serif text-lg leading-none mt-1">{dayNum}</div>
                  </button>
                );
              })}
            </div>

            {eventsQ.isLoading ? (
              <div className="mt-8 text-center text-[var(--ink)]/50 text-sm">
                {tr("Loading matches…", "Cargando partidos…", "Chargement…")}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyFeed
                worldwide={worldwide}
                onExpandArea={() => setWorldwide(true)}
                onResetDays={() =>
                  setSelectedDays(new Set(days.slice(0, 7).map((d) => dayKey(d))))
                }
                onCreate={() => navigate({ to: "/app/events/new" })}
              />
            ) : (
              <div className="mt-5 space-y-6">
                {myLevel && forYourLevel.length > 0 && (
                  <FeedSection
                    title={tr("For your level", "Para tu nivel", "Pour ton niveau")}
                    subtitle={tr(
                      "These matches fit your search and your level perfectly.",
                      "Estos partidos encajan con tu búsqueda y tu nivel.",
                      "Ces matches correspondent à ta recherche et ton niveau.",
                    )}
                    events={forYourLevel}
                    locale={locale}
                    pending={pending}
                    onOpen={(id) => navigate({ to: "/app/events/$eventId", params: { eventId: id } })}
                    onJoin={instantJoin}
                    onManage={(e) => navigate({ to: "/app/events/$eventId", params: { eventId: e.id } })}
                    tr={tr}
                    highlight
                  />
                )}
                {others.length > 0 && (
                  <FeedSection
                    title={myLevel && forYourLevel.length > 0
                      ? tr("Around me", "Cerca de mí", "Autour de moi")
                      : tr("Available matches", "Partidos disponibles", "Matches disponibles")}
                    subtitle={
                      myLevel && forYourLevel.length > 0
                        ? tr(
                            "Different level range — still open to join.",
                            "Rango de nivel diferente — todavía abiertos.",
                            "Autre niveau — mais toujours ouverts.",
                          )
                        : undefined
                    }
                    events={others}
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

        {/* Sticky Start-a-match pill */}
        <div className="fixed left-0 right-0 bottom-20 px-5 z-30 pointer-events-none">
          <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto pointer-events-auto flex justify-center">
            <button
              type="button"
              onClick={() => navigate({ to: "/app/events/new" })}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--plum)] text-white text-xs uppercase tracking-widest font-bold px-5 py-3 shadow-lg hover:brightness-110 transition"
            >
              <Plus className="w-4 h-4" />
              {tr("Start a match", "Convocar partido", "Lancer un match")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Feed section ----------

function FeedSection({
  title,
  subtitle,
  events,
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
  locale: string | undefined;
  pending: string | null;
  onOpen: (id: string) => void;
  onJoin: (e: EventLite) => void;
  onManage: (e: EventLite) => void;
  tr: ReturnType<typeof useTr>;
  highlight?: boolean;
}) {
  return (
    <section>
      <h2 className="text-serif text-2xl leading-tight text-[var(--ink)]">{title}</h2>
      {subtitle && <p className="text-xs text-[var(--ink)]/55 mt-1">{subtitle}</p>}
      <ul className="mt-3 space-y-3">
        {events.map((e) => (
          <li key={e.id}>
            <MatchCard
              e={e}
              locale={locale}
              pending={pending}
              onOpen={onOpen}
              onJoin={onJoin}
              onManage={onManage}
              tr={tr}
              highlight={highlight}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Match card (Playtomic-style, brand-styled) ----------

function MatchCard({
  e,
  locale,
  pending,
  onOpen,
  onJoin,
  onManage,
  tr,
  highlight,
}: {
  e: EventLite;
  locale: string | undefined;
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
  const time = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  const hour = start.getHours();
  const timeOfDay: "morning" | "afternoon" | "evening" =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const accent =
    timeOfDay === "morning"
      ? { bar: "bg-[var(--ball)]", chip: "bg-[var(--ball)]/25 text-[var(--ink)]", label: tr("Morning", "Mañana", "Matin") }
      : timeOfDay === "afternoon"
        ? { bar: "bg-[var(--clay)]", chip: "bg-[var(--clay)]/25 text-[var(--ink)]", label: tr("Afternoon", "Tarde", "Après-midi") }
        : { bar: "bg-[var(--plum)]", chip: "bg-[var(--plum)]/15 text-[var(--plum)]", label: tr("Evening", "Noche", "Soir") };

  const genderLabel =
    e.gender_rule === "mixed" ? tr("Mixed", "Mixto", "Mixte")
    : e.gender_rule === "men_only" ? tr("Men only", "Solo hombres", "Hommes uniquement")
    : tr("Women only", "Solo mujeres", "Femmes uniquement");
  const levelLabel = e.level_min
    ? e.level_min === e.level_max ? e.level_min : `${e.level_min}–${e.level_max}`
    : "";
  const mine = e.iAmHost || e.iAmParticipant;
  const full = e.filled >= 4;

  const slots = Array.from({ length: 4 }, (_, i) => e.participants?.[i] ?? null);

  return (
    <div
      className={`relative rounded-2xl bg-white overflow-hidden shadow-[0_1px_0_rgba(15,62,46,0.04),0_10px_30px_-18px_rgba(15,62,46,0.18)] ${
        highlight ? "ring-1 ring-[var(--plum)]/45" : "border border-[var(--ink)]/10"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bar}`} aria-hidden />

      <button
        type="button"
        onClick={() => onOpen(e.id)}
        className="w-full text-left pl-5 pr-4 pt-4 pb-3"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 text-center">
            <div className="text-serif text-3xl leading-none tabular-nums text-[var(--ink)]">{time}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest font-bold text-[var(--ink)]/55">
              <span className="capitalize">{weekday}</span> {dayNum} <span className="capitalize">{monthShort}</span>
            </div>
          </div>
          <div className="w-px self-stretch bg-[var(--ink)]/10" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${accent.chip}`}>
                {accent.label}
              </span>
              {mine && (
                <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${
                  e.iAmHost ? "bg-[var(--plum)] text-white" : "bg-[var(--ink)]/10 text-[var(--ink)]"
                }`}>
                  {e.iAmHost ? tr("Host", "Anfitrión", "Hôte") : tr("You're in", "Estás dentro", "Inscrit")}
                </span>
              )}
              {e.court_booked && (
                <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-[var(--court-deep)]/10 text-[var(--court-deep)]">
                  {tr("Court booked", "Pista reservada", "Court réservé")}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-widest text-[var(--ink)]/60">
              {levelLabel && <span className="font-semibold text-[var(--ink)]/75">{levelLabel}</span>}
              {levelLabel && <span className="text-[var(--ink)]/25">·</span>}
              <span>{genderLabel}</span>
            </div>
          </div>
        </div>
      </button>

      <div className="pl-5 pr-4 pb-4">
        <div className="grid grid-cols-[1fr_auto_1fr_1fr_1fr] items-center gap-2">
          <SlotAvatar slot={slots[0]} tr={tr} onJoin={() => onJoin(e)} canJoin={!mine && !full} isPending={isPending} />
          <div className="h-14 w-px bg-[var(--ink)]/10 mx-1" aria-hidden />
          <SlotAvatar slot={slots[1]} tr={tr} onJoin={() => onJoin(e)} canJoin={!mine && !full} isPending={isPending} />
          <SlotAvatar slot={slots[2]} tr={tr} onJoin={() => onJoin(e)} canJoin={!mine && !full} isPending={isPending} />
          <SlotAvatar slot={slots[3]} tr={tr} onJoin={() => onJoin(e)} canJoin={!mine && !full} isPending={isPending} />
        </div>
        <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr_1fr_1fr] gap-2 items-center text-[9px] uppercase tracking-widest font-bold text-[var(--ink)]/40">
          <span className="text-center">A</span>
          <span className="w-px" />
          <span className="text-center" />
          <span className="text-center" />
          <span className="text-center text-right pr-1">B</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(ev) => {
          ev.stopPropagation();
          if (e.iAmHost) onManage(e);
          else onOpen(e.id);
        }}
        className="w-full flex items-center gap-3 pl-5 pr-4 py-3 border-t border-[var(--ink)]/10 bg-[var(--paper-2)]/45 hover:bg-[var(--paper-2)]/70 transition text-left"
      >
        <div className="w-9 h-9 rounded-full grid place-items-center bg-white border border-[var(--ink)]/10 shrink-0">
          <MapPin className="w-4 h-4 text-[var(--ink)]/60" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--ink)] truncate">
            {e.club_name || tr("Location TBD", "Ubicación por definir", "Lieu à définir")}
          </div>
          <div className="text-[11px] text-[var(--ink)]/55 truncate">
            {e.city || e.club_address || ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          {full ? (
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--ink)]/50">
              {tr("Full", "Completo", "Complet")}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--plum)]">
              {tr(`${e.needs} left`, `Faltan ${e.needs}`, `${e.needs} à combler`)}
            </span>
          )}
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/45 mt-0.5">
            {tr("90 min", "90 min", "90 min")}
          </div>
        </div>
      </button>
    </div>
  );
}

function SlotAvatar({
  slot,
  tr,
  onJoin,
  canJoin,
  isPending,
}: {
  slot: EventLite["participants"] extends Array<infer T> | undefined ? (T | null) : never;
  tr: ReturnType<typeof useTr>;
  onJoin: () => void;
  canJoin: boolean;
  isPending: boolean;
}) {
  const name = slot?.profiles?.first_name;
  const photo = slot?.profiles?.photo_url;

  if (!slot) {
    return (
      <button
        type="button"
        disabled={!canJoin || isPending}
        onClick={(ev) => { ev.stopPropagation(); onJoin(); }}
        className="flex flex-col items-center gap-1 group"
      >
        <div className={`w-11 h-11 rounded-full grid place-items-center border-2 border-dashed transition ${
          canJoin
            ? "border-[var(--plum)]/50 text-[var(--plum)] group-hover:bg-[var(--plum)]/8 group-hover:border-[var(--plum)]"
            : "border-[var(--ink)]/20 text-[var(--ink)]/30"
        } ${isPending ? "opacity-50" : ""}`}>
          <Plus className="w-4 h-4" />
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-semibold ${canJoin ? "text-[var(--plum)]" : "text-[var(--ink)]/40"}`}>
          {canJoin ? tr("Join", "Unirme", "Rejoindre") : tr("Open", "Libre", "Libre")}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-11 h-11 rounded-full overflow-hidden border border-[var(--ink)]/15 bg-[var(--ink)]/10 grid place-items-center">
        {photo ? (
          <img src={photo} alt={name ?? ""} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[13px] font-bold text-[var(--ink)]/70">{(name ?? "?").slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <span className="text-[10px] text-[var(--ink)]/70 truncate max-w-[60px]">
        {name ?? "—"}
      </span>
    </div>
  );
}

// ---------- Empty state ----------

function EmptyFeed({
  worldwide,
  onExpandArea,
  onResetDays,
  onCreate,
}: {
  worldwide: boolean;
  onExpandArea: () => void;
  onResetDays: () => void;
  onCreate: () => void;
}) {
  const tr = useTr();
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[var(--ink)]/20 bg-white p-6 text-center">
      <div className="text-serif text-xl text-[var(--ink)]">
        {tr("No matches found", "Sin partidos", "Aucun match")}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onResetDays}
          className="rounded-full border border-[var(--ink)]/20 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
        >
          {tr("Show whole week", "Ver toda la semana", "Voir toute la semaine")}
        </button>
        {!worldwide && (
          <button
            type="button"
            onClick={onExpandArea}
            className="rounded-full border border-[var(--ink)]/20 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
          >
            {tr("Search worldwide", "Buscar en el mundo", "Chercher partout")}
          </button>
        )}
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
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/20 bg-white p-8 text-center">
        <div className="text-[var(--ink)]/80 text-base font-semibold mb-1">
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
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/55 font-semibold mb-2 px-1">{label}</div>
            <ul className="space-y-2">
              {list.map((e) => {
                const isPending = pending === e.id;
                const filled = e.filled ?? 0;
                const time = new Date(e.starts_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
                return (
                  <li key={e.id} className="rounded-2xl bg-white border border-[var(--ink)]/10 p-3.5 flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-14 shrink-0">
                      <span className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 leading-none">
                        <Clock className="w-3 h-3 inline mb-0.5" />
                      </span>
                      <span className="text-lg font-bold text-[var(--ink)] leading-none mt-1">{time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {e.iAmHost ? (
                          <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full bg-[var(--plum)] text-[var(--paper)]">
                            {tr("Host", "Anfitrión", "Hôte")}
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full bg-[var(--ink)]/10 text-[var(--ink)]">
                            {tr("Joined", "Unido", "Rejoint")}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink)]/60">
                          <Users className="w-3 h-3" />{filled}/4
                        </span>
                      </div>
                      <div className="text-sm text-[var(--ink)] truncate">
                        {e.club_name || tr("Match", "Partido", "Match")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {e.iAmHost ? (
                        <button type="button" onClick={() => onManage(e)} className="rounded-full bg-[var(--ink)] text-[var(--paper)] text-[10px] uppercase tracking-widest font-bold px-3 py-1.5">
                          {tr("Manage", "Gestionar", "Gérer")}
                        </button>
                      ) : (
                        <button type="button" onClick={() => onOpen(e.id)} className="rounded-full border border-[var(--ink)]/25 text-[var(--ink)] text-[10px] uppercase tracking-widest font-bold px-3 py-1.5">
                          {tr("Open", "Abrir", "Ouvrir")}
                        </button>
                      )}
                      {!e.iAmHost && (
                        <button type="button" disabled={isPending} onClick={() => onLeave(e)} className="rounded-full border border-red-400/50 text-red-500 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 disabled:opacity-50">
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
        className="w-full sm:max-w-md bg-[var(--paper)] border-t sm:border sm:rounded-2xl border-[var(--ink)]/15 p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--plum)]">
              {event.iAmHost ? tr("Your match", "Tu partido", "Ton match") : tr("You're in", "Estás dentro", "Vous êtes dedans")}
            </div>
            <div className="text-serif text-2xl tracking-tight text-[var(--ink)] mt-0.5">{when}</div>
            <div className="text-xs text-[var(--ink)]/70 mt-1 truncate">
              {event.club_name || tr("No club yet", "Sin club aún", "Pas de club")}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ink)]/60 hover:text-[var(--ink)] shrink-0 p-1">
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
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/55 mb-1.5 flex items-center gap-1.5">
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
            <p className="text-[10px] text-[var(--ink)]/50 mt-1.5 leading-relaxed">
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
    <div className="rounded-xl border border-[var(--ink)]/10 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--ink)]/10 text-[10px] uppercase tracking-widest text-[var(--ink)]/60">
        {tr("Match chat", "Chat del partido", "Chat du match")}
      </div>
      <div ref={scrollRef} className="max-h-60 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-xs text-[var(--ink)]/50 py-4">
            {tr("No messages yet. Say hi 👋", "Aún no hay mensajes. Saluda 👋", "Pas encore de messages. Dis bonjour 👋")}
          </div>
        )}
        {messages.map((m: any) => {
          const mine = myId ? m.sender_profile_id === myId : false;
          const name = m.sender?.first_name ?? "";
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-[var(--ink)] text-[var(--paper)] rounded-br-sm" : "bg-[var(--paper-2)]/70 text-[var(--ink)] rounded-bl-sm border border-[var(--ink)]/10"}`}>
                {!mine && name && <div className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">{name}</div>}
                <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                <div className={`text-[9px] mt-0.5 ${mine ? "text-[var(--paper)]/60" : "text-[var(--ink)]/50"}`}>{time}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
        className="flex gap-2 p-2 border-t border-[var(--ink)]/10 bg-[var(--paper-2)]/40"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr("Message the group…", "Escribe al grupo…", "Message au groupe…")}
          className="flex-1 rounded-full border border-[var(--ink)]/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--ink)]/30"
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
