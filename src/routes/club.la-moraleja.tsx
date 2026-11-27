import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, MessageCircle, Megaphone, Trophy, Users, QrCode } from "lucide-react";

const CLUB_URL = "https://padelsetmatch.com/club/la-moraleja";
const BOOK_WA = "https://wa.me/34647103375?text=" + encodeURIComponent("Hola, quería reservar una pista de pádel.");

export const Route = createFileRoute("/club/la-moraleja")({
  head: () => ({
    meta: [
      { title: "Club de Pádel La Moraleja · PadelSetMatch" },
      { name: "description", content: "La comunidad privada del Club de Pádel La Moraleja en PadelSetMatch: partidos, avisos y competiciones del club." },
      { property: "og:title", content: "Club de Pádel La Moraleja · PadelSetMatch" },
      { property: "og:description", content: "Partidos, avisos y competiciones solo para la comunidad del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ClubPage,
});

function ClubLogo({ light = true }: { light?: boolean }) {
  const ink = light ? "var(--lm-white)" : "var(--lm-navy)";
  return (
    <div className="flex flex-col items-center">
      <span className="text-[8px] tracking-[0.4em]" style={{ color: ink }}>CLUB · DE · PÁDEL</span>
      <span className="text-xl tracking-[0.18em] font-light" style={{ color: ink }}>LA MORALEJA</span>
      <svg width="120" height="34" viewBox="0 0 120 34" aria-hidden>
        <path d="M4 32 C4 14 16 4 30 4 C42 4 50 12 50 22 L50 32 Z" fill="var(--lm-lime)" />
        <path d="M14 30 C18 18 30 12 46 16" stroke="var(--lm-navy)" strokeWidth="2" fill="none" />
        <circle cx="66" cy="18" r="9" fill="var(--lm-lime)" />
        <circle cx="88" cy="22" r="5.5" fill="var(--lm-lime)" />
        <circle cx="104" cy="27" r="3" fill="var(--lm-lime)" />
      </svg>
    </div>
  );
}

const announcements = [
  { tag: "Bienestar", title: "Amazonia Massage Culture", body: "Masaje deportivo y drenaje en recepción. Reserva tu cita: 632 855 545." },
  { tag: "Clínic", title: "Clínic de bandeja y víbora", body: "Sábado 10:00 · Pista central · Todos los niveles." },
  { tag: "Restaurante", title: "Cata de pinsas", body: "Jueves por la tarde en la terraza del club." },
];

const competitions = [
  { name: "Damas de La Moraleja", when: "Liga femenina · Jornada 4", spots: "Inscripción abierta" },
  { name: "Club Series Pádel", when: "13 y 14 de diciembre", spots: "Cuadro masculino y femenino" },
  { name: "Americana de Navidad", when: "20 de diciembre · 18:00", spots: "32 plazas" },
];

const games = [
  { time: "Hoy · 19:00", level: "Nivel 3.5", players: 3 },
  { time: "Mañana · 10:30", level: "Nivel 4.0", players: 2 },
  { time: "Domingo · 12:00", level: "Todos los niveles", players: 1 },
];

function ClubPage() {
  const [qr, setQr] = useState("");
  useEffect(() => {
    let off = false;
    import("qrcode")
      .then((m) => m.default.toDataURL(CLUB_URL, { width: 360, margin: 1, color: { dark: "#0b1b2b", light: "#ffffff" } }))
      .then((d) => { if (!off) setQr(d); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  return (
    <div className="club-lm min-h-screen pb-16">
      <header className="px-5 pt-10 pb-12 text-center" style={{ background: "var(--lm-navy)" }}>
        <p className="text-[10px] tracking-[0.3em] mb-6" style={{ color: "var(--lm-lime)" }}>COMUNIDAD PRIVADA · PADELSETMATCH</p>
        <ClubLogo />
        <h1 className="mt-6 text-2xl font-semibold uppercase tracking-wide" style={{ color: "var(--lm-white)" }}>Juega en tu club</h1>
        <p className="mt-2 text-sm opacity-80 max-w-xs mx-auto" style={{ color: "var(--lm-white)" }}>Partidos, avisos y competiciones solo para socios y jugadores del club.</p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/auth" className="rounded-full px-6 py-3 text-sm font-bold uppercase" style={{ background: "var(--lm-lime)", color: "var(--lm-navy)" }}>Únete</a>
          <a href={BOOK_WA} target="_blank" rel="noreferrer" className="rounded-full px-6 py-3 text-sm font-bold uppercase border" style={{ borderColor: "var(--lm-lime)", color: "var(--lm-lime)" }}>Reserva pista</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        <Section icon={<Megaphone className="w-4 h-4" />} title="Avisos del club">
          {announcements.map((a) => (
            <Card key={a.title}>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "var(--lm-lime)" }}>{a.tag}</span>
              <p className="mt-2 font-semibold">{a.title}</p>
              <p className="text-sm opacity-75">{a.body}</p>
            </Card>
          ))}
        </Section>

        <Section icon={<Users className="w-4 h-4" />} title="Partidos abiertos">
          {games.map((g) => (
            <Card key={g.time}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{g.time}</p>
                  <p className="text-sm opacity-75">{g.level} · {g.players}/4 jugadores</p>
                </div>
                <span className="rounded-full px-4 py-2 text-xs font-bold uppercase" style={{ background: "var(--lm-navy)", color: "var(--lm-lime)" }}>Unirme</span>
              </div>
            </Card>
          ))}
        </Section>

        <Section icon={<Trophy className="w-4 h-4" />} title="Competiciones">
          {competitions.map((c) => (
            <Card key={c.name}>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm opacity-75 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{c.when}</p>
              <p className="text-xs mt-1 font-semibold">{c.spots}</p>
            </Card>
          ))}
        </Section>

        <section className="rounded-3xl p-6 text-center" style={{ background: "var(--lm-navy)", color: "var(--lm-white)" }}>
          <p className="flex items-center justify-center gap-2 text-xs tracking-[0.25em]" style={{ color: "var(--lm-lime)" }}><QrCode className="w-4 h-4" />QR DEL CLUB</p>
          <p className="mt-2 text-lg font-semibold uppercase">Escanea y entra en la comunidad</p>
          <div className="mx-auto mt-4 w-48 h-48 rounded-2xl p-3" style={{ background: "var(--lm-white)" }}>
            {qr && <img src={qr} alt="Código QR de la comunidad" className="w-full h-full" />}
          </div>
          <p className="mt-3 text-xs opacity-70">Para recepción, pantallas y cartelería</p>
        </section>

        <a href={BOOK_WA} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase" style={{ background: "var(--lm-lime)", color: "var(--lm-navy)" }}>
          <MessageCircle className="w-4 h-4" />Reservar por WhatsApp
        </a>
        <p className="text-center text-[11px] opacity-60">Con la tecnología de PadelSetMatch · Vista previa</p>
      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] mb-2 px-1">{icon}{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl p-4 shadow-sm" style={{ background: "var(--lm-white)" }}>{children}</div>;
}
