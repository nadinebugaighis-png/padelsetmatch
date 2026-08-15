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
  createShortLink,
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
  transferMatchHost,
  updateMatchEvent,
} from "@/lib/match-events.functions";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Send, ExternalLink, ArrowLeft, Share2, Pencil, Trash2, X, Check, UserPlus, Clock } from "lucide-react";
import { useTr, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/events/$eventId")({
  validateSearch: (s: Record<string, unknown>): { i?: string } => ({
    i: typeof s.i === "string" ? s.i : undefined,
  }),
  component: EventRoute,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--ink)]/70">{error.message}</div>,
  notFoundComponent: () => <NotFoundBlock />,
});

function NotFoundBlock() {
  const tr = useTr();
  return <div className="p-6 text-[var(--ink)]/70">{tr("Not found", "No encontrado", "Introuvable")}</div>;
}

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
  const { label } = useI18n();
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
  const shorten = useServerFn(createShortLink);
  const listConns = useServerFn(listInvitableConnections);
  const respondInvite = useServerFn(respondToMatchInvite);
  const revokeInvite = useServerFn(revokeMatchInvite);
  const claimInvite = useServerFn(claimMatchInviteByToken);
  const transferHost = useServerFn(transferMatchHost);
  const [transferOpen, setTransferOpen] = useState(false);

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
  const [shortShareUrl, setShortShareUrl] = useState<string | null>(null);
  const [shortShareBusy, setShortShareBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgsQ.data]);

  const shareUrl = `${shareOrigin()}/m/${eventId}`;

  // Create a short link for the share sheet so the WhatsApp preview and link stay compact.
  // MUST be declared before any early return so React sees the same hook order every render.
  useEffect(() => {
    if (!shareOpen) {
      setShortShareUrl(null);
      return;
    }
    let cancelled = false;
    setShortShareBusy(true);
    shorten({ data: { targetUrl: shareUrl } })
      .then((r) => {
        if (!cancelled) setShortShareUrl(`${shareOrigin()}${r.shortUrl}`);
      })
      .catch(() => {
        if (!cancelled) setShortShareUrl(shareUrl);
      })
      .finally(() => {
        if (!cancelled) setShortShareBusy(false);
      });
    return () => { cancelled = true; };
  }, [shareOpen, shareUrl, shorten]);

  if (eventQ.isLoading) return <div className="p-6 text-center text-[var(--ink)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</div>;
  const event: any = eventQ.data?.event;
  const me = eventQ.data?.me;
  if (!event) return <div className="p-6 text-center text-[var(--ink)]/60">{tr("Match not found", "Partido no encontrado", "Match introuvable")}</div>;

  const mapsUrl = event.club_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.club_name)}&query_place_id=${event.club_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.club_name + " " + (event.city ?? ""))}`;
  const shareText = tr(
    `Join my padel match on PadelSetMatch — ${event.club_name} · ${fmtWhen(event.starts_at)}`,
    `Únete a mi partido de pádel en PadelSetMatch — ${event.club_name} · ${fmtWhen(event.starts_at)}`,
  );

  const displayShareUrl = shortShareUrl || shareUrl;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(displayShareUrl);
      toast.success(tr("Share link copied", "Enlace copiado", "Lien copié"));
    } catch {
      toast.error(tr("Could not copy the link", "No se pudo copiar el enlace", "Impossible de copier le lien"));
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "PadelSetMatch", text: shareText, url: shortShareUrl || shareUrl });
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
      toast.error(msg || tr("Could not join", "No te pudimos unir", "Impossible de rejoindre"));
    }

  };

  const onLeave = async () => {
    if (!confirm(tr("Leave this match? Your spot will open up for someone else.", "¿Salir de este partido? Tu plaza quedará libre para otro jugador.", "Quitter ce match ? Ta place sera libérée pour un autre joueur."))) return;
    try {
      await leave({ data: { id: eventId } });
      toast.success(tr("You left the match. Thanks for letting the group know.", "Has salido del partido. Gracias por avisar al grupo.", "Tu as quitté le match. Merci d'avoir prévenu le groupe."));
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["open-events"] });
      qc.invalidateQueries({ queryKey: ["my-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not leave — please try again.", "No se pudo salir — inténtalo de nuevo.", "Impossible de quitter — réessaie."));
    }
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

  const onTransferHost = async (newHostProfileId: string, name: string) => {
    if (!confirm(tr(`Pass hosting to ${name}? You'll stay in the match as a player.`, `¿Pasar la organización a ${name}? Seguirás en el partido como jugador.`, `Passer l'organisation à ${name} ? Tu resteras dans le match comme joueur.`))) return;
    try {
      await transferHost({ data: { id: eventId, new_host_profile_id: newHostProfileId } });
      toast.success(tr("Hosting passed", "Organización traspasada", "Organisation transférée"));
      setTransferOpen(false);
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Couldn't transfer", "No se pudo traspasar", "Impossible de transférer"));
    }
  };

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-3xl max-w-[100dvw] overflow-x-hidden px-5 sm:px-6 py-4 sm:py-6 pb-32">

      <div className="flex items-center justify-between mb-4">
        <Link to="/app/events" className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]/60 hover:text-[var(--ink)] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> {tr("All matches", "Todos los partidos", "Tous les matches")}
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)] border border-[var(--ink)]/20 hover:border-[var(--ink)]/40 rounded-full px-3.5 py-1.5 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" /> {tr("Share", "Compartir", "Partager")}
        </button>
      </div>

      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/45 px-4 pb-4 pt-10"
          onClick={() => setShareOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tr("Share match", "Compartir partido", "Partager le match")}
            className="w-full max-w-md rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper-2)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--ink)]">{tr("Share match", "Compartir partido", "Partager le match")}</div>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="rounded-full border border-[var(--ink)]/15 px-3 py-1 text-xs uppercase tracking-widest text-[var(--ink)]/70"
              >
                {tr("Close", "Cerrar", "Fermer")}
              </button>
            </div>
            <input
              readOnly
              value={displayShareUrl}
              onFocus={(e) => e.currentTarget.select()}
              disabled={shortShareBusy}
              className="mt-4 w-full rounded-full border border-[var(--ink)]/15 bg-white px-4 py-2 text-sm text-[var(--ink)] outline-none disabled:opacity-60"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={displayShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[var(--ink)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[var(--paper)]"
              >
                {tr("Open link", "Abrir enlace", "Ouvrir le lien")}
              </a>
              <button
                type="button"
                onClick={copyShareLink}
                className="rounded-full border border-[var(--ink)]/25 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink)]"
              >
                {tr("Copy link", "Copiar enlace", "Copier le lien")}
              </button>
            </div>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={nativeShare}
                className="mt-2 w-full rounded-full border border-[var(--ink)]/15 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink)]/80"
              >
                {tr("Share with phone", "Compartir desde el móvil", "Partager avec le téléphone")}
              </button>
            )}
          </div>
        </div>
      )}

      {(() => {
        const d = new Date(event.starts_at);
        const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
        const day = d.toLocaleDateString(undefined, { day: "numeric" });
        const monthYear = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        const statusChip =
          event.status === "cancelled"
            ? { cls: "bg-red-500/20 text-red-100 border-red-400/30", label: tr("Cancelled", "Cancelado", "Annulé") }
            : event.needs === 0
            ? { cls: "bg-[var(--paper)]/15 text-[var(--paper)] border-[var(--paper)]/30", label: tr("Full", "Completo", "Complet") }
            : { cls: "bg-[var(--grass)] text-[var(--ink)] border-[var(--grass)]", label: tr(`Needs ${event.needs}`, `Faltan ${event.needs}`) };
        return (
          <section className="rounded-2xl border border-[var(--ink)]/15 bg-white shadow-[0_1px_0_rgba(15,62,46,0.04),0_10px_30px_-18px_rgba(15,62,46,0.25)] overflow-hidden">
            {/* Date banner — ink background for strong contrast */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch border-b border-[var(--ink)]/15 bg-[var(--ink)]">
              <div className="flex flex-col items-center justify-center px-4 sm:px-6 py-3 sm:py-4 border-r border-[var(--paper)]/15 min-w-[92px] sm:min-w-[120px] shrink-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--paper)]/70">{weekday}</div>
                <div className="text-serif text-4xl sm:text-5xl leading-none text-[var(--paper)] mt-0.5">{day}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--paper)]/70 mt-1">{monthYear}</div>
              </div>
              <div className="min-w-0 flex flex-col justify-between px-4 sm:px-6 py-3 sm:py-4 gap-1">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--paper)]/70 truncate">{tr("Match at", "Partido en", "Match à")}</div>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${statusChip.cls}`}>
                    {statusChip.label}
                  </span>
                </div>
                <h1 className="text-serif text-xl sm:text-2xl leading-tight text-[var(--paper)] truncate mt-1">{event.club_name}</h1>
                <div className="text-[11px] sm:text-xs text-[var(--paper)]/70 truncate">{event.club_address ?? event.city ?? ""}</div>
              </div>
            </div>

            {/* Meta strip */}
            <div className="grid grid-cols-3 divide-x divide-[var(--ink)]/10 border-b border-[var(--ink)]/10 text-center bg-[var(--paper-2)]/40">
              <div className="px-2 py-3 sm:py-4 min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/70">{tr("Time", "Hora", "Heure")}</div>
                <div className="text-sm sm:text-base font-semibold text-[var(--ink)] mt-0.5 truncate">{time}</div>
              </div>
              <div className="px-2 py-3 sm:py-4 min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/70">{tr("Players", "Jugadores", "Joueurs")}</div>
                <div className="text-sm sm:text-base font-semibold text-[var(--ink)] mt-0.5">{event.filled}<span className="text-[var(--ink)]/50">/4</span></div>
              </div>
              <div className="px-2 py-3 sm:py-4 min-w-0 flex flex-col justify-center">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/70">{tr("Level", "Nivel", "Niveau")}</div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--ink)] mt-0.5 leading-tight whitespace-normal break-words">
                  {label(event.level_min)}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--plum)]" />
                {genderLabel}
                <span className="text-[var(--ink)]/40">·</span>
                <span className={event.court_booked ? "text-[var(--ink)] font-semibold" : "text-[var(--ink)]/80"}>
                  {event.court_booked ? tr("Court booked", "Pista reservada", "Pista réservée") : tr("Court to book", "Falta pista", "Pista à réserver")}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[var(--ink)] hover:text-[var(--plum)] transition-colors font-medium"
                >
                  <MapPin className="w-3.5 h-3.5" /> {tr("Google Maps", "Google Maps", "Google Maps")}
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
                {event.playtomic_link && (() => {
                  const safe = normalizePlaytomicLink(event.playtomic_link).url;
                  if (!safe) return null;
                  return (
                    <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--ink)] hover:text-[var(--plum)] transition-colors font-medium">
                      Playtomic <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  );
                })()}
              </div>

              {event.note && (
                <p className="text-sm text-[var(--ink)] whitespace-pre-wrap pt-1 border-t border-[var(--ink)]/10">
                  {event.note}
                </p>
              )}
            </div>

            {event.is_private_court && me?.id !== event.host_profile_id && (
              <div className="flex items-start gap-2 border-t border-[var(--ink)]/15 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                <span aria-hidden className="mt-0.5 text-sm leading-none">⚠️</span>
                <div>
                  <div className="uppercase tracking-[0.2em] text-[10px] font-semibold text-amber-900">
                    {tr("Private court", "Pista privada", "Terrain privé")}
                  </div>
                  <div className="mt-0.5 leading-relaxed">
                    {tr(
                      "This match is at a private residence. Confirm the host in chat before heading over, share your location with a friend, and meet in daylight when possible.",
                      "Este partido es en un domicilio privado. Confirma con el organizador por chat antes de ir, comparte tu ubicación con alguien de confianza y, si puedes, queda con luz de día.",
                      "Ce match a lieu dans une résidence privée. Confirme avec l'hôte par chat avant de t'y rendre, partage ta position avec un proche et privilégie la lumière du jour.",
                    )}
                  </div>
                </div>
              </div>
            )}



          </section>
        );
      })()}


      {/* Players */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/60">{tr("Lineup", "Alineación", "Composition")}</div>
          <div className="flex-1 h-px bg-[var(--ink)]/10" />
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50">{event.filled}/4</div>
        </div>
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
                title={isMe && !isHost ? tr("Tap to leave the match", "Pulsa para salir del partido", "Appuie pour quitter le match") : ""}
                className={`flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 ${
                  isMe && !isHost
                    ? "bg-[var(--ink)]/5 border-[var(--ink)]/25 hover:bg-[var(--ink)]/10 cursor-pointer"
                    : "bg-white border-[var(--ink)]/10 cursor-default"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[var(--paper-2)] overflow-hidden">
                  {p.profiles?.photo_url && (
                    <img src={p.profiles.photo_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-[var(--ink)]">
                  {p.profiles?.first_name}{isMe ? tr(" (you)", " (tú)", " (toi)") : ""}
                </span>
              </button>
            );
          })}
          {Array.from({ length: event.extra_confirmed ?? 0 }).map((_, i) => (
            <div key={`x-${i}`} className="flex items-center gap-2 bg-[var(--paper-2)]/60 border border-dashed border-[var(--ink)]/10 rounded-full px-3 py-1.5">
              <span className="text-xs text-[var(--ink)]/60">{tr("+1 friend", "+1 amigo", "+1 ami")}</span>
            </div>
          ))}
          {Array.from({ length: event.needs }).map((_, i) => (
            <button
              key={`o-${i}`}
              type="button"
              onClick={() => { if (canJoin) onJoin(); }}
              disabled={!canJoin}
              title={canJoin ? tr("Tap to join this spot", "Pulsa para ocupar este hueco", "Appuie pour prendre cette place") : tr("This match doesn't match your profile", "Este partido no encaja con tu perfil", "Ce match ne correspond pas à ton profil")}
              className={`flex items-center gap-2 border border-dashed rounded-full px-3 py-1.5 ${
                canJoin
                  ? "border-[var(--ink)]/30 hover:bg-[var(--ink)]/5 cursor-pointer"
                  : "border-[var(--ink)]/20 opacity-60 cursor-not-allowed"
              }`}
            >
              <span className="text-xs text-[var(--ink)]">
                {canJoin ? tr("Join open spot", "Unirme al hueco", "Rejoindre la place") : tr("Open spot", "Hueco libre", "Place ouverte")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Invitee response */}
      {me?.myInvite && me.myInvite.status === "pending" && !me.iAmParticipant && event.status === "open" && (
        <div className="mt-4 rounded-xl border border-[var(--ink)]/25 bg-[var(--ink)]/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]">{tr("You're invited", "Estás invitado", "Tu es invité·e")}</div>
          <p className="mt-1 text-sm text-[var(--ink)]/80">
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
              className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--paper)]"
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
              className="rounded-full border border-[var(--ink)]/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--ink)]/80"
            >
              {tr("I can't this time", "No puedo esta vez", "Je ne peux pas cette fois")}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-2">
        {canJoin && (
          <button
            onClick={onJoin}
            className="w-full py-3.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs uppercase tracking-[0.22em] font-semibold shadow-[0_10px_24px_-14px_rgba(15,62,46,0.6)] active:scale-[0.99] transition-transform"
          >
            {tr("Join this match", "Unirme al partido", "Rejoindre ce match")}
          </button>
        )}
        {me?.iAmParticipant && !me?.iAmHost && (
          <button
            onClick={onLeave}
            className="w-full py-2.5 rounded-full border border-[var(--ink)]/15 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]/70 hover:bg-[var(--ink)]/5 transition-colors"
          >
            {tr("Leave match", "Salir del partido", "Quitter le match")}
          </button>
        )}
        {me?.iAmHost && event.status !== "cancelled" && (
          <>
            <button
              onClick={() => setInviteOpen(true)}
              className="w-full py-3.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs uppercase tracking-[0.22em] font-semibold shadow-[0_10px_24px_-14px_rgba(15,62,46,0.6)] active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> {tr("Invite players", "Invitar jugadores", "Inviter des joueurs")}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate({ to: "/app/events/$eventId/edit", params: { eventId } })}
                className="py-2.5 rounded-full border border-[var(--ink)]/25 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)] hover:bg-[var(--ink)]/5 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" /> {tr("Edit", "Editar", "Modifier")}
              </button>
              <button
                onClick={onToggleBooked}
                className={`py-2.5 rounded-full text-[11px] uppercase tracking-[0.22em] transition-colors inline-flex items-center justify-center gap-1.5 ${
                  event.court_booked
                    ? "bg-[var(--grass)]/30 text-[var(--ink)] border border-[var(--ink)]/15 hover:bg-[var(--grass)]/40"
                    : "border border-[var(--ink)]/25 text-[var(--ink)] hover:bg-[var(--ink)]/5"
                }`}
              >
                {event.court_booked ? <><Check className="w-3.5 h-3.5" /> {tr("Booked", "Reservada", "Réservée")}</> : tr("Mark booked", "Marcar reservada", "Marquer réservée")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onCancel}
                className="py-2.5 rounded-full border border-[var(--ink)]/25 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]/70 hover:bg-[var(--ink)]/5 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> {tr("Cancel match", "Cancelar partido", "Annuler")}
              </button>
              <button
                onClick={onDelete}
                className="py-2.5 rounded-full border border-red-400/50 text-[11px] uppercase tracking-[0.22em] text-red-500 hover:bg-red-500/5 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> {tr("Delete", "Eliminar", "Supprimer")}
              </button>
            </div>
            {(event.participants?.length ?? 0) > 0 && (
              <button
                onClick={() => setTransferOpen(true)}
                className="w-full py-2.5 rounded-full border border-[var(--ink)]/25 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]/70 hover:bg-[var(--ink)]/5 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> {tr("Pass hosting to a player", "Pasar la organización a un jugador", "Transférer l'organisation à un joueur")}
              </button>
            )}
          </>
        )}
        {me?.iAmHost && event.status === "cancelled" && (
          <button
            onClick={onDelete}
            className="w-full py-2.5 rounded-full border border-red-400/50 text-[11px] uppercase tracking-[0.22em] text-red-500 hover:bg-red-500/5 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> {tr("Delete match", "Eliminar partido", "Supprimer le match")}
          </button>
        )}
        {!canJoin && !me?.iAmParticipant && event.status === "open" && event.needs > 0 && !me?.myInvite && (
          <p className="text-[11px] text-[var(--ink)]/50 text-center italic pt-1">
            {tr("This match doesn't match your profile settings.", "Este partido no encaja con tu perfil.", "Ce match ne correspond pas aux réglages de ton profil.")}
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
          shorten={shorten}
          revokeInvite={revokeInvite}
          invites={event.invites ?? []}
          tr={tr}
        />
      )}

      {transferOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setTransferOpen(false)}>
          <div className="w-full max-w-md bg-[var(--paper)] rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--ink)]">{tr("Pass hosting to…", "Pasar la organización a…", "Transférer l'organisation à…")}</h3>
              <button onClick={() => setTransferOpen(false)} className="text-[var(--ink)]/50 hover:text-[var(--ink)]"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] text-[var(--ink)]/60 mb-3">
              {tr("You'll stay in the match as a regular player.", "Seguirás en el partido como jugador.", "Tu resteras dans le match comme joueur.")}
            </p>
            <div className="space-y-2">
              {(event.participants ?? []).map((p: any) => {
                const prof = p.profiles;
                if (!prof) return null;
                return (
                  <button
                    key={prof.id}
                    onClick={() => onTransferHost(prof.id, prof.first_name ?? "")}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--ink)]/5 transition-colors text-left"
                  >
                    {prof.photo_url ? (
                      <img src={prof.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--ink)]/10" />
                    )}
                    <div className="text-sm text-[var(--ink)]">{prof.first_name}</div>
                  </button>
                );
              })}
              {(event.participants?.length ?? 0) === 0 && (
                <p className="text-xs text-[var(--ink)]/50 italic">{tr("No joined players yet.", "Aún no hay jugadores.", "Pas encore de joueurs.")}</p>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Chat — auto-opens for participants once at least 2 players joined */}
      {me?.iAmParticipant && (event.participants?.length ?? 0) >= 2 && (

        <div id="event-chat" className="mt-6 scroll-mt-6">
          <div className="text-xs uppercase tracking-widest text-[var(--ink)]/60 mb-2">{tr("Group chat", "Chat del grupo", "Chat de groupe")}</div>
          <div
            ref={scrollRef}
            className="h-72 w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-[var(--ink)]/10 bg-white p-3 space-y-3"
          >
            {msgsQ.data?.messages.length === 0 && (
              <div className="text-center text-xs text-[var(--ink)]/50 py-8">{tr("No messages yet. Say hi!", "Aún no hay mensajes. ¡Saluda!", "Pas encore de messages. Dis bonjour !")}</div>
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
                        ? "bg-[var(--grass)]/30 text-[var(--ink)]"
                        : "bg-[var(--paper-2)] border border-[var(--ink)]/10 text-[var(--ink)]"
                    }`}
                    >
                      {!mine && !isEditing && (
                        <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 mb-0.5">
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
                            className="w-full resize-none rounded-md bg-[var(--paper-2)]/70 p-2 text-base text-[var(--ink)] outline-none ring-1 ring-[var(--ink)]/15 focus:ring-[var(--ink)]/40"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => { setEditingId(null); setEditingText(""); }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--ink)]/5" aria-label="Cancel">
                              <X className="h-4 w-4" />
                            </button>
                            <button type="submit" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ink)] text-[var(--paper)]" aria-label="Save">
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="whitespace-pre-wrap break-words">
                          {m.body}
                          {m.edited_at && <span className="ml-1.5 text-[10px] text-[var(--ink)]/50">{tr("(edited)", "(editado)", "(modifié)")}</span>}
                        </div>
                      )}
                    </div>
                    {mine && !isEditing && (
                      <div className="mt-1 flex gap-1.5 pr-1">
                        <button
                          type="button"
                          onClick={() => { setEditingId(m.id); setEditingText(m.body); }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ink)]/5 text-[var(--ink)] hover:bg-[var(--ink)]/10"
                          aria-label={tr("Edit", "Editar", "Modifier")}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(m.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ink)]/5 text-[var(--ink)] hover:bg-red-500/20 hover:text-red-500"
                          aria-label={tr("Delete", "Borrar", "Supprimer")}
                        >
                          <Trash2 className="h-3 w-3" />
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
              className="min-h-10 min-w-0 resize-none overflow-hidden bg-white border border-[var(--ink)]/15 rounded-full px-4 py-2 text-base leading-6 text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none focus:ring-1 focus:ring-[var(--ink)]/40"
            />
            <button
              type="button"
              onClick={onSend}
              className="w-10 h-10 shrink-0 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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
  shorten: (a: { data: { targetUrl: string } }) => Promise<{ code: string; shortUrl: string }>;
  revokeInvite: (a: { data: { inviteId: string } }) => Promise<{ ok: boolean }>;
  invites: Array<{ id: string; invitee_profile_id: string | null; token: string | null; status: string; invitee?: { first_name?: string | null } | null }>;
  tr: (en: string, es: string, fr?: string) => string;
};

