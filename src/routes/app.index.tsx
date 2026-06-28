import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDiscoverFeed, likeProfile } from "@/lib/app.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Discover,
});

function Discover() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFeed = useServerFn(getDiscoverFeed);
  const like = useServerFn(likeProfile);
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

  if (feedQ.isLoading) return <Loading />;
  if (!feedQ.data?.me) return null;

  const all = feedQ.data.candidates;
  const list = filter === "all" ? all : all.filter((c) => c.looking_for === filter || c.looking_for === "both");

  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">Tap who you'd play.</h1>
      <p className="text-sm text-[var(--cream)]/70 mt-1">Mutual taps open a chat. Then book on Playtomic.</p>

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
            <button
              key={c.id}
              disabled={c.liked || likeM.isPending}
              onClick={() => likeM.mutate(c.id)}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--cream)]/10 text-left disabled:cursor-default"
            >
              {c.photo_url && (
                <img src={c.photo_url} alt={c.first_name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <div className="absolute top-2 right-2 chip chip-ball text-[10px]">{c.score}</div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-display text-2xl leading-none">{c.first_name}, {c.age}</div>
                <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/80 mt-1">{c.zone} · {c.level}</div>
                {c.reasons[0] && <div className="text-[11px] text-[var(--cream)]/70 mt-1 line-clamp-2">{c.reasons[0]}</div>}
              </div>
              {c.liked && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--court-deep)]/70">
                  <div className="flex flex-col items-center gap-2">
                    <Heart className="w-8 h-8 fill-[var(--ball)] text-[var(--ball)]" />
                    <span className="text-xs uppercase tracking-widest">Liked</span>
                  </div>
                </div>
              )}
            </button>
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
