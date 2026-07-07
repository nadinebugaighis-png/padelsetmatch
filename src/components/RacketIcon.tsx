import type { SVGProps } from "react";

/**
 * Padel racket icon — bold, balanced silhouette for a bottom nav tab.
 * Designed to sit at the same visual weight as standard Lucide icons.
 * Follows currentColor.
 */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Padel ball floating at the upper-left, slightly separated from the racket */}
      <circle cx="6.4" cy="6.2" r="1.3" />

      {/* Racket head — large, rounded teardrop/oval tilted upper-right to lower-left */}
      <path d="M13.7 3.2c-4.2-1-8 2.3-8 6.7 0 3 1.8 5.5 4.5 6.5l-0.3 6.2c0 0.7 0.5 1.4 1.2 1.4h2.2c0.7 0 1.2-0.7 1.2-1.4l-0.3-6.2c2.7-1 4.5-3.5 4.5-6.5 0-4.4-3.8-7.7-8-6.7z" />

      {/* Bridge / throat detail */}
      <path d="M10.5 15.5c1.5-0.6 3.2-0.6 4.6 0" strokeWidth={1.7} />

      {/* Grip lines */}
      <path d="M11 18.5h3" strokeWidth={1.7} />
      <path d="M10.8 20.5h3.4" strokeWidth={1.7} />

      {/* Small hole dots to read as a padel racket */}
      <circle cx="10.5" cy="7.5" r="0.45" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="7.5" r="0.45" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="0.45" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="10.5" r="0.45" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9" r="0.45" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default RacketIcon;
