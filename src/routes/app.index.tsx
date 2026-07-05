import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDiscoverFeed, likeProfile, unlikeProfile, blockProfile, hideProfile, reportProfile, reportPhoto, getMyQaAnswers, getMyMatches, getAiCompatibility, rateAiCompatibility, getMyAiCompatibilityFeedback, setWorldMode } from "@/lib/app.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, X, Flag, Shield, Sparkles, MessageCircle, ArrowLeft, EyeOff, ThumbsUp, ThumbsDown } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n, useTr } from "@/lib/i18n";
import { PADEL_LEVELS, MADRID_ZONES, decodeLocation, formatLocation } from "@/lib/types";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Discover players · PadelMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Discover,
});

function Discover() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
  const tr = useTr();
  const getFeed = useServerFn(getDiscoverFeed);
  const like = useServerFn(likeProfile);
  const unlike = useServerFn(unlikeProfile);
  const block = useServerFn(blockProfile);
  const hide = useServerFn(hideProfile);
  const report = useServerFn(reportProfile);
  const reportPhotoFn = useServerFn(reportPhoto);
  const [filter, setFilter] = useState<"all" | "padel" | "friend" | "relationship">("all");
  const [world, setWorld] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  type CategoryScores = { playingStyle: number; personality: number; lifestyle: number };
  const [preview, setPreview] = useState<null | { id: string; first_name: string; photo_url: string | null; bio: string | null; zone: string; level: string; reasons: string[]; liked: boolean; free_court_access?: boolean; free_court_note?: string | null; score: number; categories?: CategoryScores; personal_traits?: string[]; padel_style?: string[]; priorities?: string[]; nationality?: string | null; gender?: string | null; gender_custom?: string | null; languages?: string[]; locations?: string[] }>(null);

  const feedQ = useQuery({ queryKey: ["discover", world], queryFn: () => getFeed({ data: { world } }) });
  const getAnswers = useServerFn(getMyQaAnswers);
  const qaQ = useQuery({ queryKey: ["qa-answers"], queryFn: () => getAnswers(), enabled: !!feedQ.data?.me });
  const getMatches = useServerFn(getMyMatches);
  const matchesQ = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches(), enabled: !!feedQ.data?.me });

  const compatFn = useServerFn(getAiCompatibility);
  const compatQ = useQuery({
    queryKey: ["ai-compat", preview?.id],
    queryFn: () => compatFn({ data: { otherProfileId: preview!.id } }),
    enabled: !!preview?.id,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
  const getCompatFb = useServerFn(getMyAiCompatibilityFeedback);
  const compatFbQ = useQuery({
    queryKey: ["ai-compat-fb", preview?.id],
    queryFn: () => getCompatFb({ data: { otherProfileId: preview!.id } }),
    enabled: !!preview?.id,
  });
  const rateCompat = useServerFn(rateAiCompatibility);
  const rateCompatM = useMutation({
    mutationFn: (v: { thumbs: 1 | -1; reason?: string }) => rateCompat({ data: { otherProfileId: preview!.id, thumbs: v.thumbs, reason: v.reason } }),
    onSuccess: (_r, v) => {
      qc.setQueryData(["ai-compat-fb", preview?.id], { thumbs: v.thumbs });
      if (!v.reason) toast.success(v.thumbs === 1 ? "Thanks — we'll surface more like this" : "Got it — tell us why?");
      else toast.success("Thanks — we'll adjust");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });



  useEffect(() => {
    if (feedQ.data && !feedQ.data.me) navigate({ to: "/app/onboarding" });
  }, [feedQ.data, navigate]);

  useEffect(() => {
    if (feedQ.data?.me && typeof feedQ.data.me.world_mode === "boolean") {
      setWorld(feedQ.data.me.world_mode);
    }
  }, [feedQ.data?.me?.world_mode]);

  const worldModeFn = useServerFn(setWorldMode);
  const setWorldM = useMutation({
    mutationFn: (value: boolean) => worldModeFn({ data: { world_mode: value } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save preference"),
  });

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
    mutationFn: (vars: { id: string; category: "padel" | "friend" | "relationship" | "all" }) => hide({ data: { hiddenProfileId: vars.id, category: vars.category } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      toast("Hidden from your Grid — manage in Profile → Hidden & blocked", { duration: 2400 });
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

  const reportPhotoM = useMutation({
    mutationFn: (id: string) => reportPhotoFn({ data: { reportedProfileId: id, reason: "Inappropriate photo" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      toast.success(tr("Photo reported — thanks. Our team will review it.", "Foto reportada — gracias. Nuestro equipo la revisará."));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Could not send report", "No se pudo enviar el reporte")),
  });

  function handleReport(id: string, name: string) {
    const isPhoto = window.confirm(
      tr(
        `Report ${name}'s PHOTO as inappropriate?\n\nOK = report the photo\nCancel = report for another reason`,
        `¿Reportar la FOTO de ${name} como inapropiada?\n\nAceptar = reportar la foto\nCancelar = reportar por otro motivo`,
      ),
    );
    if (isPhoto) {
      reportPhotoM.mutate(id);
      return;
    }
    const reason = window.prompt(t("disc.reportPrompt", { name }));
    if (!reason || reason.trim().length < 3) return;
    if (!window.confirm(t("disc.reportConfirm", { name }))) return;
    reportM.mutate({ id, reason: reason.trim() });
  }
  function handleHide(id: string, name: string) {
    const scope: "padel" | "friend" | "relationship" | "all" = filter === "all" ? "all" : filter;
    const scopeLabel =
      scope === "all" ? "everywhere" :
      scope === "padel" ? "from Padel partners" :
      scope === "friend" ? "from Friends" : "from Relationships";
    if (!window.confirm(`Hide ${name} ${scopeLabel}? You can unhide them anytime from Profile → Hidden & blocked.`)) return;
    hideM.mutate({ id, category: scope });
  }
  function handleBlock(id: string, name: string) {
    if (!window.confirm(t("disc.blockConfirm", { name }))) return;
    blockM.mutate(id);
  }

  if (feedQ.isLoading) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">{t("disc.loading")}</div>;
  if (!feedQ.data?.me) return null;

  const all = feedQ.data.candidates;
  const activeCat = filter === "all" ? null : filter;
  const deriveIntents = (c: { intents?: string[] | null; looking_for?: string | null }): string[] => {
    if (c.intents && c.intents.length > 0) return c.intents;
    if (c.looking_for === "partner") return ["relationship", "padel"];
    if (c.looking_for === "friend") return ["friend", "padel"];
    if (c.looking_for === "both") return ["relationship", "friend", "padel"];
    return ["padel"];
  };

  // Collect the zones/areas actually present in the current feed (smart options).
  const zonesInFeed = (() => {
    const set = new Set<string>();
    all.forEach((c) => {
      if (c.zone) set.add(c.zone.trim());
      (c.locations ?? []).forEach((loc: string) => {
        const parts = loc.split("|").map((s) => s.trim());
        const area = parts[2];
        const city = parts[1];
        if (area) set.add(area);
        else if (city) set.add(city);
      });
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  })();

  const zoneMatches = (c: typeof all[number], zone: string) => {
    const target = zone.toLowerCase();
    if ((c.zone ?? "").toLowerCase().includes(target)) return true;
    return (c.locations ?? []).some((loc: string) => loc.toLowerCase().includes(target));
  };

  const genderMatches = (c: typeof all[number], g: string) => {
    if (g === "all") return true;
    if (g === "mixed") {
      // "mixed" = show both men and women (exclude non-binary/other filters aside)
      return c.gender === "woman" || c.gender === "man";
    }
    return c.gender === g;
  };

  // Intent-tab rule: viewer must have the intent AND the candidate must have it.
  // If the viewer hasn't opted into that intent, the tab is empty (no accidental
  // romantic exposure). "all" shows everyone regardless.
  const myIntentsList = deriveIntents((feedQ.data.me ?? {}) as { intents?: string[] | null; looking_for?: string | null });
  const viewerHasIntent = filter === "all" ? true : myIntentsList.includes(filter);
  const list = (filter === "all"
    ? all
    : (viewerHasIntent
        ? all.filter((c) => deriveIntents(c as unknown as { intents?: string[]; looking_for?: string }).includes(filter))
        : []))
    .filter((c) => {
      const hc = (c as unknown as { hidden_categories?: string[] }).hidden_categories ?? [];
      if (activeCat && hc.includes(activeCat)) return false;
      if (levelFilter !== "all" && c.level !== levelFilter) return false;
      if (zoneFilter !== "all" && !zoneMatches(c, zoneFilter)) return false;
      return true;
    });
  const activeFilterCount = (levelFilter !== "all" ? 1 : 0) + (zoneFilter !== "all" ? 1 : 0);

  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">{t("disc.h1")}</h1>
      <p className="text-sm text-[var(--cream)]/70 mt-1">{t("disc.sub")}</p>
      <p className="text-xs text-[var(--cream)]/55 mt-2">
        {t("disc.scoreA")} <span className="inline-block align-middle px-1.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-bold">87</span> {t("disc.scoreB")} <b>{t("disc.scoreBold")}</b> {t("disc.scoreC")}
      </p>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2 flex-wrap items-center">
          {(["all", "padel", "friend", "relationship"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "chip-ball" : ""}`}>
              {f === "all" ? t("disc.filter.all") : f === "padel" ? t("disc.filter.padel") : f === "friend" ? t("disc.filter.friend") : t("disc.filter.relationship")}
            </button>
          ))}
          <button
            onClick={() => {
              const next = !world;
              setWorld(next);
              setWorldM.mutate(next);
            }}
            className={`chip ${world ? "chip-ball" : ""}`}
          >
            {world ? t("disc.world.on") : t("disc.world.off")}
          </button>
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`text-sm font-medium ${activeFilterCount > 0 ? "text-[var(--ball)]" : "text-[var(--cream)]/70"}`}
          aria-expanded={showFilters}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 p-3 rounded-xl border border-[var(--cream)]/15 bg-black/20 space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[var(--cream)]/60 mb-1.5">Padel level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full h-9 rounded-md border border-[var(--cream)]/20 bg-[var(--court-deep)] text-[var(--cream)] px-2 text-sm"
            >
              <option value="all">Any level</option>
              {PADEL_LEVELS.map((lv) => (
                <option key={lv} value={lv}>{label(lv)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-[var(--cream)]/60 mb-1.5">Barrio / zone</label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full h-9 rounded-md border border-[var(--cream)]/20 bg-[var(--court-deep)] text-[var(--cream)] px-2 text-sm"
            >
              <option value="all">Any zone</option>
              {zonesInFeed.length > 0 && (
                <optgroup label="From players in your Grid">
                  {zonesInFeed.map((z) => (
                    <option key={`feed-${z}`} value={z}>{z}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All Madrid zones">
                {MADRID_ZONES.filter((z) => !zonesInFeed.includes(z)).map((z) => (
                  <option key={`all-${z}`} value={z}>{z}</option>
                ))}
              </optgroup>
            </select>
            <p className="text-[10px] text-[var(--cream)]/50 mt-1">Matches on players' city, barrio or listed areas.</p>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => { setLevelFilter("all"); setZoneFilter("all"); }}
              className="text-xs text-[var(--ball)] underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {world && (
        <p className="text-[11px] text-[var(--cream)]/60 mt-2">
          {t("disc.world.note")}
        </p>
      )}

      <PhotoReminderBanner me={feedQ.data.me as { photo_url: string | null; created_at?: string | null }} />


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
              {!c.liked && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}
              <div className="absolute top-2 right-2 chip chip-ball text-[10px]" title={t("disc.scoreTooltip")}>{c.score}</div>

              <button
                type="button"
                onClick={() => setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, reasons: c.reasons, liked: c.liked, free_court_access: c.free_court_access, free_court_note: c.free_court_note, score: c.score, categories: (c as any).categories, personal_traits: (c as any).personal_traits, padel_style: (c as any).padel_style, priorities: (c as any).priorities, nationality: (c as any).nationality, gender: (c as any).gender, gender_custom: (c as any).gender_custom, languages: (c as any).languages, locations: (c as any).locations })}
                className="absolute inset-0 w-full h-full text-left"
                aria-label={`View ${c.first_name}'s profile`}
              />

              <button
                type="button"
                disabled={likeM.isPending || unlikeM.isPending}
                onClick={(e) => { e.stopPropagation(); c.liked ? unlikeM.mutate(c.id) : likeM.mutate(c.id); }}
                className={`absolute bottom-2 right-2 z-10 p-1.5 rounded-full transition ${c.liked ? "bg-[var(--ball)]" : "bg-black/50"}`}
                aria-label={c.liked ? `Unlike ${c.first_name}` : `Like ${c.first_name}`}
                title={c.liked ? t("disc.undo") : "Like"}
              >
                <Heart className={`w-3.5 h-3.5 ${c.liked ? "fill-[var(--court-deep)] text-[var(--court-deep)]" : "text-[var(--cream)]/70"}`} />
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
                {(() => {
                  const au = (c as any).away_until as string | null | undefined;
                  if (!au || au < new Date().toISOString().slice(0, 10)) return null;
                  return (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-wider">
                      ✈️ On holidays
                    </div>
                  );
                })()}
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
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-[var(--court-deep)] border-[var(--cream)]/15 max-h-[92vh] flex flex-col rounded-3xl">
          {preview && (() => {
            const mine = feedQ.data?.me;
            const mineTraits = new Set([...(mine?.personal_traits ?? []), ...(mine?.padel_style ?? []), ...(mine?.priorities ?? [])]);
            const allTheirs = [
              ...(preview.padel_style ?? []),
              ...(preview.personal_traits ?? []),
              ...(preview.priorities ?? []),
            ];
            const sharedChips = Array.from(new Set(allTheirs.filter((w) => mineTraits.has(w))));
            const match = matchesQ.data?.find((m) => m.other?.id === preview.id);
            return (
              <>
                <DialogTitle className="sr-only">{preview.first_name}</DialogTitle>
                <div className="overflow-y-auto flex-1">
                  {/* Hero photo */}
                  <div className="relative">
                    {preview.photo_url ? (
                      <img src={preview.photo_url} alt={preview.first_name} className="w-full aspect-[3/4] object-cover" />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-[var(--court)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--court-deep)] via-[var(--court-deep)]/30 to-transparent pointer-events-none" />

                    {/* Top controls */}
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-[var(--cream)] hover:bg-black/55"
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {/* Overlaid identity */}
                    <div className="absolute left-0 right-0 bottom-0 px-5 pb-4 space-y-1.5">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] font-extrabold tracking-widest uppercase">
                        {preview.score}% Match
                      </div>
                      <div className="text-display text-[44px] leading-[0.95] text-[var(--cream)] uppercase tracking-tight">{preview.first_name},</div>
                      <div className="text-sm text-[var(--cream)]/85">{preview.zone} · {label(preview.level)}</div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-5 pt-4 pb-28 space-y-4">
                    {sharedChips.length > 0 && (
                      <div className="flex flex-wrap gap-2.5">
                        {sharedChips.map((w) => (
                          <span
                            key={w}
                            className="px-4 py-2 rounded-full text-[13px] font-medium bg-[var(--cream)]/[0.06] text-[var(--cream)]/90 border border-[var(--cream)]/10"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    )}


                    {preview.categories && (
                      <MatchScoreCard total={preview.score} categories={preview.categories} />
                    )}

                    {preview.free_court_access && (
                      <div className="rounded-2xl border border-[var(--ball)]/40 bg-[var(--ball)]/10 p-4">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] font-bold uppercase tracking-wider">🎾 Free court access</div>
                        {preview.free_court_note && <p className="text-xs text-[var(--cream)]/80 mt-2">{preview.free_court_note}</p>}
                        <p className="text-[10px] text-[var(--cream)]/55 mt-1">Arrange the exact court in chat — Playtomic or their address.</p>
                      </div>
                    )}

                    {/* AI compatibility — cached per pair, with reasons + thumbs feedback */}
                    <div className="rounded-2xl border border-[var(--ball)]/30 bg-[var(--ball)]/5 p-4">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ball)] mb-2">
                        <Sparkles className="w-3 h-3" /> Why you two could click
                      </div>
                      {compatQ.isLoading ? (
                        <p className="text-sm text-[var(--cream)]/60 italic">Analyzing your vibe…</p>
                      ) : compatQ.data ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-extrabold text-[var(--cream)]">{compatQ.data.score}<span className="text-sm text-[var(--cream)]/50">/100</span></div>
                          </div>

                          {compatQ.data.sub_scores && (() => {
                            const myIntents = new Set(((feedQ.data?.me as { intents?: string[] } | undefined)?.intents ?? []) as string[]);
                            const visible = Object.entries(compatQ.data.sub_scores).filter(([k]) => myIntents.has(k));
                            if (visible.length === 0) return null;
                            return (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {visible.map(([k, v]) => {
                                  const label = k === "padel" ? "Padel fit" : k === "friend" ? "Friendship" : k === "relationship" ? "Romance" : k;
                                  return (
                                    <span key={k} className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--cream)]/[0.08] border border-[var(--cream)]/10 text-[var(--cream)]/80">
                                      {label} <span className="font-bold text-[var(--ball)]">{v}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}


                          <p className="text-sm text-[var(--cream)]/90 mt-2 leading-relaxed">{compatQ.data.blurb}</p>

                          {Array.isArray(compatQ.data.reasons) && compatQ.data.reasons.length > 0 && (
                            <ul className="mt-3 space-y-1.5">
                              {compatQ.data.reasons.map((r, i) => (
                                <li key={i} className="text-[13px] text-[var(--cream)]/85 leading-snug flex gap-2">
                                  <span className="text-[var(--ball)] mt-0.5">•</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          )}


                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[var(--cream)]/10">
                            <span className="text-[11px] text-[var(--cream)]/55 mr-1">Was this useful?</span>
                            <button
                              type="button"
                              disabled={rateCompatM.isPending}
                              onClick={() => rateCompatM.mutate({ thumbs: 1 })}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${compatFbQ.data?.thumbs === 1 ? "bg-[var(--ball)] text-[var(--court-deep)]" : "bg-[var(--cream)]/10 text-[var(--cream)]/70 hover:bg-[var(--cream)]/15"}`}
                              aria-label="Helpful"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={rateCompatM.isPending}
                              onClick={() => rateCompatM.mutate({ thumbs: -1 })}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${compatFbQ.data?.thumbs === -1 ? "bg-[var(--cream)]/80 text-[var(--court-deep)]" : "bg-[var(--cream)]/10 text-[var(--cream)]/70 hover:bg-[var(--cream)]/15"}`}
                              aria-label="Not useful"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>

                          {compatFbQ.data?.thumbs === -1 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {["Too harsh", "Too generic", "Missed the point", "Just wrong"].map((reason) => (
                                <button
                                  key={reason}
                                  type="button"
                                  disabled={rateCompatM.isPending}
                                  onClick={() => rateCompatM.mutate({ thumbs: -1, reason })}
                                  className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--cream)]/[0.06] border border-[var(--cream)]/10 text-[var(--cream)]/75 hover:bg-[var(--cream)]/[0.12]"
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          )}

                          <p className="text-[10px] text-[var(--cream)]/40 mt-1.5 leading-snug">
                            Your feedback is completely private — only the AI sees it to learn what you like.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-[var(--cream)]/50 italic">Couldn't load AI analysis right now.</p>
                      )}
                    </div>




                    {/* Me-style profile card (age intentionally omitted for privacy) */}
                    <div className="rounded-2xl border border-[var(--cream)]/10 bg-[var(--court)]/40 p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <Info label={tr("LEVEL", "NIVEL")} v={label(preview.level)} />
                        {preview.gender && (
                          <Info label={tr("GENDER", "GÉNERO")} v={preview.gender === "self-describe" ? (preview.gender_custom || label("self-describe")) : label(preview.gender)} />
                        )}
                        {preview.nationality && (
                          <Info label={tr("NATIONALITY", "NACIONALIDAD")} v={preview.nationality} />
                        )}
                      </div>

                      {(() => {
                        const locs = (preview.locations ?? []).map((l) => formatLocation(decodeLocation(l)));
                        if (locs.length === 0) return null;
                        return (
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cream)]/60 mb-2">{tr("Plays in", "Juega en")}</div>
                            <div className="flex flex-wrap gap-2">
                              {locs.map((l) => <span key={l} className="chip">{l}</span>)}
                            </div>
                          </div>
                        );
                      })()}

                      {(preview.languages?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cream)]/60 mb-2">{tr("Languages", "Idiomas")}</div>
                          <div className="flex flex-wrap gap-2">
                            {preview.languages!.map((l) => <span key={l} className="chip">{label(l)}</span>)}
                          </div>
                        </div>
                      )}

                      {(preview.personal_traits?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cream)]/60 mb-2">{tr("Personal characteristics", "Características personales")}</div>
                          <div className="flex flex-wrap gap-2">
                            {preview.personal_traits!.map((tt) => <span key={tt} className="chip">{label(tt)}</span>)}
                          </div>
                        </div>
                      )}

                      {(preview.padel_style?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cream)]/60 mb-2">{tr("Padel style", "Estilo de pádel")}</div>
                          <div className="flex flex-wrap gap-2">
                            {preview.padel_style!.map((s) => <span key={s} className="chip">{label(s)}</span>)}
                          </div>
                        </div>
                      )}

                      {preview.bio && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cream)]/60 mb-2">{tr(`About ${preview.first_name}`, `Sobre ${preview.first_name}`)}</div>
                          <p className="text-sm text-[var(--cream)]/90 leading-relaxed whitespace-pre-wrap">{preview.bio}</p>
                        </div>
                      )}
                    </div>

                    {preview.reasons[0] && (
                      <p className="text-xs text-[var(--cream)]/60 px-1">{preview.reasons[0]}</p>
                    )}
                  </div>
                </div>

                {/* Sticky bottom action bar */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pt-6 pb-4 bg-gradient-to-t from-[var(--court-deep)] via-[var(--court-deep)]/90 to-transparent">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={likeM.isPending || unlikeM.isPending}
                      onClick={() => {
                        const id = preview.id;
                        const wasLiked = preview.liked;
                        if (wasLiked) unlikeM.mutate(id); else likeM.mutate(id);
                      }}
                      className="w-11 h-11 shrink-0 rounded-full bg-[var(--ball)] flex items-center justify-center transition-transform active:scale-90"
                      aria-label={preview.liked ? "Unlike" : "Like"}
                    >
                      <Heart className={`w-5 h-5 text-[var(--court-deep)] ${preview.liked ? "fill-[var(--court-deep)]" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (match) { setPreview(null); navigate({ to: "/app/matches/$matchId", params: { matchId: match.match_id } }); return; }
                        if (!preview.liked) likeM.mutate(preview.id);
                      }}
                      disabled={likeM.isPending && !match}
                      className="flex-1 h-11 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-extrabold uppercase tracking-[0.15em] text-[13px] flex items-center justify-center disabled:opacity-70"
                    >
                      {match ? "Send Message" : preview.liked ? "Waiting for match…" : "Like to connect"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (match) { setPreview(null); navigate({ to: "/app/matches/$matchId", params: { matchId: match.match_id } }); }
                      }}
                      disabled={!match}
                      className="w-11 h-11 shrink-0 rounded-full bg-[var(--court)] border border-[var(--cream)]/10 flex items-center justify-center text-[var(--cream)] disabled:opacity-40"
                      aria-label="Open chat"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-[var(--cream)]/40 mt-2 leading-snug">
                    {t("disc.privacyNote")}
                  </p>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </main>

  );
}

function MatchScoreCard({ total, categories }: { total: number; categories: { playingStyle: number; personality: number; lifestyle: number } }) {
  const tr = useTr();
  const rows = [
    { label: tr("Playing Style", "Estilo de juego"), value: categories.playingStyle },
    { label: tr("Personality", "Personalidad"), value: categories.personality },
    { label: tr("Lifestyle", "Estilo de vida"), value: categories.lifestyle },
  ];
  return (
    <div className="rounded-2xl border border-[var(--cream)]/10 bg-[var(--court)]/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cream)]/60 mb-3">{tr("Your Match Score", "Tu puntuación de match")}</div>

      <div className="flex items-center gap-4">
        <div className="text-display text-5xl text-[var(--cream)] leading-none">{total}%</div>
        <div className="flex-1 space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div className="text-[11px] text-[var(--cream)]/70 w-20 shrink-0 text-right">{r.label}</div>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--cream)]/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--cream)]/70" style={{ width: `${r.value}%` }} />
              </div>
              <div className="text-[11px] font-semibold text-[var(--cream)]/80 w-8 shrink-0 text-right">{r.value}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">{label}</div>
      <div className="text-[var(--cream)]">{v}</div>
    </div>
  );
}


function PhotoReminderBanner({ me }: { me: { photo_url: string | null; created_at?: string | null } }) {
  const tr = useTr();
  const [dismissed, setDismissed] = useState(false);
  if (me.photo_url) return null;
  if (typeof window !== "undefined" && sessionStorage.getItem("photo-reminder-dismissed") === "1") return null;
  if (dismissed) return null;
  const created = me.created_at ? new Date(me.created_at).getTime() : Date.now();
  const daysOld = (Date.now() - created) / (1000 * 60 * 60 * 24);
  const strong = daysOld >= 7;
  return (
    <Link
      to="/app/profile"
      className={`mt-4 flex items-center gap-3 surface-card p-3 rounded-xl border ${strong ? "border-[var(--ball)] bg-[var(--ball)]/10" : "border-[var(--cream)]/15"}`}
    >
      <div className="w-9 h-9 rounded-full bg-[var(--ball)]/20 flex items-center justify-center text-lg">📸</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--cream)]">
          {strong ? tr("Add a photo — you'll get 3× more matches", "Añade una foto — tendrás 3× más matches") : tr("Add a profile photo when you're ready", "Añade una foto de perfil cuando quieras")}
        </div>
        <div className="text-xs text-[var(--cream)]/75">{tr("Tip: a photo with your racket 🎾 works best.", "Consejo: una foto con tu pala 🎾 funciona mejor.")}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sessionStorage.setItem("photo-reminder-dismissed", "1");
          setDismissed(true);
        }}
        className="p-1 text-[var(--cream)]/50 hover:text-[var(--cream)]"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </Link>
  );
}

