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
      {/* racket head — slightly larger, shifted left to balance the ball */}
      <ellipse
        cx="8.8"
        cy="8.6"
        rx="5"
        ry="6.2"
        transform="rotate(35 8.8 8.6)"
      />
      {/* handle */}
      <path d="M7.6 13.8 2.8 18.6" />
      {/* padel ball — small circle with seam arcs on the right */}
      <circle cx="18" cy="13.5" r="2.8" />
      <path d="M16.7 12.2a2.2 2.2 0 0 1 2.6 0" />
      <path d="M16.7 14.8a2.2 2.2 0 0 0 2.6 0" />
    </svg>
  );
}

export default PlayMenuIcon;
