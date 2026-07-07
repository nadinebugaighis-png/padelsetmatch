import type { SVGProps } from "react";

/** Padel racket icon — inline SVG, follows currentColor. */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* racket head */}
      <ellipse cx="10" cy="9" rx="6.2" ry="7" />
      {/* string holes (dots) */}
      <circle cx="8" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.4" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="10.6" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="0.6" fill="currentColor" stroke="none" />
      {/* neck + handle */}
      <path d="M14.4 13.6 20 19.2" />
      <path d="m18.6 17.4 1.4 1.4a1.5 1.5 0 0 1-2.1 2.1L16.5 19.5" />
    </svg>
  );
}

export default RacketIcon;
