import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Calendar, MapPin, Users, Send, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";
import { PADEL_LEVELS } from "@/lib/types";
import { guestJoinMatch, guestGetRoom, guestSendMessage, guestLeaveMatch } from "@/lib/guest.functions";

export const Route = createFileRoute("/g/$eventId")({
  head: () => ({ meta: [{ title: "Join match as guest — PadelMatch" }] }),
  component: GuestMatchRoom,
});

function tokenKey(eventId: string) {
  return `padelmatch:guest:${eventId}`;
}

function loadToken(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(tokenKey(eventId)); } catch { return null; }
}
function saveToken(eventId: string, token: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(tokenKey(eventId), token); } catch { /* ignore */ }
}
function clearToken(eventId: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(tokenKey(eventId)); } catch { /* ignore */ }
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function GuestMatchRoom() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const tr = useTr();
  const join = useServerFn(guestJoinMatch);
  const getRoom = useServerFn(guestGetRoom);
  const send = useServerFn(guestSendMessage);
  const leave = useServerFn(guestLeaveMatch);

  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState<(typeof PADEL_LEVELS)[number] | "">("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const chatEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setToken(loadToken(eventId));
    setHydrated(true);
  }, [eventId]);

  const roomQ = useQuery({
    queryKey: ["guest-room", eventId, token],
    queryFn: () => getRoom({ data: { eventId, token: token! } }),
    enabled: !!token,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (roomQ.data && roomQ.data.ok === false) {
      clearToken(eventId);
      setToken(null);
      toast.error(tr("Your guest session expired. Please rejoin.", "Tu sesión de invitado ha expirado. Vuelve a unirte.", "Ta session invité a expiré. Rejoins à nouveau."));
    }
  }, [roomQ.data, eventId, tr]);

  useEffect(() => {
    if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [roomQ.data?.messages?.length]);

  const submitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !level || !phone.trim()) {
      toast.error(tr("Fill in your name, level and phone", "Completa nombre, nivel y teléfono", "Renseigne prénom, niveau et téléphone"));
      return;
    }
    setBusy(true);
    try {
      const res = await join({ data: { eventId, displayName: firstName.trim(), level, phone: phone.trim() } });
      saveToken(eventId, res.token);
      setToken(res.token);
      toast.success(tr("You're in! Say hi in the match chat.", "¡Estás dentro! Saluda en el chat del partido.", "Tu es inscrit·e ! Dis bonjour dans le chat."));
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      if (m.startsWith("INVITE_LOCK:")) {
        const opensAt = new Date(m.slice("INVITE_LOCK:".length)).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
        toast.error(tr(`Reserved for invited players until ${opensAt}.`, `Reservado para invitados hasta ${opensAt}.`, `Réservé aux invités jusqu'à ${opensAt}.`));
      } else {
        toast.error(m || tr("Could not join", "No pudimos unirte", "Impossible de rejoindre"));
      }
    } finally {
      setBusy(false);
    }
  };

  const sendMsg = async () => {
    const body = msg.trim();
    if (!body || !token) return;
    setMsg("");
    try {
      await send({ data: { eventId, token, body } });
      roomQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not send", "No se pudo enviar", "Envoi impossible"));
      setMsg(body);
    }
  };

  const leaveMatch = async () => {
    if (!token) return;
    if (!confirm(tr("Leave this match?", "¿Salir del partido?", "Quitter ce match ?"))) return;
    try {
      await leave({ data: { eventId, token } });
    } catch { /* ignore */ }
    clearToken(eventId);
    setToken(null);
    navigate({ to: "/play" });
  };

  if (!hydrated) return <main className="min-h-screen bg-[var(--court-deep)]" />;

  // ---- JOIN FORM ----
  if (!token) {
    return (
      <main className="min-h-screen bg-[var(--court-deep)]">
        <div className="max-w-md sm:max-w-2xl mx-auto px-5 py-8">
          <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← PadelMatch</Link>
          <div className="mt-6 text-[10px] uppercase tracking-widest text-[var(--cream)]">{tr("Join as guest", "Unirse como invitado", "Rejoindre en invité")}</div>
          <h1 className="text-3xl text-[var(--cream)] font-medium mt-1 leading-tight">
            {tr("No account needed — just three quick things.", "Sin cuenta — solo tres cosas rápidas.", "Sans compte — juste trois infos rapides.")}
          </h1>
          <p className="text-sm text-[var(--cream)]/70 mt-2">
            {tr("The host will see your name and level so they know who's showing up.", "El anfitrión verá tu nombre y nivel para saber quién viene.", "L'hôte verra ton prénom et ton niveau pour savoir qui vient.")}
          </p>

          <form onSubmit={submitJoin} className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Your name", "Tu nombre", "Ton prénom")}</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={40} required
                className="w-full mt-1 bg-black/30 border border-[var(--cream)]/20 rounded-xl px-4 py-3 text-[var(--cream)] placeholder:text-[var(--cream)]/40"
                placeholder="Alex" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Padel level", "Nivel de pádel", "Niveau de padel")}</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PADEL_LEVELS.map((lvl) => (
                  <button key={lvl} type="button" onClick={() => setLevel(lvl)}
                    className={`px-3 py-2 rounded-full border text-xs uppercase tracking-widest ${level === lvl ? "bg-[var(--ball)] text-[var(--court-deep)] border-[var(--ball)]" : "border-[var(--cream)]/20 text-[var(--cream)]/80"}`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Phone / WhatsApp", "Teléfono / WhatsApp", "Téléphone / WhatsApp")}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} inputMode="tel" required
                className="w-full mt-1 bg-black/30 border border-[var(--cream)]/20 rounded-xl px-4 py-3 text-[var(--cream)] placeholder:text-[var(--cream)]/40"
                placeholder="+34 600 000 000" />
              <p className="text-[10px] text-[var(--cream)]/50 mt-1">{tr("Only visible to the host — for last-minute changes.", "Solo lo ve el anfitrión — para cambios de última hora.", "Visible uniquement par l'hôte — pour les changements de dernière minute.")}</p>
            </div>
            <button type="submit" disabled={busy}
              className="w-full py-3 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold disabled:opacity-50">
              {busy ? tr("Joining…", "Uniéndote…", "Inscription…") : tr("Join match", "Unirme al partido", "Rejoindre le match")}
            </button>
            <div className="text-center">
              <Link to="/auth" search={{ join: eventId } as never} className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60 underline">
                {tr("Have an account? Sign in instead", "¿Tienes cuenta? Inicia sesión", "Tu as un compte ? Connecte-toi")}
              </Link>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // ---- ROOM ----
  if (roomQ.isLoading || !roomQ.data) {
    return <main className="min-h-screen bg-[var(--court-deep)] text-[var(--cream)]/60 flex items-center justify-center">{tr("Loading…", "Cargando…", "Chargement…")}</main>;
  }
  const match = roomQ.data.match;
  if (!match) {
    return (
      <main className="min-h-screen bg-[var(--court-deep)] text-[var(--cream)] p-8 text-center">
        <p>{tr("This match is no longer available.", "Este partido ya no está disponible.", "Ce match n'est plus disponible.")}</p>
        <Link to="/play" className="inline-block mt-4 underline text-sm">{tr("Browse other matches", "Ver otros partidos", "Voir d'autres matches")}</Link>
      </main>
    );
  }
  const openSpots = Math.max(0, 4 - (match.filled ?? 0));
  const genderLabel = match.gender_rule === "mixed" ? tr("Mixed", "Mixto", "Mixte") : match.gender_rule === "men_only" ? tr("Men only", "Solo hombres", "Hommes") : tr("Women only", "Solo mujeres", "Femmes");
  const messages = roomQ.data.messages ?? [];

  return (
    <main className="min-h-screen bg-[var(--court-deep)]">
      <div className="max-w-md sm:max-w-2xl mx-auto px-5 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/play" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← {tr("All matches", "Todos los partidos", "Tous les matches")}</Link>
          <button onClick={leaveMatch} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--cream)]/60 hover:text-[var(--cream)]">
            <LogOut className="w-3 h-3" /> {tr("Leave", "Salir", "Quitter")}
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--cream)]/10 bg-black/30 p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--grass)]">{tr("You're in", "Estás dentro", "Tu es inscrit·e")}</div>
          <h1 className="text-2xl text-[var(--cream)] font-medium leading-tight">{match.club_name}</h1>
          {match.club_address && <p className="text-xs text-[var(--cream)]/60">{match.club_address}</p>}

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--cream)]/80 pt-2">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtWhen(match.starts_at)}</span>
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {match.filled}/4 {openSpots > 0 && `· ${openSpots} ${tr("open", "libres", "libres")}`}</span>
            {match.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {match.city}</span>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-[var(--cream)]/10 text-[var(--cream)]/70">{genderLabel}</span>
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-[var(--cream)]/10 text-[var(--cream)]/70">{tr("Level", "Nivel", "Niveau")} {match.level_min}–{match.level_max}</span>
          </div>
          {match.note && <p className="text-sm text-[var(--cream)]/80 whitespace-pre-wrap pt-2">{match.note}</p>}
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-2">{tr("Players", "Jugadores", "Joueurs")}</div>
            <div className="flex flex-wrap gap-2">
              {match.participant_names.map((name, i) => (
                <div key={i} className="bg-black/30 border border-[var(--cream)]/10 rounded-full px-3 py-1.5 text-xs text-[var(--cream)]">{name}</div>
              ))}
              {Array.from({ length: openSpots }).map((_, i) => (
                <div key={`o-${i}`} className="border border-dashed border-[var(--cream)]/30 rounded-full px-3 py-1.5 text-xs text-[var(--cream)]/50">{tr("Open", "Libre", "Libre")}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--cream)]/10 bg-black/30 p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-3">{tr("Match chat", "Chat del partido", "Chat du match")}</div>
          <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
            {messages.length === 0 && (
              <p className="text-xs text-[var(--cream)]/40 py-4 text-center">{tr("No messages yet. Say hi 👋", "Aún no hay mensajes. Saluda 👋", "Pas de messages. Dis bonjour 👋")}</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.is_me ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.is_me ? "bg-[var(--ball)] text-[var(--court-deep)]" : "bg-[var(--cream)]/10 text-[var(--cream)]"}`}>
                  {!m.is_me && <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{m.sender_name}{m.is_guest ? " · guest" : ""}</div>}
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <div className="mt-3 flex gap-2">
            <input value={msg} onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              maxLength={2000}
              placeholder={tr("Write a message…", "Escribe un mensaje…", "Écris un message…")}
              className="flex-1 bg-black/30 border border-[var(--cream)]/20 rounded-full px-4 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream)]/40" />
            <button onClick={sendMsg} disabled={!msg.trim()}
              className="w-11 h-11 rounded-full bg-[var(--ball)] text-[var(--court-deep)] flex items-center justify-center disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link to="/auth" className="text-[11px] uppercase tracking-widest text-[var(--cream)]/50 underline">
            {tr("Create a full account to find more players", "Crea una cuenta para encontrar más jugadores", "Crée un compte pour trouver plus de joueurs")}
          </Link>
        </div>
      </div>
    </main>
  );
}
