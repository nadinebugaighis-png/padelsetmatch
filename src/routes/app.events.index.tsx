import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listOpenEvents } from "@/lib/match-events.functions";
import { getMyProfile } from "@/lib/app.functions";
import { CalendarDays, Users, Plus, CalendarPlus, SlidersHorizontal, MessageCircle, Pencil } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/events/")({
  component: EventsPage,
  errorComponent: ({ error }) => <div className="p-6 text-center text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-center text-[var(--cream)]/70">—</div>,
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayLabels(base: Date, i: number, es: boolean = false) {
  const d = new Date(base);
  d.setDate(base.getDate() + i);
  const locale = es ? "es" : undefined;
  const weekday = d.toLocaleDateString(locale, { weekday: "short" }).toUpperCase();
  const month = d.toLocaleDateString(locale, { month: "short" }).toUpperCase();
  const day = d.getDate();
  const top = i === 0 ? (es ? "HOY" : "TODAY") : i === 1 ? (es ? "MAÑANA" : "TOMORROW") : weekday;
  const bottom = `${month} ${day}`;
  return { top, bottom, date: d };
}


function GenderBadge({ rule }: { rule: "mixed" | "men_only" | "women_only" }) {
  const tr = useTr();
  const label = rule === "mixed" ? tr("MIXED", "MIXTO") : rule === "men_only" ? tr("MEN", "HOMBRES") : tr("WOMEN", "MUJERES");
  return (
    <div className="flex flex-col items-center justify-center text-[var(--ball)]">
      <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
    </div>
  );
}

