import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOpenEvents, quickCreateMatchEvent, joinMatchEvent } from "@/lib/match-events.functions";
import { getMyProfile } from "@/lib/app.functions";
import { MapPin, Settings2, Search, X } from "lucide-react";
import { RacketIcon } from "@/components/RacketIcon";


import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/events/")({
  component: EventsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-[var(--cream)]/70">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-center text-[var(--cream)]/70">—</div>,
});

const HOURS = Array.from({ length: 17 }, (_, i) => 7 + i); // 07..23
const DAY_COUNT = 14;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function slotKey(date: Date, hour: number) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${hour}`;
}

function formatDay(d: Date, lang: string, todayIdx: number, i: number, tr: ReturnType<typeof useTr>) {
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : undefined;
  const weekday = d.toLocaleDateString(locale, { weekday: "short" }).toUpperCase();
  const day = d.getDate();
  const label = i === todayIdx ? tr("TODAY", "HOY", "AUJOURD'HUI") : weekday;
  return { top: label, bottom: String(day) };
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
  gender_rule: "mixed" | "men_only" | "women_only";
  host?: { first_name?: string } | null;
  participants?: Array<{ profile_id?: string; profiles?: { first_name?: string; photo_url?: string | null } | null } | null>;
};

function EventsPage() {
  const navigate = useNavigate();
  const tr = useTr();
  const { lang } = useI18n();
  const qc = useQueryClient();

  const list = useServerFn(listOpenEvents);
  const quickCreate = useServerFn(quickCreateMatchEvent);
  const join = useServerFn(joinMatchEvent);
  const getProfile = useServerFn(getMyProfile);

  const [worldwide, setWorldwide] = useState(false);
  const [search, setSearch] = useState("");
  const myAreasOnly = !worldwide;

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
    retry: false,
  });

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

  const searchLower = search.trim().toLowerCase();

  function eventMatchesName(e: EventLite) {
    if (!searchLower) return true;
    const hostName = e.host?.first_name ?? "";
    if (hostName.toLowerCase().includes(searchLower)) return true;
    return e.participants?.some((p) => p?.profiles?.first_name?.toLowerCase().includes(searchLower)) ?? false;
  }

  const visibleEvents = useMemo(
    () => ((eventsQ.data?.events ?? []) as EventLite[]).filter(eventMatchesName),
    [eventsQ.data, searchLower],
  );

  // Bucket events by (day-hour). When searching, only show matching events.
  const buckets = useMemo(() => {
    const map = new Map<string, EventLite[]>();
    for (const e of visibleEvents) {
      const d = new Date(e.starts_at);
      const key = slotKey(startOfDay(d), d.getHours());
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [visibleEvents]);

  const [pending, setPending] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ eventId: string; startsAt: string } | null>(null);
  const [slotSheet, setSlotSheet] = useState<{ startsAt: string; events: EventLite[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to a reasonable morning hour on first load
  useEffect(() => {
    if (!scrollRef.current) return;
    const nowH = new Date().getHours();
    const targetH = Math.max(7, Math.min(21, nowH));
    const rowIdx = HOURS.indexOf(targetH);
    if (rowIdx > 0) scrollRef.current.scrollTop = rowIdx * 56 - 40;
  }, []);

  async function quickCreateAt(startsAt: Date) {
    const key = slotKey(startOfDay(startsAt), startsAt.getHours());
    setPending(key);
    try {
      const { id } = await quickCreate({ data: { starts_at: startsAt.toISOString() } });
      await qc.invalidateQueries({ queryKey: ["open-events"] });
      setSlotSheet(null);
      setSheet({ eventId: id, startsAt: startsAt.toISOString() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr("Could not create match", "No se pudo crear el partido", "Impossible de créer le match");
      toast.error(msg);
      if (msg.toLowerCase().includes("level") || msg.toLowerCase().includes("name")) {
        navigate({ to: "/app/onboarding" });
      }
    } finally {
      setPending(null);
    }
  }

  async function joinEvent(id: string) {
    setPending(id);
    try {
      await join({ data: { id } });
      toast.success(tr("You're in!", "¡Estás dentro!", "C'est bon !"));
      await qc.invalidateQueries({ queryKey: ["open-events"] });
      setSlotSheet(null);
      navigate({ to: "/app/events/$eventId", params: { eventId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not join", "No se pudo unir", "Impossible de rejoindre"));
    } finally {
      setPending(null);
    }
  }

  async function handleCellTap(date: Date, hour: number) {
    if (pending) return;
    const startsAt = new Date(date);
    startsAt.setHours(hour, 0, 0, 0);
    if (startsAt.getTime() < Date.now() - 30 * 60 * 1000) {
      toast.info(tr("That slot has passed.", "Ese hueco ya ha pasado.", "Ce créneau est passé."));
      return;
    }
    const key = slotKey(date, hour);
    const existing = buckets.get(key) ?? [];
    if (existing.length === 0) {
      await quickCreateAt(startsAt);
      return;
    }
    // Show picker of all matches at this hour + option to start another.
    setSlotSheet({ startsAt: startsAt.toISOString(), events: existing });
  }

  return (
    <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 py-6 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between mb-1 gap-3">
        <div className="min-w-0">
          <h1 className="text-display text-3xl sm:text-4xl tracking-wider leading-none">
            {tr("PLAN", "PLANEA", "PLANIFIER")}
            <br />
            {tr("A MATCH", "UN PARTIDO", "UN MATCH")}
          </h1>
          <p className="text-sm text-[var(--cream)]/60 mt-2">
            {tr(
              "Tap an hour you're free. Others join. Done.",
              "Toca una hora libre. Otros se unen. Listo.",
              "Touche une heure libre. Les autres rejoignent.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWorldwide((v) => !v)}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-widest ${
            worldwide
              ? "border-[var(--ball)] text-[var(--ball)]"
              : "border-[var(--cream)]/25 text-[var(--cream)]/80"
          }`}
          title={tr("Toggle world / my areas", "Alternar mundo / mis zonas", "Basculer monde / mes zones")}
        >
          <MapPin className="w-3 h-3" />
          {worldwide ? tr("World", "Mundo", "Monde") : tr("My areas", "Mis zonas", "Mes zones")}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 mb-3 text-[10px] uppercase tracking-widest text-[var(--cream)]/60">
        <LegendDots filled={0} label={tr("Free", "Libre", "Libre")} />
        <LegendDots filled={2} label={tr("Needs 2", "Faltan 2", "Manque 2")} />
        <LegendDots filled={3} label={tr("Needs 1", "Falta 1", "Manque 1")} accent />
        <LegendDots filled={4} label={tr("Full", "Completo", "Complet")} />
        <Link
          to="/app/events/new"
          className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--cream)]/70 hover:text-[var(--cream)]"
        >
          <Settings2 className="w-3 h-3" /> {tr("Advanced", "Avanzado", "Avancé")}
        </Link>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-[var(--cream)]/10 overflow-hidden bg-black/20">
        <div
          ref={scrollRef}
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 260px)" }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `44px repeat(${DAY_COUNT}, 68px)`,
              gridAutoRows: "56px",
            }}
          >
            {/* Corner */}
            <div className="sticky top-0 left-0 z-30 bg-[var(--court-deep)] border-b border-r border-[var(--cream)]/10 h-12" />
            {/* Day headers */}
            {days.map((d, i) => {
              const label = formatDay(d, lang, 0, i, tr);
              const isToday = i === 0;
              return (
                <div
                  key={i}
                  className={`sticky top-0 z-20 h-12 border-b border-[var(--cream)]/10 flex flex-col items-center justify-center bg-[var(--court-deep)] ${
                    isToday ? "text-[var(--ball)]" : "text-[var(--cream)]/80"
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-widest font-semibold leading-none">
                    {label.top}
                  </span>
                  <span className="text-[13px] font-bold leading-none mt-1">{label.bottom}</span>
                </div>
              );
            })}

            {/* Rows */}
            {HOURS.map((h) => (
              <RowCells
                key={h}
                hour={h}
                days={days}
                buckets={buckets}
                pending={pending}
                onTap={handleCellTap}
                tr={tr}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slot picker (multiple matches at the same hour) */}
      {slotSheet && (
        <SlotSheet
          startsAt={slotSheet.startsAt}
          events={slotSheet.events}
          pending={pending}
          onClose={() => setSlotSheet(null)}
          onJoin={joinEvent}
          onOpen={(id) => {
            setSlotSheet(null);
            navigate({ to: "/app/events/$eventId", params: { eventId: id } });
          }}
          onStartAnother={() => quickCreateAt(new Date(slotSheet.startsAt))}
        />
      )}

      {/* Quick-create follow-up sheet */}
      {sheet && (
        <QuickSheet
          eventId={sheet.eventId}
          startsAt={sheet.startsAt}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function RowCells({
  hour,
  days,
  buckets,
  pending,
  onTap,
  tr,
}: {
  hour: number;
  days: Date[];
  buckets: Map<string, EventLite[]>;
  pending: string | null;
  onTap: (d: Date, h: number) => void;
  tr: ReturnType<typeof useTr>;
}) {
  const nowH = new Date().getHours();
  const isCurrentHour = hour === nowH;
  const stripe = hour % 2 === 0 ? "bg-[var(--cream)]/[0.02]" : "";
  return (
    <>
      <div className={`sticky left-0 z-10 bg-[var(--court-deep)] border-r border-b border-[var(--cream)]/10 flex items-center justify-center text-[10px] uppercase tracking-widest font-semibold ${
        isCurrentHour ? "text-[var(--ball)]" : "text-[var(--cream)]/55"
      }`}>
        {String(hour).padStart(2, "0")}
      </div>
      {days.map((d, i) => {
        const key = slotKey(d, hour);
        const events = buckets.get(key) ?? [];
        const primary = events[0];
        const isPending = pending === key;
        const startsAt = new Date(d);
        startsAt.setHours(hour, 0, 0, 0);
        const past = startsAt.getTime() < Date.now() - 30 * 60 * 1000;
        const isNowCell = isCurrentHour && i === 0 && !past;
        return (
          <button
            key={i}
            type="button"
            disabled={isPending || past}
            onClick={() => onTap(d, hour)}
            className={`border-b border-r border-[var(--cream)]/5 flex items-center justify-center relative ${stripe} ${
              past
                ? "opacity-25 cursor-not-allowed"
                : "hover:bg-[var(--cream)]/8 active:bg-[var(--cream)]/12 transition-colors"
            } ${isNowCell ? "ring-1 ring-inset ring-[var(--ball)]/40" : ""}`}
            aria-label={tr(
              `${primary ? "Open" : "Add"} ${hour}:00 ${d.toDateString()}`,
              `${primary ? "Abrir" : "Añadir"} ${hour}:00`,
              `${primary ? "Ouvrir" : "Ajouter"} ${hour}:00`,
            )}
          >
            {primary ? <CellPill e={primary} extra={events.length - 1} /> : (
              <span className="w-1 h-1 rounded-full bg-[var(--cream)]/20" />
            )}
            {isPending && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="w-4 h-4 rounded-full border-2 border-[var(--ball)] border-t-transparent animate-spin" />
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function slotColor(filled: number, mine: boolean) {
  if (filled >= 4) {
    return {
      wrap: "bg-[var(--ball)] text-[var(--court-deep)]",
      pip: "bg-[var(--court-deep)]",
      empty: "bg-[var(--court-deep)]/30",
    };
  }
  if (filled === 3) {
    // Almost full — warm accent so it pops
    return {
      wrap: `bg-[color-mix(in_oklab,var(--ball)_22%,transparent)] text-[var(--ball)] ring-1 ${mine ? "ring-[var(--cream)]" : "ring-[var(--ball)]/60"}`,
      pip: "bg-[var(--ball)]",
      empty: "bg-[var(--ball)]/25",
    };
  }
  if (filled >= 1) {
    return {
      wrap: `bg-[var(--cream)]/12 text-[var(--cream)] ${mine ? "ring-1 ring-[var(--ball)]" : ""}`,
      pip: "bg-[var(--cream)]",
      empty: "bg-[var(--cream)]/25",
    };
  }
  return {
    wrap: "bg-transparent text-[var(--cream)]/70",
    pip: "bg-[var(--cream)]/70",
    empty: "bg-[var(--cream)]/20",
  };
}

function SlotPips({ filled, pip, empty }: { filled: number; pip: string; empty: string }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[5px] h-[5px] rounded-full ${i < filled ? pip : empty}`}
        />
      ))}
    </div>
  );
}

