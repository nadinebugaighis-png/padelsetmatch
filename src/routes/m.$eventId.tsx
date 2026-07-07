import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Share2 } from "lucide-react";
import { claimMatchInviteByToken, getPublicMatch } from "@/lib/match-events.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";


const OG_IMAGE = "https://padelmatchapp.lovable.app/__l5e/assets-v1/3405870a-80f1-4e7d-a4f1-4277f9982a23/padel-mixed-share.jpg";

export const Route = createFileRoute("/m/$eventId")({
  validateSearch: (s: Record<string, unknown>) => ({
    i: typeof s.i === "string" ? s.i : undefined,
  }),
  head: () => {
    const title = "Join my padel match — PadelMatch";
    const description = "You're invited to a padel match on PadelMatch. Tap to grab an open spot.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
    };
  },
  component: PublicMatchPage,
});

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
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
      await navigator.share({ title: "PadelMatch", url: shareUrl });
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
    <main className="min-h-screen bg-[var(--court-deep)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 py-8">
        <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← PadelMatch</Link>

        {q.isLoading && <div className="mt-10 text-center text-[var(--cream)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</div>}

        {!q.isLoading && !match && (
          <div className="mt-10 text-center text-[var(--cream)]/70">
            <p className="text-lg">{tr("This match link isn't available.", "Este enlace de partido no está disponible.", "Ce lien de match n'est pas disponible.")}</p>
            <p className="text-sm text-[var(--cream)]/50 mt-2">{tr("It may have been cancelled or already played.", "Puede que se haya cancelado o ya se haya jugado.", "Il a peut-être été annulé ou déjà joué.")}</p>
            <Link to="/app/events" className="inline-block mt-6 text-[var(--cream)] underline">{tr("Browse open matches", "Ver partidos abiertos", "Explorer les matches ouverts")}</Link>

          </div>
        )}

        {match && (
          <>
            <div className="mt-4 rounded-2xl border border-[var(--cream)]/10 bg-black/30 p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]">{tr("You're invited", "Estás invitado", "Tu es invité·e")}</div>
              <h1 className="text-2xl text-[var(--cream)] font-medium leading-tight">{match.club_name}</h1>
              {match.club_address && <p className="text-xs text-[var(--cream)]/60">{match.club_address}</p>}

              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--cream)]/80 pt-2">
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtWhen(match.starts_at)}</span>
                <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {match.filled}/{totalSpots}</span>
                {match.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {match.city}</span>}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-[var(--cream)]/10 text-[var(--cream)]/70">{genderLabel}</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-[var(--cream)]/10 text-[var(--cream)]/70">
                  {tr("Level", "Nivel", "Niveau")} {match.level_min} – {match.level_max}
                </span>
              </div>

              {match.note && <p className="text-sm text-[var(--cream)]/80 whitespace-pre-wrap pt-2">{match.note}</p>}

              {match.host?.first_name && (
                <p className="text-xs text-[var(--cream)]/60 pt-2">{tr("Hosted by", "Organizado por", "Organisé par")} <span className="text-[var(--cream)]">{match.host.first_name}</span></p>
              )}

              {/* Players — tap an open spot to join */}
              <div className="pt-3">
                <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-2">{tr("Players", "Jugadores", "Joueurs")}</div>
                <div className="flex flex-wrap gap-2">
                  {match.participant_names.map((name, i) => (
                    <div key={`p-${i}`} className="flex items-center gap-2 bg-black/30 border border-[var(--cream)]/10 rounded-full px-3 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-[var(--court-deep)]" />
                      <span className="text-xs text-[var(--cream)]">{name}</span>
                    </div>
                  ))}
                  {Array.from({ length: openSpots }).map((_, i) => (
                    <button
                      key={`o-${i}`}
                      type="button"
                      onClick={onJoinClick}
                      className="flex items-center gap-2 border border-dashed border-[var(--cream)]/60 rounded-full px-3 py-1.5 hover:bg-[var(--cream)]/10"
                    >
                      <span className="text-xs text-[var(--cream)]">{tr("Join open spot", "Unirme al hueco libre", "Rejoindre la place")}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={onJoinClick}
                disabled={openSpots === 0}
                className="w-full py-3 rounded-full bg-[var(--cream)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold disabled:opacity-40"
              >
                {openSpots === 0 ? tr("Match is full", "Partido completo", "Match complet") : hasSession ? tr("Join this match", "Unirme al partido", "Rejoindre ce match") : tr("Sign up & join", "Regístrate y únete", "S'inscrire et rejoindre")}
              </button>
              <button onClick={() => setShareOpen(true)} className="w-full py-3 rounded-full border border-[var(--cream)]/50 text-[var(--cream)] text-sm uppercase tracking-widest inline-flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> {tr("Share", "Compartir", "Partager")}
              </button>
              <p className="text-[11px] text-[var(--cream)]/50 text-center pt-1">
                {tr("No long profile needed to join — just your name and padel level.", "No necesitas un perfil largo para unirte — solo tu nombre y nivel de pádel.", "Pas besoin d'un long profil pour rejoindre — juste ton prénom et ton niveau de padel.")}

              </p>
            </div>
          </>
        )}
        {shareOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--court-deep)]/80 px-4 pb-4 pt-10"
            onClick={() => setShareOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={tr("Share match", "Compartir partido", "Partager le match")}
              className="w-full max-w-md rounded-2xl border border-[var(--cream)]/15 bg-[var(--court-deep)] p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[var(--cream)]">{tr("Share match", "Compartir partido", "Partager le match")}</div>
                  <p className="mt-1 text-sm text-[var(--cream)]/70">{tr("Send this invitation link so players can join an open spot.", "Envía este enlace para que otros jugadores se unan a un hueco libre.", "Envoie ce lien d'invitation pour qu'ils puissent prendre une place ouverte.")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="rounded-full border border-[var(--cream)]/20 px-3 py-1 text-xs uppercase tracking-widest text-[var(--cream)]/70"
                >
                  {tr("Close", "Cerrar", "Fermer")}

                </button>
              </div>
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="mt-4 w-full rounded-full border border-[var(--cream)]/20 bg-black/30 px-4 py-2 text-sm text-[var(--cream)] outline-none"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[var(--cream)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[var(--court-deep)]"
                >
                  {tr("Open link", "Abrir enlace", "Ouvrir le lien")}
                </a>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="rounded-full border border-[var(--cream)]/50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--cream)]"
                >
                  {tr("Copy link", "Copiar enlace", "Copier le lien")}
                </button>
              </div>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  type="button"
                  onClick={nativeShare}
                  className="mt-2 w-full rounded-full border border-[var(--cream)]/20 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--cream)]/80"
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
