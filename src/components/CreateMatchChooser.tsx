import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, MapPin, X } from "lucide-react";
import { useTr } from "@/lib/i18n";

type Where = "club" | "address";

/** "Where are you playing?" before the match form, so the right fields open ready. */
export function CreateMatchChooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useTr();
  const navigate = useNavigate();
  const [where, setWhere] = useState<Where>("club");
  if (!open) return null;

  const go = () => {
    onClose();
    navigate({ to: "/app/events/new", search: { where } });
  };

  const Option = ({ value, icon, title, body }: { value: Where; icon: React.ReactNode; title: string; body: string }) => (
    <button type="button" onClick={() => setWhere(value)} aria-pressed={where === value}
      className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-left transition ${where === value ? "border-[var(--ink)] shadow-[0_0_0_1px_var(--ink)]" : "border-[var(--ink)]/12"}`}>
      <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--ink)]">{icon}{title}</span>
      <span className="mt-1 block text-[13px] leading-snug text-[var(--ink)]/55">{body}</span>
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={tr("Where are you playing?", "¿Dónde vas a jugar?", "Où vas-tu jouer ?")}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[var(--ink)]/45 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] bg-[var(--paper)] px-5 pt-5 animate-in slide-in-from-bottom-6 duration-200"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-serif text-[24px] text-[var(--ink)]">{tr("Where are you playing?", "¿Dónde vas a jugar?", "Où vas-tu jouer ?")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("Close", "Cerrar", "Fermer")} className="grid size-9 place-items-center rounded-full text-[var(--ink)]/60"><X className="size-5" /></button>
        </div>
        <div className="mt-4 space-y-2.5">
          <Option value="club" icon={<Building2 className="size-[18px]" strokeWidth={1.6} />}
            title={tr("At a padel club", "En un club de pádel", "Dans un club de padel")}
            body={tr("Pick the club and players can join from the Play page.", "Elige el club y los jugadores podrán unirse desde Jugar.", "Choisis le club, les joueurs rejoignent depuis Jouer.")} />
          <Option value="address" icon={<MapPin className="size-[18px]" strokeWidth={1.6} />}
            title={tr("I already know where I'm playing", "Ya sé dónde voy a jugar", "Je sais déjà où je joue")}
            body={tr("A private court, a residence or any other address.", "Una pista privada, una urbanización u otra dirección.", "Un court privé, une résidence ou une autre adresse.")} />
        </div>
        <button type="button" onClick={go}
          className="mt-5 h-12 w-full rounded-full bg-[var(--ink)] text-[15px] font-medium text-[var(--cream)] active:scale-[0.99] transition">
          {tr("Next", "Siguiente", "Suivant")}
        </button>
      </div>
    </div>
  );
}
