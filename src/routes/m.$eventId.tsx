import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MapPin, Users, Share2, Calendar, Clock } from "lucide-react";
import { claimMatchInviteByToken, getPublicMatch } from "@/lib/match-events.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";


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

function whenParts(iso: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }).replace(".", ""),
    day: d.toLocaleDateString(undefined, { day: "numeric" }),
    month: d.toLocaleDateString(undefined, { month: "short" }).replace(".", ""),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}


function shareOrigin() {
  if (typeof window === "undefined") return "https://padelmatchapp.lovable.app";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname.includes("preview--") || hostname.includes("id-preview--")) {
    return "https://padelmatchapp.lovable.app";
  }
  return origin;
}

function PublicMatchPage() {
  const { eventId } = Route.useParams();
  const { i: inviteToken } = Route.useSearch();
  const navigate = useNavigate();
  const tr = useTr();
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
            <div className="mt-4 programme-card rounded-3xl overflow-hidden shadow-[0_18px_50px_-18px_color-mix(in_oklab,var(--ink)_18%,transparent)]">
              {/* Invitation header */}
              <div className="programme-header px-5 pt-6 pb-5 text-center">
                <div className="inline-flex items-center gap-2 text-[var(--paper)]/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
                  <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">
                    {tr("Invitation to join a match", "Invitación para unirte a un partido", "Invitation à rejoindre un match")}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
                </div>
                <div className="mt-3 text-serif text-3xl leading-none text-[var(--paper)]">
                  {tr("Padel match", "Partido de pádel", "Match de padel")}
                </div>
                <span className={`inline-block mt-4 text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 rounded-full font-semibold ${openSpots > 0 ? "bg-[var(--paper)] text-[var(--ink)]" : "bg-[var(--paper)]/20 text-[var(--paper)]/80"}`}>
                  {openSpots > 0
                    ? tr(`${openSpots} spot${openSpots > 1 ? "s" : ""} left`, `${openSpots} ${openSpots > 1 ? "huecos" : "hueco"} libre${openSpots > 1 ? "s" : ""}`, `${openSpots} place${openSpots > 1 ? "s" : ""} libre${openSpots > 1 ? "s" : ""}`)
                    : tr("Full", "Completo", "Complet")}
                </span>
              </div>

              <div className="px-5 py-6 space-y-5">
                {/* Date / time / location block */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 w-9 h-9 rounded-full bg-[var(--paper-2)] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-[var(--ink)]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 font-semibold">{tr("Date", "Fecha", "Date")}</p>
                      <p className="text-lg font-semibold text-[var(--ink)] leading-tight">
                        {whenParts(match.starts_at).weekday} {whenParts(match.starts_at).day} {whenParts(match.starts_at).month}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 w-9 h-9 rounded-full bg-[var(--paper-2)] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-[var(--ink)]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 font-semibold">{tr("Time", "Hora", "Heure")}</p>
                      <p className="text-2xl text-display text-[var(--ink)] leading-none">
                        {whenParts(match.starts_at).time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 w-9 h-9 rounded-full bg-[var(--paper-2)] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[var(--ink)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 font-semibold">{tr("Location", "Lugar", "Lieu")}</p>
                      <h1 className="text-xl font-semibold text-[var(--ink)] leading-tight">{match.club_name}</h1>
                      <p className="text-sm text-[var(--ink)]/70 mt-0.5">{match.club_address || match.city}</p>
                      {match.club_address && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.club_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] underline decoration-[var(--gold)] underline-offset-4"
                        >
                          <MapPin className="w-3 h-3" />
                          {tr("Open in maps", "Abrir en mapas", "Ouvrir dans Maps")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-[var(--paper-2)] text-[var(--ink)]/80 font-semibold">{genderLabel}</span>
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-[var(--paper-2)] text-[var(--ink)]/80 font-semibold">
                    {tr("Level", "Nivel", "Niveau")} {match.level_min} – {match.level_max}
                  </span>
                  {match.host?.first_name && (
                    <span className="text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-[var(--paper-2)] text-[var(--ink)]/80 font-semibold">
                      {tr("Host", "Anfitrión", "Hôte")}: {match.host.first_name}
                    </span>
                  )}
                </div>

                {match.note && (
                  <p className="text-sm text-[var(--ink)]/75 whitespace-pre-wrap border-l-2 border-[var(--gold)] pl-3 italic">{match.note}</p>
                )}

                {/* Players */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]/50 font-semibold">{tr("Players", "Jugadores", "Joueurs")}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink)]">
                      <Users className="w-3.5 h-3.5" /> {match.filled}/{totalSpots}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {match.participant_names.map((name, i) => (
                      <div key={`p-${i}`} className="flex flex-col items-center gap-1.5">
                        <div className="w-14 h-14 rounded-full bg-[color-mix(in_oklab,var(--ink)_10%,transparent)] border border-[color-mix(in_oklab,var(--ink)_12%,transparent)] flex items-center justify-center text-display text-xl text-[var(--ink)]">
                          {name.trim().charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] text-[var(--ink)]/80 truncate max-w-full">{name}</span>
                      </div>
                    ))}
                    {Array.from({ length: openSpots }).map((_, i) => (
                      <button
                        key={`o-${i}`}
                        type="button"
                        onClick={onJoinClick}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-[var(--ink)]/30 flex items-center justify-center text-2xl text-[var(--ink)]/40 group-hover:border-[var(--gold)] group-hover:text-[var(--ink)] group-hover:bg-[var(--paper-2)] transition">
                          +
                        </div>
                        <span className="text-[11px] text-[var(--ink)]/50">{tr("Free", "Libre", "Libre")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>


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
