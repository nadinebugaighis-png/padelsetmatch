import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyProfile, upsertMyProfile } from "@/lib/app.functions";
import {
  AUDIENCE_OPTIONS, AVAILABILITY_SLOTS, COURT_SIDES, GENDERS, LANGUAGES, LOOKING_FOR, NATIONALITIES, PADEL_LEVELS,
  POPULAR_CITIES, POPULAR_COUNTRIES, PRIORITY_TRAITS,
  decodeLocation, encodeLocation, formatLocation,
  type CourtSide, type Gender, type LookingFor, type PadelLevel,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Camera, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
  const getProfile = useServerFn(getMyProfile);
  const upsert = useServerFn(upsertMyProfile);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });

  const [step, setStep] = useState(0);
  const [first_name, setFirstName] = useState("");
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState<Gender>("woman");
  const [interested_in, setInterested] = useState<Gender[]>(["man"]);
  const [friend_interested_in, setFriendAud] = useState<string[]>(["everyone"]);
  const [partner_interested_in, setPartnerAud] = useState<string[]>(["men"]);
  const [age_min, setAgeMin] = useState(25);
  const [age_max, setAgeMax] = useState(38);
  const [nationality, setNationality] = useState("Spain");
  const [locations, setLocations] = useState<string[]>([]);
  const [locCountry, setLocCountry] = useState<string>("Spain");
  const [locCity, setLocCity] = useState<string>("");
  const [locArea, setLocArea] = useState<string>("");
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [level, setLevel] = useState<PadelLevel>("intermediate");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [customTrait, setCustomTrait] = useState("");
  const [looking_for, setLookingFor] = useState<LookingFor>("both");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const p = profileQ.data;
    if (p) {
      setFirstName(p.first_name); setAge(p.age); setGender(p.gender);
      setInterested(p.interested_in); setAgeMin(p.age_min); setAgeMax(p.age_max);
      if (p.friend_interested_in?.length) setFriendAud(p.friend_interested_in);
      if (p.partner_interested_in?.length) setPartnerAud(p.partner_interested_in);
      setNationality(p.nationality); setLevel(p.level);
      setPriorities(p.priorities); setLookingFor(p.looking_for);
      setBio(p.bio ?? ""); setPhotoUrl(p.photo_url ?? null);
      if (p.languages?.length) setLanguages(p.languages);
      if (p.locations?.length) setLocations(p.locations);
      else if (p.zone) setLocations([encodeLocation({ country: p.nationality || "Spain", city: p.zone })]);
    }
  }, [profileQ.data]);

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
  const addLocation = () => {
    if (!locCountry || !locCity.trim()) { toast.error(t("ob.errCountryCity")); return; }
    if (locations.length >= 8) { toast.error(t("ob.errMaxLoc")); return; }
    const next = encodeLocation({ country: locCountry, city: locCity.trim(), area: locArea.trim() || undefined });
    if (locations.includes(next)) { toast.error(t("ob.errDup")); return; }
    setLocations((cur) => [...cur, next]);
    setLocCity(""); setLocArea("");
  };
  const removeLocation = (s: string) => setLocations((cur) => cur.filter((x) => x !== s));
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
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${u.user.id}/photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("padel-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
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

  const save = useMutation({
    mutationFn: () => {
      const derived = Array.from(new Set([...audToGenders(friend_interested_in), ...audToGenders(partner_interested_in)]));
      const legacy = derived.length ? derived : interested_in;
      const primaryCity = locations.length > 0 ? decodeLocation(locations[0]).city : "";
      return upsert({
        data: {
          first_name, age, gender, interested_in: legacy,
          friend_interested_in, partner_interested_in,
          age_min, age_max, nationality,
          zone: primaryCity,
          locations, languages,
          level, priorities, looking_for,
          bio: bio || null, photo_url: photoUrl,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("ob.saved"));
      navigate({ to: "/app" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("ob.saveFail")),
  });

  const needFriendAud = looking_for === "friend" || looking_for === "both";
  const needPartnerAud = looking_for === "partner" || looking_for === "both";
  const audOk =
    (!needFriendAud || friend_interested_in.length > 0) &&
    (!needPartnerAud || partner_interested_in.length > 0);

  const canStep = [
    !!first_name && age >= 18,
    audOk && age_min <= age_max,
    !!nationality && locations.length > 0 && languages.length > 0 && !!level,
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
            <Input type="number" min={18} max={99} value={age} onChange={(e) => setAge(parseInt(e.target.value) || 18)} />
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.iAm")}</label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`chip ${gender === g ? "chip-ball" : ""}`}>{label(g)}</button>
              ))}
            </div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.lookingFor")}</label>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR.map((g) => (
                <button key={g} onClick={() => setLookingFor(g)} className={`chip ${looking_for === g ? "chip-ball" : ""}`}>{label(g)}</button>
              ))}
            </div>
            <p className="text-xs text-[var(--cream)]/50">{t("ob.privateNote")}</p>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-display text-3xl">{t("ob.h1")}</h2>
            <p className="text-sm text-[var(--cream)]/70">{t("ob.audIntro1")} <b>{t("ob.audEveryone")}</b> {t("ob.audIntro2")} <b>{t("ob.audPrivate")}</b></p>

            {needFriendAud && (
              <>
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.audFriend")}</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((o) => (
                    <button key={o} onClick={() => toggleAud(setFriendAud)(o)} className={`chip ${friend_interested_in.includes(o) ? "chip-ball" : ""}`}>{label(o)}</button>
                  ))}
                </div>
              </>
            )}

            {needPartnerAud && (
              <>
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.audPartner")}</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((o) => (
                    <button key={o} onClick={() => toggleAud(setPartnerAud)(o)} className={`chip ${partner_interested_in.includes(o) ? "chip-ball" : ""}`}>{label(o)}</button>
                  ))}
                </div>
              </>
            )}

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.ageRange")}</label>
            <div className="flex items-center gap-3">
              <Input type="number" min={18} max={99} value={age_min} onChange={(e) => setAgeMin(parseInt(e.target.value) || 18)} />
              <span>{t("ob.to")}</span>
              <Input type="number" min={18} max={99} value={age_max} onChange={(e) => setAgeMax(parseInt(e.target.value) || 99)} />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-display text-3xl">{t("ob.h2")}</h2>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.nat")}</label>
            <select className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2" value={nationality} onChange={(e) => setNationality(e.target.value)}>
              {NATIONALITIES.map((n) => <option key={n} value={n} className="bg-[var(--court-deep)]">{n}</option>)}
            </select>

            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.places")}</label>
              <p className="text-xs text-[var(--cream)]/50 mt-1">{t("ob.placesHelp")}</p>
            </div>

            {locations.length > 0 && (
              <ul className="space-y-2">
                {locations.map((s) => {
                  const l = decodeLocation(s);
                  return (
                    <li key={s} className="flex items-center gap-2 bg-[var(--cream)]/5 rounded-md px-3 py-2">
                      <span className="flex-1 text-sm">{formatLocation(l)}</span>
                      <button onClick={() => removeLocation(s)} className="p-1 text-[var(--cream)]/60 hover:text-[var(--clay)]"><X className="w-4 h-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="space-y-2 border border-[var(--cream)]/15 rounded-md p-3">
              <label className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">{t("ob.country")}</label>
              <select className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2" value={locCountry} onChange={(e) => setLocCountry(e.target.value)}>
                {POPULAR_COUNTRIES.map((c) => <option key={c} value={c} className="bg-[var(--court-deep)]">{c}</option>)}
              </select>
              <label className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">{t("ob.city")}</label>
              <Input value={locCity} onChange={(e) => setLocCity(e.target.value)} placeholder={t("ob.cityPh")} maxLength={60} />
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.slice(0, 12).map((c) => (
                  <button key={c} type="button" onClick={() => setLocCity(c)} className={`chip text-xs ${locCity.toLowerCase() === c.toLowerCase() ? "chip-ball" : ""}`}>{c}</button>
                ))}
              </div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">{t("ob.area")}</label>
              <Input value={locArea} onChange={(e) => setLocArea(e.target.value)} placeholder={t("ob.areaPh")} maxLength={60} />
              <Button type="button" variant="outline" onClick={addLocation} className="w-full"><Plus className="w-4 h-4 mr-1" /> {t("ob.addLocation")}</Button>
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.langs")}</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button key={l} onClick={() => toggleLanguage(l)} className={`chip ${languages.includes(l) ? "chip-ball" : ""}`}>{l}</button>
              ))}
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("ob.padelLevel")}</label>
            <div className="flex flex-wrap gap-2">
              {PADEL_LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)} className={`chip ${level === l ? "chip-ball" : ""}`}>{label(l)}</button>
              ))}
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
