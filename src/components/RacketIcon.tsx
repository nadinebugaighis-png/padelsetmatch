import type { SVGProps } from "react";

/** Single padel racket, clean silhouette with a small ball. Follows currentColor. */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...rest}>
      <g transform="rotate(-30 11 11)">
        <ellipse cx="11" cy="8.6" rx="6" ry="7.1" />
        <path d="M9 14.8 9.9 18M13 14.8 12.1 18" />
        <path d="M9.9 18h2.2v3.6a1.1 1.1 0 0 1-2.2 0Z" />
      </g>
      <circle cx="19.6" cy="19" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default RacketIcon;
