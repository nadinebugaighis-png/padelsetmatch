import type { SVGProps } from "react";

/**
 * Padel racket icon — tilted teardrop head with a small ball at the upper-left
 * and a short handle extending to the lower-right. Follows currentColor.
 */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* racket head — teardrop, tilted ~45° (top-left to bottom-right) */}
      <ellipse cx="9.5" cy="9.5" rx="5.8" ry="6.8" transform="rotate(-45 9.5 9.5)" />
      {/* ball at upper-left of the head */}
      <circle cx="6.2" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
      {/* neck + handle */}
      <path d="M13.6 13.6 20 20" />
    </svg>
  );
}

export default RacketIcon;
