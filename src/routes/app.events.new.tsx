import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createMatchEvent, inviteToMatchEvent } from "@/lib/match-events.functions";
import { MatchForm, type MatchFormValues } from "@/components/MatchForm";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";
import { z } from "zod";

const searchSchema = z.object({
  invite: z.string().uuid().optional(),
  name: z.string().optional(),
});

export const Route = createFileRoute("/app/events/new")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NewEvent,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function NewEvent() {
  const navigate = useNavigate();
  const tr = useTr();
  const { invite, name } = Route.useSearch();
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
      } else {
        toast.success(tr("Match called! Waiting for players.", "¡Partido convocado! Esperando jugadores.", "Match lancé ! En attente des joueurs."));
      }
      navigate({ to: "/app/events/$eventId", params: { eventId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not create match", "No se pudo crear el partido", "Impossible de créer le match"));
    } finally {
      setSaving(false);
    }
  };

  const trimmedName = name?.trim();
  const title = invite && trimmedName
    ? tr(`Invite ${trimmedName} to play`, `Invitar a ${trimmedName} a jugar`, `Inviter ${trimmedName} à jouer`)
    : tr("Call a match", "Convocar partido", "Lancer un match");

  return <MatchForm title={title} submitLabel={tr("Call this match", "Convocar este partido", "Lancer ce match")} onSubmit={onSubmit} saving={saving} />;
}
