import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useTr } from "@/lib/i18n";
import { LEVEL_GUIDE_BANDS, levelGuideRange } from "@/lib/level-guide";
import { ratingWord } from "@/lib/level-label";

/** A quiet trigger plus an in-app explanation of the 0 to 7 padel scale. */
export function LevelGuideLink({
  rating,
  tone = "light",
  className = "",
}: {
  rating?: number | null;
  tone?: "light" | "dark";
  className?: string;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const ink = tone === "dark" ? "var(--cream)" : "var(--ink)";

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-8 items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] underline decoration-current/30 underline-offset-4 transition-opacity hover:opacity-75 ${className}`}
        style={{ color: `color-mix(in oklab, ${ink} 72%, transparent)` }}
      >
        <CircleHelp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        {tr("Level guide", "Guía de nivel", "Guide des niveaux")}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[90dvh] border-[var(--ink)]/16 bg-[var(--paper)] text-[var(--ink)]">
          <div className="mx-auto w-full max-w-lg overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
            <div className="text-center text-[10px] uppercase tracking-[0.3em] text-[var(--ink)]/62">
              {tr("Find your level", "Encuentra tu nivel", "Trouve ton niveau")}
            </div>
            <DrawerTitle className="mt-2 text-center font-serif text-[30px] font-normal leading-tight text-[var(--ink)]">
              {tr("Level guide", "Guía de nivel", "Guide des niveaux")}
            </DrawerTitle>
            <DrawerDescription className="mx-auto mt-3 max-w-sm text-center text-[13px] leading-relaxed text-[var(--ink)]/76">
              {tr(
                "The familiar 0 to 7 padel scale, also used by the Playtomic booking app. Pick the description closest to your game today.",
                "La conocida escala de pádel del 0 al 7, también usada por la app de reservas Playtomic. Elige la descripción más parecida a tu juego actual.",
                "L'échelle de padel de 0 à 7, également utilisée par l'application de réservation Playtomic. Choisis la description la plus proche de ton jeu actuel.",
              )}
            </DrawerDescription>

            <div className="mt-6 border-t border-[var(--ink)]/14">
              {LEVEL_GUIDE_BANDS.map((band) => {
                const current = rating != null && rating >= band.min && rating <= band.max + 1e-9;
                return (
                  <div
                    key={band.min}
                    className={`border-b border-[var(--ink)]/14 px-2 py-4 ${current ? "bg-[var(--gold)]/[0.08]" : ""}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[13px] font-medium text-[var(--ink)]">{ratingWord(band.min, tr)}</div>
                      <div className="shrink-0 font-serif text-[17px] tabular-nums text-[var(--ink)]/82">{levelGuideRange(band)}</div>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink)]/76">{tr(band.en, band.es, band.fr)}</p>
                    {current && (
                      <div className="mt-2 text-[9px] uppercase tracking-[0.2em] text-[var(--ink)]/62">
                        {tr("Your selected level", "Tu nivel seleccionado", "Ton niveau sélectionné")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-[var(--ink)]/70">
              {tr(
                "Your level is self-declared, not a ranking. You can adjust it whenever your game changes.",
                "Tu nivel es declarado por ti, no es una clasificación. Puedes cambiarlo cuando evolucione tu juego.",
                "Ton niveau est déclaré par toi, ce n'est pas un classement. Tu peux le modifier quand ton jeu évolue.",
              )}
            </p>
            <DrawerClose asChild>
              <button
                type="button"
                className="mt-5 h-11 w-full rounded-full border border-[var(--ink)]/24 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/[0.04]"
              >
                {tr("Got it", "Entendido", "Compris")}
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
