import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ClubPicker } from "@/components/ClubPicker";
import { PADEL_LEVELS } from "@/lib/types";
import type { ClubResult } from "@/lib/match-events.functions";
import { useTr } from "@/lib/i18n";


export type MatchFormValues = {
  starts_at: string;
  club_name: string;
  club_address: string | null;
  club_place_id: string | null;
  club_lat: number | null;
  club_lng: number | null;
  city: string | null;
  country: string | null;
  level_min: (typeof PADEL_LEVELS)[number];
  level_max: (typeof PADEL_LEVELS)[number];
  gender_rule: "mixed" | "men_only" | "women_only";
  extra_confirmed: number;
  note: string | null;
  playtomic_link: string | null;
  court_booked: boolean;
};

export type MatchFormInitial = Partial<MatchFormValues> & {
  when_local?: string; // datetime-local formatted
  app_players_count?: number;
};

type Props = {
  initial?: MatchFormInitial;
  submitLabel: string;
  onSubmit: (values: MatchFormValues) => Promise<void> | void;
  saving?: boolean;
  title: string;
};

function toLocalDatetime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MatchForm({ initial, submitLabel, onSubmit, saving, title }: Props) {
  const tr = useTr();
  const appPlayersCount = Math.min(4, Math.max(1, initial?.app_players_count ?? 1));
  const maxNeeded = Math.max(0, 4 - appPlayersCount);
  const initialNeeded = Math.min(
    maxNeeded,
    Math.max(0, 4 - appPlayersCount - (initial?.extra_confirmed ?? 0)),
  );
  const isClub = !!initial?.club_place_id;
  const [locMode, setLocMode] = useState<"club" | "address">(
    initial ? (isClub ? "club" : "address") : "club",
  );
  const [club, setClub] = useState<ClubResult | null>(
    isClub
      ? {
          place_id: initial!.club_place_id!,
          name: initial!.club_name ?? "",
          address: initial!.club_address ?? "",
          lat: initial!.club_lat ?? null,
          lng: initial!.club_lng ?? null,
          city: initial!.city ?? "",
          country: initial!.country ?? "",
        }
      : null,
  );
  const [customAddress, setCustomAddress] = useState(
    !isClub && initial?.club_address ? initial.club_address : !isClub ? initial?.club_name ?? "" : "",
  );
  const [customCity, setCustomCity] = useState(!isClub ? initial?.city ?? "" : "");
  const [when, setWhen] = useState(initial?.when_local ?? toLocalDatetime(initial?.starts_at));
  const [genderRule, setGenderRule] = useState<"mixed" | "men_only" | "women_only">(
    initial?.gender_rule ?? "mixed",
  );
  const [playersNeeded, setPlayersNeeded] = useState<number>(initialNeeded);
  const [levelMin, setLevelMin] = useState<(typeof PADEL_LEVELS)[number]>(initial?.level_min ?? "casual");
  const [levelMax, setLevelMax] = useState<(typeof PADEL_LEVELS)[number]>(initial?.level_max ?? "advanced");
  const [courtBooked, setCourtBooked] = useState<boolean>(initial?.court_booked ?? false);
  const [playtomicLink, setPlaytomicLink] = useState(initial?.playtomic_link ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const locationReady = locMode === "club" ? !!club : customAddress.trim().length > 3;
  const canSave = locationReady && !!when && !saving;

  const handleSubmit = async () => {
    if (!locationReady || !when) return;
    const extraConfirmed = Math.max(0, 4 - appPlayersCount - playersNeeded);
    const values: MatchFormValues =
      locMode === "club" && club
        ? {
            starts_at: new Date(when).toISOString(),
            club_name: club.name,
            club_address: club.address || null,
            club_place_id: club.place_id || null,
            club_lat: club.lat,
            club_lng: club.lng,
            city: club.city || null,
            country: club.country || null,
            level_min: levelMin,
            level_max: levelMax,
            gender_rule: genderRule,
            extra_confirmed: extraConfirmed,
            note: note || null,
            playtomic_link: playtomicLink || null,
            court_booked: courtBooked,
          }
        : {
            starts_at: new Date(when).toISOString(),
            club_name: customAddress.trim(),
            club_address: customAddress.trim(),
            club_place_id: null,
            club_lat: null,
            club_lng: null,
            city: customCity.trim() || null,
            country: null,
            level_min: levelMin,
            level_max: levelMax,
            gender_rule: genderRule,
            extra_confirmed: extraConfirmed,
            note: note || null,
            playtomic_link: playtomicLink || null,
            court_booked: courtBooked,
          };
    await onSubmit(values);
  };

  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-32 space-y-5">
      <Link
        to="/app/events"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-[var(--cream)]/70 hover:text-[var(--ball)]"
      >
        <ArrowLeft className="w-4 h-4" /> {tr("Find matches", "Buscar partidos")}
      </Link>
      <h1 className="text-display text-2xl tracking-wider">{title}</h1>


      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Where", "Dónde")}</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { v: "club" as const, l: tr("Padel club", "Club de pádel") },
            { v: "address" as const, l: tr("Address", "Dirección") },
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
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder={tr("Street address", "Dirección")}
              className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
            />
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder={tr("City / area (optional)", "Ciudad / zona (opcional)")}
              className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
            />
            <p className="text-[11px] text-[var(--cream)]/50">
              {tr("Use this for residential / private courts that aren't on Google.", "Úsalo para pistas privadas o residenciales que no están en Google.")}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Date & time", "Fecha y hora")}</label>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)]"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Players needed", "Jugadores que faltan")}</label>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: maxNeeded + 1 }, (_, i) => maxNeeded - i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPlayersNeeded(n)}
              className={`py-2 rounded-lg border text-sm ${
                playersNeeded === n
                  ? "border-[var(--ball)] bg-[var(--ball)]/15 text-[var(--ball)]"
                  : "border-[var(--cream)]/15 text-[var(--cream)]/70"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--cream)]/50 mt-1.5">
          {playersNeeded === 0
            ? tr("This match is full.", "Este partido está completo.")
            : tr(
                `Needs ${playersNeeded} more player${playersNeeded === 1 ? "" : "s"}.`,
                `Faltan ${playersNeeded} ${playersNeeded === 1 ? "jugador" : "jugadores"}.`,
              )}{" "}
          {tr("App players", "Jugadores en la app")}: {appPlayersCount}. {tr("Outside-app players", "Jugadores fuera de la app")}: {Math.max(0, 4 - appPlayersCount - playersNeeded)}.
        </p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Open to", "Abierto a")}</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "mixed" as const, l: tr("Mixed", "Mixto") },
            { v: "men_only" as const, l: tr("Men only", "Solo hombres") },
            { v: "women_only" as const, l: tr("Women only", "Solo mujeres") },
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
          <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Level min", "Nivel mín.")}</label>
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
          <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Level max", "Nivel máx.")}</label>
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
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Court", "Pista")}</label>
        <label className="flex items-center gap-3 text-sm text-[var(--cream)]/80">
          <input type="checkbox" checked={courtBooked} onChange={(e) => setCourtBooked(e.target.checked)} />
          {tr("I've booked the court ✅", "Ya reservé la pista ✅")}
        </label>
        <input
          type="url"
          value={playtomicLink}
          onChange={(e) => setPlaytomicLink(e.target.value)}
          placeholder={tr("Playtomic booking link (optional)", "Enlace de reserva en Playtomic (opcional)")}
          className="mt-2 w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60 block mb-2">{tr("Note (optional)", "Nota (opcional)")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={tr("Bring extra balls, etc.", "Traed pelotas de sobra, etc.")}
          className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 text-sm"
        />
      </div>

      <div className="fixed left-0 right-0 bottom-16 px-5 z-30">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="w-full py-3 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold disabled:opacity-40"
          >
            {saving ? tr("Saving…", "Guardando…") : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
