import { useNavigate } from "@tanstack/react-router";
import { Building2, ChevronRight, Link2, MapPin, X } from "lucide-react";
import { useTr } from "@/lib/i18n";

type Where = "club" | "address" | "playtomic";

/** "Where are you playing?" before the match form: tapping a card opens the form straight away. */
export function CreateMatchChooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useTr();
  const navigate = useNavigate();
  if (!open) return null;

  const go = (where: Where) => {
    onClose();
    navigate({ to: "/app/events/new", search: { where } });
  };

  const Option = ({ value, icon, title, body }: { value: Where; icon: React.ReactNode; title: string; body: string }) => (
    <button type="button" onClick={() => go(value)}
      className="w-full rounded-2xl border border-[var(--ink)]/12 bg-white px-4 py-3.5 text-left transition active:scale-[0.99] active:border-[var(--ink)]/30">
      <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--ink)]">
        <span className="flex min-w-0 flex-1 items-center gap-2.5">{icon}{title}</span>
        <ChevronRight className="size-4 shrink-0 text-[var(--ink)]/35" strokeWidth={1.8} aria-hidden="true" />
      </span>
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
          <Option value="playtomic" icon={<Link2 className="size-[18px]" strokeWidth={1.6} />}
            title={tr("It's already on Playtomic", "Ya está en Playtomic", "Il est déjà sur Playtomic")}
            body={tr("Paste your match link. Local players find it here and join on Playtomic.", "Pega el enlace de tu partido. Los jugadores de tu zona lo ven aquí y se unen en Playtomic.", "Colle le lien de ton match. Les joueurs du coin le voient ici et rejoignent sur Playtomic.")} />
        </div>
      </div>
    </div>
  );
}
