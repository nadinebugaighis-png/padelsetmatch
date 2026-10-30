import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ClubPicker } from "@/components/ClubPicker";
import { Button } from "@/components/ui/button";
import { MatchDateTimePicker } from "@/components/MatchDateTimePicker";
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
  is_private_court: boolean;
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
const labelCls = "text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/60 block mb-1";
const inputCls = "w-full bg-white border border-[var(--ink)]/15 rounded-lg px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/35 outline-none focus:border-[var(--ink)]/40 transition";
const cardCls = "rounded-2xl bg-white border border-[var(--ink)]/10 px-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]";
const rowCls = "flex items-center justify-between gap-3 min-h-11 py-1.5";
const rowLabel = "text-sm text-[var(--ink)]";
const rowDivider = "h-px bg-[var(--ink)]/[0.08]";
const stepBtn = "size-8 grid place-items-center rounded-full border border-[var(--ink)]/15 text-[var(--ink)] disabled:opacity-30";
const selectCls = "bg-transparent text-sm font-medium text-[var(--ink)] outline-none capitalize text-right";
const bareInput = "w-full bg-transparent py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none";
const helperCls = "text-[11px] text-[var(--ink)]/50 mt-1.5 leading-relaxed";

function SegButton({
  active,
  onClick,
  children,
  light = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 py-1.5 rounded-full border text-[11px] font-medium uppercase tracking-widest transition ${
        light
          ? active
            ? "border-[var(--ink)] bg-white text-[var(--ink)] font-semibold shadow-[0_1px_0_0_var(--ink)]"
            : "border-[var(--ink)]/15 bg-white text-[var(--ink)]/55 hover:border-[var(--ink)]/35 hover:text-[var(--ink)]/80"
          : active
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
          : "border-[var(--ink)]/15 bg-white text-[var(--ink)]/70 hover:border-[var(--ink)]/35"
      }`}
    >
      {children}
    </Button>
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
  const [isPrivateCourt, setIsPrivateCourt] = useState<boolean>(initial?.is_private_court ?? false);
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
            is_private_court: false,
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
            is_private_court: isPrivateCourt,
          };
    await onSubmit(values);
  };

  return (
    <div className="max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto px-4 py-3 pb-32 space-y-3">
      <Link
        to="/app/events"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60 hover:text-[var(--ink)] transition"
      >
        <ArrowLeft className="w-4 h-4" /> {tr("Find matches", "Buscar partidos", "Trouver des matches")}
      </Link>

      <header>
        <h1 className="font-serif text-2xl sm:text-3xl leading-tight text-[var(--ink)]">{title}</h1>
      </header>

      {/* Card 1 — Where & when */}
      <div className={cardCls}>
      <section className="py-2.5">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { v: "club" as const, l: tr("Padel club", "Club de pádel", "Club de padel") },
            { v: "address" as const, l: tr("Type it in", "Escríbelo yo", "Saisir moi-même") },
          ].map((o) => (
            <SegButton key={o.v} light active={locMode === o.v} onClick={() => setLocMode(o.v)}>
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
              placeholder={tr("Court name or street address", "Nombre de la pista o dirección", "Nom du terrain ou adresse")}
              className={inputCls}
            />
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder={tr("City (e.g. Dubai, Madrid, Paris)", "Ciudad (ej. Dubái, Madrid, París)", "Ville (ex. Dubaï, Madrid, Paris)")}
              className={inputCls}
            />
            <p className={helperCls}>
              {tr("Use this if your club isn't on Google, or for private / residential courts.", "Úsalo si tu club no está en Google, o para pistas privadas o residenciales.", "À utiliser si ton club n'est pas sur Google, ou pour les terrains privés / résidentiels.")}
            </p>

            <div className="pt-2">
              <label className={labelCls}>{tr("Is this a private court?", "¿Es una pista privada?", "Est-ce un terrain privé ?")}</label>
              <div className="grid grid-cols-2 gap-2">
                <SegButton active={!isPrivateCourt} onClick={() => setIsPrivateCourt(false)}>
                  {tr("No — club or residential", "No — club o urbanización", "Non — club ou résidence")}
                </SegButton>
                <SegButton active={isPrivateCourt} onClick={() => setIsPrivateCourt(true)}>
                  {tr("Yes — private home", "Sí — casa privada", "Oui — domicile privé")}
                </SegButton>
              </div>
              <p className={helperCls}>
                {tr(
                  "Private = inside someone's home or property. A residential complex or urbanization court open to residents is not private. Guests will see a 'Private court' tag so they know what to expect.",
                  "Privada = dentro de la casa o propiedad de alguien. Una pista de una urbanización o complejo residencial abierta a residentes no es privada. Los invitados verán una etiqueta 'Pista privada' para saber a qué atenerse.",
                  "Privé = à l'intérieur du domicile ou de la propriété de quelqu'un. Un terrain de complexe résidentiel ouvert aux résidents n'est pas privé. Les invités verront une étiquette « Terrain privé » pour savoir à quoi s'attendre.",
                )}
              </p>
            </div>
          </div>
        )}
      </section>
        <div className={rowDivider} />
        <MatchDateTimePicker value={when} onChange={setWhen} bare />
      </div>

      {/* Card 2 — The match */}
      <div className={cardCls}>
        <div className={rowCls}>
          <span className={rowLabel}>{tr("Players needed", "Jugadores que faltan", "Joueurs recherchés")}</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="−" disabled={playersNeeded <= 0} onClick={() => setPlayersNeeded(Math.max(0, playersNeeded - 1))} className={stepBtn}><Minus className="size-3.5" /></button>
            <span className="w-7 text-center text-sm font-semibold text-[var(--ink)] tabular-nums">{playersNeeded}</span>
            <button type="button" aria-label="+" disabled={playersNeeded >= maxNeeded} onClick={() => setPlayersNeeded(Math.min(maxNeeded, playersNeeded + 1))} className={stepBtn}><Plus className="size-3.5" /></button>
          </div>
        </div>
        <div className={rowDivider} />
        <div className="py-2.5">
          <div className="grid grid-cols-3 rounded-lg bg-[var(--ink)]/[0.06] p-0.5">
            {[
              { v: "mixed" as const, l: tr("Mixed", "Mixto", "Mixte") },
              { v: "men_only" as const, l: tr("Men", "Hombres", "Hommes") },
              { v: "women_only" as const, l: tr("Women", "Mujeres", "Femmes") },
            ].map((o) => (
              <button key={o.v} type="button" aria-pressed={genderRule === o.v} onClick={() => setGenderRule(o.v)}
                className={`h-8 rounded-md text-xs font-medium transition ${genderRule === o.v ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink)]/55"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className={rowDivider} />
        <div className={rowCls}>
          <span className={rowLabel}>{tr("Level", "Nivel", "Niveau")}</span>
          <div className="flex items-center gap-1 text-sm text-[var(--ink)]">
            <select aria-label={tr("Level min", "Nivel mín.", "Niveau min.")} value={levelMin} onChange={(e) => setLevelMin(e.target.value as any)} className={selectCls}>
              {PADEL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="text-[var(--ink)]/40">–</span>
            <select aria-label={tr("Level max", "Nivel máx.", "Niveau max.")} value={levelMax} onChange={(e) => setLevelMax(e.target.value as any)} className={selectCls}>
              {PADEL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Card 3 — The court */}
      <div className={cardCls}>
        <label className={`${rowCls} cursor-pointer`}>
          <span className={rowLabel}>{tr("Court booked", "Pista reservada", "Terrain réservé")}</span>
          <Switch checked={courtBooked} onCheckedChange={setCourtBooked} aria-label={tr("Court booked", "Pista reservada", "Terrain réservé")} />
        </label>
        <div className={rowDivider} />
        <input
          type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          value={playtomicLink}
          onChange={(e) => { setPlaytomicLink(e.target.value); if (playtomicError) setPlaytomicError(null); }}
          placeholder={tr("Playtomic link (optional)", "Enlace de Playtomic (opcional)", "Lien Playtomic (optionnel)")}
          className={bareInput}
        />
        {playtomicError && <p className="pb-2 text-[11px] text-red-500">{playtomicError}</p>}
        <div className={rowDivider} />
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={1}
          placeholder={tr("Note (optional)", "Nota (opcional)", "Note (optionnel)")}
          className={`${bareInput} resize-none`}
        />
      </div>
      {/* Sticky submit */}
      <div className="fixed left-0 right-0 px-5 z-30 pointer-events-none" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}>
        <div className="max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto pointer-events-auto">
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="w-full py-3 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs uppercase tracking-[0.2em] font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? tr("Saving…", "Guardando…", "Enregistrement…") : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
