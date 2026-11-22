import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Check, ChevronRight, Link2, MapPin, X } from "lucide-react";
import { useTr } from "@/lib/i18n";

type Where = "club" | "address" | "playtomic";

/** "Where are you playing?" before the match form: tapping a card opens the form straight away. */
export function CreateMatchChooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useTr();
  const navigate = useNavigate();
  const [pressing, setPressing] = useState<Where | null>(null);
  const [picked, setPicked] = useState<Where | null>(null);
  useEffect(() => { if (!open) { setPicked(null); setPressing(null); } }, [open]);
  if (!open) return null;

  // Show the tap clearly (tint + tick) for a moment before moving on, like native apps do.
  const go = (where: Where) => {
    if (picked) return;
    setPicked(where);
    window.setTimeout(() => {
      onClose();
      navigate({ to: "/app/events/new", search: { where } });
    }, 220);
  };

  const renderOption = ({ value, icon, title, body }: { value: Where; icon: React.ReactNode; title: string; body: string }) => {
    const on = picked === value;
    const down = pressing === value && !picked;
    return (
      <button key={value} type="button" onClick={() => go(value)}
        onPointerDown={() => setPressing(value)} onPointerUp={() => setPressing(null)}
        onPointerLeave={() => setPressing(null)} onPointerCancel={() => setPressing(null)}
        aria-pressed={on}
        className={`w-full rounded-2xl border px-4 py-3.5 text-left outline-none transition-all duration-150 ease-out [-webkit-tap-highlight-color:transparent] ${
          on ? "scale-[0.985] border-[var(--pitch)] bg-[var(--club-soft)]"
            : down ? "scale-[0.985] border-[var(--ink)]/25 bg-[var(--club-soft)]"
            : "border-[var(--ink)]/18 bg-white"
        }`}>
        <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--ink)]">
          <span className="flex min-w-0 flex-1 items-center gap-2.5">{icon}{title}</span>
          {on
            ? <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--pitch)] text-[var(--paper)] animate-in zoom-in-50 duration-150"><Check className="size-3" strokeWidth={3} aria-hidden="true" /></span>
            : <ChevronRight className="size-4 shrink-0 text-[var(--ink)]/35" strokeWidth={1.8} aria-hidden="true" />}
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-[var(--ink)]/78">{body}</span>
      </button>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={tr("Where are you playing?", "¿Dónde vas a jugar?", "Où vas-tu jouer ?")}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[var(--ink)]/45 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] bg-[var(--paper)] px-5 pt-5 animate-in slide-in-from-bottom-6 duration-200"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-serif text-[20px] sm:text-[24px] text-[var(--ink)]">{tr("Where are you playing?", "¿Dónde vas a jugar?", "Où vas-tu jouer ?")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("Close", "Cerrar", "Fermer")} className="grid size-9 place-items-center rounded-full text-[var(--ink)]/82"><X className="size-5" /></button>
        </div>
        <div className="mt-4 space-y-2.5">
          {renderOption({ value: "club", icon: <Building2 className="size-[18px]" strokeWidth={1.6} />,
            title: tr("At a padel club", "En un club de pádel", "Dans un club de padel"),
            body: tr("Pick the club and players can join from the Play page.", "Elige el club y los jugadores podrán unirse desde Jugar.", "Choisis le club, les joueurs rejoignent depuis Jouer.") })}
          {renderOption({ value: "address", icon: <MapPin className="size-[18px]" strokeWidth={1.6} />,
            title: tr("I already know where I'm playing", "Ya sé dónde voy a jugar", "Je sais déjà où je joue"),
            body: tr("A private court, a residence or any other address.", "Una pista privada, una urbanización u otra dirección.", "Un court privé, une résidence ou une autre adresse.") })}
          {renderOption({ value: "playtomic", icon: <Link2 className="size-[18px]" strokeWidth={1.6} />,
            title: tr("It's already on Playtomic", "Ya está en Playtomic", "Il est déjà sur Playtomic"),
            body: tr("Paste your match link. Local players find it here and join on Playtomic.", "Pega el enlace de tu partido. Los jugadores de tu zona lo ven aquí y se unen en Playtomic.", "Colle le lien de ton match. Les joueurs du coin le voient ici et rejoignent sur Playtomic.") })}
        </div>
      </div>
    </div>
  );
}
