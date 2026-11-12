import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getMyProfile, upsertMyProfile } from "@/lib/app.functions";
import { AGE_BRACKETS, bracketForMidpoint, bracketLabel, bracketMidpoint, type AgeBracket } from "@/lib/age-bracket";
import {
  AUDIENCE_OPTIONS, AVAILABILITY_SLOTS, COURT_SIDES, GENDERS, HONEST_EDGES, LANGUAGES, LOOKING_FOR, NATIONALITIES, PADEL_LEVELS,
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
import { ArrowUp, Camera, Crop, Plus, Trash2, X } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";
import { loadGuestDraft, clearGuestDraft } from "@/lib/guest-draft";
import { SearchableChips } from "@/components/SearchableChips";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { parseAdultAge } from "@/lib/qa-safety";

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

function AgeInput({ value, onCommit, placeholder }: { value: number | null; onCommit: (n: number | null) => void; placeholder?: string }) {
  const tr = useTr();
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => { setText(value === null ? "" : String(value)); }, [value]);
  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => {
        if (text.trim() === "") { onCommit(null); return; }
        const age = parseAdultAge(text);
        if (age === null) toast.error(tr("Enter an age from 18 to 99.", "Introduce una edad de 18 a 99 años.", "Saisis un âge entre 18 et 99 ans."));
        onCommit(age);
      }}
    />
  );
}

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
  const [locBlocks, setLocBlocks] = useState<LocBlock[]>([emptyBlock()]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [showAllLangs, setShowAllLangs] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const [level, setLevel] = useState<PadelLevel | "">("");
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
  const [mixedDoubles, setMixedDoubles] = useState(false);
  const [freeCourt, setFreeCourt] = useState(false);
  const [freeCourtNote, setFreeCourtNote] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [personalTraits, setPersonalTraits] = useState<string[]>([]);
  const [padelStyle, setPadelStyle] = useState<string[]>([]);
  const [showStepHelp, setShowStepHelp] = useState(false);


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
      setLevel((p.level ?? "") as PadelLevel | "");
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
      if (typeof p.mixed_doubles === "boolean") setMixedDoubles(p.mixed_doubles);
      if (typeof p.free_court_access === "boolean") setFreeCourt(p.free_court_access);
      if (p.free_court_note) setFreeCourtNote(p.free_court_note);
      if (p.sexual_orientation) setSexualOrientation(p.sexual_orientation);
      if (p.personal_traits?.length) setPersonalTraits(p.personal_traits);
      if (p.padel_style?.length) setPadelStyle(p.padel_style);
    } else if (profileQ.data === null) {
      // New user — hydrate from the pre-signup guest draft if present
      const draft = loadGuestDraft();
      if (draft) {
        if (draft.priorities?.length) setPriorities((cur) => cur.length ? cur : draft.priorities!);
        if (draft.level) setLevel(draft.level as PadelLevel);
        // Legacy looking_for hydration removed — app is now padel-only.
        clearGuestDraft();
        toast.success("We pre-filled your answers from the preview.");
      }
    }
    // Brand-new player: pre-fill from the "Choose your location" page.
    if (!p || (!p.locations?.length && !p.zone)) {
      const preset = presetByKey(search.loc);
      if (preset) setLocBlocks([{ country: preset.country, city: preset.city, areas: [preset.area ?? "", "", ""] }]);
    }
  }, [profileQ.data]);

  // Welcome toast — fires once for brand-new users (no profile yet).
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
            "Hope you love it — share with a padel friend or two, it plays better with more of us on the court.",
            "Esperamos que te encante — compártela con uno o dos amigos del pádel, funciona mejor entre más seamos en la pista.",
            "On espère que ça te plaira — partage-la avec un ou deux copains de padel, c'est mieux quand on est plus nombreux sur le court.",
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
          throw new Error("Server is busy right now — please wait a few seconds and try again.");
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
    if (age === null || age_min === null || age_max === null || !gender || !level) {
      throw new Error(tr("Please complete all required fields", "Completa todos los campos obligatorios", "Complète tous les champs obligatoires"));
    }
    await upsert({
      data: {
        first_name, age, gender, interested_in: legacy,
        friend_interested_in: friendAud, partner_interested_in: partnerAud,
        age_bracket_lo: (bracket ?? bracketForMidpoint(age))?.[0] ?? null,
        age_bracket_hi: (bracket ?? bracketForMidpoint(age))?.[1] ?? null,
        age_min, age_max, nationality: nationality === "__none__" ? "" : nationality,
        zone: first ? first.city : "",
        locations: encodedLocations, languages,
        level, priorities, looking_for: derivedLookingFor, intents: derivedIntents,
        bio: bio || null, photo_url: photoUrl,
        availability, court_side: courtSide || "both", mixed_doubles: mixedDoubles,
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
      !gender ? { key: "gender", label: tr("gender", "género", "genre") } : null,
      null,
      null,
      age_min === null || age_max === null ? { key: "age_range", label: tr("age range", "rango de edad", "tranche d'âge") } : null,
      age_min !== null && age_max !== null && age_min > age_max ? { key: "age_range", label: tr("a valid age range", "un rango de edad válido", "une tranche d'âge valide") } : null,
      validBlocks.length === 0 ? { key: "locations", label: tr("where you play", "dónde juegas", "où tu joues") } : null,
      languages.length === 0 ? { key: "languages", label: tr("languages", "idiomas", "langues") } : null,
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
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
  };

  // Personality/values used to be a second page; those insights now come
  // from the quick questions on the Grid, so signup is a single page.
  const steps = [
    tr("Registration", "Registro", "Inscription"),
  ];

  if (profileQ.isLoading) {
    return (
      <main className="px-4 py-10 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center text-[var(--ink)]/70">
        {tr("Loading your profile…", "Cargando tu perfil…", "Chargement de ton profil…")}
      </main>
    );
  }
  if (profileQ.isError) {
    return (
      <main className="px-4 py-10 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center space-y-4">
        <p className="text-[var(--ink)]/80">
          {tr("We couldn't load your profile. Please check your connection.", "No pudimos cargar tu perfil. Comprueba tu conexión.", "Impossible de charger ton profil. Vérifie ta connexion.")}
        </p>
        <Button onClick={() => profileQ.refetch()}>{tr("Try again", "Reintentar", "Réessayer")}</Button>
      </main>
    );
  }

  return (
    <main className="px-4 py-6 pb-32 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
      <h1 className="sr-only">{tr("Create your profile", "Crea tu perfil", "Créez votre profil")}</h1>
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-3 bg-[var(--paper,#fdfaf3)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--paper,#fdfaf3)]/80">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-[var(--ink)]/70">
          {step > 0 ? (
            <button
              type="button"
              aria-label={t("ob.back")}
              onClick={() => { setStep(step - 1); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30); }}
              className="inline-flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-[var(--ink)]/10 active:bg-[var(--ink)]/15"
            >
              <ArrowUp className="w-4 h-4 -rotate-90" />
            </button>
          ) : <span className="w-8" />}
          <span className="flex-1 text-center">{steps[step]}</span>
          <button
            type="button"
            onClick={requestExit}
            disabled={save.isPending}
            className="text-[10px] tracking-[0.2em] text-[var(--ink)]/60 hover:text-[var(--ink)] disabled:opacity-40"
          >
            {tr("Exit", "Salir", "Sortir")}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] shadow-sm p-5 sm:p-8 space-y-4">
        {showStepHelp && missingByStep[step]?.length > 0 && (
          <div className="rounded-2xl border border-[var(--clay)]/25 bg-[var(--clay)]/10 px-4 py-3 text-sm text-[var(--ink)]/85">
            <span className="font-semibold">{tr("To continue, complete:", "Para continuar, completa:", "Pour continuer, complète :")}</span>{" "}
            {missingByStep[step].join(", ")}.
          </div>
        )}
        {step === 0 && (
          <>
            <h2 className="text-display text-[1.375rem] sm:text-3xl leading-tight">{t("ob.h0")}</h2>
            <div data-field="first_name" className={fieldCls("first_name")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.firstName")}</label>
              <Input value={first_name} onChange={(e) => setFirstName(e.target.value)} placeholder={t("ob.firstNamePh")} />
            </div>
            <div data-field="age" className={fieldCls("age")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{tr("Age bracket", "Rango de edad", "Tranche d'âge")}</label>
              <p className="text-[11px] text-[var(--ink)]/55 mt-1">{tr("Never shown on your profile — used only to find good matches.", "Nunca se muestra en tu perfil — solo se usa para encontrar buenos matches.", "Jamais affiché sur ton profil — sert uniquement à trouver de bons matchs.")}</p>
              <div className="mt-3 flex w-full overflow-hidden rounded-full border border-[var(--ink)]/20 bg-[var(--paper,#fdfaf3)] shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]">
                {AGE_BRACKETS.map((b, idx) => {
                  const mid = bracketMidpoint(b);
                  const selected = bracket !== null && bracket[0] === b[0] && bracket[1] === b[1];
                  const labelTxt = bracketLabel(b);
                  return (
                    <button
                      key={labelTxt}
                      onClick={() => { setBracket(b); setAge(mid); }}
                      className={`flex-1 py-2.5 text-[13px] font-medium tracking-tight transition-colors ${idx > 0 ? "border-l border-[var(--ink)]/15" : ""} ${selected ? "bg-[var(--ink)] text-[var(--paper,#fdfaf3)]" : "text-[var(--ink)]/75 hover:bg-[var(--ink)]/5"}`}
                    >
                      {labelTxt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div data-field="gender" className={fieldCls("gender")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.iAm")}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GENDERS.map((g) => (
                  <button key={g} onClick={() => setGender(g)} className={`chip-paper ${gender === g ? "chip-paper-selected" : ""}`}>{label(g)}</button>
                ))}
              </div>
              {gender === "self-describe" && (
                <Input className="mt-2" value={genderCustom} onChange={(e) => setGenderCustom(e.target.value)} placeholder={tr("Describe yourself (e.g. trans woman, genderfluid…)", "Descríbete (p. ej. mujer trans, género fluido…)", "Décris-toi (p. ex. femme trans, genre fluide…)")} maxLength={40} />
              )}
            </div>
            {/* "What are you looking for?" removed — everyone is a padel player. */}

          </>
        )}
        {step === 0 && (
          <>
            <h2 className="text-display text-[1.375rem] sm:text-3xl leading-tight pt-4 border-t border-[var(--ink)]/10">{t("ob.h1")}</h2>




            <div data-field="age_range" className={fieldCls("age_range")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.ageRange")}</label>
              <div className="flex items-center gap-3 mt-1">
                <AgeInput value={age_min} onCommit={setAgeMin} />
                <span>{t("ob.to")}</span>
                <AgeInput value={age_max} onCommit={setAgeMax} />
              </div>
            </div>
          </>
        )}
        {step === 0 && (
          <>
            <h2 className="text-display text-[1.375rem] sm:text-3xl leading-tight pt-4 border-t border-[var(--ink)]/10">{t("ob.h2")}</h2>

            <div data-field="locations" className={fieldCls("locations")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{tr("Where do you play?", "¿Dónde juegas?", "Où joues-tu ?")}</label>
              <p className="text-xs text-[var(--ink)]/55 mt-1">{tr("Add the places you play — home, work, summer house, or when travelling. Up to 3 areas per country.", "Añade los sitios donde juegas — casa, trabajo, casa de verano o cuando viajas. Hasta 3 zonas por país.", "Ajoute les endroits où tu joues — chez toi, au travail, ta maison d'été ou en voyage. Jusqu'à 3 zones par pays.")}</p>
            </div>


            <div className="space-y-3">
              {locBlocks.map((b, i) => {
                const CUSTOM = "__custom__";
                const countryInList = !b.country || COUNTRY_NAMES.includes(b.country);
                const cities = citiesFor(countryInList ? b.country : "");
                const cityInList = !b.city || cities.some((c) => c.name === b.city);
                const areaOpts = areasFor(countryInList ? b.country : "", cityInList ? b.city : "");
                return (
                  <div key={i} className="rounded-lg border border-[var(--cream)]/15 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{tr("Location", "Ubicación", "Lieu")} {i + 1}</span>
                      {locBlocks.length > 1 && (
                        <button type="button" onClick={() => removeBlock(i)} aria-label={tr("Remove this location", "Eliminar esta ubicación", "Supprimer ce lieu")} className="text-[var(--ink)]/70 hover:text-[var(--clay)]">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <select
                      value={countryInList ? b.country : CUSTOM}
                      onChange={(e) => {
                        const v = e.target.value;
                        const nextCountry = v === CUSTOM ? CUSTOM : v;
                        const firstCity = nextCountry && nextCountry !== CUSTOM ? (citiesFor(nextCountry)[0]?.name ?? "") : "";
                        updateBlock(i, { country: nextCountry, city: firstCity, areas: ["", "", ""] });
                      }}
                      className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm text-[var(--ink)]"
                    >
                      <option value="" className="bg-[var(--court-deep)]">{tr("Country", "País", "Pays")}</option>
                      {COUNTRY_NAMES.map((n) => <option key={n} value={n} className="bg-[var(--court-deep)]">{n}</option>)}
                      <option value={CUSTOM} className="bg-[var(--court-deep)]">{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)", "+ Autre (saisis le tien)")}</option>

                    </select>
                    {!countryInList && (
                      <Input
                        maxLength={60}
                        value={b.country === CUSTOM ? "" : b.country}
                        onChange={(e) => updateBlock(i, { country: e.target.value })}
                        placeholder={tr("Type country name", "Escribe el país", "Saisis le nom du pays")}
                      />
                    )}
                    {cities.length > 0 ? (
                      <select
                        value={cityInList ? b.city : CUSTOM}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateBlock(i, { city: v === CUSTOM ? CUSTOM : v, areas: ["", "", ""] });
                        }}
                        disabled={!isReal(b.country) && countryInList}
                        className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm text-[var(--ink)] disabled:opacity-50"
                      >
                        <option value="" className="bg-[var(--court-deep)]">{b.country ? tr("City", "Ciudad", "Ville") : tr("Pick country first", "Elige país primero", "Choisis d'abord le pays")}</option>
                        {cities.map((c) => <option key={c.name} value={c.name} className="bg-[var(--court-deep)]">{c.name}</option>)}
                        <option value={CUSTOM} className="bg-[var(--court-deep)]">{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)", "+ Autre (saisis le tien)")}</option>

                      </select>
                    ) : null}
                    {(cities.length === 0 || !cityInList) && isReal(b.country) && (
                      <Input
                        maxLength={60}
                        value={b.city === CUSTOM ? "" : b.city}
                        onChange={(e) => updateBlock(i, { city: e.target.value })}
                        placeholder={tr("Type city name", "Escribe la ciudad", "Saisis le nom de la ville")}
                      />
                    )}
                    {isReal(b.city) && (
                      <div className="grid grid-cols-1 gap-2">
                        {b.areas.map((a, ai) => {
                          const areaInList = !a || areaOpts.includes(a);
                          const taken = new Set(b.areas.filter((x, k) => k !== ai && x && x !== CUSTOM));
                          if (areaOpts.length > 0 && areaInList) {
                            return (
                              <select
                                key={ai}
                                value={a || "__none__"}
                                onChange={(e) => updateArea(i, ai, e.target.value === "__none__" ? "" : e.target.value)}
                                className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm text-[var(--ink)]"
                              >
                                <option value="__none__" className="bg-[var(--court-deep)]">{tr("Area", "Zona", "Zone")} {ai + 1} ({tr("optional", "opcional", "optionnel")})</option>
                                {areaOpts.filter((o) => !taken.has(o)).map((o) => <option key={o} value={o} className="bg-[var(--court-deep)]">{o}</option>)}
                                <option value={CUSTOM} className="bg-[var(--court-deep)]">{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)", "+ Autre (saisis le tien)")}</option>

                              </select>
                            );
                          }
                          return (
                            <div key={ai} className="flex gap-2">
                              <Input
                                maxLength={80}
                                value={a === CUSTOM ? "" : a}
                                onChange={(e) => updateArea(i, ai, e.target.value)}
                                placeholder={`${tr("Area", "Zona", "Zone")} ${ai + 1} (${tr("optional", "opcional", "optionnel")})`}
                              />
                              {a && (
                                <button type="button" onClick={() => updateArea(i, ai, "")} aria-label={tr("Clear this area", "Borrar esta zona", "Effacer cette zone")} className="text-[var(--ink)]/70 hover:text-[var(--clay)] px-2">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isReal(b.country) && !isReal(b.city) && (
                      <p className="text-[11px] text-[var(--ink)]/80">
                        {tr("Choose a city too so we can show nearby players.", "Elige también una ciudad para poder mostrar jugadores cerca.", "Choisis aussi une ville pour qu'on puisse montrer les joueurs à proximité.")}
                      </p>
                    )}
                  </div>
                );
              })}
              <Button type="button" variant="outline" onClick={addBlock} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> {tr("Add another country", "Añadir otro país", "Ajouter un autre pays")}
              </Button>
            </div>


            <div data-field="nationality" className={fieldCls("nationality")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.nat")}</label>
              <select className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 mt-1" value={nationality} onChange={(e) => setNationality(e.target.value)}>
                <option value="__none__" className="bg-[var(--court-deep)]">{tr("Select country", "Selecciona país", "Sélectionne un pays")}</option>
                {NATIONALITIES.filter((n) => n !== "Other").map((n) => <option key={n} value={n} className="bg-[var(--court-deep)]">{n}</option>)}
                <option value="Other" className="bg-[var(--court-deep)]">{tr("Other", "Otro", "Autre")}</option>
                <option value="" className="bg-[var(--court-deep)]">{tr("Prefer not to say", "Prefiero no decirlo", "Je préfère ne pas dire")}</option>
              </select>
              <p className="text-[10px] text-[var(--ink)]/50 mt-1">{tr("Optional", "Opcional", "Optionnel")}</p>
            </div>

            <div data-field="languages" className={fieldCls("languages")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.langs")}</label>
              {(() => {
                const COMMON = ["English", "Spanish", "Portuguese", "French", "Italian", "German", "Arabic"];
                const ALL = LANGUAGES as readonly string[];
                const q = langQuery.trim().toLowerCase();
                const base = showAllLangs || q
                  ? ALL
                  : Array.from(new Set([...COMMON, ...languages])).filter((l) => ALL.includes(l));
                const visible = q
                  ? ALL.filter((l) => l.toLowerCase().includes(q))
                  : base;
                const trimmed = langQuery.trim();
                const canAddCustom =
                  trimmed.length >= 2 &&
                  !languages.some((l) => l.toLowerCase() === trimmed.toLowerCase()) &&
                  !ALL.some((l) => l.toLowerCase() === trimmed.toLowerCase());
                const hiddenCount = !q && !showAllLangs ? ALL.length - visible.length : 0;
                const addCustom = () => {
                  const name = trimmed.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  if (!name) return;
                  if (name.length > 30 || languages.length >= 10) { toast.error(tr("Up to 10 languages, 30 characters each", "Hasta 10 idiomas, 30 caracteres cada uno", "Jusqu’à 10 langues, 30 caractères chacune")); return; }
                  if (!languages.some((l) => l.toLowerCase() === name.toLowerCase())) {
                    setLanguages((cur) => [...cur, name]);
                  }
                  setLangQuery("");
                };
                return (
                  <div className="mt-1 space-y-2">
                    <input
                      type="text"
                      value={langQuery}
                      onChange={(e) => setLangQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (canAddCustom) addCustom(); } }}
                      placeholder={tr("Search or type your language…", "Busca o escribe tu idioma…", "Cherche ou tape ta langue…")}
                      className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm"
                    />
                    {/* Selected languages not in ALL — always show as removable chips */}
                    {languages.filter((l) => !ALL.includes(l)).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {languages.filter((l) => !ALL.includes(l)).map((l) => (
                          <button key={l} onClick={() => toggleLanguage(l)} className="chip-paper chip-paper-selected">
                            ✓ {l}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {visible.map((l) => (
                        <button key={l} onClick={() => toggleLanguage(l)} className={`chip-paper ${languages.includes(l) ? "chip-paper-selected" : ""}`}>{label(l)}</button>
                      ))}
                      {canAddCustom && (
                        <button type="button" onClick={addCustom} className="chip-paper">
                          + {tr("Add", "Añadir", "Ajouter")} "{trimmed}"
                        </button>
                      )}
                      {hiddenCount > 0 && (
                        <button type="button" onClick={() => setShowAllLangs(true)} className="chip-paper">
                          + {hiddenCount} {tr("more", "más", "plus")}
                        </button>
                      )}
                      {showAllLangs && !q && (
                        <button type="button" onClick={() => setShowAllLangs(false)} className="chip-paper">
                          − {tr("Show less", "Ver menos", "Voir moins")}
                        </button>
                      )}
                    </div>
                    {visible.length === 0 && !canAddCustom && (
                      <p className="text-xs text-[var(--ink)]/60">{tr("No match. Type a name and press Enter to add.", "Sin resultados. Escribe un nombre y pulsa Intro para añadirlo.", "Aucun résultat. Tape un nom et appuie sur Entrée pour l'ajouter.")}</p>
                    )}
                  </div>
                );
              })()}
            </div>


            <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{tr("Your padel style (pick up to 3)", "Tu estilo de pádel (elige hasta 3)", "Ton style de padel (jusqu'à 3)")}</label>
            <SearchableChips
              options={PADEL_STYLES as readonly string[]}
              selected={padelStyle}
              onToggle={(s) =>
                setPadelStyle((cur) =>
                  cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= 3 ? cur : [...cur, s]
                )
              }
              onAddCustom={(v) => {
                setPadelStyle((cur) => (cur.length >= 3 || cur.includes(v) ? cur : [...cur, v]));
              }}
              labelFn={label}
              placeholder={tr("Search or type your style…", "Busca o escribe tu estilo…", "Cherche ou tape ton style…")}
              addWord={tr("Add", "Añadir", "Ajouter")}
              moreWord={tr("more", "más", "plus")}
              lessWord={tr("Show less", "Ver menos", "Voir moins")}
            />

            <div data-field="level" className={fieldCls("level")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.padelLevel")}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PADEL_LEVELS.map((l) => (
                  <button key={l} onClick={() => setLevel(l)} className={`chip-paper ${level === l ? "chip-paper-selected" : ""}`}>{label(l)}</button>
                ))}
              </div>
            </div>



            <label className="flex items-center gap-2 text-sm pt-1">
              <input type="checkbox" checked={mixedDoubles} onChange={(e) => setMixedDoubles(e.target.checked)} className="accent-[var(--cream)]" />
              {tr("Open to mixed doubles (2 men + 2 women format)", "Abierto a dobles mixtos (formato 2 hombres + 2 mujeres)", "Ouvert au double mixte (format 2 hommes + 2 femmes)")}
            </label>

            <div className="rounded-xl border border-[var(--cream)]/30 bg-[var(--cream)]/5 p-3 mt-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={freeCourt} onChange={(e) => setFreeCourt(e.target.checked)} className="accent-[var(--cream)] mt-0.5" />
                <span>
                  <span className="font-semibold">{tr("🎾 I have free court access", "🎾 Tengo pista gratis", "🎾 J'ai accès à une pista gratuitement")}</span>
                  <span className="block text-xs text-[var(--ink)]/70 mt-0.5">{tr("Private club, residential court, or comp slots you can share with a match. A badge will appear on your profile.", "Club privado, pista residencial o slots gratuitos que puedes compartir con tu match. Aparecerá una insignia en tu perfil.", "Club privé, pista résidentielle ou créneaux offerts à partager avec un match. Un badge apparaîtra sur ton profil.")}</span>
                </span>
              </label>
              {freeCourt && (
                <Input
                  className="mt-2"
                  value={freeCourtNote}
                  onChange={(e) => setFreeCourtNote(e.target.value)}
                  placeholder={tr("Optional: court name or area (share full address only in chat)", "Opcional: nombre de la pista o zona (comparte la dirección solo en el chat)", "Optionnel : nom de la pista ou zone (partage l'adresse complète seulement en chat)")}
                  maxLength={200}
                />
              )}
            </div>


            <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.bio")}</label>
            <Textarea maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("ob.bioPh")} />

            <h2 className="text-display text-2xl pt-4 border-t border-[var(--ink)]/10">{t("ob.h4")}</h2>
            <p className="text-sm text-[var(--ink)]/70">{t("ob.h4sub")}</p>
            <div className="flex flex-col items-center gap-3">
              <label className="block aspect-[3/4] w-full max-w-[220px] sm:max-w-[240px] rounded-2xl border border-dashed border-[var(--ink)]/30 overflow-hidden relative cursor-pointer bg-[var(--paper-2)]">
                {photoUrl ? (
                  <img src={photoUrl} alt="you" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--ink)]/70 gap-2">
                    <Camera className="w-7 h-7" />
                    <span className="text-sm">{uploading ? t("ob.uploading") : t("ob.tapUpload")}</span>
                    <span className="text-[11px] text-[var(--ink)]/55 px-4 text-center">{tr("Tip: a photo with your racket gets 3× more matches 🎾", "Consejo: una foto con tu pala consigue 3× más matches 🎾", "Astuce : une photo avec ta raquette obtient 3× plus de matches 🎾")}</span>
                  </div>
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

              {photoUrl ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("ob-photo-input")?.click()}>
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    {tr("Change", "Cambiar", "Changer")}
                  </Button>
                  {lastPhotoFile && (
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => setPendingPhotoFile(lastPhotoFile)}>
                      <Crop className="w-3.5 h-3.5 mr-1.5" />
                      {tr("Recrop", "Recortar", "Recadrer")}
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" disabled={uploading} className="text-red-600 hover:text-red-700" onClick={() => { setPhotoUrl(null); setLastPhotoFile(null); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    {tr("Remove", "Quitar", "Retirer")}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("ob-photo-input")?.click()}>
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  {uploading ? t("ob.uploading") : tr("Add photo", "Añadir foto", "Ajouter une photo")}
                </Button>
              )}
            </div>

            {!photoUrl && (
              <p className="text-[11px] text-[var(--ink)]/55 text-center">
                {tr("No photo? No problem — you can add one anytime from your profile.", "¿Sin foto? Sin problema — puedes añadirla cuando quieras desde tu perfil.", "Pas de photo ? Pas de souci — tu peux en ajouter une plus tard depuis ton profil.")}
              </p>
            )}
          </>
        )}
      </div>


      {(() => {
        const coreDone = !!first_name.trim() && age !== null && !!gender && goals.length > 0 &&
          (!hasPartnerGoal || !!meetPref) &&
          age_min !== null && age_max !== null && age_min <= age_max &&
          validBlocks.length > 0 && languages.length > 0 && !!level;
        return (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--ink)]/10 bg-[var(--paper,#fdfaf3)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--paper,#fdfaf3)]/85" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
            <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between gap-2 flex-wrap">
              {step > 0 ? (
                <Button variant="outline" size="sm" onClick={() => { setStep(step - 1); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30); }}>{t("ob.back")}</Button>
              ) : <div />}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  onClick={() => requestSave("grid")}
                  disabled={save.isPending || uploading}
                >
                  {save.isPending ? t("ob.saving") : tr("Save", "Guardar", "Enregistrer")}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

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
