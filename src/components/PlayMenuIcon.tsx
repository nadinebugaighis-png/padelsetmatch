import type { SVGProps } from "react";

/**
 * Padel "Play" tab icon — a racket on the left with a clear padel ball on
 * the right, both drawn inside a 24×24 viewBox so it sits evenly alongside
 * the other single-shape tab icons.
 */
export function PlayMenuIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* racket head — kept compact and shifted left to make room for the ball */}
      <ellipse
        cx="9"
        cy="9"
        rx="4.5"
        ry="5.5"
        transform="rotate(35 9 9)"
      />
      {/* handle */}
      <path d="M8 13.5 3 18.5" />
      {/* padel ball — small circle with seam arcs on the right */}
      <circle cx="17.5" cy="13.5" r="2.8" />
      <path d="M16.2 12.2a2.2 2.2 0 0 1 2.6 0" />
      <path d="M16.2 14.8a2.2 2.2 0 0 0 2.6 0" />
    </svg>
  );
}

export default PlayMenuIcon;
