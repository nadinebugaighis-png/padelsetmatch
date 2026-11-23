import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ExternalLink, Minus, Plus } from "lucide-react";
import { clubBookingLink, clubWhatsappBooking } from "@/lib/club-booking";
import { ClubWhatsAppBooking } from "@/components/ClubWhatsAppBooking";
import { Switch } from "@/components/ui/switch";
import { ClubPicker } from "@/components/ClubPicker";
import { Button } from "@/components/ui/button";
import { MatchDateTimePicker } from "@/components/MatchDateTimePicker";
import { PADEL_LEVELS } from "@/lib/types";
import type { ClubResult } from "@/lib/match-events.functions";
import { normalizePlaytomicLink } from "@/lib/affinity";
import { useI18n, useTr } from "@/lib/i18n";
import { CLASS_STUDENT_OPTIONS, NEW_CLASS_STUDENTS, DEFAULT_GENDER_RULE, DEFAULT_MATCH_DURATION, MATCH_DURATIONS, matchEndsAt, startFromFormValue, type GenderRule, type MatchDuration } from "@/lib/match-rules";

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
  gender_rule: GenderRule;
  extra_confirmed: number;
  note: string | null;
  playtomic_link: string | null;
  court_booked: boolean;
  is_private_court: boolean;
  free_court: boolean;
  is_class: boolean;
  class_students: number | null;
  class_fee: string | null;
  duration_minutes: MatchDuration;
  /** Players join this match on Playtomic through playtomic_link, never in the app. */
  joins_on_playtomic?: boolean;
  /** Only sent when editing a game that started with no hour. */
  time_tbd?: boolean;
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
  /** When editing, the back arrow returns to this match instead of the feed. */
  backEventId?: string;
  /** New matches: open on the club search or the free address field. */
  startMode?: "club" | "address" | "playtomic";
  /** New matches: suggested local date and time (YYYY-MM-DDTHH:MM), e.g. from "Who can play?". */
  startWhen?: string;
};

