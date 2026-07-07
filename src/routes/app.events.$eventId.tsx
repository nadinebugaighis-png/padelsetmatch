import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizePlaytomicLink } from "@/lib/affinity";
import {
  cancelMatchEvent,
  claimMatchInviteByToken,
  createMatchInviteLink,
  deleteEventMessage,
  deleteMatchEvent,
  editEventMessage,
  getMatchEvent,
  inviteToMatchEvent,
  joinMatchEvent,
  leaveMatchEvent,
  listEventMessages,
  listInvitableConnections,
  respondToMatchInvite,
  revokeMatchInvite,
  sendEventMessage,
  updateMatchEvent,
} from "@/lib/match-events.functions";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Send, ExternalLink, ArrowLeft, Share2, Pencil, Trash2, X, Check, UserPlus, Clock, Lock } from "lucide-react";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/events/$eventId")({
  validateSearch: (s: Record<string, unknown>) => ({
    i: typeof s.i === "string" ? s.i : undefined,
  }),
  component: EventRoute,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function EventRoute() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.endsWith("/edit")) return <Outlet />;
  return <EventDetail />;
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shareOrigin() {
  if (typeof window === "undefined") return "https://padelmatchapp.lovable.app";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname.includes("preview--") || hostname.includes("id-preview--")) {
    return "https://padelmatchapp.lovable.app";
  }
  return origin;
}

