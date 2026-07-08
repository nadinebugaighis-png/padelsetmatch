import { Link } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "md" | "lg";
  to?: string;
  className?: string;
};

/**
 * Padel-ball mark + "PADEL·MATCH" serif wordmark.
 * Ball uses the grass tone with a subtle white seam — a nod to a real padel ball,
 * kept small and precise so it reads as a mark, not a decoration.
 */
export function BrandMark({ size = "md", to = "/", className = "" }: Props) {
  const dim = size === "sm" ? 26 : size === "lg" ? 40 : 32;
  const wordSize =
    size === "sm"
      ? "text-[15px] tracking-[0.22em]"
      : size === "lg"
      ? "text-[22px] tracking-[0.2em]"
      : "text-[17px] tracking-[0.22em]";
  const gap = size === "sm" ? "gap-2.5" : "gap-3";

  return (
    <Link
      to={to}
      className={`inline-flex items-center ${gap} ${className}`}
      aria-label="Padel Match — home"
    >
      <PadelBall size={dim} />
      <span className={`text-serif uppercase font-semibold text-[var(--ink)] leading-none ${wordSize}`}>
        Padel<span className="text-[var(--ink)]/35 mx-[0.15em]">·</span>Match
      </span>
    </Link>
  );
}

function PadelBall({ size }: { size: number }) {
  const id = "pb-" + size;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <radialGradient id={`${id}-fill`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#C9F08A" />
          <stop offset="55%" stopColor="var(--grass)" />
          <stop offset="100%" stopColor="#6FB03A" />
        </radialGradient>
        <radialGradient id={`${id}-hi`} cx="30%" cy="25%" r="35%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* soft ground shadow */}
      <ellipse cx="20" cy="35.5" rx="10" ry="1.6" fill="var(--ink)" opacity="0.14" />
      {/* ball body */}
      <circle cx="20" cy="19" r="16" fill={`url(#${id}-fill)`} stroke="var(--ink)" strokeOpacity="0.18" strokeWidth="0.75" />
      {/* highlight */}
      <circle cx="20" cy="19" r="16" fill={`url(#${id}-hi)`} />
      {/* seams */}
      <path
        d="M6 15 C 12 11.5, 28 11.5, 34 15"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M6 23 C 12 26.5, 28 26.5, 34 23"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
