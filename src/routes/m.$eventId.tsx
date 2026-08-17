import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MapPin, Users, Share2, Calendar, Clock, Plus } from "lucide-react";
import { claimMatchInviteByToken, getPublicMatch } from "@/lib/match-events.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";


const OG_IMAGE = "https://padelmatchapp.lovable.app/__l5e/assets-v1/dbc7c0f5-88b1-4692-9b4e-c13975074410/padel-share-logo.jpg";

export const Route = createFileRoute("/m/$eventId")({
  validateSearch: (s: Record<string, unknown>) => ({
    i: typeof s.i === "string" ? s.i : undefined,
  }),
  head: () => {
    const title = "Join my padel match — PadelSetMatch";
    const description = "You're invited to a padel match on PadelSetMatch. Tap to grab an open spot.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
    };
  },
  component: PublicMatchPage,
});

function whenParts(iso: string, locale?: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString(locale, { weekday: "short" }).replace(".", ""),
    day: d.toLocaleDateString(locale, { day: "numeric" }),
    month: d.toLocaleDateString(locale, { month: "short" }).replace(".", ""),
    time: d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type TimeOfDay = "morning" | "afternoon" | "evening";
function timeOfDay(hour: number): TimeOfDay {
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

function shareOrigin() {
  if (typeof window === "undefined") return "https://padelmatchapp.lovable.app";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname.includes("preview--") || hostname.includes("id-preview--")) {
    return "https://padelmatchapp.lovable.app";
  }
  return origin;
}

function InviteTimeBlock({ match, tr }: { match: { starts_at: string }; tr: ReturnType<typeof useTr> }) {
  const { lang } = useI18n();
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : undefined;
  const start = new Date(match.starts_at);
  const hour = start.getHours();
  const tod = timeOfDay(hour);
  const toneBg =
    tod === "morning"
      ? "color-mix(in oklab, var(--grass) 26%, transparent)"
      : tod === "afternoon"
        ? "color-mix(in oklab, #E8B84B 30%, transparent)"
        : "color-mix(in oklab, var(--plum) 20%, transparent)";
  const parts = whenParts(match.starts_at, locale);
  const today = startOfDay(new Date());
  const isToday = start.getTime() >= today.getTime() && start.getTime() < today.getTime() + 24 * 60 * 60 * 1000;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = start.getTime() >= tomorrow.getTime() && start.getTime() < tomorrow.getTime() + 24 * 60 * 60 * 1000;
  const dateBadge = isToday ? tr("Today", "Hoy", "Auj.") : isTomorrow ? tr("Tomorrow", "Mañana", "Demain") : null;

  return (
    <div
      className="w-[86px] sm:w-[96px] shrink-0 flex flex-col items-center justify-center py-4 text-center"
      style={{ background: toneBg }}
    >
      <div className="text-serif text-[26px] sm:text-[28px] leading-none text-[var(--ink)]">{parts.time}</div>
      <div className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink)]/85 font-semibold leading-none">
        {dateBadge ?? parts.weekday}
      </div>
      {!dateBadge && (
        <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ink)]/65 font-semibold leading-none">
          {parts.day} <span className="capitalize">{parts.month}</span>
        </div>
      )}
    </div>
  );
}

