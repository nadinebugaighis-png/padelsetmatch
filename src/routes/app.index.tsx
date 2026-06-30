import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDiscoverFeed, likeProfile, unlikeProfile, blockProfile, reportProfile, getMyQaAnswers, getMyMatches } from "@/lib/app.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, X, Flag, Shield, Sparkles, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  component: Discover,
});

function Discover() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
  const getFeed = useServerFn(getDiscoverFeed);
  const like = useServerFn(likeProfile);
  const unlike = useServerFn(unlikeProfile);
  const block = useServerFn(blockProfile);
  const report = useServerFn(reportProfile);
  const [filter, setFilter] = useState<"all" | "partner" | "friend">("all");

  const feedQ = useQuery({ queryKey: ["discover"], queryFn: () => getFeed() });
  const getAnswers = useServerFn(getMyQaAnswers);
  const qaQ = useQuery({ queryKey: ["qa-answers"], queryFn: () => getAnswers(), enabled: !!feedQ.data?.me });
  const getMatches = useServerFn(getMyMatches);
  const matchesQ = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches(), enabled: !!feedQ.data?.me });

  useEffect(() => {
    if (feedQ.data && !feedQ.data.me) navigate({ to: "/app/onboarding" });
  }, [feedQ.data, navigate]);

  const likeM = useMutation({
    mutationFn: (id: string) => like({ data: { likedProfileId: id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      if (res?.matchId) {
        toast.success("🎾 It's a match! Opening chat…", { duration: 2500 });
        setTimeout(() => navigate({ to: "/app/matches/$matchId", params: { matchId: res.matchId! } }), 600);
      } else {
        toast.success(t("disc.likeSent"), { duration: 2200 });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.likeFail")),
  });
  const unlikeM = useMutation({
    mutationFn: (id: string) => unlike({ data: { likedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast(t("disc.likeRemoved"), { duration: 1800 });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.undoFail")),
  });
  const blockM = useMutation({
    mutationFn: (id: string) => block({ data: { blockedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast.success(t("disc.blocked"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.blockFail")),
  });
  const reportM = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => report({ data: { reportedProfileId: vars.id, reason: vars.reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast.success(t("disc.reportSent"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.reportFail")),
  });

  function handleReport(id: string, name: string) {
    const reason = window.prompt(t("disc.reportPrompt", { name }));
    if (!reason || reason.trim().length < 3) return;
    if (!window.confirm(t("disc.reportConfirm", { name }))) return;
    reportM.mutate({ id, reason: reason.trim() });
  }
  function handleBlock(id: string, name: string) {
    if (!window.confirm(t("disc.blockConfirm", { name }))) return;
    blockM.mutate(id);
  }

  if (feedQ.isLoading) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">{t("disc.loading")}</div>;
  if (!feedQ.data?.me) return null;

  const all = feedQ.data.candidates;
  const list = filter === "all" ? all : all.filter((c) => c.looking_for === filter || c.looking_for === "both");

  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">{t("disc.h1")}</h1>
      <p className="text-sm text-[var(--cream)]/70 mt-1">{t("disc.sub")}</p>
      <p className="text-xs text-[var(--cream)]/55 mt-2">
        {t("disc.scoreA")} <span className="inline-block align-middle px-1.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-bold">87</span> {t("disc.scoreB")} <b>{t("disc.scoreBold")}</b> {t("disc.scoreC")}
      </p>

      <div className="flex gap-2 mt-4">
        {(["all", "partner", "friend"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "chip-ball" : ""}`}>
            {f === "all" ? t("disc.filter.all") : f === "partner" ? t("disc.filter.partner") : t("disc.filter.friend")}
          </button>
        ))}
      </div>

      {(matchesQ.data?.length ?? 0) > 0 && (
        <Link to="/app/matches" className="mt-4 flex items-center gap-3 surface-card p-3 border border-[var(--ball)] rounded-xl bg-[var(--ball)]/10">
          <div className="flex -space-x-2">
            {matchesQ.data!.slice(0, 3).map((m) => m.other?.photo_url && (
              <img key={m.match_id} src={m.other.photo_url} alt={m.other.first_name} className="w-9 h-9 rounded-full object-cover border-2 border-[var(--court-deep)]" />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[var(--cream)]">🎾 It's a match! ({matchesQ.data!.length})</div>
            <div className="text-xs text-[var(--cream)]/75">Tap to open your chat{matchesQ.data!.length > 1 ? "s" : ""}</div>
          </div>
          <MessageCircle className="w-5 h-5 text-[var(--ball)]" />
        </Link>
      )}


      {(qaQ.data?.length ?? 0) === 0 && (
        <Link to="/app/questions" className="mt-4 block surface-card p-4 border border-[var(--ball)]/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[var(--ball)] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[var(--cream)]">{t("disc.qaBannerTitle")}</div>
              <div className="text-xs text-[var(--cream)]/70 mt-1">{t("disc.qaBannerSub")}</div>
              <div className="mt-2 text-xs text-[var(--ball)] underline">{t("disc.qaBannerCta")}</div>
            </div>
          </div>
        </Link>
      )}

      {list.length === 0 ? (
        <p className="mt-10 text-center text-[var(--cream)]/60 text-sm">{t("disc.empty")}</p>
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
              <div className="absolute top-2 right-2 chip chip-ball text-[10px]" title={t("disc.scoreTooltip")}>{c.score}</div>

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
                    <span className="text-xs uppercase tracking-widest">{t("disc.liked")}</span>
                    <span className="mt-1 inline-flex items-center gap-1 chip text-[10px]"><X className="w-3 h-3" /> {t("disc.undo")}</span>
                  </div>
                </button>
              )}

              <div className="absolute top-2 left-2 z-10 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleBlock(c.id, c.first_name); }}
                  className="p-1.5 rounded-full bg-black/55 hover:bg-black/75 text-[var(--cream)]"
                  aria-label={`Block ${c.first_name}`}
                  title={t("disc.blockTitle")}
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleReport(c.id, c.first_name); }}
                  className="p-1.5 rounded-full bg-black/55 hover:bg-red-600/80 text-[var(--cream)]"
                  aria-label={`Report ${c.first_name}`}
                  title={t("disc.reportTitle")}
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                <div className="text-display text-2xl leading-none">{c.first_name}, {c.age}</div>
                <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/80 mt-1">{c.zone} · {label(c.level)}</div>
                {c.reasons[0] && <div className="text-[11px] text-[var(--cream)]/70 mt-1 line-clamp-2">{c.reasons[0]}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/app/matches" className="mt-8 block text-center text-sm text-[var(--cream)]/60 underline">
        {t("disc.seeChats")}
      </Link>
    </main>
  );
}
