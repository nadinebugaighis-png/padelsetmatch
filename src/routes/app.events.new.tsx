import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createMatchEvent } from "@/lib/match-events.functions";
import { MatchForm, type MatchFormValues } from "@/components/MatchForm";
import { toast } from "sonner";

export const Route = createFileRoute("/app/events/new")({
  component: NewEvent,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function NewEvent() {
  const navigate = useNavigate();
  const create = useServerFn(createMatchEvent);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (v: MatchFormValues) => {
    setSaving(true);
    try {
      const { id } = await create({ data: v });
      toast.success("Match called! Waiting for players.");
      navigate({ to: "/app/events/$eventId", params: { eventId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create match");
    } finally {
      setSaving(false);
    }
  };

  return <MatchForm title="CALL A MATCH" submitLabel="Call this match" onSubmit={onSubmit} saving={saving} />;
}