function PublicMatchPage() {
  const { eventId } = Route.useParams();
  const { i: inviteToken } = Route.useSearch();
  const navigate = useNavigate();
  const tr = useTr();
  const { lang } = useI18n();
  const getPublic = useServerFn(getPublicMatch);
  const claimInvite = useServerFn(claimMatchInviteByToken);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  // Auto-claim invite if signed in and token present, then redirect to private event page
  useEffect(() => {
    if (!inviteToken || hasSession !== true) return;
    (async () => {
      try {
        await claimInvite({ data: { token: inviteToken } });
        navigate({ to: "/app/events/$eventId", params: { eventId } });
      } catch { /* ignore — fall through to public view */ }
    })();
  }, [inviteToken, hasSession, claimInvite, navigate, eventId]);

  const q = useQuery({
    queryKey: ["public-match", eventId],
    queryFn: () => getPublic({ data: { id: eventId } }),
  });

  const match = q.data?.match;
  const genderLabel = !match ? "" : match.gender_rule === "mixed" ? tr("Mixed", "Mixto", "Mixte") : match.gender_rule === "men_only" ? tr("Men only", "Solo hombres", "Hommes uniquement") : tr("Women only", "Solo mujeres", "Femmes uniquement");
  const totalSpots = 4;
  const openSpots = match ? Math.max(0, totalSpots - (match.filled ?? 0)) : 0;
  const shareUrl = `${shareOrigin()}/m/${eventId}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(tr("Link copied", "Enlace copiado", "Lien copié"));
    } catch {
      toast.error(tr("Could not copy the link", "No se pudo copiar el enlace", "Impossible de copier le lien"));
    }
  };


  const nativeShare = async () => {
    try {
      await navigator.share({ title: "PadelSetMatch", url: shareUrl });
    } catch (err: any) {
      if (String(err?.name ?? "") !== "AbortError") await copyShareLink();
    }
  };

  const onJoinClick = () => {
    const search: Record<string, string> = { join: eventId };
    if (inviteToken) search.i = inviteToken;
    if (hasSession) navigate({ to: "/app/join-setup", search: search as never });
    else navigate({ to: "/auth", search: search as never });
  };

  return (
    <main className="programme-page min-h-screen">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 py-8">
        <Link to="/" className="text-xs uppercase tracking-widest text-[var(--ink)]/60">← PadelSetMatch</Link>

        {q.isLoading && <div className="mt-10 text-center text-[var(--ink)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</div>}

        {!q.isLoading && !match && (
          <div className="mt-10 text-center text-[var(--ink)]/70">
            <p className="text-lg">{tr("This match link isn't available.", "Este enlace de partido no está disponible.", "Ce lien de match n'est pas disponible.")}</p>
            <p className="text-sm text-[var(--ink)]/50 mt-2">{tr("It may have been cancelled or already played.", "Puede que se haya cancelado o ya se haya jugado.", "Il a peut-être été annulé ou déjà joué.")}</p>
            <Link to="/app/events" className="inline-block mt-6 text-[var(--ink)] underline">{tr("Browse open matches", "Ver partidos abiertos", "Explorer les matches ouverts")}</Link>

          </div>
        )}

        {match && (
          <>
            {/* Invitation header */}
            <div className="mt-5 mb-3 text-center">
              <div className="inline-flex items-center gap-2 text-[var(--ink)]/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
                <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">
                  {tr("Invitation to join a match", "Invitación para unirte a un partido", "Invitation à rejoindre un match")}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
              </div>
            </div>

            {/* Match card — same style as Play page */}
            <div className="rounded-2xl bg-white overflow-hidden shadow-[0_1px_0_rgba(15,62,46,0.04),0_6px_18px_-12px_rgba(15,62,46,0.16)] border border-[var(--ink)]/10">
              <div className="flex">
                {/* Date / time block */}
                <InviteTimeBlock match={match} tr={tr} />

                {/* Body */}
                <div className="flex-1 min-w-0 p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h1 className="text-[15px] font-semibold text-[var(--ink)] leading-tight">
                        {match.club_name || tr("Location TBD", "Ubicación por definir", "Lieu à définir")}
                      </h1>
                      <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--ink)]/60 min-w-0">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{match.club_address || match.city || "—"}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-[0.16em] rounded-full px-2 py-1 font-semibold whitespace-nowrap ${
                        openSpots === 0
                          ? "bg-[var(--ink)]/8 text-[var(--ink)]/55"
                          : "bg-[var(--plum)]/12 text-[var(--plum)]"
                      }`}
                    >
                      {openSpots === 0
                        ? tr("Full", "Completo", "Complet")
                        : tr(`${openSpots} spot${openSpots > 1 ? "s" : ""} left`, `${openSpots} ${openSpots > 1 ? "huecos" : "hueco"} libre${openSpots > 1 ? "s" : ""}`, `${openSpots} place${openSpots > 1 ? "s" : ""} libre${openSpots > 1 ? "s" : ""}`)}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[var(--ink)]/60">
                    <span className="font-semibold text-[var(--ink)]/80">{match.level_min}{match.level_min !== match.level_max ? `–${match.level_max}` : ""}</span>
                    <span className="text-[var(--ink)]/25">·</span>
                    <span>{genderLabel}</span>
                    <span className="text-[var(--ink)]/25">·</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> 90 min</span>
                    {match.court_booked && (
                      <>
                        <span className="text-[var(--ink)]/25">·</span>
                        <span className="font-semibold text-[var(--court-deep)]">{tr("Court booked", "Pista reservada", "Court réservé")}</span>
                      </>
                    )}
                    {match.host?.first_name && (
                      <>
                        <span className="text-[var(--ink)]/25">·</span>
                        <span className="font-semibold text-[var(--ink)]/80">{tr("Host", "Anfitrión", "Hôte")}: {match.host.first_name}</span>
                      </>
                    )}
                  </div>

                  {match.note && (
                    <p className="mt-2 text-xs text-[var(--ink)]/75 whitespace-pre-wrap border-l-2 border-[var(--gold)] pl-2.5 italic">{match.note}</p>
                  )}

                  {/* Players + action */}
                  <div className="mt-3 flex items-center gap-2">
                    {match.participant_names.map((name, i) => (
                      <div
                        key={`p-${i}`}
                        title={name}
                        className="w-9 h-9 shrink-0 rounded-full overflow-hidden border-2 border-white shadow bg-[var(--ink)]/10 grid place-items-center"
                      >
                        <span className="text-[12px] font-bold text-[var(--ink)]/70">{name.trim().charAt(0).toUpperCase()}</span>
                      </div>
                    ))}
                    {Array.from({ length: openSpots }).map((_, i) => (
                      <button
                        key={`o-${i}`}
                        type="button"
                        onClick={onJoinClick}
                        disabled={openSpots === 0}
                        aria-label={tr("Open slot", "Plaza libre", "Place libre")}
                        className="w-9 h-9 shrink-0 rounded-full border-2 border-dashed grid place-items-center transition border-[var(--plum)]/45 text-[var(--plum)] hover:bg-[var(--plum)]/8"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={onJoinClick}
                      disabled={openSpots === 0}
                      className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.14em] px-3.5 py-2 disabled:opacity-50"
                    >
                      {openSpots === 0 ? tr("Full", "Completo", "Complet") : tr("Join", "Unirme", "Rejoindre")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue map link */}
            {match.club_address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.club_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-[var(--ink)]/10 bg-white px-4 py-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
              >
                <MapPin className="w-3.5 h-3.5" />
                {tr("Open in maps", "Abrir en mapas", "Ouvrir dans Maps")}
              </a>
            )}

            <div className="mt-5 space-y-2">
              <button
                onClick={onJoinClick}
                disabled={openSpots === 0}
                className="w-full py-3.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm uppercase tracking-widest font-semibold disabled:opacity-40 shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--ink)_55%,transparent)]"
              >
                {openSpots === 0 ? tr("Match is full", "Partido completo", "Match complet") : hasSession ? tr("Join this match", "Unirme al partido", "Rejoindre ce match") : tr("Sign up & join", "Regístrate y únete", "S'inscrire et rejoindre")}
              </button>
              {!hasSession && openSpots > 0 && (
                <Link
                  to="/g/$eventId"
                  params={{ eventId }}
                  className="block w-full py-3 rounded-full border-2 border-[var(--ink)] text-[var(--ink)] text-sm uppercase tracking-widest font-semibold text-center"
                >
                  {tr("Join as guest — no account", "Unirme como invitado — sin cuenta", "Rejoindre en invité — sans compte")}
                </Link>
              )}
              <button onClick={() => setShareOpen(true)} className="w-full py-3 rounded-full border border-[var(--ink)]/25 text-[var(--ink)] text-sm uppercase tracking-widest inline-flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> {tr("Share", "Compartir", "Partager")}
              </button>
              <p className="text-[11px] text-[var(--ink)]/50 text-center pt-1">
                {tr("No long profile needed to join — just your name and padel level.", "No necesitas un perfil largo para unirte — solo tu nombre y nivel de pádel.", "Pas besoin d'un long profil pour rejoindre — juste ton prénom et ton niveau de padel.")}
              </p>
            </div>
          </>
        )}
        {shareOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 px-4 pb-4 pt-10"
            onClick={() => setShareOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={tr("Share match", "Compartir partido", "Partager le match")}
              className="w-full max-w-md rounded-2xl programme-card p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[var(--ink)]">{tr("Share match", "Compartir partido", "Partager le match")}</div>
                  <p className="mt-1 text-sm text-[var(--ink)]/70">{tr("Send this invitation link so players can join an open spot.", "Envía este enlace para que otros jugadores se unan a un hueco libre.", "Envoie ce lien d'invitation pour qu'ils puissent prendre une place ouverte.")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="rounded-full border border-[var(--ink)]/20 px-3 py-1 text-xs uppercase tracking-widest text-[var(--ink)]/70"
                >
                  {tr("Close", "Cerrar", "Fermer")}
                </button>
              </div>
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="mt-4 w-full rounded-full border border-[var(--ink)]/20 bg-[var(--paper-2)] px-4 py-2 text-sm text-[var(--ink)] outline-none"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[var(--ink)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[var(--paper)]"
                >
                  {tr("Open link", "Abrir enlace", "Ouvrir le lien")}
                </a>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="rounded-full border border-[var(--ink)]/50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink)]"
                >
                  {tr("Copy link", "Copiar enlace", "Copier le lien")}
                </button>
              </div>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  type="button"
                  onClick={nativeShare}
                  className="mt-2 w-full rounded-full border border-[var(--ink)]/20 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink)]/80"
                >
                  {tr("Share with phone", "Compartir con el móvil", "Partager avec le téléphone")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
