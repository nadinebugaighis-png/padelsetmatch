import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Share2 } from "lucide-react";
import { getPublicMatch } from "@/lib/match-events.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OG_IMAGE = "https://padelmatchapp.lovable.app/__l5e/assets-v1/d6b898dc-6712-4cd7-be4d-00e90e615ffc/padel-og.jpg";

export const Route = createFileRoute("/m/$eventId")({
  head: () => {
    const title = "Join my padel match — PadelMatch";
    const description = "You're invited to a padel match on PadelMatch. Tap to grab an open spot.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
    };
  },
  component: PublicMatchPage,
});

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
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

function PublicMatchPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const getPublic = useServerFn(getPublicMatch);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

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
  const shareUrl = `${shareOrigin()}/m/${eventId}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "PadelMatch", url: shareUrl });
    } catch (err: any) {
      if (String(err?.name ?? "") !== "AbortError") await copyShareLink();
    }
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

              {/* Players — tap an open spot to join */}
              <div className="pt-3">
                <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-2">Players</div>
                <div className="flex flex-wrap gap-2">
                  {match.participant_names.map((name, i) => (
                    <div key={`p-${i}`} className="flex items-center gap-2 bg-black/30 border border-[var(--cream)]/10 rounded-full px-3 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-[var(--court-deep)]" />
                      <span className="text-xs text-[var(--cream)]">{name}</span>
                    </div>
                  ))}
                  {Array.from({ length: openSpots }).map((_, i) => (
                    <button
                      key={`o-${i}`}
                      type="button"
                      onClick={onJoinClick}
                      className="flex items-center gap-2 border border-dashed border-[var(--ball)]/60 rounded-full px-3 py-1.5 hover:bg-[var(--ball)]/10"
                    >
                      <span className="text-xs text-[var(--ball)]">Join open spot</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={onJoinClick}
                disabled={openSpots === 0}
                className="w-full py-3 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold disabled:opacity-40"
              >
                {openSpots === 0 ? "Match is full" : hasSession ? "Join this match" : "Sign up & join"}
              </button>
              <button onClick={() => setShareOpen(true)} className="w-full py-3 rounded-full border border-[var(--ball)]/50 text-[var(--ball)] text-sm uppercase tracking-widest inline-flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <p className="text-[11px] text-[var(--cream)]/50 text-center pt-1">
                No long profile needed to join — just your name and padel level.
              </p>
            </div>
          </>
        )}
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
      </div>
    </main>
  );
}
