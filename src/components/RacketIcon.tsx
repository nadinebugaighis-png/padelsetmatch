import type { SVGProps } from "react";

/**
 * Padel racket icon — teardrop head tilted upper-right, short grip handle
 * dropping to lower-left, small outline ball floating at upper-left.
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
      {/* small outline ball, upper-left, detached from head */}
      <circle cx="6.4" cy="6" r="1.15" />
      {/* teardrop head: rounded top-right, pointed toward the handle at lower-left */}
      <path d="M11.2 14.4c-1.7-1.7-2-4.3-.4-5.9 2.2-2.2 6.3-2.6 8-.9 1.7 1.7 1.3 5.8-.9 8-1.6 1.6-4.3 1.4-5.9-.3l-.8-.9z" />
      {/* handle from teardrop tip to lower-left grip */}
      <path d="M11.2 14.4 8 17.6" />
      {/* grip end cap */}
      <path d="M8 17.6a1.4 1.4 0 1 1-2 2 1.4 1.4 0 0 1 2-2z" />
    </svg>
  );
}

export default RacketIcon;