function LegendDots({ filled, label, accent }: { filled: number; label: string; accent?: boolean }) {
  const colors = slotColor(filled, false);
  return (
    <span className={`inline-flex items-center gap-1.5 ${accent ? "text-[var(--ball)]" : ""}`}>
      <SlotPips filled={filled} pip={colors.pip} empty={colors.empty} />
      {label}
    </span>
  );
}

function CellPill({ e, extra }: { e: EventLite; extra: number }) {
  const filled = e.filled ?? 0;
  const mine = e.iAmHost || e.iAmParticipant;
  const c = slotColor(filled, mine);
  return (
    <div
      className={`flex flex-col items-center justify-center gap-[3px] px-1.5 py-1 rounded-lg leading-none ${c.wrap}`}
    >
      <SlotPips filled={filled} pip={c.pip} empty={c.empty} />
      <span className="text-[9px] font-bold tracking-wider">
        {filled >= 4 ? "4/4" : `${filled}/4`}
        {extra > 0 && <span className="opacity-70 ml-0.5">+{extra}</span>}
      </span>
    </div>
  );
}


function QuickSheet({
  eventId,
  startsAt,
  onClose,
}: {
  eventId: string;
  startsAt: string;
  onClose: () => void;
}) {
  const tr = useTr();
  const navigate = useNavigate();
  const when = new Date(startsAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(ev) => ev.stopPropagation()}
        className="w-full sm:max-w-sm bg-[var(--court-deep)] border-t sm:border sm:rounded-2xl border-[var(--cream)]/15 p-5 space-y-4"
      >
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">
            {tr("Match called", "Partido convocado", "Match lancé")}
          </div>
          <div className="text-display text-2xl tracking-wider text-[var(--cream)] mt-1">{when}</div>
          <p className="text-sm text-[var(--cream)]/70 mt-2">
            {tr(
              "You're in. Add a club or invite players — or leave it and let others join.",
              "Estás dentro. Añade club o invita jugadores, o déjalo y que otros se unan.",
              "C'est bon. Ajoute un club ou invite des joueurs — ou laisse d'autres rejoindre.",
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate({ to: "/app/events/$eventId/edit", params: { eventId } })}
            className="rounded-full border border-[var(--cream)]/25 text-[var(--cream)] text-[11px] uppercase tracking-widest font-bold py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" /> {tr("Add club", "Añadir club", "Ajouter club")}
          </button>
          <button
            onClick={() => navigate({ to: "/app/events/$eventId", params: { eventId } })}
            className="rounded-full border border-[var(--cream)]/25 text-[var(--cream)] text-[11px] uppercase tracking-widest font-bold py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            <RacketIcon className="w-3.5 h-3.5" /> {tr("Invite", "Invitar", "Inviter")}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] uppercase tracking-widest font-bold py-2.5"
        >
          {tr("Done", "Listo", "Terminé")}
        </button>
        <button
          onClick={() => navigate({ to: "/app/events/$eventId", params: { eventId } })}
          className="w-full text-[10px] uppercase tracking-widest text-[var(--cream)]/60"
        >
          {tr("Open match", "Ir al partido", "Voir le match")} →
        </button>
      </div>
    </div>
  );
}

