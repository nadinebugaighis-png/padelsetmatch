import { MapPin, Clock, Plus } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";

export type ProgrammeMatch = {
  starts_at: string;
  club_name?: string | null;
  club_address?: string | null;
  city?: string | null;
  level_min?: string | null;
  level_max?: string | null;
  gender_rule?: string | null;
  court_booked?: boolean | null;
  note?: string | null;
  filled?: number | null;
  participant_names?: string[] | null;
};

function whenParts(iso: string, locale?: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString(locale, { weekday: "short" }).replace(".", ""),
    day: d.toLocaleDateString(locale, { day: "numeric" }),
    month: d.toLocaleDateString(locale, { month: "short" }).replace(".", ""),
    time: d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Play-page style match card, reusable on public/guest pages. */
export function MatchProgrammeCard({
  match,
  actionLabel,
  onAction,
  disabled,
}: {
  match: ProgrammeMatch;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  const tr = useTr();
  const { lang } = useI18n();
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : undefined;

  const start = new Date(match.starts_at);
  const hour = start.getHours();
  const tod = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const toneBg =
    tod === "morning"
      ? "color-mix(in oklab, var(--grass) 26%, transparent)"
      : tod === "afternoon"
        ? "color-mix(in oklab, #E8B84B 30%, transparent)"
        : "color-mix(in oklab, var(--plum) 20%, transparent)";
  const parts = whenParts(match.starts_at, locale);
  const today = startOfDay(new Date());
  const dayMs = 24 * 60 * 60 * 1000;
  const isToday = start.getTime() >= today.getTime() && start.getTime() < today.getTime() + dayMs;
  const isTomorrow =
    start.getTime() >= today.getTime() + dayMs && start.getTime() < today.getTime() + 2 * dayMs;
  const dateBadge = isToday ? tr("Today", "Hoy", "Auj.") : isTomorrow ? tr("Tomorrow", "Mañana", "Demain") : null;

  const names = match.participant_names ?? [];
  const openSpots = Math.max(0, 4 - (match.filled ?? names.length));
  const genderLabel =
    match.gender_rule === "mixed"
      ? tr("Mixed", "Mixto", "Mixte")
      : match.gender_rule === "men_only"
        ? tr("Men only", "Solo hombres", "Hommes")
        : match.gender_rule === "women_only"
          ? tr("Women only", "Solo mujeres", "Femmes")
          : null;

  return (
    <div className="rounded-2xl bg-white overflow-hidden shadow-[0_1px_0_rgba(15,62,46,0.04),0_6px_18px_-12px_rgba(15,62,46,0.16)] border border-[var(--ink)]/10">
      <div className="flex">
        <div
          className="w-[86px] sm:w-[96px] shrink-0 flex flex-col items-center justify-center py-4 text-center"
          style={{ background: toneBg }}
        >
          <div className="text-serif text-[26px] sm:text-[28px] leading-none text-[var(--ink)]">{parts.time}</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink)]/85 font-semibold leading-none">
            {dateBadge ?? parts.weekday}
          </div>
          {!dateBadge && (
            <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ink)]/65 font-semibold leading-none">
              {parts.day} <span className="capitalize">{parts.month}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[var(--ink)] leading-tight">
                {match.club_name || tr("Location TBD", "Ubicación por definir", "Lieu à définir")}
              </h2>
              <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--ink)]/60 min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{match.club_address || match.city || "—"}</span>
              </div>
            </div>
            <span
              className={`text-[10px] uppercase tracking-[0.16em] rounded-full px-2 py-1 font-semibold whitespace-nowrap ${
                openSpots === 0 ? "bg-[var(--ink)]/8 text-[var(--ink)]/55" : "bg-[var(--plum)]/12 text-[var(--plum)]"
              }`}
            >
              {openSpots === 0
                ? tr("Full", "Completo", "Complet")
                : tr(
                    `${openSpots} spot${openSpots > 1 ? "s" : ""} left`,
                    `${openSpots} ${openSpots > 1 ? "huecos libres" : "hueco libre"}`,
                    `${openSpots} place${openSpots > 1 ? "s" : ""} libre${openSpots > 1 ? "s" : ""}`,
                  )}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[var(--ink)]/60">
            {match.level_min && (
              <span className="font-semibold text-[var(--ink)]/80">
                {match.level_min}
                {match.level_max && match.level_min !== match.level_max ? `–${match.level_max}` : ""}
              </span>
            )}
            {genderLabel && (
              <>
                <span className="text-[var(--ink)]/25">·</span>
                <span>{genderLabel}</span>
              </>
            )}
            <span className="text-[var(--ink)]/25">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> 90 min
            </span>
            {match.court_booked && (
              <>
                <span className="text-[var(--ink)]/25">·</span>
                <span className="font-semibold text-[var(--court-deep)]">
                  {tr("Court booked", "Pista reservada", "Court réservé")}
                </span>
              </>
            )}
          </div>

          {match.note && (
            <p className="mt-2 text-xs text-[var(--ink)]/75 whitespace-pre-wrap border-l-2 border-[var(--gold)] pl-2.5 italic">
              {match.note}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            {names.map((name, i) => (
              <div
                key={`p-${i}`}
                title={name}
                className="w-9 h-9 shrink-0 rounded-full overflow-hidden border-2 border-white shadow bg-[var(--ink)]/10 grid place-items-center"
              >
                <span className="text-[12px] font-bold text-[var(--ink)]/70">
                  {name.trim().charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {Array.from({ length: openSpots }).map((_, i) => (
              <div
                key={`o-${i}`}
                aria-hidden
                className="w-9 h-9 shrink-0 rounded-full border-2 border-dashed grid place-items-center border-[var(--plum)]/45 text-[var(--plum)]"
              >
                <Plus className="w-4 h-4" />
              </div>
            ))}
            {actionLabel && (
              <button
                type="button"
                onClick={onAction}
                disabled={disabled}
                className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.14em] px-3.5 py-2 disabled:opacity-50"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
