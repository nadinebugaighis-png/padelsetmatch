import { Link } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "md" | "lg";
  to?: string;
  className?: string;
};

/**
 * Sophisticated PadelMatch mark:
 *  – an elongated pill-shaped tennis/padel ball in the app's grass green,
 *    with a soft radial highlight and a single curved white seam
 *  – "PadelMatch" as one refined serif wordmark, light weight, mixed case
 */
export function BrandMark({ size = "md", to = "/", className = "" }: Props) {
  const ballH = size === "sm" ? 22 : size === "lg" ? 34 : 26;
  const ballW = Math.round(ballH * 1.55); // pill ratio
  const word =
    size === "sm"
      ? "text-[19px]"
      : size === "lg"
      ? "text-[30px]"
      : "text-[23px]";
  const gap = size === "sm" ? "gap-2.5" : "gap-3";

  return (
    <Link
      to={to}
      className={`inline-flex items-center ${gap} ${className}`}
      aria-label="PadelMatch — home"
    >
      <PadelBallPill w={ballW} h={ballH} />
      <span
        className={`text-serif text-[var(--ink)] leading-none tracking-[-0.01em] ${word}`}
        style={{ fontWeight: 400 }}
      >
        Padel<span className="italic text-[var(--plum)]">Match</span>
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
      viewBox="0 0 62 40"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C9F08A" />
          <stop offset="55%" stopColor="var(--grass)" />
          <stop offset="100%" stopColor="#7DBF3E" />
        </linearGradient>
        <radialGradient id={`${id}-hi`} cx="30%" cy="28%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="31" cy="37" rx="18" ry="1.4" fill="var(--ink)" opacity="0.18" />

      {/* pill body */}
      <rect
        x="3"
        y="4"
        width="56"
        height="32"
        rx="16"
        fill={`url(#${id}-fill)`}
        stroke="var(--ink)"
        strokeOpacity="0.22"
        strokeWidth="0.75"
      />
      {/* highlight */}
      <rect x="3" y="4" width="56" height="32" rx="16" fill={`url(#${id}-hi)`} />

      {/* single elegant seam */}
      <path
        d="M8 20 C 20 10, 42 10, 54 20"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.95"
      />
    </svg>
  );
}
