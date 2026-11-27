import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, MessageCircle, Megaphone, Trophy, QrCode } from "lucide-react";
import laMoralejaLogo from "@/assets/la-moraleja-club-logo.jpeg.asset.json";
import logoOnNavy from "@/assets/la-moraleja-logo-on-navy.png.asset.json";

const CLUB_URL = "https://padelsetmatch.com/club/la-moraleja";
const WA = (msg: string) => "https://wa.me/34647103375?text=" + encodeURIComponent(msg);

export const Route = createFileRoute("/club/la-moraleja")({
  head: () => ({
    meta: [
      { title: "Club de Pádel La Moraleja · PadelSetMatch" },
      { name: "description", content: "La comunidad privada del Club de Pádel La Moraleja en PadelSetMatch: partidos, avisos y competiciones del club." },
      { property: "og:title", content: "Club de Pádel La Moraleja · PadelSetMatch" },
      { property: "og:description", content: "Avisos y competiciones solo para la comunidad del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ClubPage,
});

type Look = 1 | 2 | 3;

// Draft only: three header looks to compare with the club before choosing one.
function ClubLogo({ look }: { look: Look }) {
  if (look === 1) return <img src={logoOnNavy.url} alt="Club de Pádel La Moraleja" width={1475} height={737} className="mx-auto w-[78%] max-w-[300px] h-auto" />;
  if (look === 2) return <img src={laMoralejaLogo.url} alt="Club de Pádel La Moraleja" width={1435} height={768} className="mx-auto w-[82%] max-w-[320px] h-auto" />;
  return (
    <div className="mx-auto w-[78%] max-w-[300px] rounded-[22px] p-5 border" style={{ background: "var(--lm-white)", borderColor: "color-mix(in oklab, var(--lm-lime) 55%, transparent)", boxShadow: "0 0 0 6px color-mix(in oklab, var(--lm-white) 6%, transparent), 0 24px 48px -20px rgba(0,0,0,0.6)" }}>
      <img src={laMoralejaLogo.url} alt="Club de Pádel La Moraleja" width={1435} height={768} className="w-full h-auto" />
    </div>
  );
}

function LookSwitcher({ look, setLook }: { look: Look; setLook: (l: Look) => void }) {
  const names: Record<Look, string> = { 1: "Navy", 2: "Claro", 3: "Placa" };
  return (
    <div className="sticky top-0 z-30 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold" style={{ background: "var(--lm-mist)" }}>
      <span className="opacity-60 mr-1 uppercase tracking-widest">Borrador</span>
      {([1, 2, 3] as Look[]).map((l) => (
        <button key={l} type="button" onClick={() => setLook(l)} className="rounded-full px-3 py-1.5 border"
          style={look === l ? { background: "var(--lm-navy)", color: "var(--lm-lime)", borderColor: "var(--lm-navy)" } : { borderColor: "color-mix(in oklab, var(--lm-navy) 25%, transparent)" }}>
          {l} · {names[l]}
        </button>
      ))}
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

function ClubPage() {
  const accent = "var(--lm-lime)";
  const BOOK_WA = WA("Hola, quería reservar una pista de pádel.");
  const [qr, setQr] = useState("");
  const [look, setLook] = useState<Look>(1);
  const light = look === 2;
  const ink = light ? "var(--lm-navy)" : "var(--lm-white)";
  useEffect(() => {
    let off = false;
    import("qrcode")
      .then((m) => m.default.toDataURL(CLUB_URL, { width: 360, margin: 1, color: { dark: "#0b1b2b", light: "#ffffff" } }))
      .then((d) => { if (!off) setQr(d); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  // The cookie notice is pinned to the bottom of the screen, so the page needs
  // enough trailing space for the booking button to clear it when scrolled down.
  return (
    <div className="club-lm min-h-screen pb-44">
      <LookSwitcher look={look} setLook={setLook} />
      <header className="px-5 pt-8 pb-10 text-center" style={light ? { background: "var(--lm-white)", borderBottom: "1px solid color-mix(in oklab, var(--lm-navy) 10%, transparent)" } : { background: "var(--lm-navy)" }}>
        <p className="text-[10px] tracking-[0.3em] mb-6" style={{ color: light ? "var(--lm-navy)" : "var(--lm-lime)", opacity: light ? 0.6 : 1 }}>COMUNIDAD PRIVADA · PADELSETMATCH</p>
        <ClubLogo look={look} />
        <div className="mx-auto mt-7 h-px w-12" style={{ background: "var(--lm-lime)" }} />
        <h1 className="mt-5 text-2xl font-semibold uppercase tracking-[0.12em]" style={{ color: ink }}>Juega en tu club</h1>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/auth" className="rounded-full px-6 py-3 text-sm font-bold uppercase" style={light ? { background: "var(--lm-navy)", color: "var(--lm-lime)" } : { background: "var(--lm-lime)", color: "var(--lm-navy)" }}>Únete</a>
          <a href={BOOK_WA} target="_blank" rel="noreferrer" className="rounded-full px-6 py-3 text-sm font-bold uppercase border" style={light ? { borderColor: "var(--lm-navy)", color: "var(--lm-navy)" } : { borderColor: "var(--lm-lime)", color: "var(--lm-lime)" }}>Reserva pista</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        <Section icon={<Megaphone className="w-4 h-4" />} title="Avisos del club">
          {announcements.map((a) => (
            <Card key={a.title}>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: accent }}>{a.tag}</span>
              <p className="mt-2 font-semibold">{a.title}</p>
              <p className="text-sm opacity-75">{a.body}</p>
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

        <a href={BOOK_WA} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase" style={{ background: accent, color: "var(--lm-navy)" }}>
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
