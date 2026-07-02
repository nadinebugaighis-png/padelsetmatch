import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDiscoverFeed, likeProfile, unlikeProfile, blockProfile, hideProfile, reportProfile, getMyQaAnswers, getMyMatches } from "@/lib/app.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, X, Flag, Shield, Sparkles, MessageCircle, ArrowLeft, EyeOff } from "lucide-react";
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
  const hide = useServerFn(hideProfile);
  const report = useServerFn(reportProfile);
  const [filter, setFilter] = useState<"all" | "partner" | "friend">("all");
  const [preview, setPreview] = useState<null | { id: string; first_name: string; photo_url: string | null; bio: string | null; zone: string; level: string; reasons: string[]; liked: boolean; gender: string; gender_custom: string | null; free_court_access?: boolean; free_court_note?: string | null }>(null);

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
  const hideM = useMutation({
    mutationFn: (id: string) => hide({ data: { hiddenProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      toast("Hidden from your Grid", { duration: 1800 });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not hide"),
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
  function handleHide(id: string, name: string) {
    if (!window.confirm(`Hide ${name} from your Grid? You can still be matched later if you change your mind in settings.`)) return;
    hideM.mutate(id);
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
                  onClick={() => setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, reasons: c.reasons, liked: false, gender: c.gender, gender_custom: c.gender_custom, free_court_access: c.free_court_access, free_court_note: c.free_court_note })}
                  className="absolute inset-0 w-full h-full text-left"
                  aria-label={`View ${c.first_name}'s profile`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, reasons: c.reasons, liked: true, gender: c.gender, gender_custom: c.gender_custom, free_court_access: c.free_court_access, free_court_note: c.free_court_note })}
                  className="absolute inset-0 flex items-center justify-center bg-[var(--court-deep)]/60"
                  aria-label={`View ${c.first_name}'s profile`}
                >
                  <Heart className="w-10 h-10 fill-[var(--ball)] text-[var(--ball)] drop-shadow-lg" />
                </button>
              )}

              <button
                type="button"
                disabled={likeM.isPending || unlikeM.isPending}
                onClick={(e) => { e.stopPropagation(); c.liked ? unlikeM.mutate(c.id) : likeM.mutate(c.id); }}
                className={`absolute bottom-2 right-2 z-10 p-2 rounded-full shadow-lg transition-transform active:scale-90 ${c.liked ? "bg-[var(--ball)]" : "bg-black/65 hover:bg-black/85"}`}
                aria-label={c.liked ? `Unlike ${c.first_name}` : `Like ${c.first_name}`}
                title={c.liked ? t("disc.undo") : "Like"}
              >
                <Heart className={`w-4 h-4 ${c.liked ? "fill-[var(--court-deep)] text-[var(--court-deep)]" : "text-[var(--cream)]"}`} />
              </button>

              <div className="absolute top-2 left-2 z-10 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleHide(c.id, c.first_name); }}
                  className="p-1.5 rounded-full bg-black/55 hover:bg-black/75 text-[var(--cream)]"
                  aria-label={`Hide ${c.first_name}`}
                  title="Not interested — hide from my Grid"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
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

              <div className="absolute bottom-0 left-0 right-0 p-3 pr-12 pointer-events-none">
                <div className="text-display text-2xl leading-none">{c.first_name}</div>
                <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/80 mt-1">{c.zone} · {label(c.level)}</div>
                {c.free_court_access && (
                  <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[10px] font-bold uppercase tracking-wider">🎾 Free court</div>
                )}
              </div>


            </div>
          ))}
        </div>
      )}

      <Link to="/app/matches" className="mt-8 block text-center text-sm text-[var(--cream)]/60 underline">
        {t("disc.seeChats")}
      </Link>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-[var(--court-deep)] border-[var(--cream)]/15 max-h-[90vh] flex flex-col">
          {preview && (
            <>
              <DialogTitle className="sr-only">{preview.first_name}</DialogTitle>
              <div className="sticky top-0 z-20 flex items-center justify-between px-3 py-2 bg-[var(--court-deep)]/95 backdrop-blur-sm border-b border-[var(--cream)]/10">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--cream)]/10 hover:bg-[var(--cream)]/20 text-[var(--cream)] text-xs font-semibold"
                  aria-label="Back to grid"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="p-2 rounded-full bg-[var(--cream)]/10 hover:bg-[var(--cream)]/20 text-[var(--cream)]"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {preview.photo_url && (
                  <img src={preview.photo_url} alt={preview.first_name} className="w-full aspect-[3/4] object-cover" />
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-display text-3xl leading-none text-[var(--cream)]">{preview.first_name}</div>
                    <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/70 mt-1">{preview.zone} · {label(preview.level)}</div>
                  </div>
                  {preview.free_court_access && (
                    <div className="rounded-lg border border-[var(--ball)]/40 bg-[var(--ball)]/10 p-3">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] font-bold uppercase tracking-wider">🎾 Free court access</div>
                      {preview.free_court_note && <p className="text-xs text-[var(--cream)]/80 mt-2">{preview.free_court_note}</p>}
                      <p className="text-[10px] text-[var(--cream)]/55 mt-1">Arrange the exact court in chat — Playtomic or their address.</p>
                    </div>
                  )}
                  {preview.bio ? (
                    <p className="text-sm text-[var(--cream)]/85 whitespace-pre-wrap">{preview.bio}</p>
                  ) : (
                    <p className="text-sm text-[var(--cream)]/50 italic">No bio yet.</p>
                  )}
                  {preview.reasons[0] && (
                    <p className="text-xs text-[var(--cream)]/65 border-t border-[var(--cream)]/10 pt-3">{preview.reasons[0]}</p>
                  )}
                <button
                  type="button"
                  disabled={likeM.isPending || unlikeM.isPending}
                  onClick={() => {
                    const id = preview.id;
                    const wasLiked = preview.liked;
                    setPreview(null);
                    if (wasLiked) unlikeM.mutate(id); else likeM.mutate(id);
                  }}
                  className={`w-full mt-2 py-3 rounded-full font-semibold flex items-center justify-center gap-2 ${preview.liked ? "bg-[var(--cream)]/10 text-[var(--cream)]" : "bg-[var(--ball)] text-[var(--court-deep)]"}`}
                >
                  <Heart className={`w-4 h-4 ${preview.liked ? "" : "fill-[var(--court-deep)]"}`} />
                  {preview.liked ? t("disc.undo") : "Like"}
                </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>

  );
}
