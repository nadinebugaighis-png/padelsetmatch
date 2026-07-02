import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelMatchEvent,
  deleteMatchEvent,
  getMatchEvent,
  joinMatchEvent,
  leaveMatchEvent,
  listEventMessages,
  sendEventMessage,
  updateMatchEvent,
} from "@/lib/match-events.functions";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Send, ExternalLink, ArrowLeft, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/app/events/$eventId")({
  component: EventDetail,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const eventQ = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => get({ data: { id: eventId } }),
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_event_messages", filter: `match_event_id=eq.${eventId}` }, () => {
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

  const onToggleBooked = async () => {
    await update({ data: { id: eventId, court_booked: !event.court_booked } });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };

  return (
    <div className="max-w-md mx-auto px-5 py-4 pb-32">
      <Link to="/app/events" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-3">
        <ArrowLeft className="w-4 h-4" /> All matches
      </Link>

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
          {(event.participants ?? []).map((p: any) => (
            <div key={p.profile_id} className="flex items-center gap-2 bg-black/30 border border-[var(--cream)]/10 rounded-full pl-1 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-[var(--court-deep)] overflow-hidden">
                {p.profiles?.photo_url && (
                  <img src={p.profiles.photo_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="text-xs text-[var(--cream)]">{p.profiles?.first_name}</span>
            </div>
          ))}
          {Array.from({ length: event.extra_confirmed ?? 0 }).map((_, i) => (
            <div key={`x-${i}`} className="flex items-center gap-2 bg-black/20 border border-dashed border-[var(--cream)]/15 rounded-full px-3 py-1.5">
              <span className="text-xs text-[var(--cream)]/60">+1 friend</span>
            </div>
          ))}
          {Array.from({ length: event.needs }).map((_, i) => (
            <div key={`o-${i}`} className="flex items-center gap-2 bg-transparent border border-dashed border-[var(--ball)]/40 rounded-full px-3 py-1.5">
              <span className="text-xs text-[var(--ball)]">Open spot</span>
            </div>
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
        {me?.iAmParticipant && (
          <a
            href="#event-chat"
            className="w-full py-3 rounded-full border border-[var(--ball)]/50 text-[var(--ball)] text-sm uppercase tracking-widest font-semibold inline-flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Open chat room
          </a>
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
            <div className="flex gap-2">
              <button
                onClick={onToggleBooked}
                className="flex-1 py-2 rounded-full border border-[var(--cream)]/20 text-xs uppercase tracking-widest text-[var(--cream)]/80"
              >
                {event.court_booked ? "Mark court not booked" : "Mark court booked ✅"}
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-full border border-red-500/30 text-xs uppercase tracking-widest text-red-300"
              >
                Cancel
              </button>
            </div>
            <button
              onClick={onDelete}
              className="w-full py-2 rounded-full border border-red-500/40 text-xs uppercase tracking-widest text-red-300"
            >
              Delete match
            </button>
          </>
        )}
        {!canJoin && !me?.iAmParticipant && event.status === "open" && event.needs > 0 && (
          <p className="text-xs text-[var(--cream)]/50 text-center">This match doesn't match your profile settings.</p>
        )}
      </div>

      {/* Chat — visible to participants */}
      {me?.iAmParticipant && (
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
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-[var(--ball)]/25 text-[var(--cream)]"
                        : "bg-[var(--court-deep)] border border-[var(--cream)]/10 text-[var(--cream)]"
                    }`}
                  >
                    {!mine && (
                      <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-0.5">
                        {m.sender?.first_name}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder="Message the group…"
              className="flex-1 bg-black/30 border border-[var(--cream)]/20 rounded-full px-4 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream)]/40"
            />
            <button
              onClick={onSend}
              className="w-10 h-10 rounded-full bg-[var(--ball)] text-[var(--court-deep)] flex items-center justify-center"
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
