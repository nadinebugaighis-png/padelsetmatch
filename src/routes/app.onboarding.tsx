import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SmallFirstPhoto } from "@/components/SmallFirstPhoto";
import { levelFromRating, ratingForLevel } from "@/lib/level-label";
import { LevelScale } from "@/components/LevelScale";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getMyProfile, upsertMyProfile } from "@/lib/app.functions";
import { AGE_BRACKETS, bracketForMidpoint, bracketLabel, bracketMidpoint, resolveAgePreference, type AgeBracket } from "@/lib/age-bracket";
import {
  AUDIENCE_OPTIONS, AVAILABILITY_SLOTS, COURT_SIDES, HONEST_EDGES, LANGUAGES, LOOKING_FOR, NATIONALITIES,
  PADEL_STYLES, PERSONAL_STRENGTHS,
  PRIORITY_TRAITS,
  decodeLocation, encodeLocation,
  type CourtSide, type Gender, type LookingFor, type PadelLevel,
} from "@/lib/types";

type LocBlock = { country: string; city: string; areas: string[] };
const emptyBlock = (): LocBlock => ({ country: "", city: "", areas: ["", "", ""] });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { presetByKey } from "@/lib/location-presets";
import { COUNTRY_NAMES, citiesFor, areasFor } from "@/lib/locations";
import { toast } from "sonner";
import { Camera, Check, ChevronLeft, ChevronRight, Lock, Plus, X } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";
import { loadGuestDraft, clearGuestDraft } from "@/lib/guest-draft";
import { SearchableChips } from "@/components/SearchableChips";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { CoachSelfSection } from "@/components/CoachSelfSection";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({
    meta: [
      { name: "description", content: "Set your padel level, locations and player preferences." },
      { property: "og:title", content: "Create your player profile \u00b7 PadelSetMatch" },
      { property: "og:description", content: "Set your padel level, locations and player preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Create your profile · PadelSetMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { step?: number; loc?: string } => {
    const out: { step?: number; loc?: string } = {};
    const raw = Number(search.step);
    if (Number.isFinite(raw)) out.step = Math.max(0, Math.min(0, Math.floor(raw)));
    if (typeof search.loc === "string") out.loc = search.loc;
    return out;
  },
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
  const tr = useTr();
  const getProfile = useServerFn(getMyProfile);
  const upsert = useServerFn(upsertMyProfile);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile(), retry: 3, retryDelay: 500 });
  const search = Route.useSearch();

  const [step, setStep] = useState(search.step ?? 0);
  const [first_name, setFirstName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [bracket, setBracket] = useState<AgeBracket | null>(null);
  const [gender, setGender] = useState<Gender | "">("");
  const [genderCustom, setGenderCustom] = useState("");
  const [interested_in, setInterested] = useState<Gender[]>([]);
  const [friend_interested_in, setFriendAud] = useState<string[]>([]);
  const [partner_interested_in, setPartnerAud] = useState<string[]>([]);
  const [age_min, setAgeMin] = useState<number | null>(null);
  const [age_max, setAgeMax] = useState<number | null>(null);
  const [nationality, setNationality] = useState("__none__");
  const [nationality2, setNationality2] = useState("");
  const [locBlocks, setLocBlocks] = useState<LocBlock[]>([emptyBlock()]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [showSecondNat, setShowSecondNat] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [level, setLevel] = useState<PadelLevel | "">("");
  const [levelRatingValue, setLevelRatingValue] = useState<number | null>(null);
  const pickRating = (n: number) => { setLevelRatingValue(n); setLevel(levelFromRating(n) as PadelLevel); };
  const [priorities, setPriorities] = useState<string[]>([]);
  const [looking_for, setLookingFor] = useState<LookingFor>("both");
  const [goals, setGoals] = useState<string[]>(["padel"]);
  const [meetPref, setMeetPref] = useState<"men" | "women" | "everyone" | "">("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [lastPhotoFile, setLastPhotoFile] = useState<File | null>(null);
  const [availability, setAvailability] = useState<string[]>([]);
  const [courtSide, setCourtSide] = useState<CourtSide | "">("");
  const [freeCourt, setFreeCourt] = useState(false);
  const [freeCourtNote, setFreeCourtNote] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [personalTraits, setPersonalTraits] = useState<string[]>([]);
  const [padelStyle, setPadelStyle] = useState<string[]>([]);
  const [showStepHelp, setShowStepHelp] = useState(false);
  const [sheet, setSheet] = useState<{ kind: "loc"; i: number } | { kind: "nat" } | { kind: "lang" } | { kind: "style" } | null>(null);


  // Hydrate the form from the saved profile exactly ONCE. Without this guard a
  // background refetch (reconnect, cache invalidation, remount) re-runs the
  // effect and silently wipes whatever the user is typing.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (profileQ.data === undefined) return;
    hydratedRef.current = true;
    const p = profileQ.data;
    if (p) {
      setFirstName(p.first_name ?? "");
      setAge(p.age ?? null);
      setBracket(p.age_bracket_lo != null && p.age_bracket_hi != null ? [p.age_bracket_lo, p.age_bracket_hi] as AgeBracket : bracketForMidpoint(p.age));
      setGender((p.gender ?? "") as Gender | "");
      setGenderCustom(p.gender_custom ?? "");
      setInterested(Array.isArray(p.interested_in) ? p.interested_in : []);
      setAgeMin(p.age_min ?? null);
      setAgeMax(p.age_max ?? null);
      if (p.friend_interested_in?.length) setFriendAud(p.friend_interested_in);
      if (p.partner_interested_in?.length) setPartnerAud(p.partner_interested_in);
      setNationality(p.nationality ? p.nationality : "__none__");
      setNationality2(p.nationality_2 ?? "");
      setLevel((p.level ?? "") as PadelLevel | "");
      setLevelRatingValue(p.level_rating != null ? Number(p.level_rating) : null);
      setPriorities(Array.isArray(p.priorities) ? p.priorities : []);
      setLookingFor((p.looking_for ?? "both") as LookingFor);
      // Derive simple goals + meetPref from stored intents (fallback to legacy looking_for)
      const g: string[] = [];
      const storedIntents = (p as unknown as { intents?: string[] }).intents ?? [];
      if (storedIntents.length > 0) {
        if (storedIntents.includes("padel")) g.push("padel");
        if (storedIntents.includes("friend")) g.push("friends");
        if (storedIntents.includes("relationship")) g.push("relationship");
      } else {
        if (p.looking_for === "partner" || p.looking_for === "both") g.push("relationship");
        if (p.looking_for === "friend" || p.looking_for === "both") { g.push("padel"); g.push("friends"); }
      }
      if (g.length) setGoals(g);
      const pa = p.partner_interested_in?.[0];
      if (pa === "men" || pa === "women" || pa === "everyone") setMeetPref(pa);
      setBio(p.bio ?? ""); setPhotoUrl(p.photo_url ?? null);
      if (p.languages?.length) setLanguages(p.languages);
      if (p.locations?.length) {
        const byKey = new Map<string, LocBlock>();
        for (const s of p.locations) {
          const { country, city, area } = decodeLocation(s);
          if (!country && !city) continue;
          const key = `${country}|${city}`;
          if (!byKey.has(key)) byKey.set(key, { country, city, areas: ["", "", ""] });
          const b = byKey.get(key)!;
          if (area) {
            const idx = b.areas.findIndex((x) => !x);
            if (idx >= 0) b.areas[idx] = area;
          }
        }
        const blocks = Array.from(byKey.values());
        if (blocks.length) setLocBlocks(blocks);
      } else if (p.zone) {
        setLocBlocks([{ country: p.nationality || "", city: p.zone, areas: ["", "", ""] }]);
      }

      if (p.availability?.length) setAvailability(p.availability);
      if (p.court_side) setCourtSide(p.court_side as CourtSide);
      if (typeof p.free_court_access === "boolean") setFreeCourt(p.free_court_access);
      if (p.free_court_note) setFreeCourtNote(p.free_court_note);
      if (p.sexual_orientation) setSexualOrientation(p.sexual_orientation);
      if (p.personal_traits?.length) setPersonalTraits(p.personal_traits);
      if (p.padel_style?.length) setPadelStyle(p.padel_style);
    } else if (profileQ.data === null) {
      // New user, hydrate from the pre-signup guest draft if present
      const draft = loadGuestDraft();
      if (draft) {
        if (draft.priorities?.length) setPriorities((cur) => cur.length ? cur : draft.priorities!);
        if (draft.level) {
          setLevel(draft.level as PadelLevel);
          // A pre-signup band alone must never save without a number, so the
          // slider starts on that band's number and it is saved with the profile.
          setLevelRatingValue(ratingForLevel(draft.level));
        }
        // Legacy looking_for hydration removed, app is now padel-only.
        clearGuestDraft();
        toast.success("We pre-filled your answers from the preview.");
      }
    }
    // Brand-new player: pre-fill from the "Choose your location" page.
    if (!p || (!p.locations?.length && !p.zone)) {
      // `loc` is a preset key, or a community location picked from the directory.
      const preset = search.loc?.includes("|") ? decodeLocation(search.loc) : presetByKey(search.loc);
      if (preset?.country && preset.city) setLocBlocks([{ country: preset.country, city: preset.city, areas: [preset.area ?? "", "", ""] }]);
    }
  }, [profileQ.data]);

  // Brand-new Apple accounts: a returning member whose Apple sign-in produced a
  // fresh hidden address lands here; offer a quiet way back to their email.
  const [newAppleAccount, setNewAppleAccount] = useState(false);
  useEffect(() => {
    if (!profileQ.isSuccess || profileQ.data) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      const providers = (data.user?.app_metadata?.["providers"] as string[] | undefined) ?? [];
      if (alive && (data.user?.app_metadata?.["provider"] === "apple" || providers.includes("apple"))) setNewAppleAccount(true);
    }).catch(() => { /* non-blocking */ });
    return () => { alive = false; };
  }, [profileQ.isSuccess, profileQ.data]);
  const switchToEmail = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/auth", search: { redirect: undefined, join: undefined }, replace: true });
  };

  // Welcome toast, fires once for brand-new users (no profile yet).
  // Covers OAuth signups that bypass the auth.tsx toast path.
  const [welcomed, setWelcomed] = useState(false);
  useEffect(() => {
    if (!profileQ.isSuccess || profileQ.data || welcomed) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("pm-welcomed") === "1") { setWelcomed(true); return; }
    setWelcomed(true);
    sessionStorage.setItem("pm-welcomed", "1");
    (async () => {
      let ordinal: number | null = null;
      try {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: n } = await supabase.rpc("get_signup_ordinal", { _user_id: u.user.id });
          if (typeof n === "number" && n > 0) ordinal = n;
        }
      } catch { /* non-blocking */ }
      toast.success(
        ordinal
          ? tr(`Welcome, player #${ordinal}! 🎾`, `¡Bienvenido, jugador #${ordinal}! 🎾`, `Bienvenue, joueur n°${ordinal} ! 🎾`)
          : tr("Welcome aboard! 🎾", "¡Bienvenido a la pista! 🎾", "Bienvenue sur le court ! 🎾"),
        {
          description: tr(
            "Hope you love it. Share with a padel friend or two, it plays better with more of us on the court.",
            "Esperamos que te encante. Compártela con uno o dos amigos del pádel, funciona mejor entre más seamos en la pista.",
            "On espère que ça te plaira. Partage-la avec un ou deux copains de padel, c'est mieux quand on est plus nombreux sur le court.",
          ),
          duration: 8000,
        },
      );
    })();
  }, [profileQ.isSuccess, profileQ.data, welcomed, tr]);


  const toggleAvail = (s: string) => setAvailability((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);

  const updateBlock = (i: number, patch: Partial<LocBlock>) =>
    setLocBlocks((cur) => cur.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const updateArea = (i: number, ai: number, val: string) =>
    setLocBlocks((cur) => cur.map((b, j) => j === i ? { ...b, areas: b.areas.map((a, k) => k === ai ? val : a) } : b));
  const addBlock = () => {
    if (locBlocks.length >= 5) { toast.error(tr("Up to 5 countries", "Hasta 5 países", "Jusqu'à 5 pays")); return; }
    setLocBlocks((cur) => [...cur, emptyBlock()]);
  };
  const removeBlock = (i: number) => setLocBlocks((cur) => cur.length === 1 ? cur : cur.filter((_, j) => j !== i));

  const isReal = (s: string) => s.trim() && s !== "__custom__";
  const validBlocks = locBlocks.filter((b) => isReal(b.country) && isReal(b.city));
  const encodedLocations: string[] = validBlocks.flatMap((b) => {
    const areas = b.areas.map((a) => a.trim()).filter((a) => a && a !== "__custom__");
    if (!areas.length) return [encodeLocation({ country: b.country.trim(), city: b.city.trim() })];
    return areas.map((a) => encodeLocation({ country: b.country.trim(), city: b.city.trim(), area: a }));
  });

  const toggleLanguage = (l: string) => {
    if (!languages.includes(l) && languages.length >= 10) { toast.error(tr("Up to 10 languages", "Hasta 10 idiomas", "Jusqu’à 10 langues")); return; }
    setLanguages((cur) => cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]);
  };

  const audToGenders = (aud: string[]): Gender[] => {
    if (!aud.length || aud.includes("everyone") || aud.includes("bisexual") || aud.includes("queer")) return ["woman", "man", "non-binary"];
    const out = new Set<Gender>();
    if (aud.includes("men") || aud.includes("gay men")) out.add("man");
    if (aud.includes("women") || aud.includes("lesbian women")) out.add("woman");
    if (aud.includes("non-binary")) out.add("non-binary");
    return Array.from(out);
  };
  const toggleAud = (setter: (fn: (cur: string[]) => string[]) => void) => (opt: string) => {
    setter((cur) => {
      if (opt === "everyone") return cur.includes("everyone") ? [] : ["everyone"];
      const next = cur.filter((x) => x !== "everyone");
      return next.includes(opt) ? next.filter((x) => x !== opt) : [...next, opt];
    });
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error(t("ob.notSignedIn"));
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${u.user.id}/photo-${Date.now()}.${ext}`;

      const isTransient = (msg: string) =>
        /too many connections|timeout|temporarily|503|gateway|fetch failed|network/i.test(msg);

      let upErr: { message: string } | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const { error } = await supabase.storage
          .from("padel-photos")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!error) { upErr = null; break; }
        upErr = error;
        if (!isTransient(error.message) || attempt === 3) break;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
      if (upErr) {
        if (isTransient(upErr.message)) {
          throw new Error("Server is busy right now. Please wait a few seconds and try again.");
        }
        throw upErr;
      }

      const { data: signed, error: sErr } = await supabase.storage.from("padel-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("Couldn't sign URL");
      setPhotoUrl(signed.signedUrl);
      toast.success(t("ob.uploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ob.uploadFail"));
    } finally {
      setUploading(false);
    }
  };

  // App is now a padel-player directory only. No friendship/relationship intents.
  const hasPartnerGoal = false;
  const hasFriendGoal = false;
  const hasPadelGoal = true;
  const derivedIntents = ["padel"];


  const persistProfile = async () => {
    const derivedLookingFor: LookingFor = "friend"; // legacy neutral value, unused in UI
    const partnerAud: string[] = [];
    const friendAud: string[] = [];
    const legacy = interested_in;

    const first = validBlocks[0];
    if (age === null || !level) {
      throw new Error(tr("Please complete all required fields", "Completa todos los campos obligatorios", "Complète tous les champs obligatoires"));
    }
    await upsert({
      data: {
        first_name, age, gender: gender || "self-describe", interested_in: legacy,
        friend_interested_in: friendAud, partner_interested_in: partnerAud,
        age_bracket_lo: (bracket ?? bracketForMidpoint(age))?.[0] ?? null,
        age_bracket_hi: (bracket ?? bracketForMidpoint(age))?.[1] ?? null,
        ...resolveAgePreference(age_min, age_max), nationality: nationality === "__none__" ? "" : nationality,
        // A second nationality only counts alongside a real first one.
        nationality_2: nationality !== "__none__" && nationality !== "" && nationality !== "Other" && nationality2 !== nationality ? nationality2 : "",
        zone: first ? first.city : "",
        locations: encodedLocations, languages,
        level, level_rating: levelRatingValue, priorities, looking_for: derivedLookingFor, intents: derivedIntents,
        bio: bio || null, photo_url: photoUrl,
        availability, court_side: courtSide || "both",
        free_court_access: freeCourt, free_court_note: freeCourt ? (freeCourtNote.trim() || null) : null,
        gender_custom: gender === "self-describe" ? (genderCustom.trim() || null) : null,
        sexual_orientation: sexualOrientation.trim() ? sexualOrientation.trim() : null,
        personal_traits: personalTraits,
        padel_style: padelStyle,
      },
    });
  };

  const save = useMutation({
    mutationFn: async (opts?: { destination?: "grid" | "profile" }) => {
      await persistProfile();
      return opts?.destination ?? "grid";
    },
    onSuccess: (dest) => {
      qc.invalidateQueries();
      toast.success(t("ob.saved"));
      navigate({ to: dest === "profile" ? "/app/profile" : "/app/grid" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("ob.saveFail")),
  });


  const audOk = goals.length > 0 && (!hasPartnerGoal || !!meetPref);

  useEffect(() => setShowStepHelp(false), [step]);

  const missingByStepDetailed: Array<Array<{ key: string; label: string }>> = [
    ([
      !first_name.trim() ? { key: "first_name", label: tr("first name", "nombre", "prénom") } : null,
      age === null || age < 18 ? { key: "age", label: tr("age", "edad", "âge") } : null,
      null,
      null,
      age_min !== null && age_max !== null && age_min > age_max ? { key: "age_range", label: tr("a valid age range", "un rango de edad válido", "une tranche d'âge valide") } : null,
      validBlocks.length === 0 ? { key: "locations", label: tr("where you play", "dónde juegas", "où tu joues") } : null,
      !level ? { key: "level", label: tr("padel level", "nivel de pádel", "niveau de padel") } : null,
    ].filter(Boolean) as Array<{ key: string; label: string }>),
    [],
  ];

  const missingByStep = missingByStepDetailed.map((arr) => arr.map((x) => x.label));
  const canStep = missingByStep.map((items) => items.length === 0);

  // Saving always validates the required (step 1) fields. If something is
  // missing we send the user back to that step with the fields highlighted,
  // instead of failing with a vague error from the server call.
  const requestSave = (destination: "grid" | "profile") => {
    const missing = missingByStepDetailed[0] ?? [];
    if (missing.length > 0) {
      setStep(0);
      setShowStepHelp(true);
      toast.error(`${tr("Please complete", "Falta por completar", "À compléter")} ${missing.map((x) => x.label).join(", ")}.`);
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field="${missing[0].key}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }
    save.mutate({ destination });
  };

  // Exit: save when the profile is valid, otherwise confirm before discarding.
  const requestExit = () => {
    const missing = missingByStepDetailed[0] ?? [];
    if (missing.length === 0) { save.mutate({ destination: "profile" }); return; }
    const ok = window.confirm(tr(
      "Leave without saving? Your changes on this screen will be lost.",
      "¿Salir sin guardar? Se perderán los cambios de esta pantalla.",
      "Quitter sans enregistrer ? Les modifications de cet écran seront perdues.",
    ));
    if (ok) navigate({ to: "/app/profile" });
  };



  const missingKeysThisStep = new Set(
    showStepHelp ? (missingByStepDetailed[step] ?? []).map((x) => x.key) : []
  );
  const fieldCls = (key: string) =>
    missingKeysThisStep.has(key)
      ? "scroll-mt-24 rounded-2xl -mx-2 px-2 py-2 ring-2 ring-[var(--clay)] bg-[var(--clay)]/5 transition-colors"
      : "";

  const goNext = () => {
    const missing = missingByStepDetailed[step] ?? [];
    if (missing.length > 0) {
      setShowStepHelp(true);
      toast.error(`${tr("Please complete", "Falta por completar", "À compléter")} ${missing.map((x) => x.label).join(", ")}.`);
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field="${missing[0].key}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    setStep(step + 1);
    setShowStepHelp(false);
    setTimeout(() => { window.scrollTo({ top: 0, behavior: "smooth" }); document.getElementById("app-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); }, 30);
  };

  // Personality/values used to be a second page; those insights now come
  // from the quick questions on the Grid, so signup is a single page.
  const steps = [
    tr("Registration", "Registro", "Inscription"),
  ];

  if (profileQ.isLoading) {
    return (
      <main className="px-4 py-10 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center text-[var(--ink)]/80">
        {tr("Loading your profile…", "Cargando tu perfil…", "Chargement de ton profil…")}
      </main>
    );
  }
  if (profileQ.isError) {
    return (
      <main className="px-4 py-10 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center space-y-4">
        <p className="text-[var(--ink)]/88">
          {tr("We couldn't load your profile. Please check your connection.", "No pudimos cargar tu perfil. Comprueba tu conexión.", "Impossible de charger ton profil. Vérifie ta connexion.")}
        </p>
        <Button onClick={() => profileQ.refetch()}>{tr("Try again", "Reintentar", "Réessayer")}</Button>
      </main>
    );
  }

  const isNew = !profileQ.data;
  const SEL = "w-full h-11 rounded-xl border border-[var(--ink)]/22 bg-[var(--card)] px-3 text-[15px] text-[var(--ink)] disabled:opacity-50";
  const CUSTOM = "__custom__";
  const realNat = (n: string) => n !== "__none__" && n !== "" && n !== "Other";
  const natSummary = nationality === "__none__"
    ? ""
    : nationality === ""
      ? tr("Prefer not to say", "Prefiero no decirlo", "Je préfère ne pas dire")
      : [nationality === "Other" ? tr("Other", "Otro", "Autre") : nationality, realNat(nationality) && nationality2 && nationality2 !== nationality ? nationality2 : ""].filter(Boolean).join(" ");
  const langSummary = languages.map((l) => ((LANGUAGES as readonly string[]).includes(l) ? label(l) : l)).join(", ");
  const ageMinShown = age_min ?? 18;
  const ageMaxShown = age_max ?? 99;
  const ageRangeText = age_min === null && age_max === null
    ? tr("Any age", "Cualquier edad", "Tous âges")
    : `${ageMinShown} ${tr("to", "a", "à")} ${age_max === null ? "99" : ageMaxShown}`;

  const renderLocEditor = (i: number) => {
    const b = locBlocks[i];
    if (!b) return null;
    const countryInList = !b.country || COUNTRY_NAMES.includes(b.country);
    const cities = citiesFor(countryInList ? b.country : "");
    const cityInList = !b.city || cities.some((c) => c.name === b.city);
    const areaOpts = areasFor(countryInList ? b.country : "", cityInList ? b.city : "");
    return (
      <div className="space-y-3">
        <div>
          <FieldLabel>{tr("Country", "País", "Pays")}</FieldLabel>
          <select
            value={countryInList ? b.country : CUSTOM}
            onChange={(e) => {
              const v = e.target.value;
              const nextCountry = v === CUSTOM ? CUSTOM : v;
              const firstCity = nextCountry && nextCountry !== CUSTOM ? (citiesFor(nextCountry)[0]?.name ?? "") : "";
              updateBlock(i, { country: nextCountry, city: firstCity, areas: ["", "", ""] });
            }}
            className={SEL}
          >
            <option value="">{tr("Country", "País", "Pays")}</option>
            {COUNTRY_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value={CUSTOM}>{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)", "+ Autre (saisis le tien)")}</option>
          </select>
          {!countryInList && (
            <Input className="mt-2 h-11 rounded-xl" maxLength={60} value={b.country === CUSTOM ? "" : b.country} onChange={(e) => updateBlock(i, { country: e.target.value })} placeholder={tr("Type country name", "Escribe el país", "Saisis le nom du pays")} />
          )}
        </div>
        {isReal(b.country) && (
          <div>
            <FieldLabel>{tr("City", "Ciudad", "Ville")}</FieldLabel>
            {cities.length > 0 && (
              <select
                value={cityInList ? b.city : CUSTOM}
                onChange={(e) => {
                  const v = e.target.value;
                  updateBlock(i, { city: v === CUSTOM ? CUSTOM : v, areas: ["", "", ""] });
                }}
                className={SEL}
              >
                <option value="">{tr("City", "Ciudad", "Ville")}</option>
                {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                <option value={CUSTOM}>{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)", "+ Autre (saisis le tien)")}</option>
              </select>
            )}
            {(cities.length === 0 || !cityInList) && (
              <Input className="mt-2 h-11 rounded-xl" maxLength={60} value={b.city === CUSTOM ? "" : b.city} onChange={(e) => updateBlock(i, { city: e.target.value })} placeholder={tr("Type city name", "Escribe la ciudad", "Saisis le nom de la ville")} />
            )}
          </div>
        )}
        {isReal(b.city) && (
          <div>
            <FieldLabel>{tr("Areas, up to 3 (optional)", "Zonas, hasta 3 (opcional)", "Zones, jusqu'à 3 (optionnel)")}</FieldLabel>
            <div className="space-y-2">
              {b.areas.map((a, ai) => {
                const areaInList = !a || areaOpts.includes(a);
                const taken = new Set(b.areas.filter((x, k) => k !== ai && x && x !== CUSTOM));
                if (areaOpts.length > 0 && areaInList) {
                  return (
                    <select key={ai} value={a || "__none__"} onChange={(e) => updateArea(i, ai, e.target.value === "__none__" ? "" : e.target.value)} className={SEL}>
                      <option value="__none__">{tr("Area", "Zona", "Zone")} {ai + 1}</option>
                      {areaOpts.filter((o) => !taken.has(o)).map((o) => <option key={o} value={o}>{o}</option>)}
                      <option value={CUSTOM}>{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)", "+ Autre (saisis le tien)")}</option>
                    </select>
                  );
                }
                return (
                  <div key={ai} className="flex gap-2">
                    <Input className="h-11 rounded-xl" maxLength={80} value={a === CUSTOM ? "" : a} onChange={(e) => updateArea(i, ai, e.target.value)} placeholder={`${tr("Area", "Zona", "Zone")} ${ai + 1}`} />
                    {a && (
                      <button type="button" onClick={() => updateArea(i, ai, "")} aria-label={tr("Clear this area", "Borrar esta zona", "Effacer cette zone")} className="px-2 text-[var(--ink)]/82">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {locBlocks.length > 1 && (
          <button type="button" onClick={() => { removeBlock(i); setSheet(null); }} className="w-full pt-3 text-center text-[13px] text-[var(--destructive)]">
            {tr("Remove this place", "Quitar este lugar", "Retirer ce lieu")}
          </button>
        )}
      </div>
    );
  };

  const nationalityEditor = (
    <div className="space-y-3">
      <div>
        <FieldLabel>{t("ob.nat")}</FieldLabel>
        <select className={SEL} value={nationality} onChange={(e) => setNationality(e.target.value)}>
          <option value="__none__">{tr("Select country", "Selecciona país", "Sélectionne un pays")}</option>
          {NATIONALITIES.filter((n) => n !== "Other").map((n) => <option key={n} value={n}>{n}</option>)}
          <option value="Other">{tr("Other", "Otro", "Autre")}</option>
          <option value="">{tr("Prefer not to say", "Prefiero no decirlo", "Je préfère ne pas dire")}</option>
        </select>
      </div>
      {realNat(nationality) && (
        showSecondNat || (nationality2 !== "" && nationality2 !== nationality) ? (
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>{tr("Second nationality", "Segunda nacionalidad", "Seconde nationalité")}</FieldLabel>
              <button type="button" onClick={() => { setNationality2(""); setShowSecondNat(false); }} className="text-[12px] text-[var(--ink)]/82 underline underline-offset-2">
                {tr("Remove", "Quitar", "Retirer")}
              </button>
            </div>
            <select aria-label={tr("Second nationality", "Segunda nacionalidad", "Seconde nationalité")} className={SEL} value={nationality2 === nationality ? "" : nationality2} onChange={(e) => setNationality2(e.target.value)}>
              <option value="">{tr("Select country", "Selecciona país", "Sélectionne un pays")}</option>
              {NATIONALITIES.filter((n) => n !== "Other" && n !== nationality).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ) : (
          <button type="button" onClick={() => setShowSecondNat(true)} className="inline-flex min-h-11 items-center gap-1 text-[14px] text-[var(--ink)]/80">
            <Plus className="w-4 h-4" /> {tr("Add second nationality", "Añadir segunda nacionalidad", "Ajouter une seconde nationalité")}
          </button>
        )
      )}
    </div>
  );

  const languagesEditor = (() => {
    const COMMON = ["English", "Spanish", "Portuguese", "French", "Italian", "German", "Arabic"];
    const ALL = LANGUAGES as readonly string[];
    const q = langQuery.trim().toLowerCase();
    const ordered = [...COMMON.filter((l) => ALL.includes(l)), ...ALL.filter((l) => !COMMON.includes(l))];
    const visible = q ? ordered.filter((l) => l.toLowerCase().includes(q) || label(l).toLowerCase().includes(q)) : ordered;
    const trimmed = langQuery.trim();
    const canAddCustom =
      trimmed.length >= 2 &&
      !languages.some((l) => l.toLowerCase() === trimmed.toLowerCase()) &&
      !ALL.some((l) => l.toLowerCase() === trimmed.toLowerCase());
    const addCustom = () => {
      const name = trimmed.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (!name) return;
      if (name.length > 30 || languages.length >= 10) { toast.error(tr("Up to 10 languages, 30 characters each", "Hasta 10 idiomas, 30 caracteres cada uno", "Jusqu’à 10 langues, 30 caractères chacune")); return; }
      if (!languages.some((l) => l.toLowerCase() === name.toLowerCase())) setLanguages((cur) => [...cur, name]);
      setLangQuery("");
    };
    return (
      <div className="space-y-3">
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <button key={l} type="button" onClick={() => toggleLanguage(l)} aria-label={`${tr("Remove", "Quitar", "Retirer")} ${ALL.includes(l) ? label(l) : l}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px]">
                {ALL.includes(l) ? label(l) : l} <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={langQuery}
          onChange={(e) => setLangQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (canAddCustom) addCustom(); } }}
          placeholder={tr("Search a language", "Busca un idioma", "Cherche une langue")}
          aria-label={t("ob.langs")}
          className={SEL}
        />
        <div className="max-h-[40vh] overflow-y-auto overscroll-contain" role="listbox" aria-multiselectable="true" aria-label={t("ob.langs")}>
          {visible.map((l) => {
            const on = languages.includes(l);
            return (
              <button
                key={l}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => { toggleLanguage(l); setLangQuery(""); }}
                className={`flex w-full min-h-12 items-center justify-between text-left text-[15px] border-b border-[var(--ink)]/[0.07] last:border-b-0 active:bg-[var(--ink)]/[0.04] ${on ? "text-[var(--ink)] font-medium" : "text-[var(--ink)]/88"}`}
              >
                <span>{label(l)}</span>
                {on && <Check className="w-4 h-4 text-[var(--ink)]" strokeWidth={2.5} />}
              </button>
            );
          })}
          {canAddCustom && (
            <button type="button" onClick={addCustom} className="flex w-full min-h-12 items-center gap-2 text-left text-[15px] text-[var(--ink)]/88">
              <Plus className="w-4 h-4" /> {tr("Add", "Añadir", "Ajouter")} "{trimmed}"
            </button>
          )}
          {visible.length === 0 && !canAddCustom && (
            <p className="py-3 text-xs text-[var(--ink)]/82">{tr("No match. Type a name and press Enter to add.", "Sin resultados. Escribe un nombre y pulsa Intro para añadirlo.", "Aucun résultat. Tape un nom et appuie sur Entrée pour l'ajouter.")}</p>
          )}
        </div>
      </div>
    );
  })();

  const styleEditor = (
    <SearchableChips
      options={PADEL_STYLES as readonly string[]}
      selected={padelStyle}
      onToggle={(s) => setPadelStyle((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= 3 ? cur : [...cur, s]))}
      onAddCustom={(v) => setPadelStyle((cur) => (cur.length >= 3 || cur.includes(v) ? cur : [...cur, v]))}
      labelFn={label}
      placeholder={tr("Search or type your style…", "Busca o escribe tu estilo…", "Cherche ou tape ton style…")}
      addWord={tr("Add", "Añadir", "Ajouter")}
      moreWord={tr("more", "más", "plus")}
      lessWord={tr("Show less", "Ver menos", "Voir moins")}
    />
  );

  const sheetTitle = !sheet ? "" :
    sheet.kind === "loc" ? tr("Where you play", "Dónde juegas", "Où tu joues") :
    sheet.kind === "nat" ? t("ob.nat") :
    sheet.kind === "lang" ? t("ob.langs") :
    tr("Your style, up to 3", "Tu estilo, hasta 3", "Ton style, jusqu'à 3");

  return (
    <main className="programme-page px-5 pb-36 max-w-md sm:max-w-xl mx-auto min-h-screen">
      <h1 className="sr-only">{isNew ? tr("Create your profile", "Crea tu perfil", "Créez votre profil") : tr("Edit profile", "Editar perfil", "Modifier le profil")}</h1>
      <div className="sticky top-0 z-20 -mx-5 px-3 pt-2 pb-2 bg-[var(--paper)]/95 backdrop-blur border-b border-[var(--ink)]/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={tr("Back", "Atrás", "Retour")}
            onClick={requestExit}
            disabled={save.isPending}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--ink)] active:bg-[var(--ink)]/10 disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="flex-1 text-center text-serif text-[19px] text-[var(--ink)]">
            {isNew ? tr("Your profile", "Tu perfil", "Ton profil") : tr("Edit profile", "Editar perfil", "Modifier le profil")}
          </span>
          <span className="w-10" />
        </div>
      </div>

      {showStepHelp && missingByStep[0]?.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[var(--clay)]/25 bg-[var(--clay)]/10 px-4 py-3 text-sm text-[var(--ink)]/90">
          <span className="font-semibold">{tr("To continue, complete:", "Para continuar, completa:", "Pour continuer, complète :")}</span>{" "}
          {missingByStep[0].join(", ")}.
        </div>
      )}
      {newAppleAccount && (
        <p className="mt-4 text-[12px] text-[var(--ink)]/82 leading-relaxed text-center">
          {tr("Already a member?", "¿Ya eres miembro?", "Déjà membre ?")}{" "}
          <button type="button" onClick={switchToEmail} className="underline underline-offset-2 text-[var(--ink)]/88">
            {tr("Sign in with your email instead", "Entra con tu email", "Connecte-toi avec ton e-mail")}
          </button>
        </p>
      )}

      {/* Photo */}
      <div className="pt-6 flex flex-col items-center">
        <label className="relative block w-32 h-40 rounded-t-full rounded-b-[16px] overflow-hidden border border-[var(--ink)]/16 bg-[var(--paper-2)] cursor-pointer">
          {photoUrl ? (
            <SmallFirstPhoto url={photoUrl} w={480} alt={first_name || tr("Your photo", "Tu foto", "Ta photo")} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[var(--ink)]/70">
              <Camera className="w-7 h-7" />
            </span>
          )}
          <input
            id="ob-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPendingPhotoFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <div className="mt-2 flex items-center gap-1 text-[13px] text-[var(--ink)]/84">
          <button type="button" disabled={uploading} onClick={() => document.getElementById("ob-photo-input")?.click()} className="min-h-10 px-2 underline-offset-4 hover:underline disabled:opacity-50">
            {uploading ? t("ob.uploading") : photoUrl ? tr("Change photo", "Cambiar foto", "Changer la photo") : tr("Add photo", "Añadir foto", "Ajouter une photo")}
          </button>
          {photoUrl && lastPhotoFile && (
            <>
              <span aria-hidden="true">·</span>
              <button type="button" disabled={uploading} onClick={() => setPendingPhotoFile(lastPhotoFile)} className="min-h-10 px-2 underline-offset-4 hover:underline">
                {tr("Recrop", "Recortar", "Recadrer")}
              </button>
            </>
          )}
          {photoUrl && (
            <>
              <span aria-hidden="true">·</span>
              <button type="button" disabled={uploading} onClick={() => { setPhotoUrl(null); setLastPhotoFile(null); }} className="min-h-10 px-2 text-[var(--ink)]/78 underline-offset-4 hover:underline">
                {tr("Remove", "Quitar", "Retirer")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* About you */}
      <Section title={tr("About you", "Sobre ti", "À propos de toi")}>
        <div data-field="first_name" className={`py-3 border-b border-[var(--ink)]/18 ${fieldCls("first_name")}`}>
          <FieldLabel htmlFor="ob-first-name">{tr("Name players see", "Nombre que verán", "Nom affiché")}</FieldLabel>
          <input id="ob-first-name" value={first_name} onChange={(e) => setFirstName(e.target.value)} placeholder={t("ob.firstNamePh")} className="w-full bg-transparent text-[17px] text-[var(--ink)] placeholder:text-[var(--ink)]/30 focus:outline-none" maxLength={40} />
        </div>
        <div className="py-3 border-b border-[var(--ink)]/18">
          <FieldLabel htmlFor="ob-bio">{tr("Short bio", "Bio corta", "Bio courte")}</FieldLabel>
          <textarea id="ob-bio" rows={3} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("ob.bioPh")} className="w-full resize-none bg-transparent text-serif italic text-[17px] leading-snug text-[var(--ink)] placeholder:text-[var(--ink)]/30 focus:outline-none" />
          <div className="text-right text-[10px] text-[var(--ink)]/70">{bio.length}/280</div>
        </div>
      </Section>

      {/* Your game */}
      <Section title={tr("Your game", "Tu juego", "Ton jeu")}>
        <div data-field="level" className={`py-3 ${fieldCls("level")}`}>
          <LevelScale
            value={levelRatingValue}
            fallback={ratingForLevel(level || null)}
            onChange={pickRating}
            tr={tr}
            label={t("ob.padelLevel")}
            plainLabel
          />
        </div>
        <SummaryRow label={tr("Style", "Estilo", "Style")} value={padelStyle.map((s) => label(s)).join(", ")} onClick={() => setSheet({ kind: "style" })} />
      </Section>

      {/* Where you play */}
      <Section title={tr("Where you play", "Dónde juegas", "Où tu joues")} sub={tr("Home, work, summer house or travel.", "Casa, trabajo, verano o viajes.", "Maison, travail, été ou voyage.")}>
        <div data-field="locations" className={fieldCls("locations")}>
          {locBlocks.map((b, i) => {
            const areas = b.areas.filter((a) => a && a !== CUSTOM);
            const head = [isReal(b.country) ? b.country : "", isReal(b.city) ? b.city : ""].filter(Boolean).join(" · ");
            return (
              <SummaryRow
                key={i}
                label={head || tr("New place", "Nuevo lugar", "Nouveau lieu")}
                value={areas.length ? areas.join(", ") : isReal(b.city) ? b.city : ""}
                onClick={() => setSheet({ kind: "loc", i })}
              />
            );
          })}
        </div>
        <button type="button" onClick={() => { const n = locBlocks.length; addBlock(); if (n < 5) setSheet({ kind: "loc", i: n }); }} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[14px] text-[var(--ink)]/84">
          <Plus className="w-4 h-4" /> {tr("Add another place", "Añadir otro lugar", "Ajouter un autre lieu")}
        </button>
      </Section>

      {/* Who you match with */}
      <Section title={tr("Who you play with", "Con quién juegas", "Avec qui tu joues")} sub={tr("Only used to suggest games. Never shown on your profile.", "Solo para sugerirte partidos. Nunca se muestra en tu perfil.", "Uniquement pour te suggérer des matchs. Jamais affiché sur ton profil.")} icon={<Lock className="w-3 h-3" />}>
        <div data-field="age" className={`py-3 border-b border-[var(--ink)]/18 ${fieldCls("age")}`}>
          <FieldLabel>{tr("Your age", "Tu edad", "Ton âge")}</FieldLabel>
          <div className="mt-1 grid grid-cols-5 overflow-hidden rounded-xl border border-[var(--ink)]/22">
            {AGE_BRACKETS.map((b, idx) => {
              const mid = bracketMidpoint(b);
              const selected = bracket !== null && bracket[0] === b[0] && bracket[1] === b[1];
              const labelTxt = bracketLabel(b);
              return (
                <button
                  key={labelTxt}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => { setBracket(b); setAge(mid); }}
                  className={`h-11 text-[13px] transition-colors ${idx > 0 ? "border-l border-[var(--ink)]/22" : ""} ${selected ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink)]/84 active:bg-[var(--ink)]/5"}`}
                >
                  {labelTxt}
                </button>
              );
            })}
          </div>
        </div>
        <div data-field="age_range" className={`py-3 ${fieldCls("age_range")}`}>
          <div className="flex items-center justify-between">
            <FieldLabel>{tr("Players aged", "Edad de los jugadores", "Âge des joueurs")}</FieldLabel>
            <span className="text-[14px] text-[var(--ink)]">{ageRangeText}</span>
          </div>
          <SliderPrimitive.Root
            className="relative mt-3 flex h-8 w-full touch-none select-none items-center"
            min={18}
            max={99}
            step={1}
            minStepsBetweenThumbs={1}
            value={[ageMinShown, ageMaxShown]}
            onValueChange={(v) => {
              const lo = v[0] ?? 18;
              const hi = v[1] ?? 99;
              setAgeMin(lo <= 18 ? null : lo);
              setAgeMax(hi >= 99 ? null : hi);
            }}
            aria-label={tr("Players aged", "Edad de los jugadores", "Âge des joueurs")}
          >
            <SliderPrimitive.Track className="relative h-px w-full grow bg-[var(--ink)]/20">
              <SliderPrimitive.Range className="absolute h-full bg-[var(--ink)]" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb aria-label={tr("Youngest", "Mínima", "Minimum")} className="block h-6 w-6 rounded-full border border-[var(--ink)]/30 bg-[var(--card)] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30" />
            <SliderPrimitive.Thumb aria-label={tr("Oldest", "Máxima", "Maximum")} className="block h-6 w-6 rounded-full border border-[var(--ink)]/30 bg-[var(--card)] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30" />
          </SliderPrimitive.Root>
        </div>
      </Section>

      {/* Background */}
      <Section title={tr("Background", "Origen", "Origines")} note={tr("optional", "opcional", "optionnel")}>
        <SummaryRow label={t("ob.nat")} value={natSummary} onClick={() => setSheet({ kind: "nat" })} />
        <SummaryRow label={t("ob.langs")} value={langSummary} onClick={() => setSheet({ kind: "lang" })} />
      </Section>

      {/* Extras */}
      <Section title={tr("Extras", "Extras", "Extras")}>
        <ToggleRow
          icon={<span className="text-[18px] leading-none" aria-hidden="true">🎾</span>}
          title={tr("I have free court access", "Tengo pista gratis", "J'ai accès à une pista gratuite")}
          sub={tr("Private club or residential court", "Club privado o pista residencial", "Club privé ou pista résidentielle")}
          on={freeCourt}
          onChange={() => setFreeCourt((v) => !v)}
        />
        {freeCourt && (
          <Input
            className="mt-1 mb-2 h-11 rounded-xl"
            value={freeCourtNote}
            onChange={(e) => setFreeCourtNote(e.target.value)}
            placeholder={tr("Court name or area (address only in chat)", "Nombre de la pista o zona (dirección solo en el chat)", "Nom de la pista ou zone (adresse seulement en chat)")}
            maxLength={200}
          />
        )}
        {profileQ.data && <CoachSelfSection isCoach={!!(profileQ.data as { is_coach?: boolean }).is_coach} showLink={false} />}
      </Section>

      <Sheet open={!!sheet} onOpenChange={(o) => { if (!o) setSheet(null); }}>
        <SheetContent side="bottom" className="programme-page rounded-t-3xl max-h-[88vh] overflow-y-auto px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] [&>button:first-of-type]:hidden">
          <div className="flex items-center justify-between gap-3 mb-4">
            <SheetTitle style={{ fontFamily: "var(--font-serif)" }} className="text-[22px] font-normal normal-case tracking-normal text-[var(--ink)]">{sheetTitle}</SheetTitle>
            <button type="button" onClick={() => setSheet(null)} className="min-h-10 px-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]">
              {tr("Done", "Listo", "OK")}
            </button>
          </div>
          {sheet?.kind === "loc" && renderLocEditor(sheet.i)}
          {sheet?.kind === "nat" && nationalityEditor}
          {sheet?.kind === "lang" && languagesEditor}
          {sheet?.kind === "style" && styleEditor}
        </SheetContent>
      </Sheet>

      <div data-bottom-ui className="fixed inset-x-0 bottom-0 z-30 bg-[var(--paper)]/95 backdrop-blur border-t border-[var(--ink)]/[0.06]" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
        <div className="max-w-md sm:max-w-xl mx-auto px-5 pt-3">
          <button
            type="button"
            onClick={() => requestSave(isNew ? "grid" : "profile")}
            disabled={save.isPending || uploading}
            className="w-full h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px] tracking-[0.08em] active:scale-[0.99] transition disabled:opacity-60"
          >
            {save.isPending ? t("ob.saving") : isNew ? tr("Save and start", "Guardar y empezar", "Enregistrer et commencer") : tr("Save changes", "Guardar cambios", "Enregistrer")}
          </button>
        </div>
      </div>

      <PhotoCropDialog
        file={pendingPhotoFile}
        onCancel={() => setPendingPhotoFile(null)}
        onConfirm={(cropped) => {
          setPendingPhotoFile(null);
          setLastPhotoFile(cropped);
          uploadPhoto(cropped);
        }}
      />
    </main>
  );
}