function EventsPage() {
  const navigate = useNavigate();
  const tr = useTr();
  const { lang } = useI18n();
  const es = lang === "es";

  const list = useServerFn(listOpenEvents);
  const getProfile = useServerFn(getMyProfile);
  const [worldwide, setWorldwide] = useState(false);
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
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => dayLabels(today, i, es)), [today.getTime(), es]);
  const [selectedIdx, setSelectedIdx] = useState<number | "all" | "custom">("all");
  const [customDate, setCustomDate] = useState<string>("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"any" | "mixed" | "women_only" | "men_only">("any");
  const [levelFilter, setLevelFilter] = useState<"any" | "beginner" | "intermediate" | "advanced">("any");
  const [cityFilter, setCityFilter] = useState("");

  const activeFilterCount =
    (genderFilter !== "any" ? 1 : 0) +
    (levelFilter !== "any" ? 1 : 0) +
    (worldwide ? 1 : 0) +
    (cityFilter.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const arr = [...(eventsQ.data?.events ?? [])];
    arr.sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
    let day: Date | null = null;
    if (selectedIdx === "custom" && customDate) {
      const [y, m, dd] = customDate.split("-").map(Number);
      day = new Date(y, m - 1, dd);
    } else if (typeof selectedIdx === "number") {
      day = days[selectedIdx].date;
    }
    const next = day ? new Date(day) : null;
    if (next && day) next.setDate(day.getDate() + 1);

    const cityQ = cityFilter.trim().toLowerCase();
    const now = new Date();
    return arr.filter((e: any) => {
      const t = new Date(e.starts_at);
      if (day && next) {
        if (!(t >= day && t < next)) return false;
      } else if (selectedIdx === "all") {
        if (t < now) return false;
      }
      if (genderFilter !== "any" && e.gender_rule !== genderFilter) return false;
      if (levelFilter !== "any") {
        const lvls = [e.level_min, e.level_max].filter(Boolean).map((x: string) => x.toLowerCase());
        if (!lvls.some((l: string) => l.includes(levelFilter))) return false;
      }
      if (!myAreasOnly && cityQ) {
        const hay = `${e.city ?? ""} ${e.club_name ?? ""}`.toLowerCase();
        if (!hay.includes(cityQ)) return false;
      }
      if (openOnly) {
        const needs = e.needs ?? Math.max(0, 4 - (e.filled ?? 0));
        if (needs === 0 && !e.iAmHost) return false;
      }
      return true;
    });
  }, [eventsQ.data, selectedIdx, customDate, days, genderFilter, levelFilter, cityFilter, openOnly, myAreasOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of filtered) {
      const d = new Date(e.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, date: new Date(items[0].starts_at), items }));
  }, [filtered]);

  const renderCard = (e: any) => {
    const needs = e.needs ?? Math.max(0, 4 - (e.filled ?? 0));
    const filled = e.filled ?? 0;
    const detailHref = { to: "/app/events/$eventId", params: { eventId: e.id } } as const;
    return (
      <Link
        key={e.id}
        {...detailHref}
        className="rounded-2xl border border-[var(--cream)]/10 bg-black/30 px-4 py-4 flex items-center gap-3"
        aria-label={tr(`Open match at ${e.club_name}`, `Abrir partido en ${e.club_name}`)}
      >
        {/* Time */}
        <div className="flex flex-col items-center w-14 shrink-0">
          <span className="text-display text-xl leading-none tracking-wider text-[var(--cream)]">{fmtTime(e.starts_at)}</span>
          <span className="text-[9px] uppercase tracking-widest text-[var(--cream)]/50 mt-1.5">
            {(() => {
              const t = new Date(e.starts_at);
              const diff = Math.round((startOfDay(t).getTime() - today.getTime()) / 86400000);
              if (diff === 0) return tr("TODAY", "HOY");
              if (diff === 1) return tr("TMRW", "MAÑ");
              return t.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
            })()}
          </span>
        </div>

        {/* Middle */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[var(--cream)] truncate leading-tight">{e.club_name}</div>
          <div className="text-[11px] text-[var(--cream)]/60 mt-0.5 truncate">
            {e.city ?? tr("Location", "Ubicación")}
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
            {needs === 0 ? tr("Full", "Completo") : `${needs} ${needs === 1 ? tr("player", "jugador") : tr("players", "jugadores")}\n${tr("needed", "faltan")}`.split("\n").map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>

        {/* Gender + Join */}
        <div className="flex items-center gap-2 shrink-0">
          <GenderBadge rule={e.gender_rule} />
          <div className="flex flex-col items-stretch gap-1.5">
            <span className="rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] uppercase tracking-widest font-bold px-4 py-2 text-center">
              {e.iAmHost ? tr("View", "Ver") : e.iAmParticipant ? tr("Chat", "Chat") : tr("Join", "Unirme")}
            </span>
            {(e.iAmHost || e.iAmParticipant) && (
              <span className="inline-flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest text-[var(--cream)]/55">
                {e.iAmHost ? <Pencil className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                {e.iAmHost ? tr("Edit", "Editar") : tr("Chat", "Chat")}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-display text-4xl tracking-wider leading-none">{tr("FIND", "BUSCA")}<br />{tr("MATCHES", "PARTIDOS")}</h1>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-widest ${
            filtersOpen || activeFilterCount > 0
              ? "border-[var(--ball)] text-[var(--ball)]"
              : "border-[var(--cream)]/25 text-[var(--cream)]"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> {tr("Filters", "Filtros")}
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[10px] font-bold px-1.5 min-w-[18px] text-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
      <p className="text-sm text-[var(--cream)]/60 mb-5">{tr("Pick a match. Join the game.", "Elige un partido. Únete al juego.")}</p>

      {filtersOpen && (
        <div className="mb-5 rounded-2xl border border-[var(--cream)]/15 bg-black/30 p-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">{tr("Gender", "Género")}</div>
            <div className="flex flex-wrap gap-2">
              {([
                ["any", tr("Any", "Cualquiera")],
                ["mixed", tr("Mixed", "Mixto")],
                ["women_only", tr("Women", "Mujeres")],
                ["men_only", tr("Men", "Hombres")],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setGenderFilter(v)}
                  className={`text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                    genderFilter === v
                      ? "border-[var(--ball)] text-[var(--ball)]"
                      : "border-[var(--cream)]/25 text-[var(--cream)]/80"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">{tr("Level", "Nivel")}</div>
            <div className="flex flex-wrap gap-2">
              {([
                ["any", tr("Any", "Cualquiera")],
                ["beginner", tr("Beginner", "Principiante")],
                ["intermediate", tr("Intermediate", "Intermedio")],
                ["advanced", tr("Advanced", "Avanzado")],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setLevelFilter(v)}
                  className={`text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                    levelFilter === v
                      ? "border-[var(--ball)] text-[var(--ball)]"
                      : "border-[var(--cream)]/25 text-[var(--cream)]/80"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[var(--cream)]/80">
            <input
              type="checkbox"
              checked={myAreasOnly}
              onChange={(e) => {
                const on = e.target.checked;
                setMyAreasOnly(on);
                if (on) setCityFilter("");
              }}
              className="accent-[var(--ball)]"
            />
            {tr("Only my areas", "Solo mis zonas")}
          </label>
          {!myAreasOnly && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">{tr("City or club", "Ciudad o club")}</div>
              <input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder={tr("e.g. Alcobendas", "p. ej. Alcobendas")}
                className="w-full rounded-full bg-black/40 border border-[var(--cream)]/20 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm px-4 py-2 outline-none focus:border-[var(--ball)]"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-[12px] text-[var(--cream)]/80">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
              className="accent-[var(--ball)]"
            />
            {tr("Only matches that still need players", "Solo partidos que buscan jugadores")}
          </label>
          <div className="flex justify-between pt-1">
            <button
              onClick={() => {
                setGenderFilter("any");
                setLevelFilter("any");
                setCityFilter("");
                setOpenOnly(false);
              }}
              className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> {tr("Clear", "Limpiar")}
            </button>
            <button
              onClick={() => setFiltersOpen(false)}
              className="rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
            >
              {tr("Show", "Mostrar")} {filtered.length}
            </button>
          </div>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto -mx-1 px-1 no-scrollbar">
        <button
          onClick={() => setSelectedIdx("all")}
          className={`shrink-0 rounded-full border px-3 py-2 text-center min-w-[64px] ${
            selectedIdx === "all"
              ? "border-[var(--ball)] text-[var(--ball)]"
              : "border-transparent text-[var(--cream)]/70"
          }`}
        >
          <div className="text-[10px] uppercase tracking-widest font-semibold leading-none">{tr("ALL", "TODOS")}</div>
          <div className="text-[10px] uppercase tracking-widest opacity-70 mt-1 leading-none">{tr("UPCOMING", "PRÓXIMOS")}</div>
        </button>
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
        <label
          className={`relative shrink-0 rounded-full border w-11 h-11 flex items-center justify-center cursor-pointer ${
            selectedIdx === "custom"
              ? "border-[var(--ball)] text-[var(--ball)]"
              : "border-[var(--cream)]/25 text-[var(--cream)]/70"
          }`}
          aria-label={tr("Pick a date", "Elegir fecha")}
        >
          <CalendarDays className="w-4 h-4" />
          <input
            type="date"
            value={customDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              const v = e.target.value;
              setCustomDate(v);
              setSelectedIdx(v ? "custom" : "all");
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      </div>


      {selectedIdx === "custom" && customDate && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ball)] text-[var(--ball)] text-[11px] uppercase tracking-widest px-3 py-1.5">
            {new Date(customDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            <button
              type="button"
              onClick={() => { setCustomDate(""); setSelectedIdx(0); }}
              aria-label={tr("Clear date", "Borrar fecha")}
              className="inline-flex"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* List */}
      {(eventsQ.isLoading || (myAreasOnly && profileQ.isLoading)) && <div className="text-center py-10 text-[var(--cream)]/60">{tr("Loading matches…", "Cargando partidos…")}</div>}
      {!eventsQ.isLoading && !(myAreasOnly && profileQ.isLoading) && filtered.length === 0 && (
        <div className="text-center py-10 border border-dashed border-[var(--cream)]/15 rounded-xl text-[var(--cream)]/70 text-sm space-y-3">
          {myAreasOnly && !profileQ.isLoading && !profileQ.data?.locations?.length ? (
            <>
              <p className="font-semibold">{tr("No areas selected", "Ninguna zona seleccionada")}</p>
              <p>{tr("Add the cities where you play in your profile to see matches near you.", "Añade en tu perfil las ciudades donde juegas para ver partidos cerca.")}</p>
              <Link
                to="/app/profile"
                className="inline-block rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
              >
                {tr("Go to profile →", "Ir al perfil →")}
              </Link>
            </>
          ) : myAreasOnly ? (
            <p>{tr("No upcoming matches in your areas.", "No hay partidos próximos en tus zonas.")}</p>
          ) : (
            <p>{selectedIdx === "all" ? tr("No upcoming matches yet.", "Aún no hay partidos próximos.") : tr("No open matches for this day.", "No hay partidos abiertos ese día.")}</p>
          )}
        </div>
      )}
      {selectedIdx === "all" ? (
        <div className="space-y-5">
          {grouped.map((g) => {
            const diff = Math.round((startOfDay(g.date).getTime() - today.getTime()) / 86400000);
            const label =
              diff === 0
                ? tr("TODAY", "HOY")
                : diff === 1
                ? tr("TOMORROW", "MAÑANA")
                : g.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
            return (
              <div key={g.key}>
                <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 font-semibold mb-2 px-1">
                  {label}
                </div>
                <div className="space-y-3">{g.items.map(renderCard)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">{filtered.map(renderCard)}</div>
      )}

      {/* Create match CTA */}
      <div className="mt-5 rounded-2xl border border-[var(--cream)]/15 bg-black/20 p-4 flex items-center gap-3">
        <CalendarPlus className="w-6 h-6 text-[var(--cream)]/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--cream)] font-semibold">{tr("Can't find the right match?", "¿No encuentras el partido ideal?")}</div>
          <div className="text-xs text-[var(--cream)]/60">{tr("Create your own and players will join you.", "Crea el tuyo y otros jugadores se unirán.")}</div>
        </div>
        <button
          onClick={() => navigate({ to: "/app/events/new" })}
          className="shrink-0 rounded-full border border-[var(--ball)] text-[var(--ball)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
        >
          {tr("Create match", "Crear partido")}
        </button>
      </div>

      {/* Floating + */}
      <button
        onClick={() => navigate({ to: "/app/events/new" })}
        className="fixed left-1/2 -translate-x-1/2 bottom-20 w-14 h-14 rounded-full bg-[var(--ball)] text-[var(--court-deep)] flex items-center justify-center shadow-xl z-30"
        aria-label={tr("Call a match", "Convocar un partido")}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}
