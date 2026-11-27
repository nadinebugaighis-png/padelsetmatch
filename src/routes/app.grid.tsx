import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { tidyHeadline } from "@/lib/clean-headline";
import { levelName, playerLevel, withRating } from "@/lib/level-label";
import { photoSrc, prefetchPhoto } from "@/lib/photo-src";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { CourtViewCard } from "@/components/CourtViewCard";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { CURATED_QUESTIONS } from "@/lib/daily-questions";
import { getDiscoverFeed, likeProfile, unlikeProfile, blockProfile, hideProfile, reportProfile, reportPhoto, getMyQaAnswers, getMyMatches, getAiCompatibility, rateAiCompatibility, getMyAiCompatibilityFeedback, getPersonalityCards, setWorldMode, sendIntroMessage } from "@/lib/app.functions";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Flag, Shield, ChevronDown, MoreHorizontal, ArrowLeft, EyeOff, Search, Zap, Globe, GraduationCap, Check, UserPlus } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CoachBadgePanel } from "@/components/CoachBadgePanel";
import { CourtIcon } from "@/components/CourtIcon";
import { MemberGuide } from "@/components/MemberGuide";
import { GearShelf } from "@/components/GearShelf";
import { DailyQuestionCard } from "@/components/PadelQuestions";
import { UNLOCK_MIN_ANSWERS } from "@/lib/daily-questions";

import { getSharedVenues, getSharedVenuesBatch, listMyVenues } from "@/lib/venues.functions";
import { MapPin } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";
import { PADEL_LEVELS, MADRID_ZONES } from "@/lib/types";
import { useCommunityView } from "@/lib/community-view";
import { communityLabel, communityOf, communityShareUrl, isVisitingOther } from "@/lib/communities";
import { nativeShare } from "@/lib/native";
import { CommunityHeading } from "@/components/CommunityHeading";
import { LevelGuideLink } from "@/components/LevelGuide";


