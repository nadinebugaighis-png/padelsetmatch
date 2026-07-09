import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listOpenEvents,
  quickCreateMatchEvent,
  joinMatchEvent,
  leaveMatchEvent,
  cancelMatchEvent,
  deleteMatchEvent,
  duplicateMatchEvent,
} from "@/lib/match-events.functions";
import { getMyProfile } from "@/lib/app.functions";
import { MapPin, Search, X, Pencil, Trash2, UserPlus, Clock, Users } from "lucide-react";
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
  level_min?: string;
  level_max?: string;
  note?: string | null;
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
  const leave = useServerFn(leaveMatchEvent);
  const cancel = useServerFn(cancelMatchEvent);
  const deleteFn = useServerFn(deleteMatchEvent);
  const duplicate = useServerFn(duplicateMatchEvent);
  const getProfile = useServerFn(getMyProfile);

  const [worldwide, setWorldwide] = useState(false);
  const [search, setSearch] = useState("");
  const myAreasOnly = !worldwide;

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
    retry: false,
  });
  void profileQ;

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
  const [slotSheet, setSlotSheet] = useState<{ startsAt: string; events: EventLite[] } | null>(null);
  const [myMatchSheet, setMyMatchSheet] = useState<EventLite | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const nowH = new Date().getHours();
    const targetH = Math.max(7, Math.min(21, nowH));
    const rowIdx = HOURS.indexOf(targetH);
    if (rowIdx > 0) scrollRef.current.scrollTop = rowIdx * 56 - 40;
  }, []);

  function refetch() {
    qc.invalidateQueries({ queryKey: ["open-events"] });
  }

  // ----- Actions with undo -----

  async function instantCreate(startsAt: Date) {
    const key = slotKey(startOfDay(startsAt), startsAt.getHours());
    setPending(key);
    try {
      const { id } = await quickCreate({ data: { starts_at: startsAt.toISOString() } });
      await refetch();
      toast.success(tr("You're marked as free", "Marcado como disponible", "Marqué comme disponible"), {
        duration: 12000,
        description: tr("Changed your mind? Tap Remove.", "¿Cambiaste de idea? Toca Quitar.", "Changé d'avis ? Touche Retirer."),
        action: {
          label: tr("Remove", "Quitar", "Retirer"),
          onClick: async () => {
            try {
              await deleteFn({ data: { id } });
              refetch();
              toast(tr("Removed", "Quitado", "Retiré"));
            } catch {/* ignore */}
          },
        },
        cancel: {
          label: tr("Details", "Detalles", "Détails"),
          onClick: () => navigate({ to: "/app/events/$eventId/edit", params: { eventId: id } }),
        },
      });
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

  async function instantJoin(e: EventLite) {
    setPending(e.id);
    try {
      await join({ data: { id: e.id } });
      await refetch();
      toast.success(tr("You're in!", "¡Estás dentro!", "C'est bon !"), {
        duration: 12000,
        description: tr("Joined by mistake? Tap Leave.", "¿Te uniste por error? Toca Salir.", "Rejoint par erreur ? Touche Quitter."),
        action: {
          label: tr("Leave", "Salir", "Quitter"),
          onClick: async () => {
            try {
              await leave({ data: { id: e.id } });
              refetch();
              toast(tr("You left", "Has salido", "Vous avez quitté"));
            } catch {/* ignore */}
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
        duration: 10000,
        action: {
          label: tr("Undo — rejoin", "Deshacer — volver", "Annuler — rejoindre"),

          onClick: async () => {
            try {
              await join({ data: { id: e.id } });
              refetch();
            } catch {/* ignore */}
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not leave", "No se pudo salir", "Impossible de quitter"));
    } finally {
      setPending(null);
    }
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
    } finally {
      setPending(null);
    }
  }

  async function hostExtend(e: EventLite, hoursAhead: number) {
    const target = new Date(e.starts_at);
    target.setHours(target.getHours() + hoursAhead, 0, 0, 0);
    setPending(e.id);
    try {
      const { id } = await duplicate({ data: { id: e.id, starts_at: target.toISOString() } });
      toast.success(tr("Copied to +" + hoursAhead + "h", "Copiado a +" + hoursAhead + "h", "Copié à +" + hoursAhead + "h"));
      await refetch();
      setMyMatchSheet(null);
      navigate({ to: "/app/events/$eventId", params: { eventId: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not copy", "No se pudo copiar", "Impossible de copier"));
    } finally {
      setPending(null);
    }
  }

  // ----- Cell tap router -----

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

    // Empty → instant create
    if (existing.length === 0) {
      if (searchLower) {
        toast.info(tr("Clear search to create a match here.", "Borra la búsqueda para crear aquí.", "Effacez la recherche pour créer ici."));
        return;
      }
      await instantCreate(startsAt);
      return;
    }

    // Multiple matches → picker
    if (existing.length > 1) {
      setSlotSheet({ startsAt: startsAt.toISOString(), events: existing });
      return;
    }

    const e = existing[0];
    const mine = e.iAmHost || e.iAmParticipant;

    // My host cell → management sheet
    if (e.iAmHost) {
      setMyMatchSheet(e);
      return;
    }
    // My participant cell → instant leave with undo
    if (mine) {
      await instantLeave(e);
      return;
    }
    // Full → show lineup + option to create another
    if ((e.filled ?? 0) >= 4) {
      setSlotSheet({ startsAt: startsAt.toISOString(), events: existing });
      return;
    }
    // Open slot, not mine → instant join with undo
    await instantJoin(e);
  }

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 py-6 sm:py-8 pb-28">
        <div className="flex items-start justify-between mb-1 gap-3">
          <div className="min-w-0">
            <h1 className="text-serif text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-none text-[var(--ink)]">
              {tr("PLAN", "PLANEA", "PLANIFIER")}
              <br />
              {tr("A MATCH", "UN PARTIDO", "UN MATCH")}
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink)]/60 mt-2 sm:mt-3">
              {tr(
                "Tap an empty hour to mark yourself free. Tap your match to manage it.",
                "Toca una hora libre para marcarte disponible. Toca tu partido para gestionarlo.",
                "Touche une heure libre pour être disponible. Touche ton match pour le gérer.",
              )}
            </p>
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
            {worldwide ? tr("World", "Mundo", "Monde") : tr("My areas", "Mis zonas", "Mes zones")}
          </button>
        </div>

        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/50 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("Search by name...", "Buscar por nombre...", "Rechercher par nom...")}
            className="w-full rounded-full bg-[var(--ink)]/[0.04] border border-[var(--ink)]/15 pl-9 pr-9 py-2 text-sm text-[var(--ink)] placeholder:italic placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--ink)]/40 focus:ring-1 focus:ring-[var(--ink)]/10"
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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 mb-3 text-[10px] uppercase tracking-widest text-[var(--ink)]/60">
          <LegendDots filled={0} label={tr("Free", "Libre", "Libre")} />
          <LegendDots filled={2} label={tr("Needs 2", "Faltan 2", "Manque 2")} />
          <LegendDots filled={3} label={tr("Needs 1", "Falta 1", "Manque 1")} accent />
          <LegendDots filled={4} label={tr("Full", "Completo", "Complet")} />
        </div>

        <div className="rounded-2xl border border-[var(--ink)]/10 overflow-hidden bg-white">
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
              <div className="sticky top-0 left-0 z-30 bg-[var(--paper)] border-b border-r border-[var(--ink)]/10 h-12" />
              {days.map((d, i) => {
                const label = formatDay(d, lang, 0, i, tr);
                const isToday = i === 0;
                return (
                  <div
                    key={i}
                    className={`sticky top-0 z-20 h-12 border-b border-[var(--ink)]/10 flex flex-col items-center justify-center bg-[var(--paper)] ${
                      isToday ? "text-[var(--plum)]" : "text-[var(--ink)]/80"
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-widest font-semibold leading-none">
                      {label.top}
                    </span>
                    <span className="text-[13px] font-bold leading-none mt-1">{label.bottom}</span>
                  </div>
                );
              })}

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

        {slotSheet && (
          <SlotSheet
            startsAt={slotSheet.startsAt}
            events={slotSheet.events}
            pending={pending}
            onClose={() => setSlotSheet(null)}
            onJoin={async (e) => { setSlotSheet(null); await instantJoin(e); }}
            onLeave={async (e) => { setSlotSheet(null); await instantLeave(e); }}

            onOpen={(id) => { setSlotSheet(null); navigate({ to: "/app/events/$eventId", params: { eventId: id } }); }}
            onStartAnother={() => {
              const d = new Date(slotSheet.startsAt);
              setSlotSheet(null);
              instantCreate(d);
            }}
          />
        )}

        {myMatchSheet && (
          <MyMatchSheet
            event={myMatchSheet}
            pending={pending}
            onClose={() => setMyMatchSheet(null)}
            onEdit={() => navigate({ to: "/app/events/$eventId/edit", params: { eventId: myMatchSheet.id } })}
            onInvite={() => navigate({ to: "/app/events/$eventId", params: { eventId: myMatchSheet.id } })}
            onOpen={() => navigate({ to: "/app/events/$eventId", params: { eventId: myMatchSheet.id } })}
            onCancel={() => hostCancel(myMatchSheet)}
            onExtend={(h) => hostExtend(myMatchSheet, h)}
          />
        )}

        {searchLower && (
          <SearchResults
            events={visibleEvents}
            search={search}
            onOpen={(id: string) => navigate({ to: "/app/events/$eventId", params: { eventId: id } })}
          />
        )}
      </div>
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
  const stripe = hour % 2 === 0 ? "bg-[var(--ink)]/[0.02]" : "";

  return (
    <>
      <div className={`sticky left-0 z-10 bg-[var(--paper)] border-r border-b border-[var(--ink)]/10 flex items-center justify-center text-[10px] uppercase tracking-widest font-semibold ${
        isCurrentHour ? "text-[var(--plum)]" : "text-[var(--ink)]/55"
      }`}>
        {String(hour).padStart(2, "0")}
      </div>
      {days.map((d, i) => {
        const key = slotKey(d, hour);
        const events = buckets.get(key) ?? [];
        const primary = events[0];
        const isPending = pending === key || (primary && pending === primary.id);
        const startsAt = new Date(d);
        startsAt.setHours(hour, 0, 0, 0);
        const past = startsAt.getTime() < Date.now() - 30 * 60 * 1000;
        const isNowCell = isCurrentHour && i === 0 && !past;
        const mine = events.some((ev) => ev.iAmHost || ev.iAmParticipant);
        const iHost = events.some((ev) => ev.iAmHost);
        return (
          <button
            key={i}
            type="button"
            disabled={!!isPending || past}
            onClick={() => onTap(d, hour)}
            className={`border-b border-r border-[var(--ink)]/5 flex items-center justify-center relative ${stripe} ${
              past ? "opacity-25 cursor-not-allowed" : "hover:bg-[var(--ink)]/5 active:bg-[var(--ink)]/8 transition-colors"
            } ${isNowCell ? "ring-1 ring-inset ring-[var(--plum)]/40" : ""}`}
            aria-label={`${primary ? "Open" : "Add"} ${hour}:00`}
          >
            {primary ? <CellPill e={primary} extra={events.length - 1} /> : (
              <span className="w-1 h-1 rounded-full bg-[var(--ink)]/20" />
            )}
            {mine && !isPending && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--plum)]" />
            )}
            {isPending && (
              <span className="absolute inset-0 flex items-center justify-center bg-[var(--ink)]/10">
                <span className="w-4 h-4 rounded-full border-2 border-[var(--plum)] border-t-transparent animate-spin" />
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
    return { wrap: "bg-[var(--ink)] text-[var(--paper)]", pip: "bg-[var(--paper)]", empty: "bg-[var(--paper)]/30" };
  }
  if (filled === 3) {
    return {
      wrap: `bg-[color-mix(in_oklab,var(--plum)_22%,transparent)] text-[var(--plum)] ring-1 ${mine ? "ring-[var(--ink)]" : "ring-[var(--plum)]/60"}`,
      pip: "bg-[var(--plum)]",
      empty: "bg-[var(--plum)]/25",
    };
  }
  if (filled >= 1) {
    return {
      wrap: `bg-[var(--ink)]/12 text-[var(--ink)] ${mine ? "ring-1 ring-[var(--plum)]" : ""}`,
      pip: "bg-[var(--ink)]",
      empty: "bg-[var(--ink)]/25",
    };
  }
  return { wrap: "bg-transparent text-[var(--ink)]/70", pip: "bg-[var(--ink)]/70", empty: "bg-[var(--ink)]/20" };
}

function SlotPips({ filled, pip, empty }: { filled: number; pip: string; empty: string }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`w-[5px] h-[5px] rounded-full ${i < filled ? pip : empty}`} />
      ))}
    </div>
  );
}

function LegendDots({ filled, label, accent }: { filled: number; label: string; accent?: boolean }) {
  const colors = slotColor(filled, false);
  return (
    <span className={`inline-flex items-center gap-1.5 ${accent ? "text-[var(--plum)]" : ""}`}>
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
    <div className={`flex flex-col items-center justify-center gap-[3px] px-1.5 py-1 rounded-lg leading-none ${c.wrap}`}>
      <SlotPips filled={filled} pip={c.pip} empty={c.empty} />
      <span className="text-[9px] font-bold tracking-wider">
        {filled >= 4 ? "4/4" : `${filled}/4`}
        {extra > 0 && <span className="opacity-70 ml-0.5">+{extra}</span>}
      </span>
    </div>
  );
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function Lineup({ e, tr }: { e: EventLite; tr: ReturnType<typeof useTr> }) {
  const filled = e.filled ?? 0;
  const slots = Array.from({ length: 4 }, (_, i) => e.participants?.[i] ?? null);
  return (
    <div className="flex items-center gap-2">
      {slots.map((p, i) => {
        const name = p?.profiles?.first_name;
        const photo = p?.profiles?.photo_url;
        const empty = i >= filled;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-full overflow-hidden border ${empty ? "border-dashed border-[var(--ink)]/25 bg-[var(--ink)]/[0.04]" : "border-[var(--ink)]/15 bg-[var(--ink)]/10"}`}>
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : null}
            </div>
            <span className="text-[10px] text-[var(--ink)]/70 truncate max-w-full">
              {empty ? tr("Open", "Libre", "Libre") : name ?? "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MyMatchSheet({
  event,
  pending,
  onClose,
  onEdit,
  onInvite,
  onOpen,
  onCancel,
  onExtend,
}: {
  event: EventLite;
  pending: string | null;
  onClose: () => void;
  onEdit: () => void;
  onInvite: () => void;
  onOpen: () => void;
  onCancel: () => void;
  onExtend: (h: number) => void;
}) {
  const tr = useTr();
  const busy = pending === event.id;
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
            <div className="text-serif text-2xl tracking-tight text-[var(--ink)] mt-0.5">{whenLabel(event.starts_at)}</div>
            <div className="text-xs text-[var(--ink)]/70 mt-1 truncate">
              {event.club_name || tr("No club yet", "Sin club aún", "Pas de club")}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ink)]/60 hover:text-[var(--ink)] shrink-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl border border-[var(--ink)]/10 bg-white p-3">
          <Lineup e={event} tr={tr} />
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/55 mt-2 text-center">
            {event.filled}/4 · {event.gender_rule === "mixed" ? tr("Mixed", "Mixto", "Mixte") : event.gender_rule === "men_only" ? tr("Men", "Hombres", "Hommes") : tr("Women", "Mujeres", "Femmes")}
            {event.level_min ? ` · ${event.level_min}${event.level_min !== event.level_max ? `–${event.level_max}` : ""}` : ""}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onInvite}
            disabled={busy}
            className="rounded-full border border-[var(--ink)]/25 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> {tr("Invite", "Invitar", "Inviter")}
          </button>
          <button
            onClick={onEdit}
            disabled={busy}
            className="rounded-full border border-[var(--ink)]/25 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> {tr("Edit", "Editar", "Éditer")}
          </button>
        </div>

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

        <button
          onClick={onOpen}
          className="w-full rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-widest font-bold py-3 inline-flex items-center justify-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> {tr("Open match page", "Ir al partido", "Voir le match")}
        </button>

        {event.iAmHost && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full rounded-full border border-red-400/50 text-red-500 text-[11px] uppercase tracking-widest font-bold py-2.5 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {(event.filled ?? 0) <= 1
              ? tr("Delete match", "Eliminar partido", "Supprimer")
              : tr("Cancel match", "Cancelar partido", "Annuler le match")}
          </button>
        )}
      </div>
    </div>
  );
}

function SearchResults({
  events,
  search,
  onOpen,
}: {
  events: EventLite[];
  search: string;
  onOpen: (id: string) => void;
}) {
  const tr = useTr();
  const grouped = useMemo(() => {
    const map = new Map<string, EventLite[]>();
    for (const e of events) {
      const day = startOfDay(new Date(e.starts_at)).toISOString();
      const arr = map.get(day) ?? [];
      arr.push(e);
      map.set(day, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const searchedName = search.trim();

  return (
    <div className="mt-6 space-y-4">
      <div className="text-xs uppercase tracking-widest text-[var(--ink)]/60">
        {events.length}{" "}
        {events.length === 1 ? tr("match", "partido", "match") : tr("matches", "partidos", "matchs")}{" "}
        {tr("for", "para", "pour")} “{searchedName}”
      </div>
      {grouped.map(([dayIso, list]) => {
        const day = new Date(dayIso);
        const dayLabel = day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        return (
          <div key={dayIso}>
            <div className="text-[11px] uppercase tracking-widest text-[var(--plum)] mb-2">{dayLabel}</div>
            <ul className="space-y-2">
              {list.map((e) => {
                const start = new Date(e.starts_at);
                const time = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(e.id)}
                      className="w-full text-left rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-3 flex items-center gap-3 hover:bg-[var(--ink)]/[0.05]"
                    >
                      <div className="flex flex-col items-center justify-center w-12 shrink-0">
                        <span className="text-serif text-lg leading-none text-[var(--ink)]">{time}</span>
                        <span className="text-[9px] uppercase tracking-widest text-[var(--ink)]/50">{e.filled}/4</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--ink)] font-semibold truncate">{e.club_name || tr("Location TBD", "Ubicación por definir", "Lieu à définir")}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/55 mt-0.5">
                          {e.gender_rule === "mixed" ? tr("Mixed", "Mixto", "Mixte") : e.gender_rule === "men_only" ? tr("Men", "Hombres", "Hommes") : tr("Women", "Mujeres", "Femmes")}
                          {e.iAmHost && ` · ${tr("You host", "Tu partido", "Toi")}`}
                        </div>
                      </div>
                      <span className="text-[var(--ink)]/50 text-lg">→</span>
                    </button>
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

function SlotSheet({
  startsAt,
  events,
  pending,
  onClose,
  onJoin,
  onLeave,
  onOpen,
  onStartAnother,
}: {
  startsAt: string;
  events: EventLite[];
  pending: string | null;
  onClose: () => void;
  onJoin: (e: EventLite) => void;
  onLeave: (e: EventLite) => void;
  onOpen: (id: string) => void;
  onStartAnother: () => void;

}) {
  const tr = useTr();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--ink)]/40" onClick={onClose}>
      <div
        onClick={(ev) => ev.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--paper)] border-t sm:border sm:rounded-2xl border-[var(--ink)]/15 p-5 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/60">
              {tr("Matches at", "Partidos a las", "Matchs à")}
            </div>
            <div className="text-serif text-2xl tracking-tight text-[var(--ink)] mt-1">{whenLabel(startsAt)}</div>
          </div>
          <button onClick={onClose} className="text-[var(--ink)]/60 hover:text-[var(--ink)] p-1"><X className="w-5 h-5" /></button>
        </div>

        <ul className="space-y-3">
          {events.map((e) => {
            const mine = e.iAmHost || e.iAmParticipant;
            const full = e.filled >= 4;
            const canJoin = !mine && !full && e.status === "open";
            const isPending = pending === e.id;
            return (
              <li key={e.id} className="rounded-xl border border-[var(--ink)]/10 bg-white p-3 space-y-2">
                <button type="button" onClick={() => onOpen(e.id)} className="w-full text-left">
                  <div className="text-sm text-[var(--ink)] font-semibold truncate">
                    {e.club_name || tr("Location TBD", "Ubicación por definir", "Lieu à définir")}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/55 mt-0.5">
                    {e.filled}/4 · {e.gender_rule === "mixed" ? tr("Mixed", "Mixto", "Mixte") : e.gender_rule === "men_only" ? tr("Men", "Hombres", "Hommes") : tr("Women", "Mujeres", "Femmes")}
                    {mine && ` · ${tr("You're in", "Estás dentro", "Vous êtes dedans")}`}
                  </div>
                </button>
                <Lineup e={e} tr={tr} />
                {canJoin ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onJoin(e)}
                    className="w-full rounded-full bg-[var(--plum)] text-white text-[11px] uppercase tracking-widest font-bold py-2.5 disabled:opacity-50"
                  >
                    {isPending ? tr("Joining…", "Uniéndose…", "…") : tr("Join this match", "Unirme a este partido", "Rejoindre")}
                  </button>
                ) : mine && !e.iAmHost ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(e.id)}
                      className="rounded-full border border-[var(--ink)]/25 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold py-2.5"
                    >
                      {tr("Open", "Abrir", "Ouvrir")}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onLeave(e)}
                      className="rounded-full border border-red-400/50 text-red-500 text-[11px] uppercase tracking-widest font-bold py-2.5 disabled:opacity-50"
                    >
                      {isPending ? "…" : tr("Leave", "Salir", "Quitter")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(e.id)}
                    className="w-full rounded-full border border-[var(--ink)]/25 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold py-2.5"
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
          className="w-full rounded-full border border-dashed border-[var(--plum)]/60 text-[var(--plum)] text-[11px] uppercase tracking-widest font-bold py-2.5 disabled:opacity-50"
        >
          + {tr("Start another match at this time", "Convocar otro partido a esta hora", "Lancer un autre match à cette heure")}
        </button>
      </div>
    </div>
  );
}
