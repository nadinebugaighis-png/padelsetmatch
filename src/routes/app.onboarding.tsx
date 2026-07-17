import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyProfile, upsertMyProfile } from "@/lib/app.functions";
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
import { COUNTRY_NAMES, citiesFor, areasFor } from "@/lib/locations";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Camera, Plus, X } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";
import { loadGuestDraft, clearGuestDraft } from "@/lib/guest-draft";
import { SearchableChips } from "@/components/SearchableChips";
import { QASection } from "@/components/QASection";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your profile · PadelMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { step?: number } => {
    const raw = Number(search.step);
    if (!Number.isFinite(raw)) return {};
    const clamped = Math.max(0, Math.min(2, Math.floor(raw)));
    return { step: clamped };
  },
  component: Onboarding,
});

function normalizeAge(raw: string, fallback: number): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  const currentYear = new Date().getFullYear();
  if (n > 1900 && n <= currentYear) return Math.min(99, Math.max(18, currentYear - n));
  return Math.min(99, Math.max(18, n));
}

function AgeInput({ value, onCommit, placeholder }: { value: number | null; onCommit: (n: number | null) => void; placeholder?: string }) {
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
        onCommit(normalizeAge(text, value ?? 18));
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
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const search = Route.useSearch();

  const [step, setStep] = useState(search.step ?? 0);
  const [first_name, setFirstName] = useState("");
  const [age, setAge] = useState<number | null>(null);
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
  const [customTrait, setCustomTrait] = useState("");
  const [looking_for, setLookingFor] = useState<LookingFor>("both");
  const [goals, setGoals] = useState<string[]>(["padel"]);
  const [meetPref, setMeetPref] = useState<"men" | "women" | "everyone" | "">("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [availability, setAvailability] = useState<string[]>([]);
  const [courtSide, setCourtSide] = useState<CourtSide | "">("");
  const [mixedDoubles, setMixedDoubles] = useState(false);
  const [freeCourt, setFreeCourt] = useState(false);
  const [freeCourtNote, setFreeCourtNote] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [personalTraits, setPersonalTraits] = useState<string[]>([]);
  const [padelStyle, setPadelStyle] = useState<string[]>([]);
  const [showStepHelp, setShowStepHelp] = useState(false);

  useEffect(() => {
    const p = profileQ.data;
    if (p) {
      setFirstName(p.first_name ?? "");
      setAge(p.age ?? null);
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
        if (draft.looking_for) setLookingFor(draft.looking_for as LookingFor);
        clearGuestDraft();
        toast.success("We pre-filled your answers from the preview.");
      }
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

  const togglePriority = (t: string) => {
    setPriorities((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 8 ? cur : [...cur, t]);
  };
  const movePriority = (i: number, dir: -1 | 1) => {
    setPriorities((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const removePriority = (t: string) => setPriorities((cur) => cur.filter((x) => x !== t));
  const addCustom = () => {
    const v = customTrait.trim().toLowerCase();
    if (!v) return;
    const customCount = priorities.filter((p) => !(PRIORITY_TRAITS as readonly string[]).includes(p)).length;
    if (customCount >= 3) { toast.error(t("ob.errMax3")); return; }
    if (priorities.includes(v)) { toast.error(t("ob.errDup")); return; }
    if (priorities.length >= 8) { toast.error(t("ob.errMaxTraits")); return; }
    setPriorities((cur) => [...cur, v]);
    setCustomTrait("");
  };
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

  const toggleLanguage = (l: string) => setLanguages((cur) => cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]);

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

  const hasPartnerGoal = goals.includes("relationship") || goals.includes("all");
  const hasFriendGoal = goals.includes("friends") || goals.includes("all");
  const hasPadelGoal = goals.includes("padel") || goals.includes("friends") || goals.includes("relationship") || goals.includes("all");
  const derivedIntents = Array.from(new Set<string>([
    ...(hasPadelGoal ? ["padel"] : []),
    ...(hasFriendGoal ? ["friend"] : []),
    ...(hasPartnerGoal ? ["relationship"] : []),
  ]));

  const save = useMutation({
    mutationFn: async (opts?: { destination?: "grid" | "profile" }) => {
      const derivedLookingFor: LookingFor = hasPartnerGoal && hasFriendGoal ? "both" : hasPartnerGoal ? "partner" : "friend";
      const partnerAud = hasPartnerGoal && meetPref ? [meetPref] : [];
      const friendAud = hasFriendGoal ? ["everyone"] : [];
      const derived = Array.from(new Set([...audToGenders(friendAud), ...audToGenders(partnerAud)]));
      const legacy = derived.length ? derived : interested_in;
      const first = validBlocks[0];
      if (age === null || age_min === null || age_max === null || !gender || !level) {
        throw new Error(tr("Please complete all required fields", "Completa todos los campos obligatorios", "Complète tous les champs obligatoires"));
      }
      await upsert({
        data: {
          first_name, age, gender, interested_in: legacy,
          friend_interested_in: friendAud, partner_interested_in: partnerAud,
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
    [],
  ];

  const missingByStep = missingByStepDetailed.map((arr) => arr.map((x) => x.label));
  const canStep = missingByStep.map((items) => items.length === 0);

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

  const steps = [
    tr("Registration", "Registro", "Inscription"),
    tr("Personality", "Personalidad", "Personnalité"),
    tr("Q&A", "Preguntas", "Q&R"),
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
    <main className="px-4 py-6 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--ink)]/70">
        <span>{t("ob.step")} {step + 1} {t("ob.of")} {steps.length}</span>
        <span>{steps[step]}</span>
      </div>
      <div className="h-1 mt-2 rounded-full bg-[var(--ink)]/10 overflow-hidden">
        <div className="h-full bg-[var(--ball)]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
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
            <h2 className="text-display text-3xl">{t("ob.h0")}</h2>
            <div data-field="first_name" className={fieldCls("first_name")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{t("ob.firstName")}</label>
              <Input value={first_name} onChange={(e) => setFirstName(e.target.value)} placeholder={t("ob.firstNamePh")} />
            </div>
            <div data-field="age" className={fieldCls("age")}>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{tr("Age bracket", "Rango de edad", "Tranche d'âge")}</label>
              <p className="text-[11px] text-[var(--ink)]/55 mt-1">{tr("Never shown on your profile — used only to find good matches.", "Nunca se muestra en tu perfil — solo se usa para encontrar buenos matches.", "Jamais affiché sur ton profil — sert uniquement à trouver de bons matchs.")}</p>
              <div className="mt-3 flex w-full overflow-hidden rounded-full border border-[var(--ink)]/20 bg-[var(--paper,#fdfaf3)] shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]">
                {([[18,24],[25,34],[35,45],[46,55],[56,99]] as const).map(([lo, hi], idx) => {
                  const mid = Math.round((lo + hi) / 2);
                  const selected = age === mid;
                  const labelTxt = hi >= 99 ? "56+" : `${lo}–${hi}`;
                  return (
                    <button
                      key={labelTxt}
                      onClick={() => setAge(mid)}
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
            <h2 className="text-display text-3xl pt-4 border-t border-[var(--ink)]/10">{t("ob.h1")}</h2>

            {hasPartnerGoal && (
              <div data-field="meetPref" className={fieldCls("meetPref")}>
                <label className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{tr("Who would you like to meet?", "¿A quién te gustaría conocer?", "Qui veux-tu rencontrer ?")}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(["men", "women", "everyone"] as const).map((o) => (
                    <button key={o} onClick={() => setMeetPref(o)} className={`chip-paper ${meetPref === o ? "chip-paper-selected" : ""}`}>
                      {o === "men" ? tr("Men", "Hombres", "Hommes") : o === "women" ? tr("Women", "Mujeres", "Femmes") : tr("Everyone", "Todos", "Tout le monde")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasPartnerGoal && meetPref === "everyone" && (
              <div className="rounded-lg border border-[var(--cream)]/10 p-3 space-y-2">
                <div className="text-xs uppercase tracking-widest text-[var(--ink)]/70">{tr("Advanced profile (optional)", "Perfil avanzado (opcional)", "Profil avancé (optionnel)")}</div>
                <label className="text-[11px] text-[var(--ink)]/70">{tr("Sexual orientation", "Orientación sexual", "Orientation sexuelle")}</label>
                <Input
                  value={sexualOrientation}
                  onChange={(e) => setSexualOrientation(e.target.value)}
                  placeholder={tr("e.g. straight, gay, bisexual, queer, pansexual…", "p. ej. hetero, gay, bisexual, queer, pansexual…", "p. ex. hétéro, gay, bisexuel·le, queer, pansexuel·le…")}
                  maxLength={60}
                />
                <p className="text-[10px] text-[var(--ink)]/55">{tr("Private — used only to improve matches. Not shown on your profile.", "Privado — solo se usa para mejorar tus matches. No aparece en tu perfil.", "Privé — utilisé seulement pour améliorer les matches. Pas affiché sur ton profil.")}</p>
              </div>
            )}

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
            <h2 className="text-display text-3xl pt-4 border-t border-[var(--ink)]/10">{t("ob.h2")}</h2>

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
                        <button type="button" onClick={() => removeBlock(i)} className="text-[var(--ink)]/70 hover:text-[var(--clay)]">
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
                        maxLength={80}
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
                                <button type="button" onClick={() => updateArea(i, ai, "")} className="text-[var(--ink)]/70 hover:text-[var(--clay)] px-2">
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
            <label className="block aspect-[3/4] w-full max-w-[220px] sm:max-w-[240px] mx-auto rounded-2xl border border-dashed border-[var(--ink)]/30 overflow-hidden relative cursor-pointer">
              {photoUrl ? (
                <>
                  <img src={photoUrl} alt="you" className="absolute inset-0 w-full h-full object-cover" />
                  <button onClick={(e) => { e.preventDefault(); setPhotoUrl(null); }} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--ink)]/70 gap-2">
                  <Camera className="w-7 h-7" />
                  <span className="text-sm">{uploading ? t("ob.uploading") : t("ob.tapUpload")}</span>
                  <span className="text-[11px] text-[var(--ink)]/55 px-4 text-center">{tr("Tip: a photo with your racket gets 3× more matches 🎾", "Consejo: una foto con tu pala consigue 3× más matches 🎾", "Astuce : une photo avec ta raquette obtient 3× plus de matches 🎾")}</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            </label>

            {!photoUrl && (
              <p className="text-[11px] text-[var(--ink)]/55 text-center">
                {tr("No photo? No problem — you can add one anytime from your profile.", "¿Sin foto? Sin problema — puedes añadirla cuando quieras desde tu perfil.", "Pas de photo ? Pas de souci — tu peux en ajouter une plus tard depuis ton profil.")}
              </p>
            )}
          </>
        )}
        {step === 1 && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-[var(--ball)]/40 bg-[var(--ball)]/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60 font-semibold">
                {tr("Optional — for fun", "Opcional — por diversión", "Optionnel — pour le fun")}
              </p>
              <h2 className="text-display text-2xl mt-1">
                {tr("Unlock compatibility with other padel players ✨", "Desbloquea la compatibilidad con otros jugadores de pádel ✨", "Débloque la compatibilité avec d'autres joueurs de padel ✨")}
              </h2>
              <p className="text-sm text-[var(--ink)]/75 mt-1">
                {tr("Powers your AI matches. Do it anytime.", "Impulsa tus matches IA. Hazlo cuando quieras.", "Booste tes matchs IA. Quand tu veux.")}
              </p>
              <p className="text-[12px] text-[var(--ink)]/60 italic mt-2">🔒 {tr("Nothing goes on your profile — used only for compatibility matching.", "Nada aparece en tu perfil — solo se usa para la compatibilidad.", "Rien n'apparaît sur ton profil — utilisé uniquement pour la compatibilité.")}</p>

            </div>

            {/* SECTION 1 — Priorities */}
            <section data-field="priorities" className={`space-y-3 ${fieldCls("priorities")}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-serif text-lg flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs font-bold">1</span>
                  {tr("Your top values", "Tus valores principales", "Tes valeurs principales")}
                </h3>
                <span className="text-[11px] font-medium text-[var(--ink)]/55">
                  {priorities.length} {tr("picked", "elegidos", "choisis")}
                </span>
              </div>
              <p className="text-[12px] text-[var(--ink)]/60">{tr("Pick as many as you like. Order matters — top = most important.", "Elige los que quieras. El orden cuenta — arriba = más importante.", "Choisis-en autant que tu veux. L'ordre compte — haut = plus important.")}</p>

              <SearchableChips
                options={PRIORITY_TRAITS as readonly string[]}
                selected={priorities}
                onToggle={togglePriority}
                onAddCustom={(v) => {
                  const customCount = priorities.filter((p) => !(PRIORITY_TRAITS as readonly string[]).includes(p)).length;
                  if (customCount >= 3) { toast.error(t("ob.errMax3")); return; }
                  if (priorities.length >= 8) { toast.error(t("ob.errMaxTraits")); return; }
                  if (priorities.some((p) => p.toLowerCase() === v.toLowerCase())) { toast.error(t("ob.errDup")); return; }
                  setPriorities((cur) => [...cur, v.toLowerCase()]);
                }}
                labelFn={label}
                placeholder={tr("Search or add your own…", "Busca o añade el tuyo…", "Cherche ou ajoute le tien…")}
                addWord={tr("Add", "Añadir", "Ajouter")}
                moreWord={tr("more", "más", "plus")}
                lessWord={tr("Show less", "Ver menos", "Voir moins")}
                initialVisible={14}
              />

              {priorities.length > 0 && (
                <div className="mt-2 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper-2)] p-3">
                  <p className="text-[11px] uppercase tracking-widest text-[var(--ink)]/55 mb-2">{tr("Your order", "Tu orden", "Ton ordre")}</p>
                  <ul className="space-y-1.5">
                    {priorities.map((tr, i) => (
                      <li key={tr} className="flex items-center gap-2 bg-[var(--paper)] rounded-lg px-3 py-2 border border-[var(--ink)]/10">
                        <span className="text-[var(--ink)] font-bold w-5 text-sm">{i + 1}</span>
                        <span className="flex-1 capitalize text-sm">{label(tr)}</span>
                        <button onClick={() => movePriority(i, -1)} disabled={i === 0} aria-label="Move up" className="p-1 disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
                        <button onClick={() => movePriority(i, 1)} disabled={i === priorities.length - 1} aria-label="Move down" className="p-1 disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
                        <button onClick={() => removePriority(tr)} aria-label="Remove" className="p-1 text-[var(--ink)]/50 hover:text-[var(--clay)]"><X className="w-4 h-4" /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* SECTION 2 — Personal traits */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-serif text-lg flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs font-bold">2</span>
                  {tr("How would you describe yourself", "Cómo te describirías", "Comment tu te décrirais")}
                </h3>
                <span className="text-[11px] font-medium text-[var(--ink)]/55">{personalTraits.length}/10</span>
              </div>
              <p className="text-[12px] text-[var(--ink)]/60">{tr("Optional — pick a mix of strengths and a couple of honest edges.", "Opcional — elige una mezcla: fortalezas y un par de aristas honestas.", "Optionnel — mélange forces et petits défauts assumés.")}</p>

              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60 mb-2">✨ {tr("Strengths", "Fortalezas", "Forces")}</p>
                  <SearchableChips
                    options={PERSONAL_STRENGTHS as readonly string[]}
                    selected={personalTraits.filter((p) => (PERSONAL_STRENGTHS as readonly string[]).includes(p) || (!(HONEST_EDGES as readonly string[]).includes(p) && !!p))}
                    onToggle={(pt) =>
                      setPersonalTraits((cur) =>
                        cur.includes(pt) ? cur.filter((x) => x !== pt) : cur.length >= 10 ? cur : [...cur, pt]
                      )
                    }
                    onAddCustom={(v) => {
                      setPersonalTraits((cur) => {
                        if (cur.length >= 10) return cur;
                        if (cur.some((x) => x.toLowerCase() === v.toLowerCase())) return cur;
                        return [...cur, v];
                      });
                    }}
                    labelFn={label}
                    placeholder={tr("Search or add your own…", "Busca o añade el tuyo…", "Cherche ou ajoute le tien…")}
                    addWord={tr("Add", "Añadir", "Ajouter")}
                    moreWord={tr("more", "más", "plus")}
                    lessWord={tr("Show less", "Ver menos", "Voir moins")}
                    initialVisible={12}
                  />
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60 mb-2">🔥 {tr("Honest edges", "Aristas honestas", "Défauts assumés")}</p>
                  <SearchableChips
                    options={HONEST_EDGES as readonly string[]}
                    selected={personalTraits.filter((p) => (HONEST_EDGES as readonly string[]).includes(p))}
                    onToggle={(pt) =>
                      setPersonalTraits((cur) =>
                        cur.includes(pt) ? cur.filter((x) => x !== pt) : cur.length >= 10 ? cur : [...cur, pt]
                      )
                    }
                    labelFn={label}
                    placeholder={tr("Search an edge…", "Busca una arista…", "Cherche un défaut…")}
                    addWord={tr("Add", "Añadir", "Ajouter")}
                    moreWord={tr("more", "más", "plus")}
                    lessWord={tr("Show less", "Ver menos", "Voir moins")}
                  />
                </div>
              </div>
            </section>

          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--ball)]/40 bg-[var(--ball)]/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60 font-semibold">
                {tr("Optional — for fun", "Opcional — por diversión", "Optionnel — pour le fun")}
              </p>
              <h2 className="text-display text-2xl mt-1">
                {tr("Answer a few questions ✨", "Responde unas preguntas ✨", "Réponds à quelques questions ✨")}
              </h2>
              <p className="text-sm text-[var(--ink)]/75 mt-1">
                {tr(
                  "Tap Generate to get fresh AI questions. Answer as many as you like — you can always come back later.",
                  "Toca Generar para obtener preguntas de IA. Responde las que quieras — puedes volver cuando quieras.",
                  "Appuie sur Générer pour de nouvelles questions IA. Réponds à celles que tu veux — tu peux revenir plus tard.",
                )}
              </p>
              <p className="text-[12px] text-[var(--ink)]/60 italic mt-2">🔒 {tr("Only used to improve your matches.", "Solo se usa para mejorar tus matches.", "Sert seulement à améliorer tes matches.")}</p>
            </div>
            <QASection />
          </div>
        )}
      </div>


      {(() => {
        const coreDone = !!first_name.trim() && age !== null && !!gender && goals.length > 0 &&
          (!hasPartnerGoal || !!meetPref) &&
          age_min !== null && age_max !== null && age_min <= age_max &&
          validBlocks.length > 0 && languages.length > 0 && !!level;
        const isRegPage = step === 0;
        return (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button variant="outline" onClick={() => { setStep(step - 1); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30); }}>{t("ob.back")}</Button>
              ) : <div />}
              {step === 0 && (
                <Button onClick={goNext}>{t("ob.next")}</Button>
              )}
              {step === 1 && (
                <Button onClick={() => { setStep(2); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30); }}>
                  {tr("Continue", "Continuar", "Continuer")}
                </Button>
              )}
              {step === 2 && (
                <Button onClick={() => save.mutate({ destination: "grid" })} disabled={!coreDone || save.isPending}>
                  {save.isPending ? t("ob.saving") : t("ob.start")}
                </Button>
              )}
            </div>
            {!isRegPage && (
              <div className="flex items-center justify-center gap-4 text-[11px] uppercase tracking-[0.2em]">
                <button
                  type="button"
                  onClick={() => save.mutate({ destination: "profile" })}
                  disabled={!coreDone || save.isPending}
                  className="text-[var(--ink)]/55 hover:text-[var(--ink)] disabled:opacity-40"
                >
                  {save.isPending ? t("ob.saving") : tr("Skip — go to Me", "Saltar — ir a Mí", "Passer — vers Moi")}
                </button>
              </div>
            )}
          </div>
        );
      })()}

    </main>
  );
}