function SlotSheet({
  startsAt,
  events,
  pending,
  onClose,
  onJoin,
  onOpen,
  onStartAnother,
}: {
  startsAt: string;
  events: EventLite[];
  pending: string | null;
  onClose: () => void;
  onJoin: (id: string) => void;
  onOpen: (id: string) => void;
  onStartAnother: () => void;
}) {
  const tr = useTr();
  const when = new Date(startsAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(ev) => ev.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--court-deep)] border-t sm:border sm:rounded-2xl border-[var(--cream)]/15 p-5 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">
            {tr("Matches at", "Partidos a las", "Matchs à")}
          </div>
          <div className="text-display text-2xl tracking-wider text-[var(--cream)] mt-1">{when}</div>
          <p className="text-xs text-[var(--cream)]/60 mt-1">
            {events.length}{" "}
            {events.length === 1
              ? tr("match", "partido", "match")
              : tr("matches", "partidos", "matchs")}
          </p>
        </div>

        <ul className="space-y-2">
          {events.map((e) => {
            const mine = e.iAmHost || e.iAmParticipant;
            const full = e.filled >= 4;
            const canJoin = !mine && !full && e.status === "open";
            const isPending = pending === e.id;
            return (
              <li
                key={e.id}
                className="rounded-xl border border-[var(--cream)]/12 bg-[var(--cream)]/[0.03] p-3 flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => onOpen(e.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm text-[var(--cream)] font-semibold truncate">
                    {e.club_name || tr("Location TBD", "Ubicación por definir", "Lieu à définir")}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/55 mt-0.5">
                    {e.filled}/4 · {e.gender_rule === "mixed"
                      ? tr("Mixed", "Mixto", "Mixte")
                      : e.gender_rule === "men_only"
                        ? tr("Men", "Hombres", "Hommes")
                        : tr("Women", "Mujeres", "Femmes")}
                    {mine && ` · ${tr("You're in", "Estás dentro", "Vous êtes dedans")}`}
                  </div>
                </button>
                {canJoin ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onJoin(e.id)}
                    className="shrink-0 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[10px] uppercase tracking-widest font-bold px-3 py-2 disabled:opacity-50"
                  >
                    {isPending
                      ? tr("Joining…", "Uniéndose…", "…")
                      : tr("Join", "Unirme", "Rejoindre")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(e.id)}
                    className="shrink-0 rounded-full border border-[var(--cream)]/25 text-[var(--cream)] text-[10px] uppercase tracking-widest font-bold px-3 py-2"
                  >
                    {tr("Open", "Abrir", "Ouvrir")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onStartAnother}
          disabled={!!pending}
          className="w-full rounded-full border border-dashed border-[var(--ball)]/60 text-[var(--ball)] text-[11px] uppercase tracking-widest font-bold py-2.5 disabled:opacity-50"
        >
          + {tr("Start another match at this time", "Convocar otro partido a esta hora", "Lancer un autre match à cette heure")}
        </button>

        <button
          onClick={onClose}
          className="w-full text-[10px] uppercase tracking-widest text-[var(--cream)]/60"
        >
          {tr("Close", "Cerrar", "Fermer")}
        </button>
      </div>
    </div>
  );
}