function Section({ title, sub, note, icon, children }: { title: string; sub?: string; note?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="pt-9">
      <div className="flex items-baseline gap-2">
        <h2 className="text-serif text-[26px] leading-tight text-[var(--ink)]">{title}</h2>
        {note && <span className="text-[12px] text-[var(--ink)]/72">{note}</span>}
      </div>
      {sub && <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--ink)]/78">{icon}{sub}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-[12px] text-[var(--ink)]/78 mb-0.5">{children}</label>;
}

function SummaryRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  const tr = useTr();
  return (
    <button type="button" onClick={onClick} className="w-full min-h-[60px] flex items-center justify-between gap-3 py-3 text-left border-b border-[var(--ink)]/18 active:bg-[var(--ink)]/[0.03]">
      <span className="min-w-0">
        <span className="block text-[12px] text-[var(--ink)]/78">{label}</span>
        <span className={`block truncate text-[16px] ${value ? "text-[var(--ink)]" : "text-[var(--ink)]/35"}`}>{value || tr("Add", "Añadir", "Ajouter")}</span>
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-[var(--ink)]/70" />
    </button>
  );
}

function ToggleRow({ icon, title, sub, on, onChange, disabled }: { icon?: ReactNode; title: string; sub?: string; on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[var(--ink)]/18 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="inline-flex w-8 justify-center shrink-0">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[16px] text-[var(--ink)] leading-tight">{title}</div>
          {sub && <div className="text-[12px] text-[var(--ink)]/78 mt-0.5">{sub}</div>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={onChange}
        disabled={disabled}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-[var(--ink)]" : "bg-[var(--ink)]/15"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[var(--card)] shadow-sm transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
