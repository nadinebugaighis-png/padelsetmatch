import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelMatchEvent, deleteMatchEvent, getMatchEvent, updateMatchEvent } from "@/lib/match-events.functions";
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
  const cancel = useServerFn(cancelMatchEvent);
  const deleteEvent = useServerFn(deleteMatchEvent);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const onCancel = async () => {
    if (!confirm("Cancel this match? Players will see it as cancelled.")) return;
    setBusy(true);
    try {
      await cancel({ data: { id: eventId } });
      toast.success("Match cancelled");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["open-events"] });
      navigate({ to: "/app/events" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this match permanently? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteEvent({ data: { id: eventId } });
      toast.success("Match deleted");
      qc.invalidateQueries({ queryKey: ["open-events"] });
      navigate({ to: "/app/events" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
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

      <div className="max-w-md mx-auto px-5 pb-32 -mt-4 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 pt-4">Danger zone</div>
        {event.status !== "cancelled" && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full py-2 rounded-full border border-red-500/40 text-xs uppercase tracking-widest text-red-300 disabled:opacity-50"
          >
            Cancel match
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={busy}
          className="w-full py-2 rounded-full border border-red-500/60 bg-red-500/10 text-xs uppercase tracking-widest text-red-300 disabled:opacity-50"
        >
          Delete match
        </button>
      </div>
    </div>
  );
}
