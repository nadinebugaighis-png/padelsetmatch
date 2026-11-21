import type { SVGProps } from "react";

/**
 * Padel racket: rounded head with a few perforations, a short throat and a
 * grip, tilted 45° like a racket resting in the hand. Follows currentColor.
 */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...rest}>
      <g transform="rotate(45 12 12)">
        {/* head */}
        <path d="M12 1.8c3.6 0 5.8 2.6 5.8 6 0 3.6-2.4 6.4-5.8 6.4S6.2 11.4 6.2 7.8c0-3.4 2.2-6 5.8-6Z" />
        {/* perforations */}
        <g fill="currentColor" stroke="none">
          <circle cx="10" cy="6" r="0.65" /><circle cx="14" cy="6" r="0.65" />
          <circle cx="12" cy="8.2" r="0.65" />
          <circle cx="10" cy="10.4" r="0.65" /><circle cx="14" cy="10.4" r="0.65" />
        </g>
        {/* throat and grip */}
        <path d="M10.6 14 11.2 16.2M13.4 14 12.8 16.2" />
        <path d="M11 16.2h2v5.6a1 1 0 0 1-2 0Z" />
      </g>
    </svg>
  );
}

export default RacketIcon;