export const Route = createFileRoute("/app/grid")({
  head: () => ({
    meta: [
      { name: "description", content: "Find padel players and discover your on-court compatibility." },
      { property: "og:title", content: "Player directory \u00b7 PadelSetMatch" },
      { property: "og:description", content: "Find padel players and discover your on-court compatibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Home · PadelSetMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Discover,
});

function SharedVenuesBadge({ otherProfileId }: { otherProfileId: string }) {
  const tr = useTr();
  const fn = useServerFn(getSharedVenues);
  const q = useQuery({
    queryKey: ["shared-venues", otherProfileId],
    queryFn: () => fn({ data: { other_profile_id: otherProfileId } }),
    staleTime: 60_000,
  });
  const d = q.data;
  if (!d || d.count === 0) return null;
  const hasNames = d.names && d.names.length > 0;
  return (
    <div className="rounded-2xl border border-[var(--grass)]/40 bg-[var(--grass)]/15 p-3 flex items-start gap-2">
      <MapPin className="w-4 h-4 mt-0.5 text-[var(--ink)]" />
      <div className="text-sm text-[var(--ink)]">
        <div className="font-semibold">
          {hasNames
            ? tr(`You both play at ${d.names.join(", ")}`, `Ambos jugáis en ${d.names.join(", ")}`, `Vous jouez tous les deux à ${d.names.join(", ")}`)
            : d.count === 1
              ? tr("You share 1 venue", "Compartís 1 lugar", "Vous partagez 1 lieu")
              : tr(`You share ${d.count} venues`, `Compartís ${d.count} lugares`, `Vous partagez ${d.count} lieux`)}
        </div>
        {!hasNames && (
          <div className="text-xs text-[var(--ink)]/76 mt-0.5">
            {tr("Kept private by one of you.", "Uno de vosotros lo mantiene privado.", "L'un de vous le garde privé.")}
          </div>
        )}
      </div>
    </div>
  );
}

function Discover() {
  const navigate = useNavigate({ from: "/app/grid" });
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
  // World mode is OFF by default; each user's choice is saved to their profile
  // (and cached locally) so it stays exactly as they left it.
  const [world, setWorld] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem("world-mode");
    if (cached === "true") setWorld(true);
  }, []);

  const [levelFilter, setLevelFilter] = useState<string>("all");
  // Age range for Home; null = the range saved on my profile.
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Progressive rendering: only mount a page of cards at a time so the grid
  // stays snappy on phones even with hundreds of candidates.
  const PAGE = 24;
  const [shown, setShown] = useState(PAGE);
  const [feedTick, setFeedTick] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setShown(PAGE);
  }, [levelFilter, zoneFilter, searchQuery, world]);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setShown((s) => s + PAGE); },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // Re-attach whenever the list or mode changes, the sentinel can remount
    // (e.g. after toggling World), leaving the observer on a stale node.
  }, [shown, world, feedTick, levelFilter, zoneFilter, searchQuery]);
  type CategoryScores = { playingStyle: number; personality: number; lifestyle: number };
  const [preview, setPreview] = useState<null | { id: string; first_name: string; photo_url: string | null; bio: string | null; zone: string; level: string; level_rating?: number | null; reasons: string[]; liked: boolean; free_court_access?: boolean; free_court_note?: string | null; score: number; categories?: CategoryScores; personal_traits?: string[]; padel_style?: string[]; priorities?: string[]; nationality?: string | null; nationality_2?: string | null; gender?: string | null; gender_custom?: string | null; languages?: string[]; locations?: string[]; is_coach?: boolean; founding_number?: number | null }>(null);
  const search = useSearch({ from: "/app/grid" }) as { previewId?: string };




  // Community chosen in the directory (null = all my communities together).
  const communityView = useCommunityView();
  const feedQ = useQuery({
    queryKey: ["discover", world, communityView],
    queryFn: () => getFeed({ data: { world, ...(communityView ? { visit: communityView } : {}) } }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const feedLen = (feedQ.data?.candidates?.length ?? 0);
  useEffect(() => { setFeedTick(feedLen); }, [feedLen]);
  const getAnswers = useServerFn(getMyQaAnswers);
  const qaQ = useQuery({ queryKey: ["qa-answers"], queryFn: () => getAnswers(), enabled: !!feedQ.data?.me, staleTime: 5 * 60_000 });
  const getMatches = useServerFn(getMyMatches);
  const matchesQ = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches(), enabled: !!feedQ.data?.me, staleTime: 60_000 });
  const listMyVenuesFn = useServerFn(listMyVenues);
  const myVenuesQ = useQuery({ queryKey: ["my-venues"], queryFn: () => listMyVenuesFn(), enabled: !!feedQ.data?.me, staleTime: 5 * 60_000 });

  const sharedVenuesBatchFn = useServerFn(getSharedVenuesBatch);
  const candidateIds = (feedQ.data?.candidates ?? []).map((c) => c.id);
  const candidateIdsKey = candidateIds.join(",");
  const sharedVenuesQ = useQuery({
    queryKey: ["shared-venues-batch", candidateIdsKey],
    queryFn: () => sharedVenuesBatchFn({ data: { profile_ids: candidateIds } }),
    enabled: candidateIds.length > 0,
    staleTime: 60_000,
  });

  const closedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const candidates = feedQ.data?.candidates;
    if (!search.previewId || !candidates) return;
    if (closedIdRef.current === search.previewId) return;
    const c = candidates.find((x) => x.id === search.previewId);
    if (c) {
      setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, level_rating: c.level_rating ?? null, reasons: c.reasons, liked: c.liked, free_court_access: c.free_court_access, free_court_note: c.free_court_note, score: c.score, categories: (c as any).categories, personal_traits: (c as any).personal_traits, padel_style: (c as any).padel_style, priorities: (c as any).priorities, nationality: (c as any).nationality, nationality_2: (c as any).nationality_2, gender: (c as any).gender, gender_custom: (c as any).gender_custom, languages: (c as any).languages, locations: (c as any).locations, is_coach: (c as any).is_coach, founding_number: (c as any).founding_number });
    }
  }, [search.previewId, feedQ.data?.candidates]);

  const openPreview = (c: NonNullable<typeof feedQ.data>["candidates"][number]) => {
    closedIdRef.current = null;
    setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, level_rating: c.level_rating ?? null, reasons: c.reasons, liked: c.liked, free_court_access: c.free_court_access, free_court_note: c.free_court_note, score: c.score, categories: (c as any).categories, personal_traits: (c as any).personal_traits, padel_style: (c as any).padel_style, priorities: (c as any).priorities, nationality: (c as any).nationality, nationality_2: (c as any).nationality_2, gender: (c as any).gender, gender_custom: (c as any).gender_custom, languages: (c as any).languages, locations: (c as any).locations, is_coach: (c as any).is_coach, founding_number: (c as any).founding_number });
    navigate({ search: { previewId: c.id }, replace: true, resetScroll: false });
  };
  const closePreview = () => {
    closedIdRef.current = search.previewId ?? preview?.id ?? null;
    setPreview(null);
    if (search.previewId) navigate({ search: {}, replace: true, resetScroll: false });
  };


  const compatFn = useServerFn(getAiCompatibility);
  const needsUnlock = !!qaQ.data && qaQ.data.length < UNLOCK_MIN_ANSWERS;
  const compatQ = useQuery({
    queryKey: ["ai-compat", preview?.id, lang],
    queryFn: () => compatFn({ data: { otherProfileId: preview!.id, lang } }),
    // The player card no longer shows the AI read (padel facts only), so it is not fetched here.
    enabled: SHOW_AI_READ && !!preview?.id && preview?.id !== feedQ.data?.me?.id && !!qaQ.data && !needsUnlock,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
  // Warm the court reads for the top players in the background, two at a time,
  // so tapping a card shows the read instantly instead of waiting on the AI.
  const warmIds = (feedQ.data?.candidates ?? []).slice(0, 12).map((c) => c.id).join(",");
  useEffect(() => {
    if (!SHOW_AI_READ || !warmIds || !qaQ.data || needsUnlock) return;
    let cancelled = false;
    const ids = warmIds.split(",");
    const run = async () => {
      for (let i = 0; i < ids.length && !cancelled; i += 3) {
        await Promise.allSettled(ids.slice(i, i + 3).map((id) =>
          qc.prefetchQuery({
            queryKey: ["ai-compat", id, lang],
            queryFn: () => compatFn({ data: { otherProfileId: id, lang } }),
            staleTime: 1000 * 60 * 60,
          })));
      }
    };
    const t = setTimeout(run, 1200);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warmIds, lang, !!qaQ.data, needsUnlock]);
  // Saved read shows instantly; if answers changed since, refresh quietly and swap in.
  const compatStale = !!(compatQ.data as { stale?: boolean } | undefined)?.stale;
  useQuery({
    queryKey: ["ai-compat-refresh", preview?.id, lang],
    queryFn: async () => {
      const fresh = await compatFn({ data: { otherProfileId: preview!.id, lang, refresh: true } });
      qc.setQueryData(["ai-compat", preview?.id, lang], fresh);
      return true;
    },
    enabled: !!preview?.id && compatStale,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
  const cardsFn = useServerFn(getPersonalityCards);
  const cardsQ = useQuery({
    queryKey: ["personality-cards-v2", preview?.id],
    queryFn: () => cardsFn({ data: { otherProfileId: preview!.id } }),
    enabled: !!preview?.id && preview?.id !== feedQ.data?.me?.id,
    staleTime: 1000 * 60 * 10,
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
      if (!v.reason) toast.success(v.thumbs === 1 ? "Thanks, we'll surface more like this" : "Got it, tell us why?");
      else toast.success("Thanks, we'll adjust");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });




  useEffect(() => {
    // Only send to onboarding on a confirmed, settled "no profile" answer.
    if (feedQ.isSuccess && !feedQ.isFetching && feedQ.data && !feedQ.data.me) {
      navigate({ to: "/app/onboarding" });
    }
  }, [feedQ.isSuccess, feedQ.isFetching, feedQ.data, navigate]);

  useEffect(() => {
    if (feedQ.data?.me && typeof feedQ.data.me.world_mode === "boolean") {
      setWorld(feedQ.data.me.world_mode);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("world-mode", feedQ.data.me.world_mode ? "true" : "false");
      }
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
        toast.success("It's a match. Opening chat…", { duration: 2500 });
        setTimeout(() => navigate({ to: "/app/matches/$matchId", params: { matchId: res.matchId! } }), 600);
      } else {
        toast.success(t("disc.likeSent"), { duration: 2200 });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.likeFail")),
  });
  // Quick variant used by the tiny thumbs-up on the card, silent connect, never navigates away.
  const likeSilentM = useMutation({
    mutationFn: (id: string) => like({ data: { likedProfileId: id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      if (res?.matchId) {
        toast.success("It's a match.", { duration: 2000 });
      } else {
        toast.success("👍 Sent", { duration: 1600 });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.likeFail")),
  });
  const sendIntro = useServerFn(sendIntroMessage);
  const [introOpen, setIntroOpen] = useState(false);
  const [fullReadFor, setFullReadFor] = useState<string | null>(null);
  const [introText, setIntroText] = useState("");
  const introM = useMutation({
    mutationFn: (args: { targetProfileId: string; body: string }) => sendIntro({ data: args }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      setIntroOpen(false);
      setIntroText("");
      toast.success(tr("Message sent · they'll see it once", "Mensaje enviado · lo verán una vez", "Message envoyé · ils le verront une fois"), { duration: 2400 });
      if (res?.matchId) setTimeout(() => navigate({ to: "/app/matches" }), 400);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't send", "No se pudo enviar", "Envoi impossible")),
  });
  const unlikeM = useMutation({
    mutationFn: (id: string) => unlike({ data: { likedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["my-matches"] });
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
      toast(tr("Hidden from your Home grid. Manage in Profile → Hidden & blocked", "Oculto en tu Inicio. Puedes gestionarlo en Perfil → Ocultos y bloqueados", "Masqué de ton accueil. Gère-le dans Profil → Masqués et bloqués"), { duration: 2400 });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Could not hide", "No se pudo ocultar", "Impossible de masquer")),
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
      toast.success(tr("Reported, thanks 🙏", "Reportado, gracias 🙏", "Signalé, merci 🙏"));
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
    const scope = "all";
    if (!window.confirm(tr(`Hide ${name}? You can restore them from Hidden & blocked.`, `¿Ocultar a ${name}? Puedes recuperarlo desde Ocultos y bloqueados.`, `Masquer ${name} ? Tu peux le rétablir dans Masqué et bloqué.`))) return;
    hideM.mutate({ id, category: scope });
  }
  function handleBlock(id: string, name: string) {
    if (!window.confirm(t("disc.blockConfirm", { name }))) return;
    blockM.mutate(id);
  }

  if (!feedQ.data?.me) return <GridSkeleton />;

  const all = feedQ.data.candidates;
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

  const list = all.filter((c) => {
      if (levelFilter !== "all" && c.level !== levelFilter) return false;
      if (zoneFilter !== "all" && zoneFilter.trim() && !zoneMatches(c, zoneFilter.trim())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          c.first_name,
          c.zone ?? "",
          (c as any).nationality ?? "",
          (c as any).nationality_2 ?? "",
          ...((c.locations ?? []) as string[]),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  const activeFilterCount = (levelFilter !== "all" ? 1 : 0) + (zoneFilter !== "all" ? 1 : 0);
  const myLocations = ((feedQ.data.me as unknown as { locations?: string[] | null }).locations) ?? [];
  const visitingOther = isVisitingOther(communityView, myLocations);
  const myCommunityKeys = new Set(myLocations.map((l) => communityOf(l)?.key).filter(Boolean));
  // The one community on screen: the one being viewed, or my only one.
  const startingCommunity = communityView ?? (myCommunityKeys.size === 1 ? myLocations.find((l) => communityOf(l)) ?? null : null);

  return (
    <main className="programme-page px-5 py-4 sm:py-8 lg:py-10 min-h-[calc(100vh-4rem)]">
      <MemberGuide />
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CommunityHeading
              view={communityView}
              locations={((feedQ.data.me as unknown as { locations?: string[] | null }).locations) ?? []}
              world={world}
              fallbackTitle={t("disc.h1")}
              subtitle={t("disc.h1.sub")}
            />
          </div>
          {!communityView && (
            <button
              onClick={() => {
                const next = !world;
                setWorld(next);
                setWorldM.mutate(next);
              }}
              className={`shrink-0 mt-1 whitespace-nowrap rounded-full px-2.5 sm:px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] transition inline-flex items-center gap-1 ${
                world
                  ? "bg-[var(--ink)] text-[var(--paper)] border border-[var(--ink)] shadow-sm"
                  : "bg-white border border-[var(--ink)]/20 text-[var(--ink)] hover:bg-[var(--ink)]/5 hover:border-[var(--ink)]/40"
              }`}
            >
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {world ? t("disc.world.on") : t("disc.world.off")}
            </button>
          )}
        </div>

        {(() => {
          const me = feedQ.data.me as unknown as {
            photo_url?: string | null;
            availability?: string[] | null;
            intents?: string[] | null;
            looking_for?: string | null;
          } | null;
          if (!me) return null;
          const hasPhoto = !!me.photo_url;
          const hasVenues = (myVenuesQ.data?.length ?? 0) > 0;
          const hasAvailability = (me.availability?.length ?? 0) > 0;
          const hasQA = (qaQ.data?.length ?? 0) >= 3;
          const steps = [
            { done: hasPhoto, key: "photo", label: tr("Add a clear photo", "Añade una foto clara", "Ajoute une photo nette") },

            { done: hasAvailability, key: "availability", label: tr("Set your availability", "Indica tu disponibilidad", "Indique ta disponibilité") },
            { done: hasVenues, key: "venues", label: tr("Add a club or compound", "Añade un club o urbanización", "Ajoute un club ou une résidence") },
            { done: hasQA, key: "qa", label: tr("Answer 3+ questions", "Responde 3+ preguntas", "Réponds à 3+ questions") },
          ];
          const done = steps.filter((s) => s.done).length;
          const total = steps.length;
          if (done === total) return null;
          const next = steps.find((s) => !s.done)!;
          const pct = (done / total) * 100;
          const r = 14;
          const c = 2 * Math.PI * r;
          const dash = (pct / 100) * c;
          return (
            <button
              type="button"
              onClick={() => navigate({ to: "/app/profile" })}
              className="mt-4 w-full rounded-xl border border-[var(--ink)]/16 bg-[var(--paper)] hover:bg-[var(--ink)]/[0.03] p-3 flex items-center gap-3 text-left transition"
              aria-label={tr("Complete your profile", "Completa tu perfil", "Complète ton profil")}
            >
              <div className="relative shrink-0 w-9 h-9">
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" className="text-[var(--ink)]/10" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r={r} fill="none"
                    stroke="currentColor"
                    className="text-[var(--ink)]"
                    strokeWidth="3"
                    strokeDasharray={`${dash} ${c}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--ink)]">
                  {done}/{total}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold uppercase tracking-widest text-[var(--ink)]/82">
                  {tr("Profile", "Perfil", "Profil")}
                </div>
                <div className="text-[13px] text-[var(--ink)] truncate">
                  {tr("Next:", "Siguiente:", "Ensuite :")} {next.label}
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]">→</span>
            </button>
          );
        })()}




        <div className="mt-3 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink)]/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr("Search by name...", "Buscar por nombre...", "Rechercher par nom...")}
              className="w-full h-10 pl-10 pr-3 rounded-full border border-[var(--ink)]/22 bg-white text-[var(--ink)] text-[13px] placeholder:italic placeholder:text-[var(--ink)]/55 focus:outline-none focus:border-[var(--ink)]/40"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`h-9 rounded-full px-3.5 text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shrink-0 border transition ${
              activeFilterCount > 0
                ? "text-[var(--ink)] border-[var(--ink)]/40 bg-[var(--ink)]/[0.06]"
                : "text-[var(--ink)]/80 border-[var(--ink)]/20 bg-white hover:bg-[var(--ink)]/5"
            }`}
            aria-expanded={showFilters}
          >
            {tr("Filters", "Filtros", "Filtres")}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 4h18M6 12h12M10 20h4" strokeLinecap="round" /></svg>
          </button>
        </div>


        {showFilters && (
          <div className="mt-3 p-3 rounded-xl border border-[var(--ink)]/22 bg-white space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[var(--ink)]/82 mb-1.5 font-semibold">{tr("Padel level", "Nivel de pádel", "Niveau de padel")}</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-[var(--ink)]/20 bg-white text-[var(--ink)] px-2 text-sm"
              >
                <option value="all">{tr("Any level", "Cualquier nivel", "Tous niveaux")}</option>
                {PADEL_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{withRating(levelName(lv, tr), lv)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[var(--ink)]/82 mb-1.5 font-semibold">{tr("City / community", "Ciudad / comunidad", "Ville / communauté")}</label>
              <input
                type="text"
                list="zone-suggestions"
                value={zoneFilter === "all" ? "" : zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value.trim() ? e.target.value : "all")}
                placeholder={tr("Any city or zone (e.g. Dubai, Madrid, Chamberí)", "Cualquier ciudad o comunidad (p. ej. Dubái, Madrid, Chamberí)", "N'importe quelle ville ou zone (ex. Dubaï, Madrid, Chamberí)")}
                className="w-full h-9 rounded-md border border-[var(--ink)]/20 bg-white text-[var(--ink)] px-2 text-sm"
              />
              <datalist id="zone-suggestions">
                {zonesInFeed.map((z) => (
                  <option key={`feed-${z}`} value={z} />
                ))}
                {MADRID_ZONES.filter((z) => !zonesInFeed.includes(z)).map((z) => (
                  <option key={`all-${z}`} value={z} />
                ))}
              </datalist>
              
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setLevelFilter("all"); setZoneFilter("all"); }}
                className="text-[11px] text-[var(--ink)] underline font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        <PhotoReminderBanner me={feedQ.data.me as { photo_url: string | null; created_at?: string | null }} />

        <DailyQuestionCard profileId={feedQ.data.me.id} answered={qaQ.data?.map((a) => a.question)} />

        {list.length === 0 ? (
          (() => {
            // Smart empty state, infer WHY the grid is empty and offer a fix.
            const totalInFeed = all.length;
            const hasSearch = !!searchQuery.trim();
            const hasSideFilters = activeFilterCount > 0;
            let title = tr("No one matches yet", "Aún no hay coincidencias", "Personne ne correspond pour l'instant");
            let hint = tr(
              "Try widening your filters or invite a friend to join.",
              "Prueba ampliando los filtros o invita a un amigo a unirse.",
              "Élargis tes filtres ou invite un ami à rejoindre.",
            );
            const actions: Array<{ label: string; onClick: () => void; primary?: boolean }> = [];

            if (hasSearch) {
              title = tr("No player by that name", "Ningún jugador con ese nombre", "Aucun joueur à ce nom");
              hint = tr("Clear the search to see everyone again.", "Borra la búsqueda para ver a todos de nuevo.", "Efface la recherche pour revoir tout le monde.");
              actions.push({
                label: tr("Clear search", "Borrar búsqueda", "Effacer la recherche"),
                onClick: () => setSearchQuery(""),
                primary: true,
              });
            } else if (hasSideFilters) {
              title = tr("No matches with these filters", "Sin resultados con estos filtros", "Aucun résultat avec ces filtres");
              hint = tr(
                "Loosen level or zone to see more players.",
                "Relaja el nivel o la comunidad para ver más jugadores.",
                "Assouplis le niveau ou la zone pour voir plus de joueurs.",
              );
              actions.push({
                label: tr("Clear filters", "Borrar filtros", "Effacer les filtres"),
                onClick: () => { setLevelFilter("all"); setZoneFilter("all"); },
                primary: true,
              });
            } else if (totalInFeed === 0 && !world && startingCommunity) {
              // A brand-new or tiny community: say so plainly and offer to share it.
              const label = communityLabel(startingCommunity) ?? "";
              title = tr(`${label} is just starting`, `${label} acaba de empezar`, `${label} démarre`);
              hint = visitingOther
                ? tr("No members yet. Join and share it to bring players in.", "Aún no hay miembros. Únete y compártela para atraer jugadores.", "Pas encore de membres. Rejoins-la et partage-la pour attirer des joueurs.")
                : tr("You're the first member. Share it with your padel friends.", "Eres el primer miembro. Compártela con tus amigos de pádel.", "Tu es le premier membre. Partage-la avec tes amis de padel.");
              actions.push({
                label: tr("Share community", "Compartir comunidad", "Partager la communauté"),
                onClick: async () => {
                  const outcome = await nativeShare({
                    title: label,
                    text: tr(`Join ${label} on PadelSetMatch`, `Únete a ${label} en PadelSetMatch`, `Rejoins ${label} sur PadelSetMatch`),
                    url: communityShareUrl(startingCommunity),
                  });
                  if (outcome === "copied") toast.success(tr("Link copied", "Enlace copiado", "Lien copié"));
                },
                primary: true,
              });
            } else if (totalInFeed === 0 && !world && !communityView) {
              title = tr("Nobody in your zone yet", "Aún nadie en tu comunidad", "Personne dans ta zone pour l'instant");
              hint = tr(
                "Turn on World mode to see players everywhere, or invite friends from your club.",
                "Activa el modo Mundo para ver jugadores en todas partes, o invita a amigos de tu club.",
                "Active le mode Monde pour voir des joueurs partout, ou invite des amis de ton club.",
              );
              actions.push({
                label: tr("Turn on World mode", "Activar modo Mundo", "Activer le mode Monde"),
                onClick: () => { setWorld(true); setWorldM.mutate(true); },
                primary: true,
              });
            } else {
              // World is on OR feed has people but everything filtered, offer invite.
              actions.push({
                label: tr("Invite a friend", "Invitar a un amigo", "Inviter un ami"),
                onClick: () => {
                  const url = typeof window !== "undefined" ? window.location.origin : "";
                  const text = tr(
                    `Join me on PadelSetMatch, social padel by zone. ${url}`,
                    `Únete a mí en PadelSetMatch, pádel social por comunidad. ${url}`,
                    `Rejoins-moi sur PadelSetMatch, padel social par zone. ${url}`,
                  );
                  const nav2 = (navigator as unknown as { share?: (d: { text: string }) => Promise<void> });
                  if (nav2.share) nav2.share({ text }).catch(() => {});
                  else navigator.clipboard?.writeText(text).then(() => toast.success(tr("Invite copied", "Invitación copiada", "Invitation copiée")));
                },
                primary: true,
              });
            }

            return (
              <div className="mt-10 mx-auto max-w-sm text-center programme-card p-6">
                <div className="text-serif text-lg text-[var(--ink)]">{title}</div>
                <p className="text-sm text-[var(--ink)]/80 mt-2 leading-snug">{hint}</p>
                {actions.length > 0 && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                    {actions.map((a, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={a.onClick}
                        className={`rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-widest transition ${
                          a.primary
                            ? "bg-[var(--ink)] text-[var(--paper)] hover:opacity-90"
                            : "border border-[var(--ink)]/25 text-[var(--ink)] hover:bg-[var(--ink)]/5"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="grid grid-cols-2 min-[540px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-6 mt-3">
            {(() => {
              const me = feedQ.data.me as any;
              // Visiting another community: show its members only, not me.
              if (!me || visitingOther) return null;
              const openSelf = () => {
                closedIdRef.current = null;
                setPreview({
                  id: me.id,
                  first_name: me.first_name,
                  photo_url: me.photo_url,
                  bio: me.bio,
                  zone: me.zone,
                  level: me.level,
                  level_rating: me.level_rating ?? null,
                  reasons: [],
                  liked: false,
                  free_court_access: me.free_court_access,
                  free_court_note: me.free_court_note,
                  score: 100,
                  personal_traits: me.personal_traits,
                  padel_style: me.padel_style,
                  priorities: me.priorities,
                  nationality: me.nationality,
                  nationality_2: me.nationality_2,
                  gender: me.gender,
                  gender_custom: me.gender_custom,
                  languages: me.languages,
                  locations: me.locations,
                  is_coach: me.is_coach,
                });
                navigate({ search: { previewId: me.id }, replace: true, resetScroll: false });
              };
              return (
                <div className="group relative flex flex-col programme-card overflow-hidden transition hover:shadow-md lazy-card">
                  <div className="relative bg-white p-1.5 sm:p-2 shadow-[0_10px_28px_-12px_rgba(31,58,46,0.22)] rounded-[2px]">
                    <div className="relative aspect-[3/4] bg-[var(--paper-2)] overflow-hidden">
                      {me.photo_url ? (
                        <PlayerPhoto seed={me.id} src={photoSrc(me.photo_url, 480)} alt={me.first_name} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover brightness-110 md:transition-transform md:duration-500 md:group-hover:scale-[1.03]" />
                      ) : (
                        <CourtViewCard seed={me.id} name={me.first_name} className="absolute inset-0" />
                      )}
                      <button
                        type="button"
                        onClick={openSelf}
                        className="absolute inset-0 w-full h-full text-left"
                        aria-label={tr("View your player card", "Ver tu tarjeta de jugador", "Voir ta carte de joueur")}
                      />
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-white">
                    <div className="flex items-center gap-1">
                      <h3 className="text-serif text-[13px] sm:text-[20px] lg:text-[22px] leading-none uppercase text-[var(--ink)] truncate">{me.first_name}</h3>
                      {me.free_court_access && (
                        <span
                          className="shrink-0 inline-flex items-center"
                          title={tr("Free court access", "Pista gratis", "Terrain gratuit")}
                          aria-label={tr("Free court access", "Pista gratis", "Terrain gratuit")}
                        >
                          <CourtIcon className="w-4 h-2.5 sm:w-5 sm:h-3 text-[var(--ink)]" strokeWidth={2.2} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 sm:mt-1.5 text-[9px] sm:text-[11px] text-[var(--ink)]/82 tracking-[0.06em] sm:tracking-[0.08em] font-semibold uppercase truncate">
                      {[me.zone, playerLevel(me.level, me.level_rating, tr)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })()}
            {list.slice(0, shown).map((c, idx) => {
              const away = (() => {
                const au = (c as unknown as { away_until?: string | null }).away_until;
                return !!(au && au >= new Date().toISOString().slice(0, 10));
              })();
              return (
                <div
                  key={c.id}
                  onPointerEnter={() => prefetchPhoto(c.photo_url, 800)}
                  onTouchStart={() => prefetchPhoto(c.photo_url, 800)}
                  className="group relative flex flex-col programme-card overflow-hidden transition hover:shadow-md lazy-card"
                >
                  {/* Polaroid-style photo frame */}
                  <div className="relative bg-white p-1.5 sm:p-2 shadow-[0_10px_28px_-12px_rgba(31,58,46,0.22)] rounded-[2px]">
                    <div className="relative aspect-[3/4] bg-[var(--paper-2)] overflow-hidden">
                      {c.photo_url && (
                        <PlayerPhoto seed={c.id} src={photoSrc(c.photo_url, 480)} alt={c.first_name} loading={idx < 6 ? "eager" : "lazy"} fetchPriority={idx < 4 ? "high" : "auto"} decoding="async" className="absolute inset-0 w-full h-full object-cover brightness-110 md:transition-transform md:duration-500 md:group-hover:scale-[1.03]" />
                      )}
                      {!c.photo_url && (
                        <CourtViewCard seed={c.id} name={c.first_name} className="absolute inset-0" />
                      )}

                      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 flex gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleHide(c.id, c.first_name); }}
                          className="w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-white/95 border border-[var(--ink)]/16 flex items-center justify-center text-[var(--ink)] hover:bg-white"
                          aria-label={tr(`Hide ${c.first_name}`, `Ocultar a ${c.first_name}`, `Masquer ${c.first_name}`)}
                          title={tr("Not interested, hide from my Home grid", "No me interesa, ocultar de mi Inicio", "Pas intéressé·e, masquer de mon accueil")}
                        >
                          <EyeOff className="w-2 h-2 sm:w-2.5 sm:h-2.5" strokeWidth={1.6} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!c.liked) {
                              toast.info(tr(`Connect with ${c.first_name} first to request a match`, `Conecta primero con ${c.first_name} para proponer un partido`, `Connecte-toi d'abord avec ${c.first_name} pour proposer un match`));
                              return;
                            }
                            navigate({ to: "/app/events/new", search: { invite: c.id, name: c.first_name } });
                          }}
                          className={`w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-white/95 border border-[var(--ink)]/16 flex items-center justify-center hover:bg-white ${c.liked ? "text-[var(--ink)]" : "text-[var(--ink)]/35"}`}
                          aria-label={tr(`Request to play with ${c.first_name}`, `Proponer un partido a ${c.first_name}`, `Proposer un match à ${c.first_name}`)}
                          title={c.liked ? tr(`Request to play with ${c.first_name}`, `Proponer un partido a ${c.first_name}`, `Proposer un match à ${c.first_name}`) : tr(`No connection yet with ${c.first_name}`, `Aún no hay conexión con ${c.first_name}`, `Pas encore de connexion avec ${c.first_name}`)}
                        >
                          <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="currentColor" strokeWidth={1.5} />

                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (c.liked) unlikeM.mutate(c.id);
                          else likeSilentM.mutate(c.id);
                        }}
                        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20 w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-white/95 border border-[var(--ink)]/16 flex items-center justify-center hover:bg-white after:absolute after:content-[''] after:-inset-3"
                        aria-label={c.liked ? tr(`Undo thumbs up for ${c.first_name}`, `Quitar pulgar a ${c.first_name}`, `Retirer le pouce à ${c.first_name}`) : tr(`Connect with ${c.first_name}`, `Conectar con ${c.first_name}`, `Connecter avec ${c.first_name}`)}
                        title={c.liked ? tr("Connected", "Conectado", "Connecté") : tr("Connect", "Conectar", "Connecter")}
                      >
                        {c.liked ? <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-[var(--ink)]" strokeWidth={2.5} /> : <UserPlus className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-[var(--ink)]/80" strokeWidth={1.8} />}
                      </button>


                      <button
                        type="button"
                        onClick={() => openPreview(c)}
                        className="absolute inset-0 w-full h-full text-left"
                        aria-label={`View ${c.first_name}'s profile`}
                      />
                    </div>
                  </div>

                  <div className="p-2 sm:p-3 bg-white">
                    <div className="flex items-center gap-1">
                      <h3 className="text-serif text-[13px] sm:text-[20px] lg:text-[22px] leading-none uppercase text-[var(--ink)] truncate">{c.first_name}</h3>
                      {c.free_court_access && (
                        <span
                          className="shrink-0 inline-flex items-center"
                          title={tr("Free court access", "Pista gratis", "Terrain gratuit")}
                          aria-label={tr("Free court access", "Pista gratis", "Terrain gratuit")}
                        >
                          <CourtIcon className="w-4 h-2.5 sm:w-5 sm:h-3 text-[var(--ink)]" strokeWidth={2.2} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 sm:mt-1.5 text-[9px] sm:text-[11px] text-[var(--ink)]/82 tracking-[0.06em] sm:tracking-[0.08em] font-semibold uppercase truncate">
                      {[c.zone, playerLevel(c.level, c.level_rating, tr)].filter(Boolean).join(" · ")}
                    </p>
                    {(c as any).is_coach && (
                      <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 px-1 py-0.5 rounded-full bg-[var(--plum)]/12 border border-[var(--plum)]/30 text-[var(--plum)] text-[8px] sm:text-[11px] font-semibold uppercase tracking-wider">
                        <GraduationCap className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {tr("Coach", "Entrenador", "Coach")}
                      </div>
                    )}
                    {away && (
                      <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 px-1 py-0.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/22 text-[var(--ink)] text-[8px] sm:text-[11px] font-semibold uppercase tracking-wider">
                        ✈ {tr("On holidays", "De vacaciones", "En vacances")}
                      </div>
                    )}
                    {(() => {
                      const s = sharedVenuesQ.data?.[c.id];
                      if (!s || s.count === 0) return null;
                      const first = s.names?.[0];
                      const chip = first
                        ? first
                        : s.count === 1
                          ? tr("Shared venue", "Lugar en común", "Lieu en commun")
                          : tr(`${s.count} shared`, `${s.count} en común`, `${s.count} en commun`);
                      return (
                        <div
                          className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 px-1 py-0.5 rounded-full bg-[var(--grass)]/20 border border-[var(--grass)]/50 text-[var(--ink)] text-[8px] sm:text-[11px] font-semibold uppercase tracking-wider max-w-full"
                          title={s.names?.length ? s.names.join(" · ") : tr("You share a venue", "Compartís un lugar", "Vous partagez un lieu")}
                        >
                          <MapPin className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" />
                          <span className="truncate">{chip}</span>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {list.length > shown && (
          <div ref={loadMoreRef} className="h-10 mt-4" aria-hidden="true" />
        )}

        <Link to="/app/matches" className="mt-10 block text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink)] hover:opacity-80">
          {t("disc.seeChats")} →
        </Link>
      </div>


      <Dialog open={!!preview} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="w-[calc(100%-1.75rem)] max-w-sm sm:max-w-md lg:max-w-3xl xl:max-w-4xl p-0 overflow-hidden bg-[var(--paper)] border-[var(--ink)]/16 text-[var(--ink)] max-h-[92dvh] flex flex-col rounded-3xl">
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
            const isSelf = !!mine && preview.id === mine.id;
            return (
              <>
                <DialogTitle className="sr-only">{preview.first_name}</DialogTitle>
                {!isSelf && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="absolute right-11 top-3 z-10 w-7 h-7 rounded-full bg-[var(--paper)]/90 flex items-center justify-center text-[var(--ink)]/70 hover:text-[var(--ink)] focus:outline-none"
                      aria-label={tr("More options", "Más opciones", "Plus d'options")}
                    >
                      <MoreHorizontal className="w-4 h-4" strokeWidth={1.6} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px] bg-[var(--paper)] border-[var(--card-edge)] text-[var(--ink)]">
                      <DropdownMenuItem onSelect={() => handleBlock(preview.id, preview.first_name)} className="gap-2 text-[13px]">
                        <Shield className="w-3.5 h-3.5" /> {t("disc.blockTitle")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleReport(preview.id, preview.first_name)} className="gap-2 text-[13px]">
                        <Flag className="w-3.5 h-3.5" /> {t("disc.reportTitle")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div className="overflow-y-auto flex-1 lg:flex lg:overflow-hidden">
                  {/* Photo, polaroid-style white frame, previous size, no gold */}
                  <div className="relative lg:w-[40%] lg:shrink-0 lg:h-full bg-[var(--paper)] p-4 lg:p-5 flex flex-col justify-center items-center lg:items-stretch">
                    <div className="relative bg-white p-2 sm:p-2.5 pb-3 lg:p-3 lg:pb-3 shadow-[0_14px_42px_-10px_rgba(31,58,46,0.22)] lg:shadow-[0_18px_48px_-12px_rgba(31,58,46,0.28)] rounded-sm lg:rounded-md w-[62%] max-w-[240px] lg:w-auto lg:max-w-[300px] xl:max-w-[330px] lg:mx-auto">
                      {preview.photo_url ? (
                        <PlayerPhoto seed={preview.id} src={photoSrc(preview.photo_url, 800)} alt={preview.first_name} decoding="async" fetchPriority="high" className="w-full aspect-[3/4] lg:aspect-auto lg:h-[330px] xl:h-[370px] object-cover" />
                      ) : (
                        <CourtViewCard seed={preview.id} name={preview.first_name} className="w-full aspect-[3/4] lg:aspect-auto lg:h-[330px] xl:h-[370px]" letterClassName="text-7xl" />
                      )}
                      <button
                        type="button"
                        onClick={closePreview}
                        className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-[var(--cream)] hover:bg-black/55 lg:hidden"
                        aria-label="Back"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body, scrollable on desktop */}
                  <div className="lg:w-[58%] lg:overflow-y-auto">
                    <div className="px-5 pt-5 pb-8 lg:px-8 lg:pt-8 lg:pb-10 space-y-4">
                      {/* Programme header */}
                      <div className="text-center lg:text-left">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--ink)]/78">{[preview.zone, playerLevel(preview.level, preview.level_rating, tr)].filter(Boolean).join(" · ")}</div>
                        <LevelGuideLink rating={preview.level_rating} className="mt-1" />
                        <div className="text-serif text-[34px] lg:text-[40px] leading-[1.05] text-[var(--ink)] mt-1">{preview.first_name}</div>
                        <div className="mt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-1 text-[11px] uppercase tracking-normal">
                          <span className="text-[var(--ink)] font-semibold">{(preview.score ?? 0) >= 75 ? tr("Great on court", "Gran afinidad", "Grande affinité") : (preview.score ?? 0) >= 55 ? tr("Good on court", "Buena afinidad", "Bonne affinité") : tr("Worth a game", "Para un partido", "À essayer")}</span>
                        </div>
                        {preview.bio && (
                          <blockquote className="mt-4 text-serif italic text-[19px] leading-snug text-[var(--ink)]/90 whitespace-pre-wrap">“{preview.bio.trim()}”</blockquote>
                        )}
                      </div>





                      {/* Overall % lives on the photo badge; per-category scores live inside each analysis card below. */}


                      {preview.free_court_access && (
                        <div className="flex items-center gap-2 text-[13px] text-[var(--ink)]">
                          <CourtIcon className="w-5 h-3 text-[var(--ink)] shrink-0" strokeWidth={2.2} />
                          <span className="font-medium">{tr("Free court access", "Pista gratis", "Terrain gratuit")}</span>
                          {preview.free_court_note && (
                            <span className="text-[var(--ink)]/82 truncate">· {preview.free_court_note}</span>
                          )}
                        </div>
                      )}

                      <SharedVenuesBadge otherProfileId={preview.id} />

                      <GearShelf profileId={preview.id} />


                      {/* Primary actions, coach card + message/like button placed above the fold */}
                      {preview.is_coach && (
                        <CoachBadgePanel coachName={preview.first_name} />
                      )}

                      {/* Tu partida: one game-fit line, then padel facts as plain rows (three, rest behind More). No off-court score, no AI prose: it read like a dating profile. */}
                      {!isSelf && (() => {
                        const resolve = (c: { id: string; option: number }) => {
                          const q = CURATED_QUESTIONS.find((x) => x.id === c.id);
                          const opt = q?.options[c.option];
                          return q && opt ? { q, opt, shared: (c as { shared?: boolean }).shared } : null;
                        };
                        const facts = (cardsQ.data?.cards ?? []).map(resolve).filter((r): r is NonNullable<typeof r> => !!r)
                          .sort((x, y) => Number(!!y.shared) - Number(!!x.shared));
                        const complements = (cardsQ.data?.complements ?? []).slice(0, 2);
                        const showFull = fullReadFor === preview.id;
                        const visible = showFull ? facts : facts.slice(0, 2);
                        const hasMore = facts.length > 2 || complements.length > 0;
                        const story = tidyHeadline(noDash(String((compatQ.data as { sub_scores?: { headline?: string } | null; blurb?: string } | undefined)?.sub_scores?.headline || "").trim()));
                        const label = (children: string) => (
                          <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[var(--ink)]/62">{children}</div>
                        );
                        const section = "border-t border-[var(--card-edge)] pt-5";
                        return (
                          <div className="space-y-6 pt-2">
                            {(preview.score != null || story || compatQ.isLoading) && (
                              <div className={section}>
                                <div className="mb-4 flex items-baseline justify-between gap-4">
                                  <span className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink)]/62">{tr("Your game", "Tu partida", "Ta partie")}</span>
                                  {preview.score != null && (
                                    <span className="inline-flex items-baseline gap-2 text-[12px] tracking-[0.04em] text-[var(--ink)]/75">{tr("Game fit", "Afinidad de juego", "Jeu compatible")}<span className="tabular-nums font-medium text-[var(--ink)]">{preview.score}%</span></span>
                                  )}
                                </div>
                                {story ? (
                                  <p className="text-serif text-[18px] leading-relaxed text-[var(--ink)] text-balance">{story}</p>
                                ) : compatQ.isLoading ? (
                                  <p className="text-serif text-[16px] text-[var(--ink)]/60">{tr("Reading the court…", "Leyendo la pista…", "On lit le terrain…")}</p>
                                ) : null}
                              </div>
                            )}

                            {visible.length > 0 && (
                              <div className={section}>
                                {label(tr("In common", "En común", "En commun"))}
                                <ul className="divide-y divide-[var(--card-edge)]">
                                  {visible.map((r) => (
                                    <li key={r.q.id} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                                      <span className="text-[13px] text-[var(--ink)]/66 leading-snug">{factLabel(r.q.id, r.q.q[lang], tr)}</span>
                                      <span className="text-[13px] text-[var(--ink)] leading-snug text-right">{noDash(r.opt[lang])}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {showFull && complements.length > 0 && (
                              <div className={section}>
                                {label(tr("On court", "En pista", "Sur le court"))}
                                <ul className="space-y-2">
                                  {complements.map((c) => (
                                    <li key={c.key} className="text-[13px] text-[var(--ink)] leading-snug">{noDash(c.text[lang])}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {hasMore && (
                              <button
                                type="button"
                                onClick={() => setFullReadFor(showFull ? null : preview.id)}
                                aria-expanded={showFull}
                                className="w-full border-t border-[var(--card-edge)] pt-4 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]/70 hover:text-[var(--ink)] transition"
                              >
                                {showFull ? tr("Show less", "Ver menos", "Voir moins") : tr("See more", "Ver más", "Voir plus")}
                                <ChevronDown className={"w-3.5 h-3.5 transition-transform " + (showFull ? "rotate-180" : "")} strokeWidth={1.6} />
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Lifestyle chips removed per Nadine's request */}


                    </div>
                  </div>
                </div>
                {/* One fixed action at the bottom of the sheet */}
                <div className="shrink-0 border-t border-[var(--card-edge)] bg-[var(--paper)] px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {isSelf ? (
                    <Link
                      to="/app/profile"
                      onClick={closePreview}
                      className="mx-auto w-full max-w-[320px] h-11 px-6 rounded-full bg-[var(--ink)] text-[var(--paper)] font-medium uppercase tracking-[0.16em] text-[11px] flex items-center justify-center transition active:scale-[0.98] hover:brightness-110"
                    >
                      {tr("Edit profile", "Editar perfil", "Modifier le profil")}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (match) { navigate({ to: "/app/matches/$matchId", params: { matchId: match.match_id } }); return; }
                        setIntroText(""); setIntroOpen(true);
                      }}
                      className="mx-auto w-full max-w-[320px] h-11 px-6 rounded-full bg-[var(--ink)] text-[var(--paper)] font-medium uppercase tracking-[0.16em] text-[11px] whitespace-nowrap flex items-center justify-center transition active:scale-[0.98] hover:brightness-110"
                    >
                      {tr("Message", "Mensaje", "Message")}
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={introOpen} onOpenChange={setIntroOpen}>
        <DialogContent className="max-w-md bg-[var(--paper)] border border-[var(--ink)]/18">
          <DialogTitle className="text-serif text-3xl text-[var(--ink)]">
            {preview ? tr(`Send ${preview.first_name} a message`, `Enviar mensaje a ${preview.first_name}`, `Envoyer un message à ${preview.first_name}`) : ""}
          </DialogTitle>
          <p className="text-[13px] text-[var(--ink)]/80 -mt-1">
            {tr(
              "One message only. They'll see it once and can accept to open the chat, or ignore it.",
              "Un solo mensaje. Lo verán una vez y pueden aceptar para abrir el chat, o ignorarlo.",
              "Un seul message. Ils le verront une fois et pourront accepter pour ouvrir la discussion, ou l'ignorer.",
            )}
          </p>
          <textarea
            value={introText}
            onChange={(e) => setIntroText(e.target.value.slice(0, 300))}
            rows={4}
            placeholder={tr("Hey! We played at Padel Now last month. Up for another game?", "¡Hola! Jugamos en Padel Now el mes pasado, ¿otro partido?", "Salut ! On a joué à Padel Now le mois dernier, on rejoue ?")}
            className="w-full rounded-2xl border border-[var(--ink)]/20 bg-white p-3 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] resize-none"
          />
          <div className="flex items-center justify-between text-[11px] text-[var(--ink)]/78">
            <span>{introText.length}/300</span>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIntroOpen(false)}
              className="flex-1 h-11 rounded-full border border-[var(--ink)]/25 text-[var(--ink)]/88 text-[11px] uppercase tracking-[0.16em] font-semibold"
            >
              {tr("Cancel", "Cancelar", "Annuler")}
            </button>
            <button
              type="button"
              disabled={introM.isPending || introText.trim().length === 0 || !preview}
              onClick={() => { if (preview) introM.mutate({ targetProfileId: preview.id, body: introText.trim() }); }}
              className="flex-1 h-11 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-[0.16em] font-semibold disabled:opacity-50"
            >
              {introM.isPending ? tr("Sending…", "Enviando…", "Envoi…") : tr("Send", "Enviar", "Envoyer")}
            </button>
          </div>
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
    <div className="rounded-2xl card-pop p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/78 mb-3">{tr("Your Match Score", "Tu puntuación de compatibilidad", "Ton score de match")}</div>

      <div className="flex items-center gap-4">
        <div className="text-display text-5xl text-[var(--ink)] leading-none">{total}%</div>
        <div className="flex-1 space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div className="text-[11px] text-[var(--ink)]/76 w-20 shrink-0 text-right">{r.label}</div>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--ink)]/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--ink)]/70" style={{ width: `${r.value}%` }} />
              </div>
              <div className="text-[11px] font-semibold text-[var(--ink)]/88 w-8 shrink-0 text-right">{r.value}%</div>
            </div>
          ))}
        </div>
      </div>
      {rows.length > 0 && (
        <p className="mt-3 text-[10px] text-[var(--ink)]/78 leading-snug">
          {tr("Overall = average of Padel and Personality.", "Total = media de Pádel y Personalidad.", "Total = moyenne de Padel et Personnalité.")}
        </p>
      )}
    </div>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/78">{label}</div>
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
          {strong ? tr("Add a photo: you'll get 3× more matches", "Añade una foto: tendrás 3× más matches", "Ajoute une photo : tu auras 3× plus de matches") : tr("Add a profile photo when you're ready", "Añade una foto de perfil cuando quieras", "Ajoute une photo de profil quand tu es prêt·e")}
        </div>
        <div className="text-xs text-[var(--ink)]/76">{tr("Tip: a photo with your racket works best.", "Consejo: una foto con tu pala funciona mejor.", "Astuce : une photo avec ta raquette marche le mieux.")}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sessionStorage.setItem("photo-reminder-dismissed", "1");
          setDismissed(true);
        }}
        className="p-1 text-[var(--ink)]/76 hover:text-[var(--ink)]"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </Link>
  );
}


function GridSkeleton() {
  return (
    <div className="programme-page px-5 py-6 min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <div className="h-9 w-2/3 rounded-lg bg-[var(--ink)]/8 animate-pulse" />
        <div className="mt-3 h-4 w-1/2 rounded bg-[var(--ink)]/6 animate-pulse" />
        <div className="mt-4 grid gap-2.5 sm:gap-4 lg:gap-6 grid-cols-2 min-[540px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-[var(--ink)]/14 bg-white">
              <div className="aspect-[3/4] bg-[var(--ink)]/8 animate-pulse" />
              <div className="p-2 sm:p-3 space-y-2">
                <div className="h-2.5 sm:h-3.5 w-2/3 rounded bg-[var(--ink)]/8 animate-pulse" />
                <div className="h-2 sm:h-3 w-1/2 rounded bg-[var(--ink)]/6 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Card rendering no longer uses the AI read, so the grid does not request it.
const SHOW_AI_READ = true;

// Short padel labels for the card rows; questions themselves stay unchanged in the bank.
function factLabel(id: string, question: string, tr: (en: string, es: string, fr: string) => string): string {
  switch (id) {
    case "side": return tr("Side", "Lado", "Côté");
    case "deuce": return tr("Big points", "Puntos clave", "Points clés");
    case "shot": return tr("Signature shot", "Golpe estrella", "Coup signature");
    case "weapon": return tr("Strength", "Punto fuerte", "Point fort");
    case "tiebreak": return tr("Tie-break", "Tie-break", "Tie-break");
    case "comeback": return tr("When behind", "Cuando vas perdiendo", "Mené au score");
    case "talk": return tr("Role", "Rol", "Rôle");
    case "voice": return tr("During the point", "Durante el punto", "Pendant le point");
    case "time": return tr("Schedule", "Horario", "Horaire");
    case "net": return tr("Favourite spot", "Sitio favorito", "Endroit préféré");
    case "format": return tr("Format", "Formato", "Format");
    case "sitter": return tr("Partner misses", "Si tu compañero falla", "Si le partenaire rate");
    case "outside": return tr("Ball out of court", "Bola fuera", "Balle sortie");
    case "lob": return tr("Lob over partner", "Globo al compañero", "Lob sur le partenaire");
    case "warmup": return tr("Warm-up", "Calentamiento", "Échauffement");
    case "rules": return tr("Close calls", "Bolas dudosas", "Balles litigieuses");
    case "pace": return tr("Rhythm", "Ritmo", "Rythme");
    case "surface": return tr("Court", "Pista", "Court");
    case "racket": return tr("Racket", "Pala", "Raquette");
    case "stronger": return tr("Higher level", "Nivel más alto", "Niveau supérieur");
    case "lessons": return tr("Lessons", "Clases", "Cours");
    case "balls": return tr("Balls", "Pelotas", "Balles");
    case "wind": return tr("Wind", "Viento", "Vent");
    case "watch": return tr("Watching pros", "Ver profesionales", "Regarder les pros");
    case "goal": return tr("This season", "Esta temporada", "Cette saison");
    default: return question.replace(/\s*(You|Tú|Vous|Toi|Tu)?\s*(…|\.\.\.)\s*$/u, "").replace(/[.,:?¿]\s*$/, "").trim();
  }
}

// Never show dashes in card copy; saved answer text keeps them, so swap at display time.
function noDash(t: string): string {
  return t.replace(/\s*[\u2014\u2013]\s*/g, ", ");
}
