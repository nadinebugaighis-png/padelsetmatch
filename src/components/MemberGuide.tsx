import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTr } from "@/lib/i18n";

const KEY = "member-guide-seen-v1";

export function openMemberGuide() {
  window.dispatchEvent(new Event("open-member-guide"));
}

/** First-visit "how to use the app" guide; reopen via openMemberGuide(). */
export function MemberGuide() {
  const tr = useTr();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { /* ignore */ }
    const h = () => setOpen(true);
    window.addEventListener("open-member-guide", h);
    return () => window.removeEventListener("open-member-guide", h);
  }, []);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  };

  const steps = [
    [tr("Connect", "Conecta", "Connecte-toi"), tr("Tap Connect on a player's card to invite them to play and to chat.", "Pulsa Conectar en la tarjeta de un jugador para invitarle a jugar y chatear.", "Touche Connecter sur la carte d'un joueur pour l'inviter à jouer et discuter.")],
    [tr("Your area and clubs", "Tu zona y tus clubes", "Ton quartier et tes clubs"), tr("Add your neighbourhood and the club you play in, so you find and meet players there.", "Añade tu barrio y el club donde juegas para encontrar y conocer jugadores allí.", "Ajoute ton quartier et ton club pour trouver et rencontrer des joueurs sur place.")],
    [tr("Compatibility", "Compatibilidad", "Compatibilité"), tr("Answer the compatibility questions to be paired with players of your level and vibe, for better games.", "Responde las preguntas de compatibilidad para emparejarte con jugadores de tu nivel y estilo, y jugar mejores partidos.", "Réponds aux questions de compatibilité pour jouer avec des joueurs de ton niveau et de ton style.")],
    [tr("Be the first", "Sé el primero", "Sois le premier"), tr("Be the first to join a match, so others can follow.", "Sé el primero en unirte a un partido, así los demás te siguen.", "Sois le premier à rejoindre un match, les autres suivront.")],
    [tr("The court symbol", "El símbolo de pista", "Le symbole du court"), tr("A small court on a player's card means they have access to free courts.", "Una pequeña pista en la tarjeta de un jugador significa que tiene acceso a pistas gratis.", "Un petit court sur la carte d'un joueur signifie qu'il a accès à des terrains gratuits.")],
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-md bg-[var(--paper)] border-[var(--gold)]/40 max-h-[90vh] overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--ink)]/55">{tr("Welcome", "Bienvenido", "Bienvenue")}</div>
        <DialogTitle className="text-serif text-[28px] leading-tight text-[var(--ink)] font-normal">
          {tr("How the club works", "Cómo funciona el club", "Comment fonctionne le club")}
        </DialogTitle>
        <span className="block h-px w-10 bg-[var(--gold)]" />
        <ol className="space-y-4 mt-1">
          {steps.map(([title, body], i) => (
            <li key={i} className="flex gap-4">
              <span className="text-serif text-[20px] leading-none text-[var(--gold)] w-5 shrink-0">{i + 1}</span>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--ink)] font-semibold">{title}</div>
                <p className="text-[14px] text-[var(--ink)]/75 leading-snug mt-1">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={close} className="mt-3 w-full h-11 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-[0.18em] font-semibold">
          {tr("Enter the club", "Entrar al club", "Entrer dans le club")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