function EventDetail() {
  const { eventId } = Route.useParams();
  const { i: inviteToken } = Route.useSearch();
  const navigate = useNavigate();
  const tr = useTr();
  const qc = useQueryClient();
  const get = useServerFn(getMatchEvent);
  const join = useServerFn(joinMatchEvent);
  const leave = useServerFn(leaveMatchEvent);
  const cancel = useServerFn(cancelMatchEvent);
  const deleteEvent = useServerFn(deleteMatchEvent);
  const update = useServerFn(updateMatchEvent);
  const listMsgs = useServerFn(listEventMessages);
  const sendMsg = useServerFn(sendEventMessage);
  const editMsg = useServerFn(editEventMessage);
  const deleteMsg = useServerFn(deleteEventMessage);
  const invitePeople = useServerFn(inviteToMatchEvent);
  const createInviteLink = useServerFn(createMatchInviteLink);
  const listConns = useServerFn(listInvitableConnections);
  const respondInvite = useServerFn(respondToMatchInvite);
  const revokeInvite = useServerFn(revokeMatchInvite);
  const claimInvite = useServerFn(claimMatchInviteByToken);

  // Auto-claim a share-link invite token if present on this URL, then strip it
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      try {
        await claimInvite({ data: { token: inviteToken } });
      } catch { /* ignore — token may be already claimed or invalid */ }
      if (cancelled) return;
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      navigate({ to: "/app/events/$eventId", params: { eventId }, search: {}, replace: true });
    })();
    return () => { cancelled = true; };
  }, [inviteToken, claimInvite, eventId, navigate, qc]);


  const eventQ = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      try {
        return await get({ data: { id: eventId } });
      } catch (err: any) {
        // Swallow transient auth errors during sign-out; the auth gate will redirect.
        if (String(err?.message ?? "").includes("Unauthorized")) return { event: null, me: null };
        throw err;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
  });

  const msgsQ = useQuery({
    queryKey: ["event-msgs", eventId],
    queryFn: () => listMsgs({ data: { id: eventId } }),
    enabled: !!eventQ.data?.me?.iAmParticipant,
  });

  useEffect(() => {
    if (!eventQ.data?.me?.iAmParticipant) return;
    const ch = supabase
      .channel(`ev-msgs-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_event_messages", filter: `match_event_id=eq.${eventId}` }, () => {
        qc.invalidateQueries({ queryKey: ["event-msgs", eventId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_event_participants", filter: `match_event_id=eq.${eventId}` }, () => {
        qc.invalidateQueries({ queryKey: ["event", eventId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, eventQ.data?.me?.iAmParticipant, qc]);

  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgsQ.data]);

  if (eventQ.isLoading) return <div className="p-6 text-center text-[var(--cream)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</div>;
  const event: any = eventQ.data?.event;
  const me = eventQ.data?.me;
  if (!event) return <div className="p-6 text-center text-[var(--cream)]/60">{tr("Match not found", "Partido no encontrado", "Match introuvable")}</div>;

  const mapsUrl = event.club_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.club_name)}&query_place_id=${event.club_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.club_name + " " + (event.city ?? ""))}`;
  const shareUrl = `${shareOrigin()}/m/${eventId}`;
  const shareText = tr(
    `Join my padel match on PadelMatch — ${event.club_name} · ${fmtWhen(event.starts_at)}`,
    `Únete a mi partido de pádel en PadelMatch — ${event.club_name} · ${fmtWhen(event.starts_at)}`,
  );

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(tr("Share link copied", "Enlace copiado", "Lien copié"));
    } catch {
      toast.error(tr("Could not copy the link", "No se pudo copiar el enlace", "Impossible de copier le lien"));
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "PadelMatch", text: shareText, url: shareUrl });
    } catch (err: any) {
      if (String(err?.name ?? "") !== "AbortError") await copyShareLink();
    }
  };

  const genderLabel = event.gender_rule === "mixed" ? tr("Mixed", "Mixto", "Mixte") : event.gender_rule === "men_only" ? tr("Men only", "Solo hombres", "Hommes uniquement") : tr("Women only", "Solo mujeres", "Femmes uniquement");
  const canJoin =
    !me?.iAmParticipant && event.status === "open" && event.needs > 0 &&
    (event.gender_rule === "mixed"
      || (event.gender_rule === "men_only" && me?.gender === "man")
      || (event.gender_rule === "women_only" && me?.gender === "woman"));

  const onJoin = async () => {
    try {
      await join({ data: { id: eventId } });
      toast.success(tr("You're in!", "¡Estás dentro!", "Tu es inscrit·e !"));
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["open-events"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("INVITE_LOCK:")) {
        const iso = msg.slice("INVITE_LOCK:".length);
        const opensAt = new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
        toast.error(tr(`Reserved for invited players until ${opensAt}. Come back then!`, `Reservado para invitados hasta ${opensAt}. ¡Vuelve entonces!`));
      } else {
        toast.error(msg || tr("Could not join", "No te pudimos unir", "Impossible de rejoindre"));
      }
    }
  };

  const onLeave = async () => {
    await leave({ data: { id: eventId } });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
    qc.invalidateQueries({ queryKey: ["open-events"] });
  };

  const onCancel = async () => {
    if (!confirm(tr("Cancel this match?", "¿Cancelar este partido?", "Annuler ce match ?"))) return;
    await cancel({ data: { id: eventId } });
    toast.success(tr("Match cancelled", "Partido cancelado", "Match annulé"));
    navigate({ to: "/app/events" });
  };

  const onDelete = async () => {
    if (!confirm(tr("Delete this match permanently? This cannot be undone.", "¿Borrar este partido para siempre? No se puede deshacer.", "Supprimer ce match définitivement ? Irréversible."))) return;
    await deleteEvent({ data: { id: eventId } });
    toast.success(tr("Match deleted", "Partido borrado", "Match supprimé"));
    qc.invalidateQueries({ queryKey: ["open-events"] });
    navigate({ to: "/app/events" });
  };

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      await sendMsg({ data: { id: eventId, body } });
      qc.invalidateQueries({ queryKey: ["event-msgs", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Send failed", "No se pudo enviar", "Échec de l'envoi"));
    }
  };

  const onSaveMessage = async () => {
    if (!editingId) return;
    const body = editingText.trim();
    if (!body) return;
    try {
      await editMsg({ data: { messageId: editingId, body } });
      setEditingId(null);
      setEditingText("");
      qc.invalidateQueries({ queryKey: ["event-msgs", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Couldn't edit", "No se pudo editar", "Impossible de modifier"));
    }
  };

  const onDeleteMessage = async (messageId: string) => {
    if (!confirm(tr("Delete this message?", "¿Borrar este mensaje?", "Supprimer ce message ?"))) return;
    try {
      await deleteMsg({ data: { messageId } });
      qc.invalidateQueries({ queryKey: ["event-msgs", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Couldn't delete", "No se pudo borrar", "Impossible de supprimer"));
    }
  };

  const onToggleBooked = async () => {
    await update({ data: { id: eventId, court_booked: !event.court_booked } });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };

  return (
    <div className="mx-auto w-full max-w-md max-w-[100dvw] overflow-x-hidden px-5 py-4 pb-32">
      <div className="flex items-center justify-between mb-3">
        <Link to="/app/events" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/60">
          <ArrowLeft className="w-4 h-4" /> {tr("All matches", "Todos los partidos", "Tous les matches")}
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)] border border-[var(--cream)]/40 rounded-full px-3 py-1"
        >
          <Share2 className="w-3.5 h-3.5" /> {tr("Share", "Compartir", "Partager")}
        </button>
      </div>

      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--court-deep)]/80 px-4 pb-4 pt-10"
          onClick={() => setShareOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tr("Share match", "Compartir partido", "Partager le match")}
            className="w-full max-w-md rounded-2xl border border-[var(--cream)]/15 bg-[var(--court-deep)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--cream)]">{tr("Share match", "Compartir partido", "Partager le match")}</div>
                <p className="mt-1 text-sm text-[var(--cream)]/70">{tr("Send this invitation link so players can join an open spot.", "Envía este enlace para que los jugadores ocupen un hueco.", "Envoie ce lien d'invitation pour qu'ils puissent prendre une place ouverte.")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="rounded-full border border-[var(--cream)]/20 px-3 py-1 text-xs uppercase tracking-widest text-[var(--cream)]/70"
              >
                {tr("Close", "Cerrar", "Fermer")}
              </button>
            </div>
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-4 w-full rounded-full border border-[var(--cream)]/20 bg-black/30 px-4 py-2 text-sm text-[var(--cream)] outline-none"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[var(--cream)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[var(--court-deep)]"
              >
                {tr("Open link", "Abrir enlace", "Ouvrir le lien")}
              </a>
              <button
                type="button"
                onClick={copyShareLink}
                className="rounded-full border border-[var(--cream)]/50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--cream)]"
              >
                {tr("Copy link", "Copiar enlace", "Copier le lien")}
              </button>
            </div>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={nativeShare}
                className="mt-2 w-full rounded-full border border-[var(--cream)]/20 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--cream)]/80"
              >
                {tr("Share with phone", "Compartir desde el móvil", "Partager avec le téléphone")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--cream)]/10 bg-black/30 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-medium text-[var(--cream)] truncate">{event.club_name}</h1>
            {event.club_address && <div className="text-xs text-[var(--cream)]/60 truncate">{event.club_address}</div>}
          </div>
          <span
            className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
              event.status === "cancelled"
                ? "bg-red-500/20 text-red-300"
                : event.needs === 0
                ? "bg-[var(--cream)]/10 text-[var(--cream)]/70"
                : "bg-[var(--cream)]/20 text-[var(--cream)]"
            }`}
          >
            {event.status === "cancelled" ? tr("Cancelled", "Cancelado", "Annulé") : event.needs === 0 ? tr("Full", "Completo", "Complet") : tr(`Needs ${event.needs}`, `Faltan ${event.needs}`)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--cream)]/70 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {fmtWhen(event.starts_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {event.filled}/4
          </span>
          <span className="uppercase tracking-widest text-[10px]">{genderLabel}</span>
          <span className="uppercase tracking-widest text-[10px]">
            {tr("Level", "Nivel", "Niveau")} {event.level_min} – {event.level_max}
          </span>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--cream)] hover:underline"
        >
          <MapPin className="w-3.5 h-3.5" /> {tr("Open in Google Maps", "Abrir en Google Maps", "Ouvrir dans Google Maps")}
        </a>

        {event.note && <p className="text-sm text-[var(--cream)]/80 whitespace-pre-wrap">{event.note}</p>}

        <div className="text-xs text-[var(--cream)]/60">
          {event.court_booked ? tr("✅ Court is booked", "✅ Pista reservada", "✅ Pista réservée") : tr("🔎 Court still needed", "🔎 Falta reservar la pista", "🔎 Pista encore à trouver")}
          {event.playtomic_link && (() => {
            const safe = normalizePlaytomicLink(event.playtomic_link).url;
            if (!safe) return null;
            return (
              <a href={safe} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-[var(--cream)] hover:underline">
                Playtomic <ExternalLink className="w-3 h-3" />
              </a>
            );
          })()}
        </div>

        {event.lock_active && event.invite_lock_until && (
          <div className="flex items-start gap-2 rounded-xl border border-[var(--cream)]/30 bg-[var(--cream)]/5 px-3 py-2 text-xs text-[var(--cream)]/80">
            <Lock className="mt-0.5 h-3.5 w-3.5 text-[var(--cream)] shrink-0" />
            <div>
              <div className="text-[var(--cream)] uppercase tracking-widest text-[10px]">{tr("Priority window", "Ventana prioritaria", "Fenêtre prioritaire")}</div>
              <div className="mt-0.5">
                {tr(
                  `Invited players first — opens to everyone at ${new Date(event.invite_lock_until).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}`,
                  `Prioridad para invitados — se abre a todos el ${new Date(event.invite_lock_until).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}`,
                )}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Players */}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-2">{tr("Players", "Jugadores", "Joueurs")}</div>
        <div className="flex flex-wrap gap-2">
          {(event.participants ?? []).map((p: any) => {
            const isMe = p.profile_id === me?.id;
            const isHost = p.profile_id === event.host_profile_id;
            return (
              <button
                key={p.profile_id}
                type="button"
                onClick={() => { if (isMe && !isHost) onLeave(); }}
                disabled={!isMe || isHost}
                title={isMe && !isHost ? tr("Tap to leave the match", "Toca para salir del partido", "Appuie pour quitter le match") : ""}
                className={`flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 ${
                  isMe && !isHost
                    ? "bg-[var(--cream)]/10 border-[var(--cream)]/40 hover:bg-[var(--cream)]/20 cursor-pointer"
                    : "bg-black/30 border-[var(--cream)]/10 cursor-default"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[var(--court-deep)] overflow-hidden">
                  {p.profiles?.photo_url && (
                    <img src={p.profiles.photo_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-[var(--cream)]">
                  {p.profiles?.first_name}{isMe ? tr(" (you)", " (tú)", " (toi)") : ""}
                </span>
              </button>
            );
          })}
          {Array.from({ length: event.extra_confirmed ?? 0 }).map((_, i) => (
            <div key={`x-${i}`} className="flex items-center gap-2 bg-black/20 border border-dashed border-[var(--cream)]/15 rounded-full px-3 py-1.5">
              <span className="text-xs text-[var(--cream)]/60">{tr("+1 friend", "+1 amigo", "+1 ami")}</span>
            </div>
          ))}
          {Array.from({ length: event.needs }).map((_, i) => (
            <button
              key={`o-${i}`}
              type="button"
              onClick={() => { if (canJoin) onJoin(); }}
              disabled={!canJoin}
              title={canJoin ? tr("Tap to join this spot", "Toca para ocupar este hueco", "Appuie pour prendre cette place") : tr("This match doesn't match your profile", "Este partido no encaja con tu perfil", "Ce match ne correspond pas à ton profil")}
              className={`flex items-center gap-2 border border-dashed rounded-full px-3 py-1.5 ${
                canJoin
                  ? "border-[var(--cream)]/60 hover:bg-[var(--cream)]/10 cursor-pointer"
                  : "border-[var(--cream)]/30 opacity-60 cursor-not-allowed"
              }`}
            >
              <span className="text-xs text-[var(--cream)]">
                {canJoin ? tr("Join open spot", "Unirme al hueco", "Rejoindre la place") : tr("Open spot", "Hueco libre", "Place ouverte")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Invitee response */}
      {me?.myInvite && me.myInvite.status === "pending" && !me.iAmParticipant && event.status === "open" && (
        <div className="mt-4 rounded-xl border border-[var(--cream)]/40 bg-[var(--cream)]/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]">{tr("You're invited", "Estás invitado", "Tu es invité·e")}</div>
          <p className="mt-1 text-sm text-[var(--cream)]/80">
            {tr(`${event.host?.first_name ?? "The host"} invited you to this match.`, `${event.host?.first_name ?? "El anfitrión"} te ha invitado a este partido.`)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                try {
                  await respondInvite({ data: { inviteId: me!.myInvite!.id, accept: true } });
                  toast.success(tr("You're in! See you on court 🎾", "¡Estás dentro! Nos vemos en la pista 🎾", "Tu es inscrit·e ! À bientôt sur la pista 🎾"));
                  qc.invalidateQueries({ queryKey: ["event", eventId] });
                } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
              }}
              className="rounded-full bg-[var(--cream)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--court-deep)]"
            >
              {tr("I'm in", "Voy", "Je suis partant·e")}
            </button>
            <button
              onClick={async () => {
                try {
                  await respondInvite({ data: { inviteId: me!.myInvite!.id, accept: false } });
                  toast(tr("No worries — thanks for letting the host know", "Sin problema — gracias por avisar", "Pas de souci — merci d'avoir prévenu l'hôte"));
                  qc.invalidateQueries({ queryKey: ["event", eventId] });
                } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
              }}
              className="rounded-full border border-[var(--cream)]/25 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--cream)]/80"
            >
              {tr("I can't this time", "No puedo esta vez", "Je ne peux pas cette fois")}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 space-y-2">
        {canJoin && (
          <button
            onClick={onJoin}
            className="w-full py-3 rounded-full bg-[var(--cream)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold"
          >
            {tr("Join this match", "Unirme al partido", "Rejoindre ce match")}
          </button>
        )}
        {me?.iAmParticipant && !me?.iAmHost && (
          <button
            onClick={onLeave}
            className="w-full py-2 rounded-full border border-[var(--cream)]/20 text-xs uppercase tracking-widest text-[var(--cream)]/70"
          >
            {tr("Leave match", "Salir del partido", "Quitter le match")}
          </button>
        )}
        {me?.iAmHost && event.status !== "cancelled" && (
          <>
            <button
              onClick={() => setInviteOpen(true)}
              className="w-full py-3 rounded-full bg-[var(--cream)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> {tr("Invite players", "Invitar jugadores", "Inviter des joueurs")}
            </button>
            <button
              onClick={() => navigate({ to: "/app/events/$eventId/edit", params: { eventId } })}
              className="w-full py-2 rounded-full border border-[var(--cream)]/60 text-xs uppercase tracking-widest text-[var(--cream)]"
            >
              {tr("Edit match", "Editar partido", "Modifier le match")}
            </button>
            <button
              onClick={onToggleBooked}
              className="w-full py-2 rounded-full border border-[var(--cream)]/20 text-xs uppercase tracking-widest text-[var(--cream)]/80"
            >
              {event.court_booked ? tr("Mark court not booked", "Marcar pista como no reservada", "Marquer pista non réservée") : tr("Mark court booked ✅", "Marcar pista reservada ✅", "Marquer pista réservée ✅")}
            </button>
          </>
        )}
        {!canJoin && !me?.iAmParticipant && event.status === "open" && event.needs > 0 && !me?.myInvite && (
          <p className="text-xs text-[var(--cream)]/50 text-center">
            {event.lock_active
              ? tr("This match is reserved for invited players right now.", "Este partido está reservado para invitados ahora mismo.", "Ce match est réservé aux joueurs invités pour l'instant.")
              : tr("This match doesn't match your profile settings.", "Este partido no encaja con tu perfil.", "Ce match ne correspond pas aux réglages de ton profil.")}
          </p>
        )}
      </div>

      {/* Invite panel */}
      {inviteOpen && (
        <InvitePanel
          eventId={eventId}
          onClose={() => setInviteOpen(false)}
          listConns={listConns}
          invitePeople={invitePeople}
          createLink={createInviteLink}
          revokeInvite={revokeInvite}
          invites={event.invites ?? []}
          tr={tr}
        />
      )}

      {/* Chat — auto-opens for participants once at least 2 players joined */}
      {me?.iAmParticipant && (event.participants?.length ?? 0) >= 2 && (

        <div id="event-chat" className="mt-6 scroll-mt-6">
          <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-2">{tr("Group chat", "Chat del grupo", "Chat de groupe")}</div>
          <div
            ref={scrollRef}
            className="h-72 w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-[var(--cream)]/10 bg-black/30 p-3 space-y-3"
          >
            {msgsQ.data?.messages.length === 0 && (
              <div className="text-center text-xs text-[var(--cream)]/50 py-8">{tr("No messages yet. Say hi!", "Aún no hay mensajes. ¡Saluda!", "Pas encore de messages. Dis bonjour !")}</div>
            )}
            {msgsQ.data?.messages.map((m: any) => {
              const mine = m.sender_profile_id === me?.id;
              const isEditing = editingId === m.id;
              return (
                <div key={m.id} className={`group flex w-full ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div
                      className={`${mine ? "max-w-[min(100%,18rem)]" : "max-w-[min(100%,19rem)]"} min-w-0 rounded-2xl px-3 py-2 text-base ${
                      mine
                        ? "bg-[var(--cream)]/25 text-[var(--cream)]"
                        : "bg-[var(--court-deep)] border border-[var(--cream)]/10 text-[var(--cream)]"
                    }`}
                    >
                      {!mine && !isEditing && (
                        <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-0.5">
                          {m.sender?.first_name}
                        </div>
                      )}
                      {isEditing ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); void onSaveMessage(); }}
                          className="flex w-[min(16rem,72vw)] max-w-full flex-col gap-2"
                        >
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full resize-none rounded-md bg-[var(--court-deep)]/30 p-2 text-base text-[var(--cream)] outline-none ring-1 ring-[var(--cream)]/20 focus:ring-[var(--cream)]/60"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => { setEditingId(null); setEditingText(""); }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--cream)]/10" aria-label="Cancel">
                              <X className="h-4 w-4" />
                            </button>
                            <button type="submit" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cream)] text-[var(--court-deep)]" aria-label="Save">
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="whitespace-pre-wrap break-words">
                          {m.body}
                          {m.edited_at && <span className="ml-1.5 text-[10px] text-[var(--cream)]/50">{tr("(edited)", "(editado)", "(modifié)")}</span>}
                        </div>
                      )}
                    </div>
                    {mine && !isEditing && (
                      <div className="mt-1 flex gap-2 pr-1">
                        <button
                          type="button"
                          onClick={() => { setEditingId(m.id); setEditingText(m.body); }}
                          className="inline-flex h-6 items-center gap-1 rounded-full bg-[var(--cream)]/10 px-2 text-[10px] uppercase tracking-wider text-[var(--cream)] hover:bg-[var(--cream)]/20"
                          aria-label="Edit message"
                        >
                          <Pencil className="h-3 w-3" /> {tr("Edit", "Editar", "Modifier")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(m.id)}
                          className="inline-flex h-6 items-center gap-1 rounded-full bg-[var(--cream)]/10 px-2 text-[10px] uppercase tracking-wider text-[var(--cream)] hover:bg-red-500/20 hover:text-red-300"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3 w-3" /> {tr("Delete", "Borrar", "Supprimer")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid w-full max-w-full grid-cols-[minmax(0,1fr)_auto] gap-2 mt-2 overflow-hidden">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
              placeholder={tr("Message the group…", "Escribe al grupo…", "Écris au groupe…")}
              rows={1}
              enterKeyHint="send"
              className="min-h-10 min-w-0 resize-none overflow-hidden bg-black/30 border border-[var(--cream)]/20 rounded-full px-4 py-2 text-base leading-6 text-[var(--cream)] placeholder:text-[var(--cream)]/40 outline-none focus:ring-1 focus:ring-[var(--cream)]/60"
            />
            <button
              type="button"
              onClick={onSend}
              className="w-10 h-10 shrink-0 rounded-full bg-[var(--cream)] text-[var(--court-deep)] flex items-center justify-center"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-[var(--cream)]/50 mt-2">
            {tr("🎾 For safety, arrange the actual court on Playtomic when possible.", "🎾 Por seguridad, reservad la pista en Playtomic siempre que podáis.", "🎾 Pour la sécurité, organise la pista sur Playtomic quand c'est possible.")}
          </p>
        </div>
      )}
    </div>
  );
}

function shareOriginInvite() {
  if (typeof window === "undefined") return "https://padelmatchapp.lovable.app";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname.includes("preview--") || hostname.includes("id-preview--")) {
    return "https://padelmatchapp.lovable.app";
  }
  return origin;
}

type InvitePanelProps = {
  eventId: string;
  onClose: () => void;
  listConns: (a: { data: { eventId: string } }) => Promise<{ people: Array<{ id: string; first_name: string | null; photo_url: string | null; level: string | null; gender: string | null; invited: boolean; joined: boolean }> }>;
  invitePeople: (a: { data: { eventId: string; profileIds: string[] } }) => Promise<{ invited: number }>;
  createLink: (a: { data: { eventId: string } }) => Promise<{ token: string; id: string }>;
  revokeInvite: (a: { data: { inviteId: string } }) => Promise<{ ok: boolean }>;
  invites: Array<{ id: string; invitee_profile_id: string | null; token: string | null; status: string; invitee?: { first_name?: string | null } | null }>;
  tr: (en: string, es: string, fr?: string) => string;
};

function InvitePanel({ eventId, onClose, listConns, invitePeople, createLink, revokeInvite, invites, tr }: InvitePanelProps) {
  const qc = useQueryClient();
  const connsQ = useQuery({ queryKey: ["invitable", eventId], queryFn: () => listConns({ data: { eventId } }) });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sendInvites = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const r = await invitePeople({ data: { eventId, profileIds: Array.from(selected) } });
      toast.success(tr(`Sent ${r.invited} invite${r.invited === 1 ? "" : "s"}`, `Enviadas ${r.invited} invitaciones`));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["invitable", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const makeLink = async () => {
    setBusy(true);
    try {
      const r = await createLink({ data: { eventId } });
      const url = `${shareOriginInvite()}/m/${eventId}?i=${r.token}`;
      setLinkUrl(url);
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const whatsappUrl = linkUrl
    ? `https://wa.me/?text=${encodeURIComponent(tr(`You're invited to my padel match — tap to join: ${linkUrl}`, `Estás invitado a mi partido de pádel — toca para unirte: ${linkUrl}`))}`
    : null;

  const copyLink = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      toast.success(tr("Link copied", "Enlace copiado", "Lien copié"));
    } catch {
      toast.error(tr("Could not copy the link", "No se pudo copiar el enlace", "Impossible de copier le lien"));
    }
  };

  const people = connsQ.data?.people ?? [];
  const directInvites = invites.filter((i) => i.invitee_profile_id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--court-deep)]/80 px-4 pb-4 pt-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--cream)]/15 bg-[var(--court-deep)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]">{tr("Invite players", "Invitar jugadores", "Inviter des joueurs")}</div>
            <p className="mt-1 text-xs text-[var(--cream)]/70">
              {tr(
                "Invited players get first dibs. The match opens to everyone 10 hours after your first invite.",
                "Los invitados tienen prioridad. El partido se abre a todos 10 horas después de la primera invitación.",
              )}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full border border-[var(--cream)]/20 px-3 py-1 text-xs uppercase tracking-widest text-[var(--cream)]/70">
            {tr("Close", "Cerrar", "Fermer")}
          </button>
        </div>

        {/* From connections */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">
            {tr("From your matches & friends", "De tus matches y amigos", "Depuis tes matches et amis")}
          </div>
          {connsQ.isLoading && <div className="text-xs text-[var(--cream)]/50">{tr("Loading…", "Cargando…", "Chargement…")}</div>}
          {!connsQ.isLoading && people.length === 0 && (
            <p className="text-xs text-[var(--cream)]/50">
              {tr("No connections yet. Use the invite link below to share on WhatsApp.", "Aún no tienes conexiones. Usa el enlace de abajo para compartir por WhatsApp.", "Pas encore de connexions. Utilise le lien d'invitation ci-dessous pour partager sur WhatsApp.")}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {people.map((p) => {
              const sel = selected.has(p.id);
              const disabled = p.invited || p.joined;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(p.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                    disabled
                      ? "border-[var(--cream)]/10 bg-black/20 opacity-60"
                      : sel
                      ? "border-[var(--cream)] bg-[var(--cream)]/15"
                      : "border-[var(--cream)]/15 bg-black/30 hover:border-[var(--cream)]/50"
                  }`}
                >
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-[var(--court-deep)]">
                    {p.photo_url && <img src={p.photo_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="w-full truncate text-xs text-[var(--cream)]">{p.first_name ?? "—"}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50">
                    {p.joined ? tr("Joined", "Unido", "Inscrit") : p.invited ? tr("Invited", "Invitado", "Invité") : p.level ?? ""}
                  </div>
                </button>
              );
            })}
          </div>
          {selected.size > 0 && (
            <button
              onClick={sendInvites}
              disabled={busy}
              className="mt-3 w-full rounded-full bg-[var(--cream)] py-3 text-xs font-semibold uppercase tracking-widest text-[var(--court-deep)] disabled:opacity-50"
            >
              {tr(`Send ${selected.size} invite${selected.size === 1 ? "" : "s"}`, `Enviar ${selected.size} invitaciones`)}
            </button>
          )}
        </div>

        {/* Invite link */}
        <div className="mt-5 border-t border-[var(--cream)]/10 pt-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">
            {tr("Share an invite link", "Compartir enlace de invitación", "Partager un lien d'invitation")}
          </div>
          {!linkUrl ? (
            <button
              onClick={makeLink}
              disabled={busy}
              className="w-full rounded-full border border-[var(--cream)]/60 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--cream)] disabled:opacity-50"
            >
              {tr("Create WhatsApp invite link", "Crear enlace para WhatsApp", "Créer un lien d'invitation WhatsApp")}
            </button>
          ) : (
            <>
              <input
                readOnly
                value={linkUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-full border border-[var(--cream)]/20 bg-black/30 px-4 py-2 text-xs text-[var(--cream)] outline-none"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a
                  href={whatsappUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#25D366] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[var(--court-deep)]"
                >
                  {tr("Send on WhatsApp", "Enviar por WhatsApp", "Envoyer sur WhatsApp")}
                </a>
                <button
                  onClick={copyLink}
                  className="rounded-full border border-[var(--cream)]/50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--cream)]"
                >
                  {tr("Copy link", "Copiar enlace", "Copier le lien")}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-[var(--cream)]/50">
                {tr(
                  "Anyone who opens this link and signs in gets priority to join.",
                  "Cualquiera que abra este enlace e inicie sesión tendrá prioridad para unirse.",
                )}
              </p>
            </>
          )}
        </div>

        {/* Existing invites */}
        {directInvites.length > 0 && (
          <div className="mt-5 border-t border-[var(--cream)]/10 pt-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">
              {tr("Invites sent", "Invitaciones enviadas", "Invitations envoyées")}
            </div>
            <ul className="space-y-1.5">
              {directInvites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-2">
                  <div className="text-sm text-[var(--cream)]">
                    {inv.invitee?.first_name ?? "—"}
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-[var(--cream)]/50">
                      {inv.status === "accepted"
                        ? tr("Accepted", "Aceptada", "Accepté")
                        : inv.status === "declined"
                        ? tr("Can't this time", "No puede", "Pas cette fois")
                        : tr("Pending", "Pendiente", "En attente")}
                    </span>
                  </div>
                  {inv.status === "pending" && (
                    <button
                      onClick={async () => {
                        await revokeInvite({ data: { inviteId: inv.id } });
                        qc.invalidateQueries({ queryKey: ["event", eventId] });
                        qc.invalidateQueries({ queryKey: ["invitable", eventId] });
                      }}
                      className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 hover:text-red-300"
                    >
                      {tr("Cancel", "Cancelar", "Annuler")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
