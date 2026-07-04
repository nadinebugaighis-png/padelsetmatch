import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createMatchEvent } from "@/lib/match-events.functions";
import { MatchForm, type MatchFormValues } from "@/components/MatchForm";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/events/new")({
  component: NewEvent,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function NewEvent() {
  const navigate = useNavigate();
  const tr = useTr();
  const create = useServerFn(createMatchEvent);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (v: MatchFormValues) => {
    setSaving(true);
    try {
      const { id } = await create({ data: v });
      toast.success(tr("Match called! Waiting for players.", "¡Partido convocado! Esperando jugadores."));
      navigate({ to: "/app/events/$eventId", params: { eventId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not create match", "No se pudo crear el partido"));
    } finally {
      setSaving(false);
    }
  };

  return <MatchForm title={tr("CALL A MATCH", "CONVOCAR PARTIDO")} submitLabel={tr("Call this match", "Convocar este partido")} onSubmit={onSubmit} saving={saving} />;
}