function InvitePanel({ eventId, onClose, listConns, invitePeople, createLink, shorten, revokeInvite, invites, tr }: InvitePanelProps) {
  const qc = useQueryClient();
  const connsQ = useQuery({ queryKey: ["invitable", eventId], queryFn: () => listConns({ data: { eventId } }) });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [shortLinkUrl, setShortLinkUrl] = useState<string | null>(null);
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
      const longUrl = `${shareOriginInvite()}/m/${eventId}?i=${r.token}`;
      setLinkUrl(longUrl);
      try {
        const s = await shorten({ data: { targetUrl: longUrl } });
        setShortLinkUrl(`${shareOriginInvite()}${s.shortUrl}`);
      } catch {
        setShortLinkUrl(longUrl);
      }
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const displayLink = shortLinkUrl || linkUrl;
  const whatsappUrl = displayLink
    ? `https://wa.me/?text=${encodeURIComponent(tr(`You're invited to my padel match — tap to join: ${displayLink}`, `Estás invitado a mi partido de pádel — toca para unirte: ${displayLink}`))}`
    : null;

  const copyLink = async () => {
    if (!displayLink) return;
    try {
      await navigator.clipboard.writeText(displayLink);
      toast.success(tr("Link copied", "Enlace copiado", "Lien copié"));
    } catch {
      toast.error(tr("Could not copy the link", "No se pudo copiar el enlace", "Impossible de copier le lien"));
    }
  };

  const people = connsQ.data?.people ?? [];
  const directInvites = invites.filter((i) => i.invitee_profile_id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--ink)]/50 backdrop-blur-sm px-0 sm:px-4 pb-0 sm:pb-4 pt-10 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-[var(--ink)]/8 bg-[var(--paper-2)]">
          <div className="mx-auto sm:hidden mb-3 h-1 w-10 rounded-full bg-[var(--ink)]/15" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/50">
                {tr("Match", "Partido", "Match")}
              </div>
              <h2 className="mt-1 font-serif text-2xl leading-tight text-[var(--ink)]">
                {tr("Invite players", "Invitar jugadores", "Inviter des joueurs")}
              </h2>
              <p className="mt-1.5 text-xs text-[var(--ink)]/60 leading-relaxed max-w-sm">
                {tr("First come, first served — anyone can still join.", "Por orden de llegada — cualquiera puede unirse.", "Premier arrivé, premier servi — tout le monde peut rejoindre.")}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label={tr("Close", "Cerrar", "Fermer")}
              className="shrink-0 h-9 w-9 grid place-items-center rounded-full border border-[var(--ink)]/15 bg-[var(--paper)] text-[var(--ink)]/70 hover:bg-[var(--ink)]/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* From connections */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60">
                {tr("Your connections", "Tus conexiones", "Tes connexions")}
              </h3>
              {selected.size > 0 && (
                <span className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60">
                  {selected.size} {tr("selected", "seleccionados", "sélectionnés")}
                </span>
              )}
            </div>

            {connsQ.isLoading && (
              <div className="text-xs text-[var(--ink)]/50">{tr("Loading…", "Cargando…", "Chargement…")}</div>
            )}
            {!connsQ.isLoading && people.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--ink)]/15 bg-[var(--paper-2)]/60 px-4 py-6 text-center">
                <p className="text-xs text-[var(--ink)]/60 leading-relaxed">
                  {tr(
                    "No connections yet — share the invite link below on WhatsApp.",
                    "Aún no tienes conexiones — comparte el enlace de abajo por WhatsApp.",
                    "Pas encore de connexions — partage le lien ci-dessous sur WhatsApp.",
                  )}
                </p>
              </div>
            )}

            {people.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {people.map((p) => {
                  const sel = selected.has(p.id);
                  const disabled = p.invited || p.joined;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(p.id)}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                        disabled
                          ? "border-[var(--ink)]/10 bg-[var(--paper-2)]/50 opacity-60 cursor-not-allowed"
                          : sel
                          ? "border-[var(--ink)] bg-[var(--ink)]/5 shadow-sm"
                          : "border-[var(--ink)]/12 bg-white hover:border-[var(--ink)]/30 hover:-translate-y-0.5"
                      }`}
                    >
                      {sel && !disabled && (
                        <span className="absolute top-1.5 right-1.5 h-5 w-5 grid place-items-center rounded-full bg-[var(--ink)] text-[var(--paper)]">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                      <div className="h-14 w-14 overflow-hidden rounded-full bg-[var(--paper-2)] ring-1 ring-[var(--ink)]/8">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-[var(--ink)]/30 text-sm font-serif">
                            {(p.first_name ?? "?").charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="w-full truncate text-xs font-medium text-[var(--ink)]">
                        {p.first_name ?? "—"}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-[var(--ink)]/50 -mt-1">
                        {p.joined
                          ? tr("Joined", "Unido", "Inscrit")
                          : p.invited
                          ? tr("Invited", "Invitado", "Invité")
                          : p.level ?? ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Invite link */}
          <section className="border-t border-[var(--ink)]/8 pt-5">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60 mb-3">
              {tr("Share an invite link", "Compartir enlace", "Partager un lien")}
            </h3>
            {!linkUrl ? (
              <button
                onClick={makeLink}
                disabled={busy}
                className="w-full rounded-full border border-[var(--ink)]/25 bg-white py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink)] hover:bg-[var(--ink)]/5 transition disabled:opacity-50"
              >
                {tr("Create invite link", "Crear enlace", "Créer un lien")}
              </button>
            ) : (
              <div className="space-y-2.5">
                <input
                  readOnly
                  value={displayLink || ""}
                  disabled={busy && !shortLinkUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-xl border border-[var(--ink)]/15 bg-white px-4 py-2.5 text-xs text-[var(--ink)]/80 outline-none focus:border-[var(--ink)]/40 disabled:opacity-60"
                />
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={whatsappUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#25D366] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-white hover:brightness-95 transition"
                  >
                    {tr("WhatsApp", "WhatsApp", "WhatsApp")}
                  </a>
                  <button
                    onClick={copyLink}
                    className="rounded-full border border-[var(--ink)]/25 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink)] hover:bg-[var(--ink)]/5 transition"
                  >
                    {tr("Copy link", "Copiar", "Copier")}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--ink)]/50 leading-relaxed">
                  {tr(
                    "Anyone who opens this link and signs in gets priority to join.",
                    "Cualquiera que abra este enlace e inicie sesión tendrá prioridad.",
                    "Toute personne qui ouvre ce lien et se connecte est prioritaire.",
                  )}
                </p>
              </div>
            )}
          </section>

          {/* Existing invites */}
          {directInvites.length > 0 && (
            <section className="border-t border-[var(--ink)]/8 pt-5">
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60 mb-3">
                {tr("Invites sent", "Invitaciones enviadas", "Invitations envoyées")}
              </h3>
              <ul className="space-y-1.5">
                {directInvites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--ink)]/8 bg-white px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-[var(--ink)] truncate">
                        {inv.invitee?.first_name ?? "—"}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          inv.status === "accepted"
                            ? "bg-[var(--ink)]/10 text-[var(--ink)]"
                            : inv.status === "declined"
                            ? "bg-[var(--ink)]/5 text-[var(--ink)]/50"
                            : "bg-[var(--paper-2)] text-[var(--ink)]/60"
                        }`}
                      >
                        {inv.status === "accepted"
                          ? tr("Accepted", "Aceptada", "Accepté")
                          : inv.status === "declined"
                          ? tr("Declined", "Rechazada", "Refusé")
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
                        className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 hover:text-red-500 transition"
                      >
                        {tr("Cancel", "Cancelar", "Annuler")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sticky footer send button */}
        {selected.size > 0 && (
          <div className="border-t border-[var(--ink)]/10 bg-[var(--paper)] px-5 py-3.5">
            <button
              onClick={sendInvites}
              disabled={busy}
              className="w-full rounded-full bg-[var(--ink)] py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--paper)] hover:brightness-110 transition disabled:opacity-50"
            >
              {tr(
                `Send ${selected.size} invite${selected.size === 1 ? "" : "s"}`,
                `Enviar ${selected.size} invitación${selected.size === 1 ? "" : "es"}`,
                `Envoyer ${selected.size} invitation${selected.size === 1 ? "" : "s"}`,
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