function toLocalDatetime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Shared field styles
const inputCls = "w-full bg-white border border-[var(--ink)]/22 rounded-lg px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/35 outline-none focus:border-[var(--ink)]/40 transition";
const cardCls = "rounded-2xl bg-white border border-[var(--ink)]/16 px-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]";
const rowCls = "flex items-center justify-between gap-3 min-h-11 py-1.5";
const rowLabel = "text-sm text-[var(--ink)]";
const rowDivider = "h-px bg-[var(--ink)]/[0.08]";
const stepBtn = "size-8 grid place-items-center rounded-full border border-[var(--ink)]/22 text-[var(--ink)] disabled:opacity-30";
const selectCls = "bg-transparent text-sm font-medium text-[var(--ink)] outline-none capitalize text-right";
const bareInput = "w-full bg-transparent py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/55 outline-none";
const helperCls = "text-[11px] text-[var(--ink)]/76 mt-1.5 leading-relaxed";

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
            : "border-[var(--ink)]/22 bg-white text-[var(--ink)]/78 hover:border-[var(--ink)]/35 hover:text-[var(--ink)]/88"
          : active
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
          : "border-[var(--ink)]/22 bg-white text-[var(--ink)]/80 hover:border-[var(--ink)]/35"
      }`}
    >
      {children}
    </Button>
  );
}

export function MatchForm({ initial, submitLabel, onSubmit, saving, title, backEventId, startMode, startWhen }: Props) {
  const { label: levelLabelFor } = useI18n();
  const levelName = (l: string) => { const v = levelLabelFor(l); return v.charAt(0).toUpperCase() + v.slice(1); };
  const tr = useTr();
  // People already in the lineup (0 when the host stepped out); a new match starts with the host.
  const appPlayersCount = Math.min(5, Math.max(0, initial?.app_players_count ?? 1));
  const maxNeeded = Math.max(0, 4 - appPlayersCount);
  const initialNeeded = Math.min(
    maxNeeded,
    Math.max(0, 4 - appPlayersCount - (initial?.extra_confirmed ?? 0)),
  );
  const isClub = !!initial?.club_place_id;
  const [locMode, setLocMode] = useState<"club" | "address">(
    initial ? (isClub ? "club" : "address") : startMode === "address" ? "address" : "club",
  );
  // Shared from Playtomic: players tap through and join there.
  const onPlaytomic = initial?.joins_on_playtomic ?? startMode === "playtomic";
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
  // City is no longer typed: edits keep the saved one, new matches get it from the host's area on the server.
  const customCity = !isClub ? initial?.city ?? "" : "";
  // A game with no hour yet opens with just its date; the hour stays empty until someone picks it.
  const allowNoTime = !!initial?.time_tbd;
  const [when, setWhen] = useState(
    initial?.when_local ?? (!initial && startWhen ? startWhen : allowNoTime ? toLocalDatetime(initial?.starts_at).slice(0, 10) : toLocalDatetime(initial?.starts_at)),
  );
  const hasTime = when.length > 10;
  const [genderRule, setGenderRule] = useState<GenderRule>(
    initial?.gender_rule ?? DEFAULT_GENDER_RULE,
  );
  const [freeCourt, setFreeCourt] = useState<boolean>(initial?.free_court ?? false);
  const [playersNeeded, setPlayersNeeded] = useState<number>(initialNeeded);
  const [duration, setDuration] = useState<MatchDuration>(initial?.duration_minutes === 60 ? 60 : DEFAULT_MATCH_DURATION);
  const [isClass, setIsClass] = useState<boolean>(!onPlaytomic && (initial?.is_class ?? false));
  const [classStudents, setClassStudents] = useState<number>(initial?.class_students ?? NEW_CLASS_STUDENTS);
  const classFee = initial?.class_fee ?? "";
  // Students already in (everyone except the coach) — the class can't be made smaller than that.
  const minStudents = Math.max(1, appPlayersCount - 1);
  const [levelMin, setLevelMin] = useState<(typeof PADEL_LEVELS)[number]>(initial?.level_min ?? "casual");
  const [levelMax, setLevelMax] = useState<(typeof PADEL_LEVELS)[number]>(initial?.level_max ?? "advanced");
  const [courtBooked, setCourtBooked] = useState<boolean>(initial?.court_booked ?? false);
  const [isPrivateCourt, setIsPrivateCourt] = useState<boolean>(initial?.is_private_court ?? false);
  const [playtomicLink, setPlaytomicLink] = useState(initial?.playtomic_link ?? "");
  const [playtomicError, setPlaytomicError] = useState<string | null>(null);
  const [note, setNote] = useState(initial?.note ?? "");
  // Optional settings stay folded away unless an edited match already uses them.
  const [showMore, setShowMore] = useState<boolean>(
    !!(initial?.note || (initial?.playtomic_link && !onPlaytomic) || initial?.free_court || initial?.is_private_court ||
      (initial?.gender_rule && initial.gender_rule !== DEFAULT_GENDER_RULE) ||
      (initial?.level_min && initial.level_min !== "casual") || (initial?.level_max && initial.level_max !== "advanced")),
  );

  const formBooking =
    locMode === "club" && club
      ? clubBookingLink({ club_name: club.name, city: club.city, club_place_id: club.place_id, playtomic_link: playtomicLink, free_court: freeCourt })
      : null;

  // Clubs that book by WhatsApp: the creator books directly instead of going to Playtomic.
  // Booking is via Playtomic only (WhatsApp booking paused).
  const formWaClub = null as ReturnType<typeof clubWhatsappBooking>;

  const locationReady = locMode === "club" ? !!club : customAddress.trim().length > 3;
  const whenReady = hasTime || (allowNoTime && when.length === 10);
  const linkReady = !onPlaytomic || playtomicLink.trim().length > 0;
  const canSave = locationReady && whenReady && linkReady && !saving;

  const handleSubmit = async () => {
    if (!locationReady || !whenReady || !linkReady) return;
    const { startsLocal, timeTbd } = startFromFormValue(when);
    const normalized = normalizePlaytomicLink(playtomicLink);
    if (normalized.error || (onPlaytomic && !normalized.url)) {
      setPlaytomicError(tr("Enter a valid Playtomic link (playtomic.io)", "Introduce un enlace válido de Playtomic (playtomic.io)", "Saisis un lien Playtomic valide (playtomic.io)"));
      return;
    }
    setPlaytomicError(null);

    const extraConfirmed = isClass ? 0 : Math.max(0, 4 - appPlayersCount - playersNeeded);
    const classValues = {
      is_class: isClass,
      class_students: isClass ? classStudents : null,
      class_fee: isClass ? classFee.trim() || null : null,
      duration_minutes: duration,
      ...(onPlaytomic ? { joins_on_playtomic: true } : {}),
      ...(allowNoTime ? { time_tbd: timeTbd } : {}),
    };
    const values: MatchFormValues =
      locMode === "club" && club
        ? {
            starts_at: new Date(startsLocal).toISOString(),
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
            court_booked: onPlaytomic || courtBooked,
            is_private_court: false,
            free_court: !onPlaytomic && freeCourt,
            ...classValues,
          }
        : {
            starts_at: new Date(startsLocal).toISOString(),
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
            court_booked: onPlaytomic || courtBooked,
            is_private_court: isPrivateCourt,
            free_court: !onPlaytomic && freeCourt,
            ...classValues,
          };
    await onSubmit(values);
  };

  return (
    <div className="max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto px-4 py-3 pb-32 space-y-3">
      {backEventId ? (
        <Link
          to="/app/events/$eventId"
          params={{ eventId: backEventId }}
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/82 hover:text-[var(--ink)] transition"
        >
          <ArrowLeft className="w-4 h-4" /> {tr("Back to match", "Volver al partido", "Retour au match")}
        </Link>
      ) : (
        <Link
          to="/app/events"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/82 hover:text-[var(--ink)] transition"
        >
          <ArrowLeft className="w-4 h-4" /> {tr("Find matches", "Buscar partidos", "Trouver des matches")}
        </Link>
      )}

      <header>
        <h1 className="font-serif text-2xl sm:text-3xl leading-tight text-[var(--ink)]">{title}</h1>
      </header>

      {onPlaytomic ? (
        <div className={`${cardCls} py-3`}>
          <label htmlFor="playtomic-match-link" className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/82">
            {tr("Your Playtomic match link", "Enlace de tu partido en Playtomic", "Lien de ton match Playtomic")}
          </label>
          <input
            id="playtomic-match-link"
            type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            value={playtomicLink}
            onChange={(e) => { setPlaytomicLink(e.target.value); if (playtomicError) setPlaytomicError(null); }}
            placeholder="https://app.playtomic.io/…"
            className={`${inputCls} mt-2`}
          />
          {playtomicError && <p className="pt-1.5 text-[11px] text-red-500">{playtomicError}</p>}
          <p className={helperCls}>
            {tr(
              "In Playtomic, open your match and tap Share. Players here tap through and join on Playtomic.",
              "En Playtomic, abre tu partido y pulsa Compartir. Los jugadores de aquí entran y se unen en Playtomic.",
              "Dans Playtomic, ouvre ton match et touche Partager. Les joueurs d'ici rejoignent sur Playtomic.",
            )}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-2 rounded-full bg-[var(--ink)]/[0.06] p-0.5">
        {[
          { v: false, l: tr("Match", "Partido", "Match") },
          { v: true, l: tr("Class", "Clase", "Cours") },
        ].map((o) => (
          <button key={String(o.v)} type="button" aria-pressed={isClass === o.v}
            onClick={() => { setIsClass(o.v); if (o.v && classStudents < minStudents) setClassStudents(Math.min(4, minStudents)); }}
            className={`h-9 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium transition ${isClass === o.v ? (o.v ? "bg-[var(--plum)] text-[var(--paper)]" : "bg-white text-[var(--ink)] shadow-sm") : "text-[var(--ink)]/78"}`}>
            {o.l}
          </button>
        ))}
      </div>
      )}

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
          <div>
            <input
              type="text"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder={tr("Court name or address", "Nombre de la pista o dirección", "Nom du terrain ou adresse")}
              className={inputCls}
            />
          </div>
        )}
      </section>
        <div className={rowDivider} />
        <MatchDateTimePicker value={when} onChange={setWhen} bare allowNoTime={allowNoTime} />
        <div className={rowDivider} />
        <div className={rowCls}>
          <span className={rowLabel}>
            {tr("Length", "Duración", "Durée")}
            {hasTime && (
              <span className="ml-1.5 text-[12px] text-[var(--ink)]/72 tabular-nums">
                {tr("ends", "termina", "fin")} {matchEndsAt(new Date(when), duration).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            )}
          </span>
          <div className="grid grid-cols-2 rounded-lg bg-[var(--ink)]/[0.06] p-0.5 w-44">
            {MATCH_DURATIONS.map((m) => (
              <button key={m} type="button" aria-pressed={duration === m} onClick={() => setDuration(m)}
                className={`h-8 rounded-md text-xs font-medium tabular-nums transition ${duration === m ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink)]/78"}`}>
                {m} min
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cardCls}>
        {isClass ? (
          <>
            <div className={rowCls}>
              <span className={rowLabel}>{tr("Students", "Alumnos", "Élèves")}</span>
              <div className="grid grid-cols-4 rounded-lg bg-[var(--ink)]/[0.06] p-0.5 w-44">
                {CLASS_STUDENT_OPTIONS.map((n) => (
                  <button key={n} type="button" aria-pressed={classStudents === n} disabled={n < minStudents} onClick={() => setClassStudents(n)}
                    className={`h-8 rounded-md text-xs font-medium tabular-nums transition disabled:opacity-30 ${classStudents === n ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink)]/78"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
        <div className={rowCls}>
          <span className={rowLabel}>{tr("Players needed", "Jugadores que faltan", "Joueurs recherchés")}</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="−" disabled={playersNeeded <= 0} onClick={() => setPlayersNeeded(Math.max(0, playersNeeded - 1))} className={stepBtn}><Minus className="size-3.5" /></button>
            <span className="w-7 text-center text-sm font-semibold text-[var(--ink)] tabular-nums">{playersNeeded}</span>
            <button type="button" aria-label="+" disabled={playersNeeded >= maxNeeded} onClick={() => setPlayersNeeded(Math.min(maxNeeded, playersNeeded + 1))} className={stepBtn}><Plus className="size-3.5" /></button>
          </div>
        </div>
        )}
        {!onPlaytomic && (<>
        <div className={rowDivider} />
        <div className={rowCls}>
          <span className={rowLabel}>{tr("Court booked", "Pista reservada", "Terrain réservé")}</span>
          <div className="flex items-center gap-3">
            {!courtBooked && formWaClub && club && when && (
              <ClubWhatsAppBooking
                clubName={club.name}
                startsAt={new Date(when)}
                placement="match_form"
                trigger={(open, label) => (
                  <button type="button" onClick={open} className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink)] underline underline-offset-2">
                    {label}
                  </button>
                )}
              />
            )}
            {!courtBooked && !formWaClub && formBooking && (
              <a
                href={formBooking.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  window.__lovableEvents?.track?.("project.book_court_clicked", {
                    club: formBooking.club,
                    source: formBooking.source,
                    placement: "match_form",
                    court_booked: false,
                  })
                }
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink)] underline underline-offset-2"
              >
                {tr("Book court", "Reservar pista", "Réserver")} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Switch className="data-[state=checked]:bg-[var(--ink)]" checked={courtBooked} onCheckedChange={setCourtBooked} aria-label={tr("Court booked", "Pista reservada", "Terrain réservé")} />
          </div>
        </div>
        </>)}
      </div>

      <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}
        className="w-full flex items-center justify-between px-1 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/82 hover:text-[var(--ink)] transition">
        <span>{tr("More preferences", "Más preferencias", "Plus de préférences")}</span>
        <ChevronDown className={`w-4 h-4 transition ${showMore ? "rotate-180" : ""}`} />
      </button>
      {showMore && (
      <div className={cardCls}>
        <div className="py-2.5">
          <div className="grid grid-cols-4 rounded-lg bg-[var(--ink)]/[0.06] p-0.5">
            {[
              { v: "open" as const, l: tr("Open", "Abierto", "Ouvert") },
              { v: "mixed" as const, l: tr("Mixed", "Mixto", "Mixte") },
              { v: "men_only" as const, l: tr("Men", "Hombres", "Hommes") },
              { v: "women_only" as const, l: tr("Women", "Mujeres", "Femmes") },
            ].map((o) => (
              <button key={o.v} type="button" aria-pressed={genderRule === o.v} onClick={() => setGenderRule(o.v)}
                className={`h-8 rounded-md text-xs font-medium transition ${genderRule === o.v ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink)]/78"}`}>
                {o.l}
              </button>
            ))}
          </div>
          <p className={helperCls}>
            {genderRule === "open"
              ? tr("Anyone can join. Restrict it only if you need to.", "Cualquiera puede unirse. Restríngelo solo si lo necesitas.", "Tout le monde peut rejoindre. Restreins seulement si besoin.")
              : genderRule === "mixed"
                ? tr("You're looking for a mixed game.", "Buscas un partido mixto.", "Tu cherches un match mixte.")
                : tr("Only players of this gender can join.", "Solo pueden unirse jugadores de este género.", "Seuls les joueurs de ce genre peuvent rejoindre.")}
          </p>
        </div>
        <div className={rowDivider} />
        <div className={rowCls}>
          <span className={rowLabel}>{tr("Level", "Nivel", "Niveau")}</span>
          <div className="flex items-center gap-1 text-sm text-[var(--ink)]">
            <select aria-label={tr("Level min", "Nivel mín.", "Niveau min.")} value={levelMin} onChange={(e) => setLevelMin(e.target.value as any)} className={selectCls}>
              {PADEL_LEVELS.map((l) => <option key={l} value={l}>{levelName(l)}</option>)}
            </select>
            <span className="text-[var(--ink)]/70">–</span>
            <select aria-label={tr("Level max", "Nivel máx.", "Niveau max.")} value={levelMax} onChange={(e) => setLevelMax(e.target.value as any)} className={selectCls}>
              {PADEL_LEVELS.map((l) => <option key={l} value={l}>{levelName(l)}</option>)}
            </select>
          </div>
        </div>
        {!onPlaytomic && (<>
        <div className={rowDivider} />
        <div className={rowCls}>
          <div className="min-w-0">
            <span className={rowLabel}>{tr("Free court", "Pista gratis", "Terrain gratuit")}</span>
            <p className="text-[11px] text-[var(--ink)]/76 leading-snug">
              {tr(
                "Players joining don't pay (e.g. urbanization court, or you're covering it). Your shared link will say it's free.",
                "Quien se una no paga (p. ej. pista de urbanización o la pagas tú). Tu enlace dirá que es gratis.",
                "Les joueurs ne paient pas (ex. terrain de résidence, ou tu l'offres). Ton lien indiquera que c'est gratuit.",
              )}
            </p>
          </div>
          <Switch className="data-[state=checked]:bg-[var(--ink)] shrink-0" checked={freeCourt} onCheckedChange={setFreeCourt} aria-label={tr("Free court", "Pista gratis", "Terrain gratuit")} />
        </div>
        </>)}
        {locMode === "address" && (
          <>
            <div className={rowDivider} />
            <div className={rowCls}>
              <span className={rowLabel}>{tr("Private home court", "Pista en casa privada", "Terrain privé à domicile")}</span>
              <Switch className="data-[state=checked]:bg-[var(--ink)] shrink-0" checked={isPrivateCourt} onCheckedChange={setIsPrivateCourt} aria-label={tr("Private home court", "Pista en casa privada", "Terrain privé à domicile")} />
            </div>
          </>
        )}
        {!onPlaytomic && (<>
        <div className={rowDivider} />
        <input
          type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          value={playtomicLink}
          onChange={(e) => { setPlaytomicLink(e.target.value); if (playtomicError) setPlaytomicError(null); }}
          placeholder={tr("Playtomic link (optional)", "Enlace de Playtomic (opcional)", "Lien Playtomic (optionnel)")}
          className={bareInput}
        />
        {playtomicError && <p className="pb-2 text-[11px] text-red-500">{playtomicError}</p>}
        {!playtomicLink.trim() && formBooking && (
          <a href={formBooking.url} target="_blank" rel="noopener noreferrer"
            onClick={() => window.__lovableEvents?.track?.("project.book_court_clicked", { club: formBooking.club, source: formBooking.source, placement: "match_form_more", court_booked: courtBooked })}
            className="inline-flex items-center gap-1 pb-2 text-[12px] font-medium text-[var(--ink)] underline underline-offset-2">
            {tr("Book on Playtomic", "Reservar en Playtomic", "Réserver sur Playtomic")} <ExternalLink className="w-3 h-3" />
          </a>
        )}
        </>)}
        <div className={rowDivider} />
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={1}
          placeholder={tr("Note (optional)", "Nota (opcional)", "Note (optionnel)")}
          className={`${bareInput} resize-none`}
        />
      </div>
      )}
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
