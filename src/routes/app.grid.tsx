import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getDiscoverFeed, likeProfile, unlikeProfile, blockProfile, hideProfile, reportProfile, reportPhoto, getMyQaAnswers, getMyMatches, getAiCompatibility, rateAiCompatibility, getMyAiCompatibilityFeedback, setWorldMode } from "@/lib/app.functions";
import { listMyFavorites, toggleFavorite } from "@/lib/favorites.functions";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Flag, Shield, Sparkles, MessageCircle, ArrowLeft, EyeOff, ThumbsUp, ThumbsDown, Search, Zap, Globe, GraduationCap, Star } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CoachEndorsePanel } from "@/components/CoachEndorsePanel";
import { getSharedVenues, getSharedVenuesBatch, listMyVenues } from "@/lib/venues.functions";
import { MapPin } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";
import { PADEL_LEVELS, MADRID_ZONES, decodeLocation, formatLocation } from "@/lib/types";


export const Route = createFileRoute("/app/grid")({
  head: () => ({
    meta: [
      { title: "Home · PadelMatch" },
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
          <div className="text-xs text-[var(--ink)]/65 mt-0.5">
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
  const [filter, setFilter] = useState<"all" | "padel" | "friend" | "relationship">("all");
  const [world, setWorld] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  type CategoryScores = { playingStyle: number; personality: number; lifestyle: number };
  const [preview, setPreview] = useState<null | { id: string; first_name: string; photo_url: string | null; bio: string | null; zone: string; level: string; reasons: string[]; liked: boolean; free_court_access?: boolean; free_court_note?: string | null; score: number; categories?: CategoryScores; personal_traits?: string[]; padel_style?: string[]; priorities?: string[]; nationality?: string | null; gender?: string | null; gender_custom?: string | null; languages?: string[]; locations?: string[]; is_coach?: boolean }>(null);
  const search = useSearch({ from: "/app/grid" }) as { previewId?: string };




  const feedQ = useQuery({ queryKey: ["discover", world], queryFn: () => getFeed({ data: { world } }), staleTime: 60_000 });
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
      setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, reasons: c.reasons, liked: c.liked, free_court_access: c.free_court_access, free_court_note: c.free_court_note, score: c.score, categories: (c as any).categories, personal_traits: (c as any).personal_traits, padel_style: (c as any).padel_style, priorities: (c as any).priorities, nationality: (c as any).nationality, gender: (c as any).gender, gender_custom: (c as any).gender_custom, languages: (c as any).languages, locations: (c as any).locations, is_coach: (c as any).is_coach });
    }
  }, [search.previewId, feedQ.data?.candidates]);

  const openPreview = (c: NonNullable<typeof feedQ.data>["candidates"][number]) => {
    closedIdRef.current = null;
    setPreview({ id: c.id, first_name: c.first_name, photo_url: c.photo_url, bio: c.bio, zone: c.zone, level: c.level, reasons: c.reasons, liked: c.liked, free_court_access: c.free_court_access, free_court_note: c.free_court_note, score: c.score, categories: (c as any).categories, personal_traits: (c as any).personal_traits, padel_style: (c as any).padel_style, priorities: (c as any).priorities, nationality: (c as any).nationality, gender: (c as any).gender, gender_custom: (c as any).gender_custom, languages: (c as any).languages, locations: (c as any).locations, is_coach: (c as any).is_coach });
    navigate({ search: { previewId: c.id }, replace: true, resetScroll: false });
  };
  const closePreview = () => {
    closedIdRef.current = search.previewId ?? preview?.id ?? null;
    setPreview(null);
    if (search.previewId) navigate({ search: {}, replace: true, resetScroll: false });
  };


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

  const listFavs = useServerFn(listMyFavorites);
  const favsQ = useQuery({ queryKey: ["favorites"], queryFn: () => listFavs(), enabled: !!feedQ.data?.me, staleTime: 60_000 });
  const favSet = new Set(favsQ.data?.ids ?? []);
  const toggleFav = useServerFn(toggleFavorite);
  const toggleFavM = useMutation({
    mutationFn: (id: string) => toggleFav({ data: { favoriteProfileId: id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData<{ ids: string[] }>(["favorites"]);
      const ids = new Set(prev?.ids ?? []);
      const wasFav = ids.has(id);
      if (wasFav) ids.delete(id); else ids.add(id);
      qc.setQueryData(["favorites"], { ids: Array.from(ids) });
      return { prev, wasFav };
    },
    onError: (_e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev); toast.error("Couldn't update favorite"); },
    onSuccess: (r) => { toast.success(r.favorited ? tr("Added to favorites — you'll be notified when they play", "Añadido a favoritos — te avisaremos cuando jueguen", "Ajouté aux favoris — on te préviendra") : tr("Removed from favorites", "Quitado de favoritos", "Retiré des favoris")); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
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
      toast(tr("Hidden from your Home grid — manage in Profile → Hidden & blocked", "Oculto en tu Inicio — puedes gestionarlo en Perfil → Ocultos y bloqueados", "Masqué de ton accueil — gère-le dans Profil → Masqués et bloqués"), { duration: 2400 });
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
      if (zoneFilter !== "all" && zoneFilter.trim() && !zoneMatches(c, zoneFilter.trim())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          c.first_name,
          c.zone ?? "",
          (c as any).nationality ?? "",
          ...((c.locations ?? []) as string[]),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  const activeFilterCount = (levelFilter !== "all" ? 1 : 0) + (zoneFilter !== "all" ? 1 : 0);

  return (
    <main className="programme-page px-5 py-7 sm:py-8 lg:py-10 min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
        <h1 className="text-serif uppercase text-[var(--ink)] leading-[0.95] text-[32px] sm:text-[38px] lg:text-[44px] xl:text-[52px]">{t("disc.h1")}</h1>
        <p className="text-serif italic text-[var(--ink)]/70 mt-2 leading-[1.15] text-[20px] sm:text-[22px] lg:text-[24px] xl:text-[26px]">{t("disc.sub")}</p>

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
          const hasIntent = ((me.intents ?? []) as string[]).length > 0 || !!me.looking_for;
          const steps = [
            { done: hasPhoto, key: "photo", label: tr("Add a clear photo", "Añade una foto clara", "Ajoute une photo nette") },
            { done: hasIntent, key: "intent", label: tr("Pick what you're here for", "Elige qué buscas aquí", "Choisis ce que tu cherches") },
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
              className="mt-4 w-full rounded-xl border border-[var(--ink)]/10 bg-[var(--paper)] hover:bg-[var(--ink)]/[0.03] p-3 flex items-center gap-3 text-left transition"
              aria-label={tr("Complete your profile", "Completa tu perfil", "Complète ton profil")}
            >
              <div className="relative shrink-0 w-9 h-9">
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" className="text-[var(--ink)]/10" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r={r} fill="none"
                    stroke="currentColor"
                    className="text-[var(--plum)]"
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
                <div className="text-[12px] font-semibold uppercase tracking-widest text-[var(--ink)]/60">
                  {tr("Profile", "Perfil", "Profil")}
                </div>
                <div className="text-[13px] text-[var(--ink)] truncate">
                  {tr("Next:", "Siguiente:", "Ensuite :")} {next.label}
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-[var(--plum)]">→</span>
            </button>
          );
        })()}


        <div className="mt-5 lg:mt-6 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 p-3 lg:p-4 flex items-start gap-3">
          <div className="shrink-0 w-7 h-7 rounded-full bg-white text-[var(--ink)] flex items-center justify-center text-[13px] font-bold border border-[var(--ink)]/20">87</div>
          <p className="text-[13px] lg:text-[14px] leading-snug text-[var(--ink)]/75">
            {t("disc.scoreA")} <b className="text-[var(--ink)]">{t("disc.scoreBold")}</b> {t("disc.scoreB")} {t("disc.scoreC")}
          </p>
        </div>

        <div className="mt-5 lg:mt-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {(["all", "padel", "friend", "relationship"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
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
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition inline-flex items-center gap-1.5 ${
                world
                  ? "bg-[var(--plum)] text-[var(--paper)] border border-[var(--plum)] shadow-sm"
                  : "bg-white border border-[var(--ink)]/20 text-[var(--ink)] hover:bg-[var(--plum)]/5 hover:border-[var(--plum)]/40"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              {world ? t("disc.world.on") : t("disc.world.off")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink)]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr("Search by name...", "Buscar por nombre...", "Rechercher par nom...")}
              className="w-full h-10 pl-10 pr-3 rounded-full border border-[var(--ink)]/15 bg-white text-[var(--ink)] text-[13px] placeholder:italic placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--ink)]/40"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`h-9 rounded-full px-3.5 text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shrink-0 border transition ${
              activeFilterCount > 0
                ? "text-[var(--ink)] border-[var(--ink)]/40 bg-[var(--ink)]/[0.06]"
                : "text-[var(--ink)]/70 border-[var(--ink)]/20 bg-white hover:bg-[var(--ink)]/5"
            }`}
            aria-expanded={showFilters}
          >
            {tr("Filters", "Filtros", "Filtres")}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 4h18M6 12h12M10 20h4" strokeLinecap="round" /></svg>
          </button>
        </div>


        {showFilters && (
          <div className="mt-3 p-3 rounded-xl border border-[var(--ink)]/15 bg-white space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[var(--ink)]/60 mb-1.5 font-semibold">{tr("Padel level", "Nivel de pádel", "Niveau de padel")}</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-[var(--ink)]/20 bg-white text-[var(--ink)] px-2 text-sm"
              >
                <option value="all">{tr("Any level", "Cualquier nivel", "Tous niveaux")}</option>
                {PADEL_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{label(lv)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[var(--ink)]/60 mb-1.5 font-semibold">{tr("City / barrio / zone", "Ciudad / barrio / zona", "Ville / quartier / zone")}</label>
              <input
                type="text"
                list="zone-suggestions"
                value={zoneFilter === "all" ? "" : zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value.trim() ? e.target.value : "all")}
                placeholder={tr("Any city or zone (e.g. Dubai, Madrid, Chamberí)", "Cualquier ciudad o zona (p. ej. Dubái, Madrid, Chamberí)", "N'importe quelle ville ou zone (ex. Dubaï, Madrid, Chamberí)")}
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
              <p className="text-[10px] text-[var(--ink)]/50 mt-1 italic">{tr("Type any city, barrio or area. Matches players' city, barrio or listed areas.", "Escribe cualquier ciudad, barrio o zona. Coincide con la ciudad, el barrio o las zonas indicadas.", "Tape n'importe quelle ville, quartier ou zone. Correspond à la ville, au quartier ou aux zones indiquées.")}</p>
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
          (() => {
            // Smart empty state — infer WHY the grid is empty and offer a fix.
            const totalInFeed = all.length;
            const hasSearch = !!searchQuery.trim();
            const hasSideFilters = activeFilterCount > 0;
            const intentBlocked = filter !== "all" && !viewerHasIntent;
            const intentEmpty =
              filter !== "all" &&
              viewerHasIntent &&
              all.filter((c) =>
                deriveIntents(c as unknown as { intents?: string[]; looking_for?: string }).includes(filter),
              ).length === 0;

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
            } else if (intentBlocked) {
              title = tr("Opt in to see this circle", "Activa este círculo para verlo", "Active ce cercle pour le voir");
              hint = tr(
                "This tab only shows people once you also opt into it in your profile — it's how we keep things intentional and private.",
                "Esta pestaña sólo muestra personas si tú también lo activas en tu perfil — así mantenemos todo intencional y privado.",
                "Cet onglet n'affiche des personnes que si tu l'actives aussi dans ton profil — c'est notre façon de garder tout intentionnel et privé.",
              );
              actions.push({
                label: tr("Edit your profile", "Editar tu perfil", "Modifier ton profil"),
                onClick: () => navigate({ to: "/app/profile" }),
                primary: true,
              });
              actions.push({
                label: tr("Show everyone", "Ver a todos", "Voir tout le monde"),
                onClick: () => setFilter("all"),
              });
            } else if (intentEmpty) {
              title = tr("No one in this circle yet", "Aún no hay nadie en este círculo", "Personne dans ce cercle pour l'instant");
              hint = tr(
                "Nobody nearby has opted into this yet. Widen your reach or check back soon.",
                "Nadie cerca lo ha activado todavía. Amplía tu alcance o vuelve pronto.",
                "Personne près de toi ne l'a activé pour l'instant. Élargis ta portée ou reviens bientôt.",
              );
              actions.push({
                label: tr("Show everyone", "Ver a todos", "Voir tout le monde"),
                onClick: () => setFilter("all"),
                primary: true,
              });
              if (!world) {
                actions.push({
                  label: tr("Turn on World mode", "Activar modo Mundo", "Activer le mode Monde"),
                  onClick: () => { setWorld(true); setWorldM.mutate(true); },
                });
              }
            } else if (hasSideFilters) {
              title = tr("No matches with these filters", "Sin resultados con estos filtros", "Aucun résultat avec ces filtres");
              hint = tr(
                "Loosen level or zone to see more players.",
                "Relaja el nivel o la zona para ver más jugadores.",
                "Assouplis le niveau ou la zone pour voir plus de joueurs.",
              );
              actions.push({
                label: tr("Clear filters", "Borrar filtros", "Effacer les filtres"),
                onClick: () => { setLevelFilter("all"); setZoneFilter("all"); },
                primary: true,
              });
            } else if (totalInFeed === 0 && !world) {
              title = tr("Nobody in your zone yet", "Aún nadie en tu zona", "Personne dans ta zone pour l'instant");
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
              // World is on OR feed has people but everything filtered — offer invite.
              actions.push({
                label: tr("Invite a friend", "Invitar a un amigo", "Inviter un ami"),
                onClick: () => {
                  const url = typeof window !== "undefined" ? window.location.origin : "";
                  const text = tr(
                    `Join me on PadelMatch — social padel by zone. ${url}`,
                    `Únete a mí en PadelMatch — pádel social por zona. ${url}`,
                    `Rejoins-moi sur PadelMatch — padel social par zone. ${url}`,
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
                <p className="text-sm text-[var(--ink)]/70 mt-2 leading-snug">{hint}</p>
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
                  {/* Polaroid-style photo frame */}
                  <div className="relative bg-white p-2 shadow-[0_10px_28px_-12px_rgba(31,58,46,0.22)] rounded-[2px]">
                    <div className="relative aspect-[3/4] bg-[var(--paper-2)] overflow-hidden">
                      {c.photo_url && (
                        <img src={c.photo_url} alt={c.first_name} loading="lazy" decoding="async" className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${!c.liked ? "grayscale-[35%]" : ""}`} />
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
                          className="w-5 h-5 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--ink)]/10 flex items-center justify-center text-[var(--ink)] hover:bg-white"
                          aria-label={tr(`Hide ${c.first_name}`, `Ocultar a ${c.first_name}`, `Masquer ${c.first_name}`)}
                          title={tr("Not interested — hide from my Home grid", "No me interesa — ocultar de mi Inicio", "Pas intéressé·e — masquer de mon accueil")}
                        >
                          <EyeOff className="w-2.5 h-2.5" strokeWidth={1.6} />
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
                          className={`w-5 h-5 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--ink)]/10 flex items-center justify-center hover:bg-white ${c.liked ? "text-[var(--ink)]" : "text-[var(--ink)]/35"}`}
                          aria-label={tr(`Request to play with ${c.first_name}`, `Proponer un partido a ${c.first_name}`, `Proposer un match à ${c.first_name}`)}
                          title={c.liked ? tr(`Request to play with ${c.first_name}`, `Proponer un partido a ${c.first_name}`, `Proposer un match à ${c.first_name}`) : tr(`No connection yet with ${c.first_name}`, `Aún no hay conexión con ${c.first_name}`, `Pas encore de connexion avec ${c.first_name}`)}
                        >
                          <Zap className="w-2.5 h-2.5" fill="currentColor" strokeWidth={1.5} />

                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (c.liked) unlikeM.mutate(c.id);
                          else likeM.mutate(c.id);
                        }}
                        className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--ink)]/10 flex items-center justify-center hover:bg-white"
                        aria-label={c.liked ? tr(`Undo thumbs up for ${c.first_name}`, `Quitar pulgar a ${c.first_name}`, `Retirer le pouce à ${c.first_name}`) : tr(`Thumbs up ${c.first_name}`, `Pulsa para conectar con ${c.first_name}`, `Pouce pour connecter avec ${c.first_name}`)}
                        title={c.liked ? tr("Connected", "Conectado", "Connecté") : tr("Thumbs up to connect", "Pulsa para conectar", "Pouce pour connecter")}
                      >
                        <ThumbsUp
                          className={`w-2.5 h-2.5 transition ${c.liked ? "text-[var(--ink)]" : "text-[var(--ink)]/70"}`}
                          fill={c.liked ? "currentColor" : "none"}
                          strokeWidth={1.6}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => openPreview(c)}
                        className="absolute inset-0 w-full h-full text-left"
                        aria-label={`View ${c.first_name}'s profile`}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white">
                    <h3 className="text-serif text-[17px] leading-none uppercase text-[var(--ink)] truncate">{c.first_name}</h3>
                    <p className="mt-1 text-[9px] text-[var(--ink)]/55 tracking-[0.18em] font-semibold uppercase truncate">
                      {c.zone} · {label(c.level)}
                    </p>
                    {(c as any).is_coach && (
                      <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--plum)]/12 border border-[var(--plum)]/30 text-[var(--plum)] text-[8px] font-bold uppercase tracking-wider">
                        <GraduationCap className="w-2.5 h-2.5" /> {tr("Coach", "Entrenador", "Coach")}
                      </div>
                    )}
                    {typeof (c as any).founding_number === "number" && (c as any).founding_number <= 100 && (
                      <div className="mt-2 ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--ball)]/90 border border-[var(--ball)] text-[var(--court-deep)] text-[8px] font-extrabold uppercase tracking-wider" title={tr("One of our first 100 players", "Uno de nuestros 100 primeros jugadores", "L'un de nos 100 premiers joueurs")}>
                        ★ Founding #{(c as any).founding_number}
                      </div>
                    )}
                    {away && (
                      <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/15 text-[var(--ink)] text-[8px] font-bold uppercase tracking-wider">
                        ✈ On holidays
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
                          className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--grass)]/20 border border-[var(--grass)]/50 text-[var(--ink)] text-[8px] font-bold uppercase tracking-wider max-w-full"
                          title={s.names?.length ? s.names.join(" · ") : tr("You share a venue", "Compartís un lugar", "Vous partagez un lieu")}
                        >
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{chip}</span>
                        </div>
                      );
                    })()}

                    <div className="mt-2 flex items-center justify-between">
                      {c.free_court_access ? (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--paper-2)] text-[var(--ink)] text-[8px] font-bold uppercase tracking-tight flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--grass)]" />
                          Free Court
                        </span>
                      ) : <span />}
                      <div
                        className="w-6 h-6 rounded-full bg-white text-[var(--ink)] text-[10px] flex items-center justify-center font-bold border border-[var(--ink)]/20"
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


      <Dialog open={!!preview} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-sm sm:max-w-md lg:max-w-3xl xl:max-w-4xl p-0 overflow-hidden bg-[var(--paper)] border-[var(--ink)]/10 text-[var(--ink)] max-h-[92vh] flex flex-col rounded-3xl">
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
                <div className="overflow-y-auto flex-1 lg:flex lg:overflow-hidden">
                  {/* Hero photo — Polaroid-style white frame on desktop and mobile */}
                  <div className="relative lg:w-[40%] lg:shrink-0 lg:h-full bg-[var(--paper)] p-4 sm:p-4 lg:p-5 flex flex-col justify-center">
                    <div className="relative bg-white p-3 sm:p-3.5 lg:p-3.5 shadow-[0_14px_42px_-10px_rgba(31,58,46,0.28)] rounded-sm lg:rounded-md">

                      {preview.photo_url ? (
                        <img src={preview.photo_url} alt={preview.first_name} decoding="async" fetchPriority="high" className="w-full aspect-[3/4] lg:aspect-auto lg:h-[420px] xl:h-[480px] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] lg:aspect-auto lg:h-[420px] xl:h-[480px] bg-[var(--paper-2)]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--court-deep)] via-[var(--court-deep)]/30 to-transparent pointer-events-none lg:hidden" />

                      {/* Top controls — mobile only */}
                      <button
                        type="button"
                        onClick={closePreview}
                        className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-[var(--cream)] hover:bg-black/55 lg:hidden"
                        aria-label="Back"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      {/* Overlaid identity — mobile only */}
                      <div className="absolute left-0 right-0 bottom-0 px-5 pb-5 lg:hidden">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--grass)] text-[var(--ink)] text-[11px] font-extrabold tracking-widest uppercase">
                          {(compatQ.data?.score ?? preview.score)}% {tr("Match", "Match", "Match")}
                        </div>
                        <div className="text-display text-[44px] leading-[0.95] text-[var(--cream)] uppercase tracking-tight mt-1.5">{preview.first_name},</div>
                        <div className="text-sm text-[var(--cream)]/85 mt-0.5">{preview.zone} · {label(preview.level)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Body — scrollable on desktop */}
                  <div className="lg:w-[60%] lg:overflow-y-auto">
                    <div className="px-5 pt-4 pb-28 lg:px-6 lg:pt-6 lg:pb-24 space-y-4">
                      {/* Desktop header */}
                      <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-4">
                        <div>
                          <div className="text-display text-3xl xl:text-4xl leading-[0.95] text-[var(--ink)] uppercase tracking-tight">{preview.first_name}</div>
                          <div className="text-sm text-[var(--ink)]/70 mt-1">{preview.zone} · {label(preview.level)}</div>
                          {typeof (preview as any).founding_number === "number" && (preview as any).founding_number <= 100 && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[10px] font-extrabold uppercase tracking-wider">
                              ★ {tr("Founding", "Fundador", "Fondateur")} #{(preview as any).founding_number}
                            </div>
                          )}
                        </div>
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[var(--grass)] text-[var(--ink)] text-sm font-extrabold tracking-widest uppercase">
                          {(compatQ.data?.score ?? preview.score)}% {tr("Match", "Match", "Match")}
                        </div>
                      </div>

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
                            
                        </div>
                      )}

                      <SharedVenuesBadge otherProfileId={preview.id} />

                      {/* Primary actions — coach card + message/like button placed above the fold */}
                      {preview.is_coach && (
                        <CoachEndorsePanel coachProfileId={preview.id} coachName={preview.first_name} />
                      )}

                      <div className="flex items-stretch gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (match) { navigate({ to: "/app/matches/$matchId", params: { matchId: match.match_id } }); return; }
                            if (!preview.liked) likeM.mutate(preview.id);
                          }}
                          disabled={likeM.isPending && !match}
                          className="flex-1 h-11 px-6 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.12em] text-[11px] flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 hover:brightness-110 shadow-[0_12px_40px_-8px_rgba(15,62,46,0.35)]"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {match ? tr("Send Message", "Enviar mensaje", "Envoyer un message") : preview.liked ? tr("Waiting for match…", "Esperando match…", "En attente du match…") : tr("Like to connect", "Pulsa para conectar", "Like pour connecter")}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavM.mutate(preview.id)}
                          disabled={toggleFavM.isPending}
                          aria-label={favSet.has(preview.id) ? tr("Remove favorite", "Quitar favorito", "Retirer des favoris") : tr("Add to favorites", "Añadir a favoritos", "Ajouter aux favoris")}
                          title={favSet.has(preview.id) ? tr("Favorited — you'll be notified when they play", "Favorito — te avisaremos cuando jueguen", "Favori — on te préviendra") : tr("Get notified when they play", "Avísame cuando juegue", "Me prévenir quand il/elle joue")}
                          className={`h-11 w-11 shrink-0 rounded-full border flex items-center justify-center transition active:scale-[0.94] ${favSet.has(preview.id) ? "bg-[var(--plum)] border-[var(--plum)] text-white shadow-[0_8px_24px_-6px_rgba(72,46,146,0.45)]" : "bg-white border-[var(--ink)]/25 text-[var(--ink)]/70 hover:border-[var(--plum)]/60 hover:text-[var(--plum)]"}`}
                        >
                          <Star className="w-4 h-4" fill={favSet.has(preview.id) ? "currentColor" : "none"} strokeWidth={2} />
                        </button>
                      </div>


                      {/* AI compatibility — punchy: headline + specific bullets + sub-score bars */}
                      <div className="rounded-2xl border border-[var(--ink)]/12 bg-white p-4">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] mb-2.5">
                          <Sparkles className="w-3 h-3" /> {tr("Why you two could click", "Por qué podríais conectar", "Pourquoi vous pourriez matcher")}
                        </div>
                        {compatQ.isLoading ? (
                          <p className="text-sm text-[var(--ink)]/55 italic">{tr("Analyzing your vibe…", "Analizando vuestra vibra…", "On analyse votre vibe…")}</p>
                        ) : compatQ.data ? (
                          <>
                            {/* Headline — one grounded sentence */}
                            <p className="text-[15px] font-medium text-[var(--ink)] leading-snug">
                              {compatQ.data.sub_scores?.headline || compatQ.data.blurb}
                            </p>

                            {/* Specific bullets — each references a real detail */}
                            {(() => {
                              const bullets = compatQ.data.sub_scores?.highlights?.length
                                ? compatQ.data.sub_scores.highlights
                                : compatQ.data.reasons;
                              if (!bullets || bullets.length === 0) return null;
                              return (
                                <ul className="mt-3 space-y-1.5">
                                  {bullets.slice(0, 3).map((b, i) => (
                                    <li key={i} className="text-[13px] text-[var(--ink)]/80 leading-snug flex gap-2">
                                      <span className="text-[var(--ink)]/40 shrink-0">•</span>
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}

                            {/* Tiny sub-score bars — replaces the two long paragraphs */}
                            {(compatQ.data.sub_scores?.padel != null || compatQ.data.sub_scores?.personality != null) && (
                              <div className="mt-3.5 pt-3 border-t border-[var(--ink)]/8 grid grid-cols-2 gap-3">
                                {compatQ.data.sub_scores?.padel != null && (
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-[var(--ink)]/55 mb-1">
                                      <span>🎾 {tr("On-court", "En pista", "Sur le court")}</span>
                                      <span className="tabular-nums text-[var(--ink)]/70">{compatQ.data.sub_scores.padel}</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-[var(--ink)]/8 overflow-hidden">
                                      <div className="h-full bg-[var(--ink)]" style={{ width: `${compatQ.data.sub_scores.padel}%` }} />
                                    </div>
                                  </div>
                                )}
                                {compatQ.data.sub_scores?.personality != null && (
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-[var(--ink)]/55 mb-1">
                                      <span>✨ {tr("Off-court", "Fuera de pista", "Hors court")}</span>
                                      <span className="tabular-nums text-[var(--ink)]/70">{compatQ.data.sub_scores.personality}</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-[var(--ink)]/8 overflow-hidden">
                                      <div className="h-full bg-[var(--ink)]" style={{ width: `${compatQ.data.sub_scores.personality}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Watch-out — only when the AI flagged something concrete */}
                            {compatQ.data.friction && (
                              <div className="mt-3 rounded-lg bg-[var(--ink)]/[0.04] px-3 py-2 text-[12px] text-[var(--ink)]/75 leading-snug">
                                <span className="font-medium">{tr("Worth knowing:", "A tener en cuenta:", "À savoir :")}</span> {compatQ.data.friction}
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[var(--ink)]/8">
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
                                {locs.map((l) => <span key={l} className="chip-paper">{l}</span>)}
                              </div>
                            </div>
                          );
                        })()}

                        {(preview.languages?.length ?? 0) > 0 && (
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-2">{tr("Languages", "Idiomas", "Langues")}</div>
                            <div className="flex flex-wrap gap-2">
                              {preview.languages!.map((l) => <span key={l} className="chip-paper">{label(l)}</span>)}
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
                    </div>
                  </div>
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
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mb-3">{tr("Your Match Score", "Tu puntuación de compatibilidad", "Ton score de match")}</div>

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

