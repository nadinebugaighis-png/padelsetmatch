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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_NAMES, citiesFor, areasFor } from "@/lib/locations";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Camera, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { loadGuestDraft, clearGuestDraft } from "@/lib/guest-draft";

export const Route = createFileRoute("/app/onboarding")({
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
      // Derive simple goals + meetPref from stored data
      const g: string[] = [];
      if (p.looking_for === "partner" || p.looking_for === "both") g.push("relationship");
      if (p.looking_for === "friend" || p.looking_for === "both") { g.push("padel"); g.push("friends"); }
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

  const validBlocks = locBlocks.filter((b) => b.country.trim() && b.city.trim());
  const encodedLocations: string[] = validBlocks.flatMap((b) => {
    const areas = b.areas.map((a) => a.trim()).filter(Boolean);
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
    !!photoUrl,
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
            <AgeInput value={age} onCommit={setAge} placeholder="e.g. 32" />
            <p className="text-[11px] text-[var(--cream)]/50">Enter your age (18–99), not your birth year.</p>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.iAm")}</label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`chip ${gender === g ? "chip-ball" : ""}`}>{label(g)}</button>
              ))}
            </div>
            {gender === "self-describe" && (
              <Input value={genderCustom} onChange={(e) => setGenderCustom(e.target.value)} placeholder="Describe yourself (e.g. trans woman, genderfluid…)" maxLength={40} />
            )}
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">What are you looking for?</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "padel", label: "Padel partners" },
                { id: "friends", label: "Friends" },
                { id: "relationship", label: "Relationship" },
                { id: "all", label: "Open to all" },
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
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Who would you like to meet?</label>
                <div className="flex flex-wrap gap-2">
                  {(["men", "women", "everyone"] as const).map((o) => (
                    <button key={o} onClick={() => setMeetPref(o)} className={`chip ${meetPref === o ? "chip-ball" : ""}`}>
                      {o === "men" ? "Men" : o === "women" ? "Women" : "Everyone"}
                    </button>
                  ))}
                </div>
              </>
            )}

            {hasPartnerGoal && meetPref === "everyone" && (
              <div className="rounded-lg border border-[var(--cream)]/10 p-3 space-y-2">
                <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Advanced profile (optional)</div>
                <label className="text-[11px] text-[var(--cream)]/60">Sexual orientation</label>
                <Input
                  value={sexualOrientation}
                  onChange={(e) => setSexualOrientation(e.target.value)}
                  placeholder="e.g. straight, gay, bisexual, queer, pansexual…"
                  maxLength={60}
                />
                <p className="text-[10px] text-[var(--cream)]/50">Private — used only to improve matches. Not shown on your profile.</p>
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
              <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Where do you play?</label>
              <p className="text-xs text-[var(--cream)]/50 mt-1">Add the places you play — home, work, summer house, or when travelling. Up to 3 areas per country.</p>
            </div>

            <div className="space-y-3">
              {locBlocks.map((b, i) => (
                <div key={i} className="rounded-lg border border-[var(--cream)]/15 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Location {i + 1}</span>
                    {locBlocks.length > 1 && (
                      <button type="button" onClick={() => removeBlock(i)} className="text-[var(--cream)]/60 hover:text-[var(--clay)]">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Select value={b.country || undefined} onValueChange={(v) => updateBlock(i, { country: v, city: "", areas: ["", "", ""] })}>
                    <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={b.city || undefined} onValueChange={(v) => updateBlock(i, { city: v, areas: ["", "", ""] })} disabled={!b.country}>
                    <SelectTrigger><SelectValue placeholder={b.country ? "City" : "Pick country first"} /></SelectTrigger>
                    <SelectContent>
                      {citiesFor(b.country).map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {areasFor(b.country, b.city).length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                      {b.areas.map((a, ai) => {
                        const opts = areasFor(b.country, b.city);
                        const taken = new Set(b.areas.filter((x, k) => k !== ai && x));
                        return (
                          <Select key={ai} value={a || undefined} onValueChange={(v) => updateArea(i, ai, v === "__none__" ? "" : v)} disabled={!b.city}>
                            <SelectTrigger><SelectValue placeholder={b.city ? `Area ${ai + 1} (optional)` : "Pick city first"} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— None —</SelectItem>
                              {opts.filter((o) => !taken.has(o)).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        );
                      })}
                    </div>
                  )}

                </div>
              ))}
              <Button type="button" variant="outline" onClick={addBlock} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add another country
              </Button>
            </div>


            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.nat")}</label>
            <select className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2" value={nationality} onChange={(e) => setNationality(e.target.value)}>
              <option value="" className="bg-[var(--court-deep)]">— Select —</option>
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
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Preferred court side</label>
            <div className="flex flex-wrap gap-2">
              {COURT_SIDES.map((s) => (
                <button key={s} type="button" onClick={() => setCourtSide(s)} className={`chip ${courtSide === s ? "chip-ball" : ""}`}>{s}</button>
              ))}
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">When can you play?</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_SLOTS.map((s) => (
                <button key={s} type="button" onClick={() => toggleAvail(s)} className={`chip ${availability.includes(s) ? "chip-ball" : ""}`}>{s}</button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm pt-1">
              <input type="checkbox" checked={mixedDoubles} onChange={(e) => setMixedDoubles(e.target.checked)} className="accent-[var(--ball)]" />
              Open to mixed doubles (2 men + 2 women format)
            </label>

            <div className="rounded-xl border border-[var(--ball)]/30 bg-[var(--ball)]/5 p-3 mt-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={freeCourt} onChange={(e) => setFreeCourt(e.target.checked)} className="accent-[var(--ball)] mt-0.5" />
                <span>
                  <span className="font-semibold">🎾 I have free court access</span>
                  <span className="block text-xs text-[var(--cream)]/70 mt-0.5">Private club, residential court, or comp slots you can share with a match. A badge will appear on your profile.</span>
                </span>
              </label>
              {freeCourt && (
                <Input
                  className="mt-2"
                  value={freeCourtNote}
                  onChange={(e) => setFreeCourtNote(e.target.value)}
                  placeholder="Optional: court name or area (share full address only in chat)"
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
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            </label>
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
            {save.isPending ? t("ob.saving") : t("ob.start")}
          </Button>
        )}
      </div>
    </main>
  );
}
