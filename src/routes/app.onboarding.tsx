import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyProfile, upsertMyProfile } from "@/lib/app.functions";
import {
  AUDIENCE_OPTIONS, AVAILABILITY_SLOTS, COURT_SIDES, GENDERS, LANGUAGES, LOOKING_FOR, NATIONALITIES, PADEL_LEVELS,
  PADEL_STYLES, PERSONAL_TRAITS,
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

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your profile · PadelMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
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

  const [step, setStep] = useState(0);
  const [first_name, setFirstName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender | "">("");
  const [genderCustom, setGenderCustom] = useState("");
  const [interested_in, setInterested] = useState<Gender[]>([]);
  const [friend_interested_in, setFriendAud] = useState<string[]>([]);
  const [partner_interested_in, setPartnerAud] = useState<string[]>([]);
  const [age_min, setAgeMin] = useState<number | null>(null);
  const [age_max, setAgeMax] = useState<number | null>(null);
  const [nationality, setNationality] = useState("");
  const [locBlocks, setLocBlocks] = useState<LocBlock[]>([emptyBlock()]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [level, setLevel] = useState<PadelLevel | "">("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [customTrait, setCustomTrait] = useState("");
  const [looking_for, setLookingFor] = useState<LookingFor>("both");
  const [goals, setGoals] = useState<string[]>([]);
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

  useEffect(() => {
    const p = profileQ.data;
    if (p) {
      setFirstName(p.first_name); setAge(p.age); setGender(p.gender);
      setGenderCustom(p.gender_custom ?? "");
      setInterested(p.interested_in); setAgeMin(p.age_min); setAgeMax(p.age_max);
      if (p.friend_interested_in?.length) setFriendAud(p.friend_interested_in);
      if (p.partner_interested_in?.length) setPartnerAud(p.partner_interested_in);
      setNationality(p.nationality); setLevel(p.level);
      setPriorities(p.priorities); setLookingFor(p.looking_for);
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
    if (locBlocks.length >= 5) { toast.error("Up to 5 countries"); return; }
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
    mutationFn: () => {
      const derivedLookingFor: LookingFor = hasPartnerGoal && hasFriendGoal ? "both" : hasPartnerGoal ? "partner" : "friend";
      const partnerAud = hasPartnerGoal && meetPref ? [meetPref] : [];
      const friendAud = hasFriendGoal ? ["everyone"] : [];
      const derived = Array.from(new Set([...audToGenders(friendAud), ...audToGenders(partnerAud)]));
      const legacy = derived.length ? derived : interested_in;
      const first = validBlocks[0];
      if (age === null || age_min === null || age_max === null || !gender || !level) {
        throw new Error("Please complete all required fields");
      }
      return upsert({
        data: {
          first_name, age, gender, interested_in: legacy,
          friend_interested_in: friendAud, partner_interested_in: partnerAud,
          age_min, age_max, nationality,
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
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("ob.saved"));
      navigate({ to: "/app/questions" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("ob.saveFail")),
  });

  const audOk = goals.length > 0 && (!hasPartnerGoal || !!meetPref);

  const canStep = [
    !!first_name && age !== null && age >= 18 && !!gender && goals.length > 0,
    audOk && age_min !== null && age_max !== null && age_min <= age_max,
    validBlocks.length > 0 && !!nationality && languages.length > 0 && !!level && !!courtSide,
    priorities.length >= 3,
    true,
  ];

  const steps = [t("ob.s0"), t("ob.s1"), t("ob.s2"), t("ob.s3"), t("ob.s4")];

  return (
    <main className="px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--cream)]/60">
        <span>{t("ob.step")} {step + 1} {t("ob.of")} {steps.length}</span>
        <span>{steps[step]}</span>
      </div>
      <div className="h-1 mt-2 rounded-full bg-[var(--cream)]/10 overflow-hidden">
        <div className="h-full bg-[var(--ball)]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="mt-6 surface-card p-5 space-y-4">
        {step === 0 && (
          <>
            <h2 className="text-display text-3xl">{t("ob.h0")}</h2>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.firstName")}</label>
            <Input value={first_name} onChange={(e) => setFirstName(e.target.value)} placeholder={t("ob.firstNamePh")} />
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.age")}</label>
            <AgeInput value={age} onCommit={setAge} placeholder={tr("e.g. 32", "p. ej. 32")} />
            <p className="text-[11px] text-[var(--cream)]/50">{tr("Enter your age (18–99), not your birth year.", "Introduce tu edad (18–99), no tu año de nacimiento.")}</p>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.iAm")}</label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`chip ${gender === g ? "chip-ball" : ""}`}>{label(g)}</button>
              ))}
            </div>
            {gender === "self-describe" && (
              <Input value={genderCustom} onChange={(e) => setGenderCustom(e.target.value)} placeholder={tr("Describe yourself (e.g. trans woman, genderfluid…)", "Descríbete (p. ej. mujer trans, género fluido…)")} maxLength={40} />
            )}
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("What are you looking for?", "¿Qué estás buscando?")}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "padel", label: tr("Padel partners", "Compis de pádel") },
                { id: "friends", label: tr("Friends", "Amistad") },
                { id: "relationship", label: tr("Relationship", "Relación") },
                { id: "all", label: tr("Open to all", "Abierto a todo") },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoals((cur) => cur.includes(g.id) ? cur.filter((x) => x !== g.id) : [...cur, g.id])}
                  className={`chip ${goals.includes(g.id) ? "chip-ball" : ""}`}
                >
                  {goals.includes(g.id) ? "☑ " : "☐ "}{g.label}

                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--cream)]/50">{t("ob.privateNote")}</p>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-display text-3xl">{t("ob.h1")}</h2>

            {hasPartnerGoal && (
              <>
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Who would you like to meet?", "¿A quién te gustaría conocer?")}</label>
                <div className="flex flex-wrap gap-2">
                  {(["men", "women", "everyone"] as const).map((o) => (
                    <button key={o} onClick={() => setMeetPref(o)} className={`chip ${meetPref === o ? "chip-ball" : ""}`}>
                      {o === "men" ? tr("Men", "Hombres") : o === "women" ? tr("Women", "Mujeres") : tr("Everyone", "Todos")}
                    </button>
                  ))}
                </div>

              </>
            )}

            {hasPartnerGoal && meetPref === "everyone" && (
              <div className="rounded-lg border border-[var(--cream)]/10 p-3 space-y-2">
                <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Advanced profile (optional)", "Perfil avanzado (opcional)")}</div>
                <label className="text-[11px] text-[var(--cream)]/60">{tr("Sexual orientation", "Orientación sexual")}</label>
                <Input
                  value={sexualOrientation}
                  onChange={(e) => setSexualOrientation(e.target.value)}
                  placeholder={tr("e.g. straight, gay, bisexual, queer, pansexual…", "p. ej. hetero, gay, bisexual, queer, pansexual…")}
                  maxLength={60}
                />
                <p className="text-[10px] text-[var(--cream)]/50">{tr("Private — used only to improve matches. Not shown on your profile.", "Privado — solo se usa para mejorar tus matches. No aparece en tu perfil.")}</p>
              </div>
            )}

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.ageRange")}</label>
            <div className="flex items-center gap-3">
              <AgeInput value={age_min} onCommit={setAgeMin} />
              <span>{t("ob.to")}</span>
              <AgeInput value={age_max} onCommit={setAgeMax} />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-display text-3xl">{t("ob.h2")}</h2>

            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Where do you play?", "¿Dónde juegas?")}</label>
              <p className="text-xs text-[var(--cream)]/50 mt-1">{tr("Add the places you play — home, work, summer house, or when travelling. Up to 3 areas per country.", "Añade los sitios donde juegas — casa, trabajo, casa de verano o cuando viajas. Hasta 3 zonas por país.")}</p>
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
                      <span className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Location", "Ubicación")} {i + 1}</span>
                      {locBlocks.length > 1 && (
                        <button type="button" onClick={() => removeBlock(i)} className="text-[var(--cream)]/60 hover:text-[var(--clay)]">
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
                      className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm text-[var(--cream)]"
                    >
                      <option value="" className="bg-[var(--court-deep)]">{tr("Country", "País")}</option>
                      {COUNTRY_NAMES.map((n) => <option key={n} value={n} className="bg-[var(--court-deep)]">{n}</option>)}
                      <option value={CUSTOM} className="bg-[var(--court-deep)]">{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)")}</option>

                    </select>
                    {!countryInList && (
                      <Input
                        maxLength={60}
                        value={b.country === CUSTOM ? "" : b.country}
                        onChange={(e) => updateBlock(i, { country: e.target.value })}
                        placeholder={tr("Type country name", "Escribe el país")}
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
                        className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm text-[var(--cream)] disabled:opacity-50"
                      >
                        <option value="" className="bg-[var(--court-deep)]">{b.country ? tr("City", "Ciudad") : tr("Pick country first", "Elige país primero")}</option>
                        {cities.map((c) => <option key={c.name} value={c.name} className="bg-[var(--court-deep)]">{c.name}</option>)}
                        <option value={CUSTOM} className="bg-[var(--court-deep)]">{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)")}</option>

                      </select>
                    ) : null}
                    {(cities.length === 0 || !cityInList) && isReal(b.country) && (
                      <Input
                        maxLength={80}
                        value={b.city === CUSTOM ? "" : b.city}
                        onChange={(e) => updateBlock(i, { city: e.target.value })}
                        placeholder={tr("Type city name", "Escribe la ciudad")}
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
                                className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm text-[var(--cream)]"
                              >
                                <option value="__none__" className="bg-[var(--court-deep)]">{tr("Area", "Zona")} {ai + 1} ({tr("optional", "opcional")})</option>
                                {areaOpts.filter((o) => !taken.has(o)).map((o) => <option key={o} value={o} className="bg-[var(--court-deep)]">{o}</option>)}
                                <option value={CUSTOM} className="bg-[var(--court-deep)]">{tr("+ Other (type your own)", "+ Otro (escribe el tuyo)")}</option>

                              </select>
                            );
                          }
                          return (
                            <div key={ai} className="flex gap-2">
                              <Input
                                maxLength={80}
                                value={a === CUSTOM ? "" : a}
                                onChange={(e) => updateArea(i, ai, e.target.value)}
                                placeholder={`${tr("Area", "Zona")} ${ai + 1} (${tr("optional", "opcional")})`}
                              />
                              {a && (
                                <button type="button" onClick={() => updateArea(i, ai, "")} className="text-[var(--cream)]/60 hover:text-[var(--clay)] px-2">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isReal(b.country) && !isReal(b.city) && (
                      <p className="text-[11px] text-[var(--ball)]/80">
                        {tr("Choose a city too so we can show nearby players.", "Elige también una ciudad para poder mostrar jugadores cerca.")}
                      </p>
                    )}
                  </div>
                );
              })}
              <Button type="button" variant="outline" onClick={addBlock} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> {tr("Add another country", "Añadir otro país")}
              </Button>
            </div>


            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.nat")}</label>
            <select className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2" value={nationality} onChange={(e) => setNationality(e.target.value)}>
              <option value="" className="bg-[var(--court-deep)]">{tr("— Select —", "— Selecciona —")}</option>
              {NATIONALITIES.map((n) => <option key={n} value={n} className="bg-[var(--court-deep)]">{n}</option>)}
            </select>



            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.langs")}</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button key={l} onClick={() => toggleLanguage(l)} className={`chip ${languages.includes(l) ? "chip-ball" : ""}`}>{l}</button>
              ))}
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Your padel style (pick up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {PADEL_STYLES.map((s) => {
                const on = padelStyle.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setPadelStyle((cur) =>
                        cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= 3 ? cur : [...cur, s]
                      )
                    }
                    className={`chip ${on ? "chip-ball" : ""}`}
                  >
                    {on ? "✓ " : "+ "}{s}
                  </button>
                );
              })}
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.padelLevel")}</label>
            <div className="flex flex-wrap gap-2">
              {PADEL_LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)} className={`chip ${level === l ? "chip-ball" : ""}`}>{label(l)}</button>
              ))}
            </div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Preferred court side", "Lado de pista preferido")}</label>
            <div className="flex flex-wrap gap-2">
              {COURT_SIDES.map((s) => (
                <button key={s} type="button" onClick={() => setCourtSide(s)} className={`chip ${courtSide === s ? "chip-ball" : ""}`}>{s}</button>
              ))}
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("When can you play?", "¿Cuándo puedes jugar?")}</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_SLOTS.map((s) => (
                <button key={s} type="button" onClick={() => toggleAvail(s)} className={`chip ${availability.includes(s) ? "chip-ball" : ""}`}>{s}</button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm pt-1">
              <input type="checkbox" checked={mixedDoubles} onChange={(e) => setMixedDoubles(e.target.checked)} className="accent-[var(--ball)]" />
              {tr("Open to mixed doubles (2 men + 2 women format)", "Abierto a dobles mixtos (formato 2 hombres + 2 mujeres)")}
            </label>

            <div className="rounded-xl border border-[var(--ball)]/30 bg-[var(--ball)]/5 p-3 mt-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={freeCourt} onChange={(e) => setFreeCourt(e.target.checked)} className="accent-[var(--ball)] mt-0.5" />
                <span>
                  <span className="font-semibold">{tr("🎾 I have free court access", "🎾 Tengo pista gratis")}</span>
                  <span className="block text-xs text-[var(--cream)]/70 mt-0.5">{tr("Private club, residential court, or comp slots you can share with a match. A badge will appear on your profile.", "Club privado, pista residencial o slots gratuitos que puedes compartir con tu match. Aparecerá una insignia en tu perfil.")}</span>
                </span>
              </label>
              {freeCourt && (
                <Input
                  className="mt-2"
                  value={freeCourtNote}
                  onChange={(e) => setFreeCourtNote(e.target.value)}
                  placeholder={tr("Optional: court name or area (share full address only in chat)", "Opcional: nombre de la pista o zona (comparte la dirección solo en el chat)")}
                  maxLength={200}
                />
              )}
            </div>


            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.bio")}</label>
            <Textarea maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("ob.bioPh")} />
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-display text-3xl">{t("ob.h3")}</h2>
            <p className="text-sm text-[var(--cream)]/70">{t("ob.h3sub")} <b>{t("ob.h3priv")}</b></p>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.suggested")}</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_TRAITS.map((tr) => {
                const picked = priorities.includes(tr);
                return (
                  <button key={tr} onClick={() => togglePriority(tr)} className={`chip ${picked ? "chip-ball" : ""}`}>
                    {picked ? "✓ " : "+ "}{label(tr)}
                  </button>
                );
              })}
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.addOwn")}</label>
            <div className="flex gap-2">
              <Input
                value={customTrait}
                onChange={(e) => setCustomTrait(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                placeholder={t("ob.addOwnPh")}
                maxLength={30}
              />
              <Button type="button" variant="outline" onClick={addCustom}><Plus className="w-4 h-4" /></Button>
            </div>

            {priorities.length > 0 && (
              <>
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.ranking")}</label>
                <ul className="space-y-2">
                  {priorities.map((tr, i) => (
                    <li key={tr} className="flex items-center gap-2 bg-[var(--cream)]/5 rounded-md px-3 py-2">
                      <span className="text-[var(--ball)] font-bold w-6">{i + 1}.</span>
                      <span className="flex-1 capitalize">{label(tr)}</span>
                      <button onClick={() => movePriority(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => movePriority(i, 1)} disabled={i === priorities.length - 1} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                      <button onClick={() => removePriority(tr)} className="p-1 text-[var(--cream)]/60 hover:text-[var(--clay)]"><X className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[var(--cream)]/50">{t("ob.pickThree")}</p>
              </>
            )}

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Personal characteristics (pick up to 10)</label>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_TRAITS.map((tr) => {
                const on = personalTraits.includes(tr);
                return (
                  <button
                    key={tr}
                    type="button"
                    onClick={() =>
                      setPersonalTraits((cur) =>
                        cur.includes(tr) ? cur.filter((x) => x !== tr) : cur.length >= 10 ? cur : [...cur, tr]
                      )
                    }
                    className={`chip ${on ? "chip-ball" : ""}`}
                  >
                    {on ? "✓ " : "+ "}{tr}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--cream)]/50">{personalTraits.length}/10 selected</p>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-display text-3xl">{t("ob.h4")}</h2>
            <p className="text-sm text-[var(--cream)]/70">{t("ob.h4sub")}</p>
            <label className="block aspect-[3/4] rounded-2xl border border-dashed border-[var(--cream)]/30 overflow-hidden relative cursor-pointer">
              {photoUrl ? (
                <>
                  <img src={photoUrl} alt="you" className="absolute inset-0 w-full h-full object-cover" />
                  <button onClick={(e) => { e.preventDefault(); setPhotoUrl(null); }} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--cream)]/60 gap-2">
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">{uploading ? t("ob.uploading") : t("ob.tapUpload")}</span>
                  <span className="text-[11px] text-[var(--cream)]/50 px-6 text-center">{tr("Tip: a photo with your racket gets 3× more matches 🎾", "Consejo: una foto con tu pala consigue 3× más matches 🎾")}</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            </label>
            {!photoUrl && (
              <p className="text-[11px] text-[var(--cream)]/55 text-center">
                {tr("No photo? No problem — you can add one anytime from your profile.", "¿Sin foto? Sin problema — puedes añadirla cuando quieras desde tu perfil.")}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex justify-between gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>{t("ob.back")}</Button>
        ) : <div />}
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canStep[step]}>{t("ob.next")}</Button>
        ) : (
          <Button onClick={() => save.mutate()} disabled={!canStep[step] || save.isPending}>
            {save.isPending ? t("ob.saving") : photoUrl ? t("ob.start") : tr("Skip photo & start", "Saltar foto y empezar")}
          </Button>
        )}
      </div>
    </main>
  );
}
