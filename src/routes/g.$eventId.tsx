import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { MapPin, Send, LogOut, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";
import { PADEL_LEVELS } from "@/lib/types";
import { guestJoinMatch, guestGetRoom, guestSendMessage, guestLeaveMatch, guestLeaveByPhone, guestRecoverAccess } from "@/lib/guest.functions";
import { getPublicMatch } from "@/lib/match-events.functions";
import { MatchProgrammeCard } from "@/components/MatchProgrammeCard";

export const Route = createFileRoute("/g/$eventId")({
  head: () => ({ meta: [{ title: "Join match as guest — PadelSetMatch" }] }),
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
function tokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const t = new URLSearchParams(window.location.search).get("t");
  return t && /^[0-9a-f-]{36}$/i.test(t) ? t : null;
}
function putTokenInUrl(token: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("t", token);
  window.history.replaceState(null, "", url.toString());
}
function stripTokenFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("t");
  window.history.replaceState(null, "", url.toString());
}

function GuestMatchRoom() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const tr = useTr();
  const join = useServerFn(guestJoinMatch);
  const getRoom = useServerFn(guestGetRoom);
  const send = useServerFn(guestSendMessage);
  const leave = useServerFn(guestLeaveMatch);
  const recover = useServerFn(guestRecoverAccess);

  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverBusy, setRecoverBusy] = useState(false);


  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState<(typeof PADEL_LEVELS)[number] | "">("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const chatEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fromUrl = tokenFromUrl();
    if (fromUrl) {
      saveToken(eventId, fromUrl);
      setToken(fromUrl);
    } else {
      const saved = loadToken(eventId);
      setToken(saved);
      if (saved) putTokenInUrl(saved);
    }
    setHydrated(true);
  }, [eventId]);

  const roomQ = useQuery({
    queryKey: ["guest-room", eventId, token],
    queryFn: () => getRoom({ data: { eventId, token: token! } }),
    enabled: !!token,
    refetchInterval: 5000,
  });

  const getPublic = useServerFn(getPublicMatch);
  const publicQ = useQuery({
    queryKey: ["public-match", eventId],
    queryFn: () => getPublic({ data: { id: eventId } }),
    enabled: !token,
  });



  useEffect(() => {
    if (roomQ.data && roomQ.data.ok === false) {
      clearToken(eventId);
      stripTokenFromUrl();
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
      putTokenInUrl(res.token);
      setToken(res.token);
      toast.success(tr("You're in ✅", "¡Estás dentro ✅", "Tu es inscrit·e ✅"));
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      if (m.startsWith("INVITE_LOCK:")) {
        const opensAt = new Date(m.slice("INVITE_LOCK:".length)).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
        toast.error(tr(`Reserved for invited players until ${opensAt}.`, `Reservado para invitados hasta ${opensAt}.`, `Réservé aux invités jusqu'à ${opensAt}.`));
      } else if (m.startsWith("LEVEL_MISMATCH:")) {
        const [, min, max, guest] = m.split(":");
        const range = min === max ? min : `${min} – ${max}`;
        toast.error(
          tr(
            `This match is listed as ${range}. Your level (${guest}) doesn't fit.`,
            `Este partido es de nivel ${range}. Tu nivel (${guest}) no encaja.`,
            `Ce match est listé en ${range}. Ton niveau (${guest}) ne correspond pas.`
          )
        );
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
    stripTokenFromUrl();
    setToken(null);
    navigate({ to: "/play" });
  };

  if (!hydrated) return <main className="programme-page min-h-screen" />;

  // ---- JOIN FORM ----
  if (!token) {
    const preview = publicQ.data?.match;
    return (
      <main className="programme-page min-h-screen">
        <div className="max-w-md sm:max-w-2xl mx-auto px-5 py-8">
          <Link to="/" className="text-xs uppercase tracking-widest text-[var(--ink)]/60">← PadelSetMatch</Link>

          <div className="mt-5 mb-3 text-center">
            <div className="inline-flex items-center gap-2 text-[var(--ink)]/70">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">
                {tr("Invitation to join a match", "Invitación para unirte a un partido", "Invitation à rejoindre un match")}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
            </div>
          </div>

          {preview && <MatchProgrammeCard match={preview as never} />}

          {preview?.club_address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(preview.club_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-[var(--ink)]/10 bg-white px-4 py-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              {tr("Open in maps", "Abrir en mapas", "Ouvrir dans Maps")}
            </a>
          )}

          <div className="mt-7 text-[10px] uppercase tracking-widest text-[var(--ink)]">{tr("Join as guest", "Unirse como invitado", "Rejoindre en invité")}</div>
          <h1 className="text-2xl text-serif text-[var(--ink)] font-medium mt-1 leading-tight">
            {tr("No account needed — just three quick things.", "Sin cuenta — solo tres cosas rápidas.", "Sans compte — juste trois infos rapides.")}
          </h1>
          <p className="text-sm text-[var(--ink)]/70 mt-2">
            {tr("The host will see your name and level so they know who's showing up.", "El anfitrión verá tu nombre y nivel para saber quién viene.", "L'hôte verra ton prénom et ton niveau pour savoir qui vient.")}
          </p>

          <form onSubmit={submitJoin} className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/60">{tr("Your name", "Tu nombre", "Ton prénom")}</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={40} required
                className="w-full mt-1 bg-[var(--paper-2)] border border-[var(--ink)]/15 rounded-xl px-4 py-3 text-[var(--ink)] placeholder:text-[var(--ink)]/40"
                placeholder="Alex" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest text-[var(--ink)]/60">{tr("Padel level", "Nivel de pádel", "Niveau de padel")}</label>
                {preview && (
                  <span className="text-[10px] uppercase tracking-widest text-[var(--gold)] font-semibold">
                    {tr("Match level", "Nivel del partido", "Niveau du match")}: {preview.level_min === preview.level_max ? preview.level_min : `${preview.level_min} – ${preview.level_max}`}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PADEL_LEVELS.map((lvl) => (
                  <button key={lvl} type="button" onClick={() => setLevel(lvl)}
                    className={`px-3 py-2 rounded-full border text-xs uppercase tracking-widest ${level === lvl ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "border-[var(--ink)]/20 text-[var(--ink)]/80"}`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--ink)]/60">{tr("Phone / WhatsApp", "Teléfono / WhatsApp", "Téléphone / WhatsApp")}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} inputMode="tel" required
                className="w-full mt-1 bg-[var(--paper-2)] border border-[var(--ink)]/15 rounded-xl px-4 py-3 text-[var(--ink)] placeholder:text-[var(--ink)]/40"
                placeholder="+34 600 000 000" />
              <p className="text-[10px] text-[var(--ink)]/50 mt-1">{tr("Only visible to the host — for last-minute changes.", "Solo lo ve el anfitrión — para cambios de última hora.", "Visible uniquement par l'hôte — pour les changements de dernière minute.")}</p>
            </div>
            <button type="submit" disabled={busy}
              className="w-full py-3 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm uppercase tracking-widest font-semibold disabled:opacity-50 shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--ink)_55%,transparent)]">
              {busy ? tr("Joining…", "Uniéndote…", "Inscription…") : tr("Join match", "Unirme al partido", "Rejoindre le match")}
            </button>
            <div className="text-center">
              <Link to="/auth" search={{ join: eventId } as never} className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60 underline">
                {tr("Have an account? Sign in instead", "¿Tienes cuenta? Inicia sesión", "Tu as un compte ? Connecte-toi")}
              </Link>
            </div>
          </form>

          {/* One simple way back in: phone number → your match (chat + leave button) */}
          <div className="mt-8 pt-6 border-t border-[var(--ink)]/10">
            <div className="text-center text-[11px] uppercase tracking-widest text-[var(--ink)]/60">
              {tr("Already joined?", "¿Ya te uniste?", "Déjà inscrit·e ?")}
            </div>
            <p className="mt-1 text-center text-xs text-[var(--ink)]/50">
              {tr("Enter your phone to open the chat or cancel your spot.", "Escribe tu teléfono para abrir el chat o cancelar tu plaza.", "Entre ton téléphone pour ouvrir le chat ou annuler ta place.")}
            </p>
            <div className="mt-3 flex items-center gap-2 bg-[var(--paper-2)] border border-[var(--ink)]/15 rounded-full pl-4 pr-1 py-1">
              <input
                value={recoverPhone}
                onChange={(e) => setRecoverPhone(e.target.value)}
                inputMode="tel"
                maxLength={32}
                placeholder={tr("Phone you used", "Tu teléfono", "Ton téléphone")}
                className="flex-1 min-w-0 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none py-2"
              />
              <button
                type="button"
                disabled={recoverBusy || recoverPhone.trim().length < 4}
                onClick={async () => {
                  setRecoverBusy(true);
                  try {
                    const res = await recover({ data: { eventId, phone: recoverPhone.trim() } });
                    if (res.token) {
                      saveToken(eventId, res.token);
                      putTokenInUrl(res.token);
                      setToken(res.token);
                      setRecoverPhone("");
                      toast.success(tr("Welcome back 👋", "¡Bienvenido de nuevo 👋", "Content de te revoir 👋"));
                    } else {
                      toast.error(tr("We couldn't find a spot with that phone number.", "No encontramos una plaza con ese teléfono.", "Nous n'avons pas trouvé de place avec ce numéro."));
                    }
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : tr("Could not open", "No se pudo abrir", "Impossible d'ouvrir"));
                  } finally {
                    setRecoverBusy(false);
                  }
                }}
                className="shrink-0 h-9 px-4 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-widest font-semibold disabled:opacity-40"
              >
                {recoverBusy ? "…" : tr("Open my match", "Abrir mi partido", "Ouvrir mon match")}
              </button>
            </div>
          </div>

        </div>
      </main>
    );
  }

  // ---- ROOM ----
  if (roomQ.isLoading || !roomQ.data) {
    return <main className="programme-page min-h-screen text-[var(--ink)]/60 flex items-center justify-center">{tr("Loading…", "Cargando…", "Chargement…")}</main>;
  }
  const match = roomQ.data.match;
  if (!match) {
    return (
      <main className="programme-page min-h-screen text-[var(--ink)] p-8 text-center">
        <p>{tr("This match is no longer available.", "Este partido ya no está disponible.", "Ce match n'est plus disponible.")}</p>
        <Link to="/play" className="inline-block mt-4 underline text-sm">{tr("Browse other matches", "Ver otros partidos", "Voir d'autres matches")}</Link>
      </main>
    );
  }
  const messages = roomQ.data.messages ?? [];

  return (
    <main className="programme-page min-h-screen">
      <div className="max-w-md sm:max-w-2xl mx-auto px-5 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/play" className="text-xs uppercase tracking-widest text-[var(--ink)]/60">← {tr("All matches", "Todos los partidos", "Tous les matches")}</Link>
          <button onClick={leaveMatch} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--ink)]/60 hover:text-[var(--ink)]">
            <LogOut className="w-3 h-3" /> {tr("Leave", "Salir", "Quitter")}
          </button>
        </div>

        <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/70">
          {tr("You're in", "Estás dentro", "Tu es inscrit·e")}
        </div>

        <button
          type="button"
          onClick={async () => {
            const link = typeof window !== "undefined" ? window.location.href : "";
            try {
              if (navigator.share) await navigator.share({ url: link });
              else { await navigator.clipboard.writeText(link); toast.success(tr("Private link copied — keep it to come back anytime.", "Enlace privado copiado — guárdalo para volver cuando quieras.", "Lien privé copié — garde-le pour revenir quand tu veux.")); }
            } catch { /* cancelled */ }
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[var(--ink)]/15 bg-white px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold text-[var(--ink)]/80 hover:bg-[var(--paper-2)] transition"
        >
          <Link2 className="w-3.5 h-3.5" />
          {tr("Save my private link", "Guardar mi enlace privado", "Garder mon lien privé")}
        </button>
        <MatchProgrammeCard match={match as never} />

        <div className="programme-card rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 mb-3">{tr("Match chat", "Chat del partido", "Chat du match")}</div>
          <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
            {messages.length === 0 && (
              <p className="text-xs text-[var(--ink)]/40 py-4 text-center">{tr("No messages yet. Say hi 👋", "Aún no hay mensajes. Saluda 👋", "Pas de messages. Dis bonjour 👋")}</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.is_me ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.is_me ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-2)] text-[var(--ink)]"}`}>
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
              className="flex-1 bg-[var(--paper-2)] border border-[var(--ink)]/15 rounded-full px-4 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40" />
            <button onClick={sendMsg} disabled={!msg.trim()}
              className="w-11 h-11 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link to="/auth" className="text-[11px] uppercase tracking-widest text-[var(--ink)]/50 underline">
            {tr("Create a full account to find more players", "Crea una cuenta para encontrar más jugadores", "Crée un compte pour trouver plus de joueurs")}
          </Link>
        </div>
      </div>
    </main>
  );
}
