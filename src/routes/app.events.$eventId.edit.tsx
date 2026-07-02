import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatchEvent, updateMatchEvent } from "@/lib/match-events.functions";
import { MatchForm, type MatchFormValues } from "@/components/MatchForm";
import { toast } from "sonner";

export const Route = createFileRoute("/app/events/$eventId/edit")({
  component: EditEvent,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function EditEvent() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getMatchEvent);
  const update = useServerFn(updateMatchEvent);
  const [saving, setSaving] = useState(false);

  const eventQ = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => get({ data: { id: eventId } }),
  });

  if (eventQ.isLoading) return <div className="p-6 text-center text-[var(--cream)]/60">Loading…</div>;
  const event: any = eventQ.data?.event;
  const me = eventQ.data?.me;
  if (!event) return <div className="p-6 text-center text-[var(--cream)]/60">Match not found</div>;
  if (!me?.iAmHost) {
    return <div className="p-6 text-center text-[var(--cream)]/60">Only the host can edit this match.</div>;
  }

  const onSubmit = async (v: MatchFormValues) => {
    setSaving(true);
    try {
      await update({ data: { id: eventId, ...v } });
      toast.success("Match updated");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["open-events"] });
      navigate({ to: "/app/events/$eventId", params: { eventId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update match");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MatchForm
      title="EDIT MATCH"
      submitLabel="Save changes"
      saving={saving}
      onSubmit={onSubmit}
      initial={{
        starts_at: event.starts_at,
        club_name: event.club_name,
        club_address: event.club_address,
        club_place_id: event.club_place_id,
        club_lat: event.club_lat,
        club_lng: event.club_lng,
        city: event.city,
        country: event.country,
        level_min: event.level_min,
        level_max: event.level_max,
        gender_rule: event.gender_rule,
        extra_confirmed: event.extra_confirmed,
        note: event.note,
        playtomic_link: event.playtomic_link,
        court_booked: event.court_booked,
        app_players_count: event.participants?.length ?? 1,
      }}
    />
  );
}
