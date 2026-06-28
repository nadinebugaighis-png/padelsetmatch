import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyProfile, upsertMyProfile } from "@/lib/app.functions";
import { AUDIENCE_OPTIONS, GENDERS, LOOKING_FOR, MADRID_ZONES, NATIONALITIES, PADEL_LEVELS, PRIORITY_TRAITS, type Gender, type LookingFor, type MadridZone, type PadelLevel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Camera, Plus, X } from "lucide-react";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
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
  const [zone, setZone] = useState<MadridZone>("Chamberí");
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
      setNationality(p.nationality); setZone(p.zone); setLevel(p.level);
      setPriorities(p.priorities); setLookingFor(p.looking_for);
      setBio(p.bio ?? ""); setPhotoUrl(p.photo_url ?? null);
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
    if (customCount >= 3) { toast.error("Up to 3 custom traits"); return; }
    if (priorities.includes(v)) { toast.error("Already added"); return; }
    if (priorities.length >= 8) { toast.error("Max 8 traits"); return; }
    setPriorities((cur) => [...cur, v]);
    setCustomTrait("");
  };
  // Derive legacy interested_in (gender list) from the audience choices
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
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${u.user.id}/photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("padel-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("padel-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("Couldn't sign URL");
      setPhotoUrl(signed.signedUrl);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: () => upsert({
      data: { first_name, age, gender, interested_in, friend_interested_in, partner_interested_in, age_min, age_max, nationality, zone, level, priorities, looking_for, bio: bio || null, photo_url: photoUrl },
    }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Profile saved");
      navigate({ to: "/app" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const needFriendAud = looking_for === "friend" || looking_for === "both";
  const needPartnerAud = looking_for === "partner" || looking_for === "both";
  const audOk =
    (!needFriendAud || friend_interested_in.length > 0) &&
    (!needPartnerAud || partner_interested_in.length > 0);

  const canStep = [
    !!first_name && age >= 18,
    audOk && age_min <= age_max,
    !!nationality && !!zone && !!level,
    priorities.length >= 3,
    !!photoUrl,
  ];

  const steps = ["You", "Who you're meeting", "Padel & home", "What matters", "Photo"];

  return (
    <main className="px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--cream)]/60">
        <span>Step {step + 1} / {steps.length}</span>
        <span>{steps[step]}</span>
      </div>
      <div className="h-1 mt-2 rounded-full bg-[var(--cream)]/10 overflow-hidden">
        <div className="h-full bg-[var(--ball)]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="mt-6 surface-card p-5 space-y-4">
        {step === 0 && (
          <>
            <h2 className="text-display text-3xl">Who are you?</h2>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">First name (only this is shown)</label>
            <Input value={first_name} onChange={(e) => setFirstName(e.target.value)} placeholder="Lucía" />
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Age</label>
            <Input type="number" min={18} max={99} value={age} onChange={(e) => setAge(parseInt(e.target.value) || 18)} />
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">I am</label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`chip ${gender === g ? "chip-ball" : ""}`}>{g}</button>
              ))}
            </div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Looking for</label>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR.map((g) => (
                <button key={g} onClick={() => setLookingFor(g)} className={`chip ${looking_for === g ? "chip-ball" : ""}`}>{g}</button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-display text-3xl">Who do you want to meet?</h2>
            <p className="text-sm text-[var(--cream)]/70">Pick separately for friendship and for a relationship — tap as many as fit. Choose <b>Everyone</b> if you're open to all.</p>

            {needFriendAud && (
              <>
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">For friendship</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((o) => (
                    <button key={o} onClick={() => toggleAud(setFriendAud)(o)} className={`chip ${friend_interested_in.includes(o) ? "chip-ball" : ""}`}>{o}</button>
                  ))}
                </div>
              </>
            )}

            {needPartnerAud && (
              <>
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">For a relationship</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((o) => (
                    <button key={o} onClick={() => toggleAud(setPartnerAud)(o)} className={`chip ${partner_interested_in.includes(o) ? "chip-ball" : ""}`}>{o}</button>
                  ))}
                </div>
              </>
            )}

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Age range</label>
            <div className="flex items-center gap-3">
              <Input type="number" min={18} max={99} value={age_min} onChange={(e) => setAgeMin(parseInt(e.target.value) || 18)} />
              <span>to</span>
              <Input type="number" min={18} max={99} value={age_max} onChange={(e) => setAgeMax(parseInt(e.target.value) || 99)} />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-display text-3xl">Padel & home base</h2>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Nationality / background</label>
            <select className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2" value={nationality} onChange={(e) => setNationality(e.target.value)}>
              {NATIONALITIES.map((n) => <option key={n} value={n} className="bg-[var(--court-deep)]">{n}</option>)}
            </select>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Madrid zone</label>
            <div className="flex flex-wrap gap-2">
              {MADRID_ZONES.map((z) => (
                <button key={z} onClick={() => setZone(z)} className={`chip ${zone === z ? "chip-ball" : ""}`}>{z}</button>
              ))}
            </div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Padel level</label>
            <div className="flex flex-wrap gap-2">
              {PADEL_LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)} className={`chip ${level === l ? "chip-ball" : ""}`}>{l}</button>
              ))}
            </div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Short bio (optional)</label>
            <Textarea maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Quiet hitter. Saturday morning regular." />
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-display text-3xl">What matters to you?</h2>
            <p className="text-sm text-[var(--cream)]/70">Tap to add. Then rank them — most important first. You can delete any and add up to 3 of your own to help the AI match you better.</p>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Suggested traits</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_TRAITS.map((t) => {
                const picked = priorities.includes(t);
                return (
                  <button key={t} onClick={() => togglePriority(t)} className={`chip ${picked ? "chip-ball" : ""}`}>
                    {picked ? "✓ " : "+ "}{t}
                  </button>
                );
              })}
            </div>

            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Add your own (up to 3)</label>
            <div className="flex gap-2">
              <Input
                value={customTrait}
                onChange={(e) => setCustomTrait(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                placeholder="e.g. animal lover, foodie, early bird"
                maxLength={30}
              />
              <Button type="button" variant="outline" onClick={addCustom}><Plus className="w-4 h-4" /></Button>
            </div>

            {priorities.length > 0 && (
              <>
                <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Your ranking (top = most important)</label>
                <ul className="space-y-2">
                  {priorities.map((t, i) => (
                    <li key={t} className="flex items-center gap-2 bg-[var(--cream)]/5 rounded-md px-3 py-2">
                      <span className="text-[var(--ball)] font-bold w-6">{i + 1}.</span>
                      <span className="flex-1 capitalize">{t}</span>
                      <button onClick={() => movePriority(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => movePriority(i, 1)} disabled={i === priorities.length - 1} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                      <button onClick={() => removePriority(t)} className="p-1 text-[var(--cream)]/60 hover:text-[var(--clay)]"><X className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[var(--cream)]/50">Pick at least 3.</p>
              </>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-display text-3xl">Your padel photo</h2>
            <p className="text-sm text-[var(--cream)]/70">A photo of you with a racket on court — that's the whole vibe. Only shown to people you match with… and the discover grid.</p>
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
                  <span className="text-sm">{uploading ? "Uploading…" : "Tap to upload"}</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            </label>
          </>
        )}
      </div>

      <div className="mt-5 flex justify-between gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
        ) : <div />}
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canStep[step]}>Next</Button>
        ) : (
          <Button onClick={() => save.mutate()} disabled={!canStep[step] || save.isPending}>
            {save.isPending ? "Saving…" : "Start matching"}
          </Button>
        )}
      </div>
    </main>
  );
}
