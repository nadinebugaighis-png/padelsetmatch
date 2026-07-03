import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelMatchEvent,
  deleteEventMessage,
  deleteMatchEvent,
  editEventMessage,
  getMatchEvent,
  joinMatchEvent,
  leaveMatchEvent,
  listEventMessages,
  sendEventMessage,
  updateMatchEvent,
} from "@/lib/match-events.functions";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Send, ExternalLink, ArrowLeft, Share2, Pencil, Trash2, X, Check } from "lucide-react";

export const Route = createFileRoute("/app/events/$eventId")({
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
  const navigate = useNavigate();
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
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgsQ.data]);

  if (eventQ.isLoading) return <div className="p-6 text-center text-[var(--cream)]/60">Loading…</div>;
  const event: any = eventQ.data?.event;
  const me = eventQ.data?.me;
  if (!event) return <div className="p-6 text-center text-[var(--cream)]/60">Match not found</div>;

  const mapsUrl = event.club_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.club_name)}&query_place_id=${event.club_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.club_name + " " + (event.city ?? ""))}`;
  const shareUrl = `${shareOrigin()}/m/${eventId}`;
  const shareText = `Join my padel match on PadelMatch — ${event.club_name} · ${fmtWhen(event.starts_at)}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "PadelMatch", text: shareText, url: shareUrl });
    } catch (err: any) {
      if (String(err?.name ?? "") !== "AbortError") await copyShareLink();
    }
  };

  const genderLabel = event.gender_rule === "mixed" ? "Mixed" : event.gender_rule === "men_only" ? "Men only" : "Women only";
  const canJoin =
    !me?.iAmParticipant && event.status === "open" && event.needs > 0 &&
    (event.gender_rule === "mixed"
      || (event.gender_rule === "men_only" && me?.gender === "man")
      || (event.gender_rule === "women_only" && me?.gender === "woman"));

  const onJoin = async () => {
    try {
      await join({ data: { id: eventId } });
      toast.success("You're in!");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["open-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not join");
    }
  };

  const onLeave = async () => {
    await leave({ data: { id: eventId } });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
    qc.invalidateQueries({ queryKey: ["open-events"] });
  };

  const onCancel = async () => {
    if (!confirm("Cancel this match?")) return;
    await cancel({ data: { id: eventId } });
    toast.success("Match cancelled");
    navigate({ to: "/app/events" });
  };

  const onDelete = async () => {
    if (!confirm("Delete this match permanently? This cannot be undone.")) return;
    await deleteEvent({ data: { id: eventId } });
    toast.success("Match deleted");
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
      toast.error(e instanceof Error ? e.message : "Send failed");
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
      toast.error(e instanceof Error ? e.message : "Couldn't edit");
    }
  };

  const onDeleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteMsg({ data: { messageId } });
      qc.invalidateQueries({ queryKey: ["event-msgs", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  const onToggleBooked = async () => {
    await update({ data: { id: eventId, court_booked: !event.court_booked } });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };

  return (
    <div className="mx-auto w-full max-w-md overflow-x-hidden px-5 py-4 pb-32">
      <div className="flex items-center justify-between mb-3">
        <Link to="/app/events" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/60">
          <ArrowLeft className="w-4 h-4" /> All matches
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--ball)] border border-[var(--ball)]/40 rounded-full px-3 py-1"
        >
          <Share2 className="w-3.5 h-3.5" /> Share
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
            aria-label="Share match"
            className="w-full max-w-md rounded-2xl border border-[var(--cream)]/15 bg-[var(--court-deep)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--ball)]">Share match</div>
                <p className="mt-1 text-sm text-[var(--cream)]/70">Send this invitation link so players can join an open spot.</p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="rounded-full border border-[var(--cream)]/20 px-3 py-1 text-xs uppercase tracking-widest text-[var(--cream)]/70"
              >
                Close
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
                className="rounded-full bg-[var(--ball)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[var(--court-deep)]"
              >
                Open link
              </a>
              <button
                type="button"
                onClick={copyShareLink}
                className="rounded-full border border-[var(--ball)]/50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ball)]"
              >
                Copy link
              </button>
            </div>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={nativeShare}
                className="mt-2 w-full rounded-full border border-[var(--cream)]/20 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--cream)]/80"
              >
                Share with phone
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
                : "bg-[var(--ball)]/20 text-[var(--ball)]"
            }`}
          >
            {event.status === "cancelled" ? "Cancelled" : event.needs === 0 ? "Full" : `Needs ${event.needs}`}
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
            Level {event.level_min} – {event.level_max}
          </span>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ball)] hover:underline"
        >
          <MapPin className="w-3.5 h-3.5" /> Open in Google Maps
        </a>

        {event.note && <p className="text-sm text-[var(--cream)]/80 whitespace-pre-wrap">{event.note}</p>}

        <div className="text-xs text-[var(--cream)]/60">
          {event.court_booked ? "✅ Court is booked" : "🔎 Court still needed"}
          {event.playtomic_link && (
            <a href={event.playtomic_link} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-[var(--ball)] hover:underline">
              Playtomic <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-2">Players</div>
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
                title={isMe && !isHost ? "Tap to leave the match" : ""}
                className={`flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 ${
                  isMe && !isHost
                    ? "bg-[var(--ball)]/10 border-[var(--ball)]/40 hover:bg-[var(--ball)]/20 cursor-pointer"
                    : "bg-black/30 border-[var(--cream)]/10 cursor-default"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[var(--court-deep)] overflow-hidden">
                  {p.profiles?.photo_url && (
                    <img src={p.profiles.photo_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-[var(--cream)]">
                  {p.profiles?.first_name}{isMe ? " (you)" : ""}
                </span>
              </button>
            );
          })}
          {Array.from({ length: event.extra_confirmed ?? 0 }).map((_, i) => (
            <div key={`x-${i}`} className="flex items-center gap-2 bg-black/20 border border-dashed border-[var(--cream)]/15 rounded-full px-3 py-1.5">
              <span className="text-xs text-[var(--cream)]/60">+1 friend</span>
            </div>
          ))}
          {Array.from({ length: event.needs }).map((_, i) => (
            <button
              key={`o-${i}`}
              type="button"
              onClick={() => { if (canJoin) onJoin(); }}
              disabled={!canJoin}
              title={canJoin ? "Tap to join this spot" : "This match doesn't match your profile"}
              className={`flex items-center gap-2 border border-dashed rounded-full px-3 py-1.5 ${
                canJoin
                  ? "border-[var(--ball)]/60 hover:bg-[var(--ball)]/10 cursor-pointer"
                  : "border-[var(--ball)]/30 opacity-60 cursor-not-allowed"
              }`}
            >
              <span className="text-xs text-[var(--ball)]">
                {canJoin ? "Join open spot" : "Open spot"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 space-y-2">
        {canJoin && (
          <button
            onClick={onJoin}
            className="w-full py-3 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold"
          >
            Join this match
          </button>
        )}
        {me?.iAmParticipant && !me?.iAmHost && (
          <button
            onClick={onLeave}
            className="w-full py-2 rounded-full border border-[var(--cream)]/20 text-xs uppercase tracking-widest text-[var(--cream)]/70"
          >
            Leave match
          </button>
        )}
        {me?.iAmHost && event.status !== "cancelled" && (
          <>
            <button
              onClick={() => navigate({ to: "/app/events/$eventId/edit", params: { eventId } })}
              className="w-full py-2 rounded-full border border-[var(--ball)]/60 text-xs uppercase tracking-widest text-[var(--ball)]"
            >
              Edit match
            </button>
            <button
              onClick={onToggleBooked}
              className="w-full py-2 rounded-full border border-[var(--cream)]/20 text-xs uppercase tracking-widest text-[var(--cream)]/80"
            >
              {event.court_booked ? "Mark court not booked" : "Mark court booked ✅"}
            </button>
          </>
        )}
        {!canJoin && !me?.iAmParticipant && event.status === "open" && event.needs > 0 && (
          <p className="text-xs text-[var(--cream)]/50 text-center">This match doesn't match your profile settings.</p>
        )}
      </div>

      {/* Chat — auto-opens for participants once at least 2 players joined */}
      {me?.iAmParticipant && (event.participants?.length ?? 0) >= 2 && (

        <div id="event-chat" className="mt-6 scroll-mt-6">
          <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-2">Group chat</div>
          <div
            ref={scrollRef}
            className="rounded-xl border border-[var(--cream)]/10 bg-black/30 p-3 h-72 overflow-y-auto space-y-2"
          >
            {msgsQ.data?.messages.length === 0 && (
              <div className="text-center text-xs text-[var(--cream)]/50 py-8">No messages yet. Say hi!</div>
            )}
            {msgsQ.data?.messages.map((m: any) => {
              const mine = m.sender_profile_id === me?.id;
              const isEditing = editingId === m.id;
              return (
                <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                  {mine && !isEditing && (
                    <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { setEditingId(m.id); setEditingText(m.body); }}
                        className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cream)]/10 text-[var(--cream)] hover:bg-[var(--cream)]/20"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(m.id)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cream)]/10 text-[var(--cream)] hover:bg-red-500/20 hover:text-red-300"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div
                    className={`${mine ? "max-w-[min(72%,16rem)]" : "max-w-[min(80%,18rem)]"} rounded-2xl px-3 py-2 text-base sm:text-sm ${
                      mine
                        ? "bg-[var(--ball)]/25 text-[var(--cream)]"
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
                        className="flex min-w-[min(12rem,66vw)] flex-col gap-2"
                      >
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full resize-none rounded-md bg-[var(--court-deep)]/30 p-2 text-base text-[var(--cream)] outline-none ring-1 ring-[var(--cream)]/20 focus:ring-[var(--ball)]/60"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => { setEditingId(null); setEditingText(""); }} className="grid h-7 w-7 place-items-center rounded-full hover:bg-[var(--cream)]/10" aria-label="Cancel">
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button type="submit" className="grid h-7 w-7 place-items-center rounded-full hover:bg-[var(--cream)]/10" aria-label="Save">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {m.body}
                        {m.edited_at && <span className="ml-1.5 text-[10px] text-[var(--cream)]/50">(edited)</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 mt-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder="Message the group…"
              className="min-w-0 bg-black/30 border border-[var(--cream)]/20 rounded-full px-4 py-2 text-base text-[var(--cream)] placeholder:text-[var(--cream)]/40 outline-none focus:ring-1 focus:ring-[var(--ball)]/60"
            />
            <button
              type="button"
              onClick={onSend}
              className="w-10 h-10 shrink-0 rounded-full bg-[var(--ball)] text-[var(--court-deep)] flex items-center justify-center"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-[var(--cream)]/50 mt-2">
            🎾 For safety, arrange the actual court on Playtomic when possible.
          </p>
        </div>
      )}
    </div>
  );
}
