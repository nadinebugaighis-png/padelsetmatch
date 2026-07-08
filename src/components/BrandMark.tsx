import { Link } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "md";
  to?: string;
  className?: string;
};

/**
 * Circular X racket icon + two-line "PADEL / MATCH" serif lockup.
 * Used across the landing, auth, and in-app headers for consistency.
 */
export function BrandMark({ size = "md", to = "/", className = "" }: Props) {
  const iconSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const strokeSize = size === "sm" ? 12 : 14;
  const label =
    size === "sm"
      ? "text-[13px] leading-[1.1] tracking-[0.22em]"
      : "text-[15px] leading-[1.05] tracking-[0.22em]";

  const inner = (
    <>
      <span
        className={`inline-flex items-center justify-center ${iconSize} rounded-full border border-[var(--ink)]/25 text-[var(--ink)] shrink-0`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width={strokeSize} height={strokeSize}>
          <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`text-serif uppercase font-semibold text-[var(--ink)] ${label}`}>
        <span className="block">Padel</span>
        <span className="block">Match</span>
      </span>
    </>
  );

  return (
    <Link to={to} className={`inline-flex items-center gap-3 ${className}`} aria-label="Padel Match — home">
      {inner}
    </Link>
  );
}
