import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelMatchEvent, deleteMatchEvent, getMatchEvent, updateMatchEvent } from "@/lib/match-events.functions";
import { MatchForm, type MatchFormValues } from "@/components/MatchForm";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/events/$eventId/edit")({
  component: EditEvent,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">—</div>,
});


function EditEvent() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tr = useTr();
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

  if (eventQ.isLoading) return <div className="p-6 text-center text-[var(--cream)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</div>;
  const event: any = eventQ.data?.event;
  const me = eventQ.data?.me;
  if (!event) return <div className="p-6 text-center text-[var(--cream)]/60">{tr("Match not found", "Partido no encontrado", "Match introuvable")}</div>;
  if (!me?.iAmHost) {
    return <div className="p-6 text-center text-[var(--cream)]/60">{tr("Only the host can edit this match.", "Solo el organizador puede editar este partido.", "Seul l'hôte peut modifier ce match.")}</div>;
  }

  const onSubmit = async (v: MatchFormValues) => {
    setSaving(true);
    try {
      await update({ data: { id: eventId, ...v } });
      toast.success(tr("Match updated", "Partido actualizado", "Match mis à jour"));
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["open-events"] });
      navigate({ to: "/app/events/$eventId", params: { eventId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not update match", "No se pudo actualizar el partido", "Impossible de mettre à jour le match"));
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async () => {
    if (!confirm(tr("Cancel this match? Players will see it as cancelled.", "¿Cancelar este partido? Los jugadores lo verán como cancelado.", "Annuler ce match ? Les joueurs le verront comme annulé."))) return;
    setBusy(true);
    try {
      await cancel({ data: { id: eventId } });
      toast.success(tr("Match cancelled", "Partido cancelado", "Match annulé"));
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["open-events"] });
      navigate({ to: "/app/events" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not cancel", "No se pudo cancelar", "Impossible d'annuler"));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(tr("Delete this match permanently? This cannot be undone.", "¿Eliminar este partido permanentemente? Esta acción no se puede deshacer.", "Supprimer ce match définitivement ? Irréversible."))) return;
    setBusy(true);
    try {
      await deleteEvent({ data: { id: eventId } });
      toast.success(tr("Match deleted", "Partido eliminado", "Match supprimé"));
      qc.invalidateQueries({ queryKey: ["open-events"] });
      navigate({ to: "/app/events" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not delete", "No se pudo eliminar", "Impossible de supprimer"));
    } finally {
      setBusy(false);
    }
  };


  return (
    <div>
      <MatchForm
        title={tr("EDIT MATCH", "EDITAR PARTIDO", "MODIFIER LE MATCH")}
        submitLabel={tr("Save changes", "Guardar cambios", "Enregistrer")}

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
          is_private_court: event.is_private_court,
          app_players_count: event.participants?.length ?? 1,
        }}
      />

      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 pb-32 -mt-4 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 pt-4">{tr("Danger zone", "Zona de peligro", "Zone sensible")}</div>
        {event.status !== "cancelled" && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full py-2 rounded-full border border-red-500/40 text-xs uppercase tracking-widest text-red-300 disabled:opacity-50"
          >
            {tr("Cancel match", "Cancelar partido", "Annuler le match")}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={busy}
          className="w-full py-2 rounded-full border border-red-500/60 bg-red-500/10 text-xs uppercase tracking-widest text-red-300 disabled:opacity-50"
        >
          {tr("Delete match", "Eliminar partido", "Supprimer le match")}
        </button>
      </div>
    </div>
  );
}
