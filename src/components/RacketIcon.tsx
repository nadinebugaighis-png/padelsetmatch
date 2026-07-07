import type { SVGProps } from "react";

/**
 * Padel racket icon — rounded oval head tilted to the upper-right, short
 * handle dropping to the lower-left, small ball floating at the upper-left
 * of the head. Follows currentColor.
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
      {/* head — oval tilted so long axis runs top-right to bottom-left */}
      <ellipse
        cx="13.5"
        cy="8.5"
        rx="4.8"
        ry="6"
        transform="rotate(35 13.5 8.5)"
      />
      {/* free ball at the upper-left of the head */}
      <circle cx="7.5" cy="6" r="1" fill="currentColor" stroke="none" />
      {/* handle from bottom of head down to lower-left */}
      <path d="M11 13.2 4.8 19.4" />
    </svg>
  );
}

export default RacketIcon;
