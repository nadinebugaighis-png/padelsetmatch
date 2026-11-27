import { askForPushAfterMatch } from "@/lib/ask-push";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createMatchEvent, inviteToMatchEvent } from "@/lib/match-events.functions";
import { MatchForm, type MatchFormValues } from "@/components/MatchForm";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";
import { z } from "zod";
import { PLAY_SLOTS, matchStartFor } from "@/lib/who-can-play";
import { clubVenueFor } from "@/lib/club-venues";

const searchSchema = z.object({
  invite: z.string().uuid().optional(),
  name: z.string().optional(),
  where: z.enum(["club", "address", "playtomic"]).optional(),
  // A club community (e.g. Club de Pádel La Moraleja): its matches start at that club.
  venue: z.string().optional().catch(undefined),
  // From "Who can play?": the day and part of the day the players agreed on.
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  slot: z.enum(PLAY_SLOTS).optional().catch(undefined),
});

export const Route = createFileRoute("/app/events/new")({
  head: () => ({ meta: [
    { title: "Call a Padel Match | PadelSetMatch" },
    { name: "description", content: "Choose your club and time to arrange a neighbourhood padel match with PadelSetMatch." },
    { property: "og:title", content: "Call a Padel Match | PadelSetMatch" },
    { property: "og:description", content: "Choose your club and time to arrange a neighbourhood padel match with PadelSetMatch." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: NewEvent,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function NewEvent() {
  const navigate = useNavigate();
  const tr = useTr();
  const { invite, name, where, day, slot, venue } = Route.useSearch();
  const startClub = where === "playtomic" ? null : clubVenueFor(venue);
  const create = useServerFn(createMatchEvent);
  const invitePlayer = useServerFn(inviteToMatchEvent);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (v: MatchFormValues) => {
    setSaving(true);
    try {
      const { id } = await create({ data: v });
      if (invite) {
        try {
          await invitePlayer({ data: { eventId: id, profileIds: [invite] } });
          toast.success(tr(`Match called! Invitation sent to ${name ?? "player"}.`, `¡Partido convocado! Invitación enviada a ${name ?? "jugador"}.`, `Match lancé ! Invitation envoyée à ${name ?? "joueur"}.`));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : tr("Match created but invite failed", "Partido creado pero falló la invitación", "Match créé mais échec de l'invitation"));
        }
      } else if (v.joins_on_playtomic) {
        toast.success(tr("Shared. Local players can find it on Play.", "Compartido. Los jugadores de tu comunidad lo verán en Jugar.", "Partagé. Les joueurs du coin le verront dans Jouer."));
      } else {
        toast.success(tr("Match called! Waiting for players.", "¡Partido convocado! Esperando jugadores.", "Match lancé ! En attente des joueurs."));
      }
      askForPushAfterMatch(tr);
      navigate({ to: "/app/events/$eventId", params: { eventId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not create match", "No se pudo crear el partido", "Impossible de créer le match"));
    } finally {
      setSaving(false);
    }
  };

  const trimmedName = name?.trim();
  const sharing = where === "playtomic";
  const title = sharing
    ? tr("Share a Playtomic match", "Compartir un partido de Playtomic", "Partager un match Playtomic")
    : invite && trimmedName
    ? tr(`Invite ${trimmedName} to play`, `Invitar a ${trimmedName} a jugar`, `Inviter ${trimmedName} à jouer`)
    : tr("Call a match", "Convocar partido", "Lancer un match");

  return <MatchForm title={title} submitLabel={sharing ? tr("Share this match", "Compartir este partido", "Partager ce match") : tr("Call this match", "Convocar este partido", "Lancer ce match")} onSubmit={onSubmit} saving={saving} startMode={where} {...(startClub ? { startClub } : {})} {...(day && slot ? { startWhen: matchStartFor(day, slot) } : {})} />;
}
