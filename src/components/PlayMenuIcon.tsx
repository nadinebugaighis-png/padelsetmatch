import type { SVGProps } from "react";

/**
 * Padel "Play" tab icon — tilted teardrop racket with a long wrapped-grip
 * handle running to the bottom-left and a seamed tennis ball resting at
 * the bottom-right, matching the classic padel logo silhouette.
 */
export function PlayMenuIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  const bg = "var(--surface, #0f1a1a)";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Racket: head (teardrop) + throat + long handle, tilted ~15° */}
      <path d="M14.9 2.1c-3.5-1.15-7.35.9-8.5 4.5-1.05 3.3.5 6.8 3.5 8.25l-1.05 1.3-4.5 5.15a1.1 1.1 0 0 0 .1 1.55l.55.5a1.1 1.1 0 0 0 1.55-.1l4.5-5.15 1.05-1.3c3.15.9 6.6-.75 7.65-4.05 1.15-3.6-1.35-9.5-4.85-10.65Z" />

      {/* Perforation dots on the head (subtractive) */}
      <g fill={bg}>
        <circle cx="10.4" cy="5.6" r="0.55" />
        <circle cx="12.4" cy="5" r="0.55" />
        <circle cx="14.4" cy="5.4" r="0.55" />
        <circle cx="9.6" cy="7.4" r="0.55" />
        <circle cx="11.6" cy="7" r="0.55" />
        <circle cx="13.6" cy="7.2" r="0.55" />
        <circle cx="15.4" cy="7.6" r="0.55" />
        <circle cx="9.2" cy="9.3" r="0.55" />
        <circle cx="11.2" cy="9" r="0.55" />
        <circle cx="13.2" cy="9.1" r="0.55" />
        <circle cx="15" cy="9.5" r="0.55" />
        <circle cx="9.5" cy="11.1" r="0.55" />
        <circle cx="11.4" cy="10.9" r="0.55" />
        <circle cx="13.2" cy="11.1" r="0.55" />
      </g>

      {/* Grip wrap stripes on the handle end */}
      <g stroke={bg} strokeWidth={0.45} strokeLinecap="round" fill="none">
        <path d="M4.4 20.1 6.1 21.6" />
        <path d="M3.6 21 5.3 22.5" />
      </g>

      {/* Tennis ball with single equator seam */}
      <circle cx="18.6" cy="19.2" r="3" />
      <path
        d="M15.7 19.2c1.7-1 4.1-1 5.8 0"
        fill="none"
        stroke={bg}
        strokeWidth={0.65}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default PlayMenuIcon;
