import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createMatchEvent, type ClubResult } from "@/lib/match-events.functions";
import { ClubPicker } from "@/components/ClubPicker";
import { PADEL_LEVELS } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/events/new")({
  component: NewEvent,
  errorComponent: ({ error }) => <div className="p-6 text-[var(--cream)]/70">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-[var(--cream)]/70">Not found</div>,
});

function NewEvent() {
  const navigate = useNavigate();
  const create = useServerFn(createMatchEvent);
  const [locMode, setLocMode] = useState<"club" | "address">("club");
  const [club, setClub] = useState<ClubResult | null>(null);
  const [customName, setCustomName] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [when, setWhen] = useState("");
  const [genderRule, setGenderRule] = useState<"mixed" | "men_only" | "women_only">("mixed");
  const [extra, setExtra] = useState(0);
  const [levelMin, setLevelMin] = useState<(typeof PADEL_LEVELS)[number]>("casual");
  const [levelMax, setLevelMax] = useState<(typeof PADEL_LEVELS)[number]>("advanced");
  const [courtBooked, setCourtBooked] = useState(false);
  const [playtomicLink, setPlaytomicLink] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const locationReady =
    locMode === "club" ? !!club : customName.trim().length > 1 && customAddress.trim().length > 3;
  const canSave = locationReady && !!when && !saving;

  const onSave = async () => {
    if (!locationReady || !when) return;
    setSaving(true);
    try {
      const payload =
        locMode === "club" && club
          ? {
              club_name: club.name,
              club_address: club.address || null,
              club_place_id: club.place_id || null,
              club_lat: club.lat,
              club_lng: club.lng,
              city: club.city || null,
              country: club.country || null,
            }
          : {
              club_name: customName.trim(),
              club_address: customAddress.trim(),
              club_place_id: null,
              club_lat: null,
              club_lng: null,
              city: customCity.trim() || null,
              country: null,
            };
      const { id } = await create({
        data: {
          starts_at: new Date(when).toISOString(),
          ...payload,
          level_min: levelMin,
          level_max: levelMax,
          gender_rule: genderRule,
          extra_confirmed: extra,
          note: note || null,
          playtomic_link: playtomicLink || null,
          court_booked: courtBooked,
        },
      });
      toast.success("Match called! Waiting for players.");
      navigate({ to: "/app/events/$eventId", params: { eventId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create match");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-32 space-y-5">
      <h1 className="text-display text-2xl tracking-wider">CALL A MATCH</h1>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Where</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { v: "club" as const, l: "Padel club" },
            { v: "address" as const, l: "Address" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setLocMode(o.v)}
              className={`py-2 rounded-lg border text-sm ${
                locMode === o.v
                  ? "border-[var(--ball)] bg-[var(--ball)]/15 text-[var(--ball)]"
                  : "border-[var(--cream)]/15 text-[var(--cream)]/70"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
        {locMode === "club" ? (
          <ClubPicker value={club} onChange={setClub} />
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Court / place name (e.g. Urbanización Los Olivos)"
              className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
            />
            <input
              type="text"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder="Street address"
              className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
            />
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="City / area (optional)"
              className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
            />
            <p className="text-[11px] text-[var(--cream)]/50">
              Use this for residential / private courts that aren't on Google.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Date & time</label>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)]"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Who's already in? (besides you)</label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setExtra(n)}
              className={`py-2 rounded-lg border text-sm ${
                extra === n
                  ? "border-[var(--ball)] bg-[var(--ball)]/15 text-[var(--ball)]"
                  : "border-[var(--cream)]/15 text-[var(--cream)]/70"
              }`}
            >
              +{n}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--cream)]/50 mt-1.5">
          Needs {Math.max(0, 3 - extra)} more player{Math.max(0, 3 - extra) === 1 ? "" : "s"} to reach 4.
        </p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Open to</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "mixed" as const, l: "Mixed" },
            { v: "men_only" as const, l: "Men only" },
            { v: "women_only" as const, l: "Women only" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setGenderRule(o.v)}
              className={`py-2 rounded-lg border text-sm ${
                genderRule === o.v
                  ? "border-[var(--ball)] bg-[var(--ball)]/15 text-[var(--ball)]"
                  : "border-[var(--cream)]/15 text-[var(--cream)]/70"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Level min</label>
          <select
            value={levelMin}
            onChange={(e) => setLevelMin(e.target.value as any)}
            className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)]"
          >
            {PADEL_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Level max</label>
          <select
            value={levelMax}
            onChange={(e) => setLevelMax(e.target.value as any)}
            className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)]"
          >
            {PADEL_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Court</label>
        <label className="flex items-center gap-3 text-sm text-[var(--cream)]/80">
          <input type="checkbox" checked={courtBooked} onChange={(e) => setCourtBooked(e.target.checked)} />
          I've booked the court ✅
        </label>
        <input
          type="url"
          value={playtomicLink}
          onChange={(e) => setPlaytomicLink(e.target.value)}
          placeholder="Playtomic booking link (optional)"
          className="mt-2 w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Bring extra balls, etc."
          className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
        />
      </div>

      <div className="fixed left-0 right-0 bottom-16 px-5 z-30">
        <div className="max-w-md mx-auto">
          <button
            onClick={onSave}
            disabled={!canSave}
            className="w-full py-3 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold disabled:opacity-40"
          >
            {saving ? "Saving…" : "Call this match"}
          </button>
        </div>
      </div>
    </div>
  );
}
