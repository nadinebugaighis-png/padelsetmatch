import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Share2 } from "lucide-react";
import { getPublicMatch } from "@/lib/match-events.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/m/$eventId")({
  head: ({ params }) => ({ meta: [{ title: `Padel match — PadelMatch` }, { name: "description", content: `Join this padel match on PadelMatch (${params.eventId.slice(0, 8)}).` }] }),
  component: PublicMatchPage,
});

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function PublicMatchPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const getPublic = useServerFn(getPublicMatch);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  const q = useQuery({
    queryKey: ["public-match", eventId],
    queryFn: () => getPublic({ data: { id: eventId } }),
  });

  const match = q.data?.match;
  const genderLabel = !match ? "" : match.gender_rule === "mixed" ? "Mixed" : match.gender_rule === "men_only" ? "Men only" : "Women only";
  const totalSpots = 4;
  const openSpots = match ? Math.max(0, totalSpots - (match.filled ?? 0)) : 0;

  const onShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "PadelMatch", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* ignore */ }
  };

  const onJoinClick = () => {
    if (hasSession) navigate({ to: "/app/join-setup", search: { join: eventId } as never });
    else navigate({ to: "/auth", search: { join: eventId } as never });
  };

  return (
    <main className="min-h-screen bg-[var(--court-deep)]">
      <div className="max-w-md mx-auto px-5 py-8">
        <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← PadelMatch</Link>

        {q.isLoading && <div className="mt-10 text-center text-[var(--cream)]/60">Loading…</div>}

        {!q.isLoading && !match && (
          <div className="mt-10 text-center text-[var(--cream)]/70">
            <p className="text-lg">This match link isn't available.</p>
            <p className="text-sm text-[var(--cream)]/50 mt-2">It may have been cancelled or already played.</p>
            <Link to="/app/events" className="inline-block mt-6 text-[var(--ball)] underline">Browse open matches</Link>
          </div>
        )}

        {match && (
          <>
            <div className="mt-4 rounded-2xl border border-[var(--cream)]/10 bg-black/30 p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--ball)]">You're invited</div>
              <h1 className="text-2xl text-[var(--cream)] font-medium leading-tight">{match.club_name}</h1>
              {match.club_address && <p className="text-xs text-[var(--cream)]/60">{match.club_address}</p>}

              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--cream)]/80 pt-2">
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtWhen(match.starts_at)}</span>
                <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {match.filled}/{totalSpots}</span>
                {match.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {match.city}</span>}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-[var(--cream)]/10 text-[var(--cream)]/70">{genderLabel}</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-[var(--cream)]/10 text-[var(--cream)]/70">
                  Level {match.level_min} – {match.level_max}
                </span>
              </div>

              {match.note && <p className="text-sm text-[var(--cream)]/80 whitespace-pre-wrap pt-2">{match.note}</p>}

              {match.host?.first_name && (
                <p className="text-xs text-[var(--cream)]/60 pt-2">Hosted by <span className="text-[var(--cream)]">{match.host.first_name}</span></p>
              )}
              {match.participant_names.length > 0 && (
                <p className="text-xs text-[var(--cream)]/60">Playing: {match.participant_names.join(", ")}</p>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={onJoinClick}
                disabled={openSpots === 0}
                className="w-full py-3 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold disabled:opacity-40"
              >
                {openSpots === 0 ? "Match is full" : hasSession ? "Join this match" : "Sign up & join"}
              </button>
              <button onClick={onShare} className="w-full py-3 rounded-full border border-[var(--ball)]/50 text-[var(--ball)] text-sm uppercase tracking-widest inline-flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <p className="text-[11px] text-[var(--cream)]/50 text-center pt-1">
                No long profile needed to join — just your name and padel level.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
