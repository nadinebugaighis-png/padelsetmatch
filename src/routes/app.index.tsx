import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDiscoverFeed, likeProfile, unlikeProfile, blockProfile, reportProfile } from "@/lib/app.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, X, Flag, Shield } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Discover,
});

function Discover() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFeed = useServerFn(getDiscoverFeed);
  const like = useServerFn(likeProfile);
  const unlike = useServerFn(unlikeProfile);
  const block = useServerFn(blockProfile);
  const report = useServerFn(reportProfile);
  const [filter, setFilter] = useState<"all" | "partner" | "friend">("all");

  const feedQ = useQuery({ queryKey: ["discover"], queryFn: () => getFeed() });

  useEffect(() => {
    if (feedQ.data && !feedQ.data.me) navigate({ to: "/app/onboarding" });
  }, [feedQ.data, navigate]);

  const likeM = useMutation({
    mutationFn: (id: string) => like({ data: { likedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast.success("Like sent — if they tap back, chat opens", { duration: 2200 });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't send like"),
  });
  const unlikeM = useMutation({
    mutationFn: (id: string) => unlike({ data: { likedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast("Like removed", { duration: 1800 });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't undo"),
  });
  const blockM = useMutation({
    mutationFn: (id: string) => block({ data: { blockedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast.success("Blocked. You won't see each other again.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't block"),
  });
  const reportM = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => report({ data: { reportedProfileId: vars.id, reason: vars.reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast.success("Report sent. The account has been removed.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't report"),
  });

  function handleReport(id: string, name: string) {
    const reason = window.prompt(`Report ${name}?\n\nDescribe what happened (harassment, fake photo, abuse, threats…). One report removes the account immediately.`);
    if (!reason || reason.trim().length < 3) return;
    if (!window.confirm(`Submit this report? ${name}'s account will be permanently deleted.`)) return;
    reportM.mutate({ id, reason: reason.trim() });
  }
  function handleBlock(id: string, name: string) {
    if (!window.confirm(`Block ${name}? You won't see each other anywhere in the app.`)) return;
    blockM.mutate(id);
  }

  if (feedQ.isLoading) return <Loading />;
  if (!feedQ.data?.me) return null;

  const all = feedQ.data.candidates;
  const list = filter === "all" ? all : all.filter((c) => c.looking_for === filter || c.looking_for === "both");

  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">Tap who you'd play.</h1>
      <p className="text-sm text-[var(--cream)]/70 mt-1">Mutual taps open a chat. Then book on Playtomic.</p>
      <p className="text-xs text-[var(--cream)]/55 mt-2">
        The <span className="inline-block align-middle px-1.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-bold">87</span> badge is the <b>match score</b> — how well your answers line up (age, level, zone, culture, shared values). Higher = stronger fit.
      </p>

      <div className="flex gap-2 mt-4">
        {(["all", "partner", "friend"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "chip-ball" : ""}`}>
            {f === "all" ? "Everyone" : f === "partner" ? "Partner" : "Friend"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-10 text-center text-[var(--cream)]/60 text-sm">No matches with these filters yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-5">
          {list.map((c) => (
            <div
              key={c.id}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--cream)]/10"
            >
              {c.photo_url && (
                <img src={c.photo_url} alt={c.first_name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />
              <div className="absolute top-2 right-2 chip chip-ball text-[10px]" title="Match score (0–100): how well your answers line up">{c.score}</div>

              {!c.liked ? (
                <button
                  type="button"
                  disabled={likeM.isPending}
                  onClick={() => likeM.mutate(c.id)}
                  className="absolute inset-0 w-full h-full text-left"
                  aria-label={`Like ${c.first_name}`}
                />
              ) : (
                <button
                  type="button"
                  disabled={unlikeM.isPending}
                  onClick={() => unlikeM.mutate(c.id)}
                  className="absolute inset-0 flex items-center justify-center bg-[var(--court-deep)]/70"
                  aria-label={`Undo like for ${c.first_name}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Heart className="w-8 h-8 fill-[var(--ball)] text-[var(--ball)]" />
                    <span className="text-xs uppercase tracking-widest">Liked</span>
                    <span className="mt-1 inline-flex items-center gap-1 chip text-[10px]"><X className="w-3 h-3" /> Tap to undo</span>
                  </div>
                </button>
              )}

              <div className="absolute top-2 left-2 z-10 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleBlock(c.id, c.first_name); }}
                  className="p-1.5 rounded-full bg-black/55 hover:bg-black/75 text-[var(--cream)]"
                  aria-label={`Block ${c.first_name}`}
                  title="Block — hide from each other"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleReport(c.id, c.first_name); }}
                  className="p-1.5 rounded-full bg-black/55 hover:bg-red-600/80 text-[var(--cream)]"
                  aria-label={`Report ${c.first_name}`}
                  title="Report — removes the account"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                <div className="text-display text-2xl leading-none">{c.first_name}, {c.age}</div>
                <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/80 mt-1">{c.zone} · {c.level}</div>
                {c.reasons[0] && <div className="text-[11px] text-[var(--cream)]/70 mt-1 line-clamp-2">{c.reasons[0]}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/app/matches" className="mt-8 block text-center text-sm text-[var(--cream)]/60 underline">
        See your chats →
      </Link>
    </main>
  );
}

function Loading() {
  return <div className="px-4 py-10 text-center text-[var(--cream)]/60">Loading the courts…</div>;
}
