import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { UserCircle, Search, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/slide")({
  head: () => ({
    meta: [
      { title: "Why PadelMatch — Slide" },
      { name: "description", content: "One-slide explainer of why PadelMatch exists and how it works." },
    ],
  }),
  component: SlidePage,
});

function SlidePage() {
  return (
    <main className="programme-page min-h-screen w-full overflow-hidden flex flex-col pb-32">
      <div className="flex-1 flex items-center justify-center px-6 max-h-[calc(100dvh-180px)] w-full max-w-full">
        <ScaledSlide />
      </div>
    </main>
  );
}

const W = 1920;
const H = 1080;

function ScaledSlide() {
  const [scale, setScale] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const sx = parent.clientWidth / W;
      const sy = parent.clientHeight / H;
      setScale(Math.min(sx, sy, 1.2));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="relative w-full max-w-full flex items-center justify-center"
      ref={ref}
      style={{
        width: W,
        height: H,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <SlideContent />
    </div>
  );
}

function SlideContent() {
  return (
    <div className="w-full h-full bg-[var(--paper)] text-[var(--ink)] relative overflow-hidden">
      {/* Decorative top ink bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--ink)]" />

      {/* Plum accent glow */}
      <div
        className="absolute -right-40 -top-40 w-[600px] h-[600px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: "var(--plum)" }}
      />

      {/* Grass accent glow */}
      <div
        className="absolute -left-32 -bottom-32 w-[480px] h-[480px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "var(--grass)" }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 h-[140px] px-[90px] flex items-center justify-between">
        <BrandMark size="lg" />
        <span className="text-[22px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)]/60">
          Padel players, everywhere.
        </span>
      </header>

      {/* Main content */}
      <div className="absolute inset-0 pt-[140px] pb-[110px] px-[110px] flex flex-col justify-between">
        {/* Hero copy */}
        <div className="max-w-[1100px]">
          <p
            className="inline-flex items-center gap-3 rounded-full px-5 py-2.5 border text-[19px] font-semibold uppercase tracking-[0.18em]"
            style={{ borderColor: "var(--plum)", color: "var(--plum)", background: "color-mix(in oklab, var(--plum) 8%, var(--paper))" }}
          >
            Why PadelMatch
          </p>

          <h1
            className="mt-6 leading-[0.95] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)", fontSize: 118, color: "var(--ink)" }}
          >
            Find players. Play more.
          </h1>

          <p
            className="mt-5 leading-[1.35] max-w-[920px]"
            style={{ fontFamily: "var(--font-sans)", fontSize: 36, color: "color-mix(in oklab, var(--ink) 78%, transparent)" }}
          >
            A directory of padel players around you. See who is up for a game, who has free
            court access, and meet players ahead of time — in your city or wherever you travel.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-8 mt-6">
          <StepCard
            number="1"
            icon={UserCircle}
            title="Private profile"
            body="Share as much as you want. The more the AI knows, the better your matches. Nothing is shown to anyone."
            accent="var(--plum)"
          />
          <StepCard
            number="2"
            icon={Search}
            title="Find & Connect"
            body="Browse players around you on Home. Tap to connect with the people you would play with."
            accent="var(--ink)"
          />
          <StepCard
            number="3"
            icon={CalendarCheck}
            title="Set your time"
            body="Open a slot with one click. Others join. Or join theirs. No more waiting on WhatsApp groups."
            accent="var(--grass)"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 h-[90px] px-[110px] flex items-center justify-between">
        <span className="text-[20px] text-[var(--ink)]/60" style={{ fontFamily: "var(--font-serif)" }}>
          padelmatchapp.lovable.app
        </span>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full" style={{ background: "var(--plum)" }} />
          <span className="w-3 h-3 rounded-full" style={{ background: "var(--ink)" }} />
          <span className="w-3 h-3 rounded-full" style={{ background: "var(--grass)" }} />
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  body,
  accent,
}: {
  number: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div
      className="relative rounded-[28px] p-10 border"
      style={{
        background: "#ffffff",
        borderColor: "color-mix(in oklab, var(--ink) 8%, transparent)",
        boxShadow: "0 1px 2px color-mix(in oklab, var(--ink) 4%, transparent), 0 18px 40px -20px color-mix(in oklab, var(--ink) 22%, transparent)",
      }}
    >
      <div
        className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
        style={{ background: `color-mix(in oklab, ${accent} 12%, var(--paper))`, color: accent }}
      >
        <Icon className="w-9 h-9" strokeWidth={2} />
      </div>
      <div
        className="absolute top-10 right-10 w-12 h-12 rounded-full flex items-center justify-center text-[22px] font-bold"
        style={{ background: `color-mix(in oklab, ${accent} 10%, var(--paper))`, color: accent }}
      >
        {number}
      </div>
      <h3
        className="mt-8 leading-none tracking-[-0.015em]"
        style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--ink)" }}
      >
        {title}
      </h3>
      <p
        className="mt-4 leading-[1.4]"
        style={{ fontFamily: "var(--font-sans)", fontSize: 28, color: "color-mix(in oklab, var(--ink) 70%, transparent)" }}
      >
        {body}
      </p>
    </div>
  );
}
