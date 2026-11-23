import { useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { NO_FILTERS, type MatchFilters, type TimeOfDay } from "@/lib/match-filters";

type Props = {
  open: boolean;
  onClose: () => void;
  value: MatchFilters;
  onChange: (next: MatchFilters) => void;
  myLevelLabel?: string | null;
  resultCount: number;
  onAlerts: () => void;
};

/** Play page filters, in the same bottom sheet style as "Where are you playing?". */
export function MatchFiltersSheet({ open, onClose, value, onChange, myLevelLabel, resultCount, onAlerts }: Props) {
  const tr = useTr();
  // Escape closes the sheet on keyboards, like the app's other pop-ups.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const Pill = ({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick}
      className={`h-10 rounded-full border px-4 text-[14px] transition disabled:opacity-40 ${active ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)]" : "border-[var(--ink)]/22 bg-white text-[var(--ink)]"}`}>
      {children}
    </button>
  );

  const times: Array<[TimeOfDay, string]> = [
    ["all", tr("Any time", "Cualquier hora", "Toute heure")],
    ["morning", tr("Morning", "Mañana", "Matin")],
    ["afternoon", tr("Afternoon", "Tarde", "Après-midi")],
    ["evening", tr("Evening", "Noche", "Soir")],
  ];

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 text-[12px] uppercase tracking-[0.14em] text-[var(--ink)]/76">{children}</div>
  );

  return (
    <div role="dialog" aria-modal="true" data-state="open" aria-label={tr("Filters", "Filtros", "Filtres")}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[var(--ink)]/45 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92%] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[var(--paper)] px-5 pt-5 animate-in slide-in-from-bottom-6 duration-200"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-serif text-[20px] sm:text-[24px] text-[var(--ink)]">{tr("Filters", "Filtros", "Filtres")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("Close", "Cerrar", "Fermer")} className="grid size-9 place-items-center rounded-full text-[var(--ink)]/82"><X className="size-5" /></button>
        </div>

        <div className="mt-4 space-y-5">
          <div>
            <Label>{tr("Level", "Nivel", "Niveau")}</Label>
            <div className="flex flex-wrap gap-2">
              <Pill active={!value.myLevel} onClick={() => onChange({ ...value, myLevel: false })}>{tr("Any level", "Cualquier nivel", "Tout niveau")}</Pill>
              <Pill active={value.myLevel} disabled={!myLevelLabel} onClick={() => onChange({ ...value, myLevel: true })}>
                {tr("My level", "Mi nivel", "Mon niveau")}{myLevelLabel ? ` · ${myLevelLabel}` : ""}
              </Pill>
            </div>
          </div>

          <div>
            <Label>{tr("Time", "Hora", "Heure")}</Label>
            <div className="flex flex-wrap gap-2">
              {times.map(([t, label]) => (
                <Pill key={t} active={value.time === t} onClick={() => onChange({ ...value, time: t })}>{label}</Pill>
              ))}
            </div>
          </div>

          <div>
            <Label>{tr("Places", "Plazas", "Places")}</Label>
            <div className="flex flex-wrap gap-2">
              <Pill active={!value.spotsLeft} onClick={() => onChange({ ...value, spotsLeft: false })}>{tr("All games", "Todos", "Tous")}</Pill>
              <Pill active={value.spotsLeft} onClick={() => onChange({ ...value, spotsLeft: true })}>{tr("Places left", "Con plazas", "Places libres")}</Pill>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => { onClose(); onAlerts(); }}
          className="mt-6 flex w-full items-center gap-2.5 rounded-2xl border border-[var(--ink)]/18 bg-white px-4 py-3 text-left text-[14px] text-[var(--ink)]">
          <Bell className="size-4 shrink-0 text-[var(--ink)]/82" strokeWidth={1.6} />
          {tr("Tell me when a new game fits", "Avísame cuando haya un partido para mí", "Préviens-moi d'un nouveau match pour moi")}
        </button>

        <div className="mt-4 flex gap-2.5">
          <button type="button" onClick={() => onChange(NO_FILTERS)}
            className="h-12 flex-1 rounded-full border border-[var(--ink)]/20 text-[15px] text-[var(--ink)]">
            {tr("Clear", "Borrar", "Effacer")}
          </button>
          <button type="button" onClick={onClose}
            className="h-12 flex-[2] rounded-full bg-[var(--ink)] text-[15px] font-medium text-[var(--cream)] active:scale-[0.99] transition">
            {tr(`Show ${resultCount} ${resultCount === 1 ? "game" : "games"}`, `Ver ${resultCount} ${resultCount === 1 ? "partido" : "partidos"}`, `Voir ${resultCount} ${resultCount === 1 ? "match" : "matchs"}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
