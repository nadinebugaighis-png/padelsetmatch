import { Link } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "md" | "lg";
  to?: string;
  className?: string;
};

/**
 * Old-style PadelMatch mark, refreshed with the new palette:
 *  – small pill-shaped padel ball (grass green) with a single curved seam
 *  – "PADEL·MATCH" as one bold serif wordmark, uppercase, ink color
 */
export function BrandMark({ size = "md", to = "/", className = "" }: Props) {
  const ballH = size === "sm" ? 18 : size === "lg" ? 26 : 22;
  const ballW = Math.round(ballH * 1.5);
  const word =
    size === "sm"
      ? "text-[15px] tracking-[0.14em]"
      : size === "lg"
      ? "text-[22px] tracking-[0.12em]"
      : "text-[17px] tracking-[0.13em]";
  const gap = size === "sm" ? "gap-2" : "gap-2.5";

  void ballW; void ballH; void gap;
  return (
    <Link
      to={to}
      className={`inline-flex items-center ${className}`}
      aria-label="Padel Match — home"
    >
      <span
        className={`text-serif uppercase text-[var(--ink)] leading-none ${word}`}
        style={{ fontWeight: 700 }}
      >
        Padel<span className="text-[var(--ink)]/40 mx-[0.18em]">·</span>Match
      </span>
    </Link>
  );
}

function PadelBallPill({ w, h }: { w: number; h: number }) {
  const id = "pb" + w + h;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 60 40"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C9F08A" />
          <stop offset="60%" stopColor="var(--grass)" />
          <stop offset="100%" stopColor="#7DBF3E" />
        </linearGradient>
      </defs>

      <rect
        x="4"
        y="4"
        width="52"
        height="32"
        rx="16"
        fill={`url(#${id}-fill)`}
        stroke="var(--ink)"
        strokeOpacity="0.25"
        strokeWidth="0.9"
      />
      <path
        d="M9 20 C 20 10, 40 10, 51 20"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.95"
      />
    </svg>
  );
}
