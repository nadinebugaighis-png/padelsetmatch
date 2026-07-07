import type { SVGProps } from "react";

/**
 * Padel racket icon — clean rounded head tilted upper-right, single-line
 * handle dropping to lower-left, small ball floating at upper-left.
 * Follows currentColor.
 */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* small outline ball at upper-left */}
      <circle cx="6.4" cy="6.2" r="1.1" />
      {/* racket head — oval tilted so long axis runs top-right to bottom-left */}
      <ellipse
        cx="14"
        cy="9.5"
        rx="4.6"
        ry="5.6"
        transform="rotate(35 14 9.5)"
      />
      {/* handle from head down to lower-left grip */}
      <path d="M11 13.6 6.6 18" />
    </svg>
  );
}

export default RacketIcon;
