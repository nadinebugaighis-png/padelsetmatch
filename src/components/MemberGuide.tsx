import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n, useTr } from "@/lib/i18n";
import { CourtIcon } from "@/components/CourtIcon";
import { GraduationCap } from "lucide-react";
import wordmark from "@/assets/padel-set-match-wordmark.png.asset.json";

const KEY = "member-guide-seen-v1";

export function openMemberGuide() {
  window.dispatchEvent(new Event("open-member-guide"));
}

/** First-visit "how to use the app" guide, one step per tab; reopen via openMemberGuide(). */
export function MemberGuide() {
  const tr = useTr();
  const { t, lang } = useI18n();
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

  const steps: Array<{ title: string; body: string; court?: boolean; coach?: boolean }> = [
    {
      title: t("shell.tab.grid"),
      body: tr(
        "Players strictly from your community/ neighborhood and are matched based on level and vibe on court & off court for long lasting padel friendships.",
        "Jugadores estrictamente de tu comunidad, emparejados por nivel y afinidad dentro y fuera de la pista, para amistades de pádel duraderas.",
        "Des joueurs strictement de ta communauté ou de ton quartier, associés selon le niveau et l'affinité sur le court et en dehors, pour des amitiés padel durables.",
      ),
    },
    {
      title: t("shell.tab.play"),
      body: tr(
        "Games in your neighbourhood and your own clubs, nothing across town. Join a match in one tap or create your own.",
        "Partidos en tu comunidad y tus clubes, nada al otro lado de la ciudad. Únete a un partido con un toque o crea el tuyo.",
        "Des matchs dans ton quartier et tes clubs, rien à l'autre bout de la ville. Rejoins un match en un geste ou crée le tien.",
      ),
    },
    {
      title: t("shell.tab.connect"),
      body: tr(
        "In Who can play?, tap the days and times you are free. Members nearby see you and can join.",
        "En ¿Quién puede jugar?, marca los días y horas en que estás libre. Los miembros cercanos te ven y se apuntan.",
        "Dans Qui peut jouer ?, choisis les jours et heures où tu es libre. Les membres proches te voient et te rejoignent.",
      ),
    },
    {
      title: t("shell.tab.me"),
      body: tr(
        "Your profile, clubs and availability. Answer the Playing style questions to meet players of your level and style.",
        "Tu perfil, tus clubes y tu disponibilidad. Responde las preguntas de Afinidad de juego para conocer jugadores de tu nivel y estilo.",
        "Ton profil, tes clubs et tes disponibilités. Réponds aux questions de Style de jeu pour rencontrer des joueurs de ton niveau et de ton style.",
      ),
    },
    {
      title: tr("Free courts", "Pistas gratis", "Terrains gratuits"),
      court: true,
      body: tr(
        "A small court on a player's card means they can host on a free court. Hosts can mark any game as Free court.",
        "Una pequeña pista en la tarjeta de un jugador significa que puede organizar en una pista gratis. El anfitrión puede marcar cualquier partido como Pista gratis.",
        "Un petit court sur la carte d'un joueur signifie qu'il peut organiser sur un terrain gratuit. L'hôte peut marquer n'importe quel match comme Terrain gratuit.",
      ),
    },
    {
      title: tr("Courtside coaches", "Entrenador a tu pista", "Coach sur ton terrain"),
      coach: true,
      body: tr(
        "Find a coach who comes to your court, at home or at your club. Book a private lesson or a small group class from the + menu.",
        "Encuentra un entrenador que viene a tu pista, en casa o en tu club. Reserva una clase privada o en grupo desde el menú +.",
        "Trouve un coach qui vient sur ton terrain, chez toi ou à ton club. Réserve un cours privé ou en petit groupe depuis le menu +.",
      ),
    },
  ];

  // The brand name is shown as the logo itself, inside the sentence.
  const [before, after] =
    lang === "es" ? ["Cómo funciona", ""] : lang === "fr" ? ["Comment fonctionne", ""] : ["How", "works"];

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="w-[88vw] max-w-sm sm:max-w-xl p-6 sm:p-10 gap-4 sm:gap-6 bg-[var(--paper)] border-[var(--gold)]/40 max-h-[80vh] sm:max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogTitle style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.01em" }} className="text-serif text-[21px] sm:text-[28px] leading-none text-[var(--ink)] font-normal flex flex-wrap items-center gap-x-2 gap-y-1.5 pr-6">
          {before && <span>{before}</span>}
          <img src={wordmark.url} alt="PadelSetMatch" className="h-[17px] sm:h-[24px] w-auto select-none" draggable={false} />
          {after && <span>{after}</span>}
        </DialogTitle>
        <ol className="divide-y divide-[var(--ink)]/14 border-y border-[var(--ink)]/14">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 py-3 sm:py-4">
              <span className="text-serif text-[15px] sm:text-[18px] leading-none text-[var(--ink)]/70 pt-0.5 w-4 shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-[var(--ink)] font-semibold">
                  {s.title}
                  {s.court && <CourtIcon className="w-5 h-3 sm:w-6 sm:h-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />}
                  {s.coach && <GraduationCap className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 fill-[var(--plum)]/25 text-[var(--plum)]/60" strokeWidth={1.5} aria-hidden="true" />}
                </div>
                <p className="text-[13.5px] sm:text-[15px] text-[var(--ink)]/86 leading-snug sm:leading-relaxed mt-1">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={close} className="outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30 focus-visible:ring-offset-2 w-full h-11 sm:h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] sm:text-[13px] uppercase tracking-[0.18em] font-semibold">
          {tr("Enter the club", "Entrar al club", "Entrer dans le club")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
