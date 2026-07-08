import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ClubPicker } from "@/components/ClubPicker";
import { PADEL_LEVELS } from "@/lib/types";
import type { ClubResult } from "@/lib/match-events.functions";
import { normalizePlaytomicLink } from "@/lib/affinity";
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
  when_local?: string;
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

// Shared field styles
const labelCls = "text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60 block mb-2";
const inputCls = "w-full bg-white border border-[var(--ink)]/15 rounded-xl px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/35 outline-none focus:border-[var(--ink)]/40 transition";
const helperCls = "text-[11px] text-[var(--ink)]/50 mt-1.5 leading-relaxed";

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2.5 rounded-full border text-xs font-medium uppercase tracking-widest transition ${
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
          : "border-[var(--ink)]/15 bg-white text-[var(--ink)]/70 hover:border-[var(--ink)]/35"
      }`}
    >
      {children}
    </button>
  );
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
  const [playtomicError, setPlaytomicError] = useState<string | null>(null);
  const [note, setNote] = useState(initial?.note ?? "");

  const locationReady = locMode === "club" ? !!club : customAddress.trim().length > 3;
  const canSave = locationReady && !!when && !saving;

  const handleSubmit = async () => {
    if (!locationReady || !when) return;
    const normalized = normalizePlaytomicLink(playtomicLink);
    if (normalized.error) {
      setPlaytomicError(tr("Enter a valid Playtomic link (playtomic.io)", "Introduce un enlace válido de Playtomic (playtomic.io)", "Saisis un lien Playtomic valide (playtomic.io)"));
      return;
    }
    setPlaytomicError(null);

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
            playtomic_link: normalized.url,
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
            playtomic_link: normalized.url,
            court_booked: courtBooked,
          };
    await onSubmit(values);
  };

  return (
    <div className="max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto px-5 py-6 pb-36 space-y-6">
      <Link
        to="/app/events"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60 hover:text-[var(--ink)] transition"
      >
        <ArrowLeft className="w-4 h-4" /> {tr("Find matches", "Buscar partidos", "Trouver des matches")}
      </Link>

      <header>
        <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-[var(--ink)]">{title}</h1>
        <p className="mt-1.5 text-xs text-[var(--ink)]/55">
          {tr("Fill in a few details and call your match.", "Rellena unos detalles y convoca tu partido.", "Remplis quelques détails et lance ton match.")}
        </p>
      </header>

      {/* Where */}
      <section>
        <label className={labelCls}>{tr("Where", "Dónde", "Où")}</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { v: "club" as const, l: tr("Padel club", "Club de pádel", "Club de padel") },
            { v: "address" as const, l: tr("Address", "Dirección", "Adresse") },
          ].map((o) => (
            <SegButton key={o.v} active={locMode === o.v} onClick={() => setLocMode(o.v)}>
              {o.l}
            </SegButton>
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
              placeholder={tr("Street address", "Dirección", "Adresse postale")}
              className={inputCls}
            />
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder={tr("City / area (optional)", "Ciudad / zona (opcional)", "Ville / zone (optionnel)")}
              className={inputCls}
            />
            <p className={helperCls}>
              {tr("Use this for residential / private courts that aren't on Google.", "Úsalo para pistas privadas o residenciales que no están en Google.", "À utiliser pour les pistas résidentielles / privées qui ne sont pas sur Google.")}
            </p>
          </div>
        )}
      </section>

      {/* Date & time */}
      <section>
        <label className={labelCls}>{tr("Date & time", "Fecha y hora", "Date et heure")}</label>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className={inputCls}
        />
      </section>

      {/* Players needed */}
      <section>
        <label className={labelCls}>{tr("Players needed", "Jugadores que faltan", "Joueurs recherchés")}</label>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: maxNeeded + 1 }, (_, i) => maxNeeded - i).map((n) => (
            <SegButton key={n} active={playersNeeded === n} onClick={() => setPlayersNeeded(n)}>
              {n}
            </SegButton>
          ))}
        </div>
        <p className={helperCls}>
          {playersNeeded === 0
            ? tr("This match is full.", "Este partido está completo.", "Ce match est complet.")
            : tr(
                `Needs ${playersNeeded} more player${playersNeeded === 1 ? "" : "s"}.`,
                `Faltan ${playersNeeded} ${playersNeeded === 1 ? "jugador" : "jugadores"}.`,
              )}{" "}
          {tr("App players", "Jugadores en la app", "Joueurs de l'app")}: {appPlayersCount}. {tr("Outside-app players", "Jugadores fuera de la app", "Joueurs hors app")}: {Math.max(0, 4 - appPlayersCount - playersNeeded)}.
        </p>
      </section>

      {/* Open to */}
      <section>
        <label className={labelCls}>{tr("Open to", "Abierto a", "Ouvert à")}</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "mixed" as const, l: tr("Mixed", "Mixto", "Mixte") },
            { v: "men_only" as const, l: tr("Men only", "Solo hombres", "Hommes uniquement") },
            { v: "women_only" as const, l: tr("Women only", "Solo mujeres", "Femmes uniquement") },
          ].map((o) => (
            <SegButton key={o.v} active={genderRule === o.v} onClick={() => setGenderRule(o.v)}>
              {o.l}
            </SegButton>
          ))}
        </div>
      </section>

      {/* Levels */}
      <section className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{tr("Level min", "Nivel mín.", "Niveau min.")}</label>
          <select
            value={levelMin}
            onChange={(e) => setLevelMin(e.target.value as any)}
            className={inputCls}
          >
            {PADEL_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{tr("Level max", "Nivel máx.", "Niveau max.")}</label>
          <select
            value={levelMax}
            onChange={(e) => setLevelMax(e.target.value as any)}
            className={inputCls}
          >
            {PADEL_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Court */}
      <section>
        <label className={labelCls}>{tr("Court", "Pista", "Pista")}</label>
        <label className="flex items-center gap-3 text-sm text-[var(--ink)]/80 rounded-xl border border-[var(--ink)]/15 bg-white px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={courtBooked}
            onChange={(e) => setCourtBooked(e.target.checked)}
            className="h-4 w-4 accent-[var(--ink)]"
          />
          {tr("I've booked the court ✅", "Ya reservé la pista ✅", "J'ai réservé la pista ✅")}
        </label>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={playtomicLink}
          onChange={(e) => {
            setPlaytomicLink(e.target.value);
            if (playtomicError) setPlaytomicError(null);
          }}
          placeholder={tr("Playtomic booking link (optional)", "Enlace de reserva en Playtomic (opcional)", "Lien de réservation Playtomic (optionnel)")}
          className={`${inputCls} mt-2 ${playtomicError ? "border-red-400" : ""}`}
        />
        {playtomicError && (
          <p className="mt-1 text-[11px] text-red-500">{playtomicError}</p>
        )}
        <p className={helperCls}>
          {tr("Paste the full playtomic.io booking link so players can open it directly.", "Pega el enlace completo de playtomic.io para que los jugadores puedan abrirlo directamente.", "Colle le lien complet de réservation playtomic.io pour que les joueurs puissent l'ouvrir directement.")}
        </p>
      </section>

      {/* Note */}
      <section>
        <label className={labelCls}>{tr("Note (optional)", "Nota (opcional)", "Note (optionnel)")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={tr("Bring extra balls, etc.", "Traed pelotas de sobra, etc.", "Apporter des balles en plus, etc.")}
          className={inputCls}
        />
      </section>

      {/* Sticky submit */}
      <div className="fixed left-0 right-0 bottom-16 px-5 z-30 pointer-events-none">
        <div className="max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto pointer-events-auto">
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="w-full py-3.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs uppercase tracking-[0.2em] font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? tr("Saving…", "Guardando…", "Enregistrement…") : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
