import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDiscoverFeed, likeProfile, unlikeProfile, blockProfile, hideProfile, reportProfile, reportPhoto, getMyQaAnswers, getMyMatches, getAiCompatibility, rateAiCompatibility, getMyAiCompatibilityFeedback, setWorldMode } from "@/lib/app.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Flag, Shield, Sparkles, MessageCircle, ArrowLeft, EyeOff, ThumbsUp, ThumbsDown, Search, Heart, Zap, Globe } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n, useTr } from "@/lib/i18n";
import { PADEL_LEVELS, MADRID_ZONES, decodeLocation, formatLocation } from "@/lib/types";

export const Route = createFileRoute("/app/grid")({
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
  const { t, label, lang } = useI18n();
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
  const [searchQuery, setSearchQuery] = useState("");
  type CategoryScores = { playingStyle: number; personality: number; lifestyle: number };
  const [preview, setPreview] = useState<null | { id: string; first_name: string; photo_url: string | null; bio: string | null; zone: string; level: string; reasons: string[]; liked: boolean; free_court_access?: boolean; free_court_note?: string | null; score: number; categories?: CategoryScores; personal_traits?: string[]; padel_style?: string[]; priorities?: string[]; nationality?: string | null; gender?: string | null; gender_custom?: string | null; languages?: string[]; locations?: string[] }>(null);

  const feedQ = useQuery({ queryKey: ["discover", world], queryFn: () => getFeed({ data: { world } }) });
  const getAnswers = useServerFn(getMyQaAnswers);
  const qaQ = useQuery({ queryKey: ["qa-answers"], queryFn: () => getAnswers(), enabled: !!feedQ.data?.me });
  const getMatches = useServerFn(getMyMatches);
  const matchesQ = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches(), enabled: !!feedQ.data?.me });

  const compatFn = useServerFn(getAiCompatibility);
  const compatQ = useQuery({
    queryKey: ["ai-compat", preview?.id, lang],
    queryFn: () => compatFn({ data: { otherProfileId: preview!.id, lang } }),
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
      toast.success(tr("Photo reported — thanks. Our team will review it.", "Foto reportada — gracias. Nuestro equipo la revisará.", "Photo signalée — merci. Notre équipe va la vérifier."));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Could not send report", "No se pudo enviar el reporte", "Impossible d'envoyer le signalement")),
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

  if (feedQ.isLoading) return <div className="programme-page px-5 py-10 text-center text-[var(--ink)]/60 min-h-[calc(100vh-4rem)]">{t("disc.loading")}</div>;
  if (!feedQ.data?.me) return <div className="programme-page px-5 py-10 text-center text-[var(--ink)]/60 min-h-[calc(100vh-4rem)]">{t("disc.loading")}</div>;

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
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!c.first_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  const activeFilterCount = (levelFilter !== "all" ? 1 : 0) + (zoneFilter !== "all" ? 1 : 0);

  return (
    <main className="programme-page px-5 py-7 min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
        <h1 className="text-serif text-[38px] leading-[0.95] uppercase text-[var(--ink)]">{t("disc.h1")}</h1>
        <p className="text-serif italic text-[32px] leading-[1.05] text-[var(--ink)]/75 mt-2">{t("disc.sub")}</p>

        <div className="mt-5 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 p-3 flex items-start gap-3">
          <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center text-[13px] font-bold">87</div>
          <p className="text-[13px] leading-snug text-[var(--ink)]/75">
            {t("disc.scoreA")} <b className="text-[var(--ink)]">{t("disc.scoreBold")}</b> {t("disc.scoreB")} {t("disc.scoreC")}
          </p>
        </div>

        <div className="flex items-start justify-between gap-3 mt-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {(["all", "padel", "friend", "relationship"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] transition sm:px-5 sm:py-2.5 sm:text-[12px] md:px-6 md:py-3 md:text-[13px] lg:px-6 lg:py-3 lg:text-[13px] xl:px-7 xl:py-3.5 xl:text-[14px] ${
                  filter === f
                    ? "bg-[var(--ink)] text-[var(--paper)] border border-[var(--ink)] shadow-sm"
                    : "bg-white border border-[var(--ink)]/20 text-[var(--ink)] hover:bg-[var(--ink)]/5 hover:border-[var(--ink)]/40"
                }`}
              >
                {f === "all" ? t("disc.filter.all") : f === "padel" ? t("disc.filter.padel") : f === "friend" ? t("disc.filter.friend") : t("disc.filter.relationship")}
              </button>
            ))}
            <button
              onClick={() => {
                const next = !world;
                setWorld(next);
                setWorldM.mutate(next);
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] transition inline-flex items-center gap-1.5 sm:px-5 sm:py-2.5 sm:text-[12px] md:px-6 md:py-3 md:text-[13px] lg:px-7 lg:py-3.5 lg:text-[15px] ${
                world
                  ? "bg-[var(--plum)] text-white border border-[var(--plum)] shadow-sm"
                  : "bg-white border border-[var(--ink)]/20 text-[var(--ink)] hover:bg-[var(--ink)]/5 hover:border-[var(--ink)]/40"
              }`}
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              {world ? t("disc.world.on") : t("disc.world.off")}
            </button>
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`rounded-full px-4 py-2 lg:px-5 lg:py-3 text-[11px] sm:text-[12px] lg:text-[13px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shrink-0 border transition ${
              activeFilterCount > 0
                ? "text-[var(--plum)] border-[var(--plum)]/40 bg-[var(--plum)]/[0.06]"
                : "text-[var(--ink)]/70 border-[var(--ink)]/20 bg-white hover:bg-[var(--ink)]/5"
            }`}
            aria-expanded={showFilters}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 4h18M6 12h12M10 20h4" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink)]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--ink)]/15 bg-[var(--ink)]/[0.04] text-[var(--ink)] text-[13px] placeholder:italic placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--ink)]/40"
            />
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 p-3 rounded-xl border border-[var(--ink)]/15 bg-white space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[var(--ink)]/60 mb-1.5 font-semibold">Padel level</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-[var(--ink)]/20 bg-white text-[var(--ink)] px-2 text-sm"
              >
                <option value="all">Any level</option>
                {PADEL_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{label(lv)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[var(--ink)]/60 mb-1.5 font-semibold">Barrio / zone</label>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-[var(--ink)]/20 bg-white text-[var(--ink)] px-2 text-sm"
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
              <p className="text-[10px] text-[var(--ink)]/50 mt-1 italic">Matches on players' city, barrio or listed areas.</p>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setLevelFilter("all"); setZoneFilter("all"); }}
                className="text-[11px] text-[var(--plum)] underline font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        {world && (
          <p className="text-[11px] text-[var(--ink)]/60 italic mt-3">
            {t("disc.world.note")}
          </p>
        )}

        <PhotoReminderBanner me={feedQ.data.me as { photo_url: string | null; created_at?: string | null }} />

        {(qaQ.data?.length ?? 0) === 0 && (
          <Link to="/app/profile" className="mt-4 block programme-card p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[var(--ink)] shrink-0 mt-0.5" />
              <div>
                <div className="text-serif text-base text-[var(--ink)]">{t("disc.qaBannerTitle")}</div>
                <div className="text-xs text-[var(--ink)]/70 mt-1">{t("disc.qaBannerSub")}</div>
                <div className="mt-2 text-[11px] text-[var(--plum)] font-bold uppercase tracking-widest">{t("disc.qaBannerCta")} →</div>
              </div>
            </div>
          </Link>
        )}

        {list.length === 0 ? (
          <p className="mt-10 text-center text-[var(--ink)]/60 text-sm italic">{t("disc.empty")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
            {list.map((c) => {
              const away = (() => {
                const au = (c as unknown as { away_until?: string | null }).away_until;
                return !!(au && au >= new Date().toISOString().slice(0, 10));
              })();
              return (
                <div
                  key={c.id}
                  className="group relative flex flex-col programme-card overflow-hidden transition hover:shadow-md"
                >
                  <div className="relative aspect-[3/4] bg-[var(--paper-2)] overflow-hidden">
                    {c.photo_url && (
                      <img src={c.photo_url} alt={c.first_name} loading="lazy" className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${!c.liked ? "grayscale-[35%]" : ""}`} />
                    )}
                    {!c.photo_url && (
                      <div className="absolute inset-0 flex items-center justify-center text-serif text-6xl text-[var(--ink)]/15">
                        {c.first_name.charAt(0)}
                      </div>
                    )}

                    <div className="absolute top-2 left-2 z-10 flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleHide(c.id, c.first_name); }}
                        className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--ink)]/10 flex items-center justify-center text-[var(--ink)] hover:bg-white"
                        aria-label={`Hide ${c.first_name}`}
                        title="Not interested — hide from my Grid"
                      >
                        <EyeOff className="w-3.5 h-3.5" strokeWidth={1.6} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!c.liked) {
                            toast.info(`Connect with ${c.first_name} first to request a match`);
                            return;
                          }
                          navigate({ to: "/app/events/new", search: { invite: c.id, name: c.first_name } });
                        }}
                        className={`w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--ink)]/10 flex items-center justify-center hover:bg-white ${c.liked ? "text-[var(--ink)]" : "text-[var(--ink)]/35"}`}
                        aria-label={`Request to play with ${c.first_name}`}
                        title={c.liked ? `Request to play with ${c.first_name}` : `No connection yet with ${c.first_name}`}
                      >
                        <Zap className="w-3.5 h-3.5" fill="currentColor" strokeWidth={1.5} />

                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (c.liked) unlikeM.mutate(c.id);
                        else likeM.mutate(c.id);
                      }}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--ink)]/10 flex items-center justify-center hover:bg-white"
                      aria-label={c.liked ? `Unlike ${c.first_name}` : `Like ${c.first_name}`}
                      title={c.liked ? "Connected" : "Like to connect"}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 transition ${c.liked ? "text-[var(--ink)]" : "text-[var(--ink)]/70"}`}
                        fill={c.liked ? "currentColor" : "none"}
                        strokeWidth={1.6}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, reasons: c.reasons, liked: c.liked, free_court_access: c.free_court_access, free_court_note: c.free_court_note, score: c.score, categories: (c as any).categories, personal_traits: (c as any).personal_traits, padel_style: (c as any).padel_style, priorities: (c as any).priorities, nationality: (c as any).nationality, gender: (c as any).gender, gender_custom: (c as any).gender_custom, languages: (c as any).languages, locations: (c as any).locations })}
                      className="absolute inset-0 w-full h-full text-left"
                      aria-label={`View ${c.first_name}'s profile`}
                    />
                  </div>

                  <div className="p-3 bg-white">
                    <h3 className="text-serif text-[17px] leading-none uppercase text-[var(--ink)] truncate">{c.first_name}</h3>
                    <p className="mt-1 text-[9px] text-[var(--ink)]/55 tracking-[0.18em] font-semibold uppercase truncate">
                      {c.zone} · {label(c.level)}
                    </p>
                    {away && (
                      <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/15 text-[var(--ink)] text-[8px] font-bold uppercase tracking-wider">
                        ✈ On holidays
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      {c.free_court_access ? (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--paper-2)] text-[var(--ink)] text-[8px] font-bold uppercase tracking-tight flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--grass)]" />
                          Free Court
                        </span>
                      ) : <span />}
                      <div
                        className="w-6 h-6 rounded-full border border-[var(--ink)] text-[var(--ink)] text-[10px] flex items-center justify-center font-bold"
                        title={t("disc.scoreTooltip")}
                      >
                        {c.score}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link to="/app/matches" className="mt-10 block text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--plum)] hover:opacity-80">
          {t("disc.seeChats")} →
        </Link>
      </div>


      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-sm sm:max-w-lg lg:max-w-2xl p-0 overflow-hidden bg-[var(--paper)] border-[var(--ink)]/10 text-[var(--ink)] max-h-[92vh] flex flex-col rounded-3xl">
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
                      <div className="w-full aspect-[3/4] bg-[var(--paper-2)]" />
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
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--grass)] text-[var(--ink)] text-[11px] font-extrabold tracking-widest uppercase">
                        {(compatQ.data?.score ?? preview.score)}% {tr("Match", "Match", "Match")}
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
                            className="px-4 py-2 rounded-full text-[13px] font-medium bg-[var(--ink)]/[0.04] text-[var(--ink)] border border-[var(--ink)]/10"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    )}


                    {/* Overall % lives on the photo badge; per-category scores live inside each analysis card below. */}

                    {preview.free_court_access && (
                      <div className="rounded-2xl border border-[var(--ink)]/15 bg-[var(--ink)]/[0.03] p-4">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--grass)] text-[var(--ink)] text-[11px] font-bold uppercase tracking-wider">🎾 {tr("Free court access", "Pista gratis", "Terrain gratuit")}</div>
                        {preview.free_court_note && <p className="text-xs text-[var(--ink)]/75 mt-2">{preview.free_court_note}</p>}
                        <p className="text-[10px] text-[var(--ink)]/55 mt-1">{tr("Arrange the exact court in chat — Playtomic or their address.", "Coordinen la pista exacta por chat — Playtomic o su dirección.", "Organisez le terrain exact par chat — Playtomic ou leur adresse.")}</p>
                      </div>
                    )}

                    {/* AI compatibility — cached per pair, with reasons + thumbs feedback */}
                    <div className="rounded-2xl border border-[var(--ink)]/12 bg-white p-4">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] mb-2">
                        <Sparkles className="w-3 h-3" /> {tr("Why you two could click", "Por qué podríais conectar", "Pourquoi vous pourriez matcher")}
                      </div>
                      {compatQ.isLoading ? (
                        <p className="text-sm text-[var(--ink)]/55 italic">{tr("Analyzing your vibe…", "Analizando vuestra vibra…", "On analyse votre vibe…")}</p>
                      ) : compatQ.data ? (
                        <>
                          <p className="text-sm text-[var(--ink)]/85 leading-relaxed">{compatQ.data.blurb}</p>

                          {/* Padel compatibility — text only, no rating */}
                          {compatQ.data.sub_scores?.padel_analysis && (
                            <div className="mt-3 rounded-xl border border-[var(--ink)]/10 bg-[var(--paper-2)]/50 p-3">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-1.5">🎾 {tr("Padel compatibility", "Compatibilidad de pádel", "Compatibilité padel")}</div>
                              <p className="text-[13px] text-[var(--ink)]/80 leading-snug">{compatQ.data.sub_scores.padel_analysis}</p>
                            </div>
                          )}

                          {/* Personality compatibility — text only, no rating */}
                          {compatQ.data.sub_scores?.personality_analysis && (
                            <div className="mt-2 rounded-xl border border-[var(--ink)]/10 bg-[var(--paper-2)]/50 p-3">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-1.5">✨ {tr("Personality compatibility", "Compatibilidad de personalidad", "Compatibilité personnalité")}</div>
                              <p className="text-[13px] text-[var(--ink)]/80 leading-snug">{compatQ.data.sub_scores.personality_analysis}</p>
                            </div>
                          )}






                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[var(--ink)]/10">
                            <span className="text-[11px] text-[var(--ink)]/55 mr-1">{tr("Was this useful?", "¿Fue útil?", "Utile ?")}</span>
                            <button
                              type="button"
                              disabled={rateCompatM.isPending}
                              onClick={() => rateCompatM.mutate({ thumbs: 1 })}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${compatFbQ.data?.thumbs === 1 ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--ink)]/8 text-[var(--ink)]/70 hover:bg-[var(--ink)]/12"}`}
                              aria-label="Helpful"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={rateCompatM.isPending}
                              onClick={() => rateCompatM.mutate({ thumbs: -1 })}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${compatFbQ.data?.thumbs === -1 ? "bg-[var(--ink)]/70 text-[var(--paper)]" : "bg-[var(--ink)]/8 text-[var(--ink)]/70 hover:bg-[var(--ink)]/12"}`}
                              aria-label="Not useful"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>

                          {compatFbQ.data?.thumbs === -1 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {[
                                { key: "harsh", label: tr("Too harsh", "Demasiado duro", "Trop dur") },
                                { key: "generic", label: tr("Too generic", "Demasiado genérico", "Trop générique") },
                                { key: "missed", label: tr("Missed the point", "No dio en el clavo", "À côté de la plaque") },
                                { key: "wrong", label: tr("Just wrong", "Directamente mal", "Complètement faux") },
                              ].map(({ key, label: reason }) => (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={rateCompatM.isPending}
                                  onClick={() => rateCompatM.mutate({ thumbs: -1, reason })}
                                  className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--ink)]/[0.04] border border-[var(--ink)]/10 text-[var(--ink)]/75 hover:bg-[var(--ink)]/[0.08]"
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          )}

                          <p className="text-[10px] text-[var(--ink)]/45 mt-1.5 leading-snug">
                            {tr("Your feedback is completely private — only the AI sees it to learn what you like.", "Tu opinión es totalmente privada — solo la IA la ve para aprender qué te gusta.", "Ton retour est totalement privé — seule l'IA le voit pour apprendre ce que tu aimes.")}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-[var(--ink)]/50 italic">{tr("Couldn't load AI analysis right now.", "No se pudo cargar el análisis de IA ahora mismo.", "Impossible de charger l'analyse IA pour le moment.")}</p>
                      )}
                    </div>




                    {/* Me-style profile card (age intentionally omitted for privacy) */}
                    <div className="rounded-2xl border border-[var(--ink)]/10 bg-white p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <Info label={tr("LEVEL", "NIVEL", "NIVEAU")} v={label(preview.level)} />
                        {preview.gender && (
                          <Info label={tr("GENDER", "GÉNERO", "GENRE")} v={preview.gender === "self-describe" ? (preview.gender_custom || label("self-describe")) : label(preview.gender)} />
                        )}
                        {preview.nationality && (
                          <Info label={tr("NATIONALITY", "NACIONALIDAD", "NATIONALITÉ")} v={preview.nationality} />
                        )}
                      </div>

                      {(() => {
                        const locs = (preview.locations ?? []).map((l) => formatLocation(decodeLocation(l)));
                        if (locs.length === 0) return null;
                        return (
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-2">{tr("Plays in", "Juega en", "Joue à")}</div>
                            <div className="flex flex-wrap gap-2">
                              {locs.map((l) => <span key={l} className="chip">{l}</span>)}
                            </div>
                          </div>
                        );
                      })()}

                      {(preview.languages?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-2">{tr("Languages", "Idiomas", "Langues")}</div>
                          <div className="flex flex-wrap gap-2">
                            {preview.languages!.map((l) => <span key={l} className="chip">{label(l)}</span>)}
                          </div>
                        </div>
                      )}

                      {(preview.personal_traits?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-2">{tr("Personal characteristics", "Características personales", "Traits personnels")}</div>
                          <div className="flex flex-wrap gap-2">
                            {preview.personal_traits!.map((tt) => <span key={tt} className="chip">{label(tt)}</span>)}
                          </div>
                        </div>
                      )}

                      {(preview.padel_style?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-2">{tr("Padel style", "Estilo de pádel", "Style de padel")}</div>
                          <div className="flex flex-wrap gap-2">
                            {preview.padel_style!.map((s) => <span key={s} className="chip">{label(s)}</span>)}
                          </div>
                        </div>
                      )}

                      {preview.bio && (
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-2">{tr(`About ${preview.first_name}`, `Sobre ${preview.first_name}`, `À propos de ${preview.first_name}`)}</div>
                          <p className="text-sm text-[var(--ink)]/85 leading-relaxed whitespace-pre-wrap">{preview.bio}</p>
                        </div>
                      )}
                    </div>

                    {preview.reasons[0] && (
                      <p className="text-xs text-[var(--ink)]/60 px-1">{preview.reasons[0]}</p>
                    )}

                    <div className="flex items-center justify-center gap-4 pt-2 pb-6">
                      <button
                        type="button"
                        onClick={() => { if (preview) handleBlock(preview.id, preview.first_name); }}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--ink)]/50 hover:text-[var(--ink)]/80 transition"
                        aria-label={`Block ${preview?.first_name ?? ""}`}
                      >
                        <Shield className="w-3.5 h-3.5" /> {t("disc.blockTitle")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (preview) handleReport(preview.id, preview.first_name); }}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--ink)]/50 hover:text-red-500/80 transition"
                        aria-label={`Report ${preview?.first_name ?? ""}`}
                      >
                        <Flag className="w-3.5 h-3.5" /> {t("disc.reportTitle")}
                      </button>
                    </div>
                    <p className="text-center text-[10px] text-[var(--ink)]/45 leading-snug pb-24">
                      {t("disc.privacyNote")}
                    </p>
                  </div>
                </div>

                {/* Floating glass action island */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (match) { setPreview(null); navigate({ to: "/app/matches/$matchId", params: { matchId: match.match_id } }); return; }
                      if (!preview.liked) likeM.mutate(preview.id);
                    }}
                    disabled={likeM.isPending && !match}
                    className="h-10 px-6 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.12em] text-[11px] flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 hover:brightness-110 shadow-[0_12px_40px_-8px_rgba(15,62,46,0.35)]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {match ? tr("Send Message", "Enviar mensaje", "Envoyer un message") : preview.liked ? tr("Waiting for match…", "Esperando match…", "En attente du match…") : tr("Like to connect", "Da like para conectar", "Like pour connecter")}
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </main>

  );
}

function MatchScoreCard({ total, padel, personality }: { total: number; padel: number | null; personality: number | null }) {
  const tr = useTr();
  const rows: Array<{ label: string; value: number }> = [];
  if (typeof padel === "number") rows.push({ label: tr("Padel", "Pádel", "Padel"), value: padel });
  if (typeof personality === "number") rows.push({ label: tr("Personality", "Personalidad", "Personnalité"), value: personality });
  return (
    <div className="rounded-2xl border border-[var(--ink)]/10 bg-white p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-3">{tr("Your Match Score", "Tu puntuación de match", "Ton score de match")}</div>

      <div className="flex items-center gap-4">
        <div className="text-display text-5xl text-[var(--ink)] leading-none">{total}%</div>
        <div className="flex-1 space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div className="text-[11px] text-[var(--ink)]/65 w-20 shrink-0 text-right">{r.label}</div>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--ink)]/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--ink)]/70" style={{ width: `${r.value}%` }} />
              </div>
              <div className="text-[11px] font-semibold text-[var(--ink)]/80 w-8 shrink-0 text-right">{r.value}%</div>
            </div>
          ))}
        </div>
      </div>
      {rows.length > 0 && (
        <p className="mt-3 text-[10px] text-[var(--ink)]/55 leading-snug">
          {tr("Overall = average of Padel and Personality.", "Total = media de Pádel y Personalidad.", "Total = moyenne de Padel et Personnalité.")}
        </p>
      )}
    </div>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/55">{label}</div>
      <div className="text-[var(--ink)]">{v}</div>
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
      className={`mt-4 flex items-center gap-3 programme-card p-3 ${strong ? "ring-1 ring-[var(--ink)]/30" : ""}`}
    >
      <div className="w-9 h-9 rounded-full bg-[var(--paper-2)] flex items-center justify-center text-lg">📸</div>
      <div className="flex-1 min-w-0">
        <div className="text-serif text-[15px] text-[var(--ink)]">
          {strong ? tr("Add a photo — you'll get 3× more matches", "Añade una foto — tendrás 3× más matches", "Ajoute une photo — tu auras 3× plus de matches") : tr("Add a profile photo when you're ready", "Añade una foto de perfil cuando quieras", "Ajoute une photo de profil quand tu es prêt·e")}
        </div>
        <div className="text-xs text-[var(--ink)]/65">{tr("Tip: a photo with your racket 🎾 works best.", "Consejo: una foto con tu pala 🎾 funciona mejor.", "Astuce : une photo avec ta raquette 🎾 marche le mieux.")}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sessionStorage.setItem("photo-reminder-dismissed", "1");
          setDismissed(true);
        }}
        className="p-1 text-[var(--ink)]/50 hover:text-[var(--ink)]"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </Link>
  );
}

