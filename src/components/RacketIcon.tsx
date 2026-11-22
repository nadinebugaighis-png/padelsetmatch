import type { SVGProps } from "react";

/** Single padel racket, clean silhouette with a small ball. Follows currentColor. */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...rest}>
      <g transform="rotate(-30 11 11)">
        <ellipse cx="11" cy="9" rx="5.2" ry="6.2" />
        <path d="M9.2 14.4 10 17.4M12.8 14.4 12 17.4" />
        <path d="M10 17.4h2v3.4a1 1 0 0 1-2 0Z" />
      </g>
      <circle cx="19.4" cy="18.6" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default RacketIcon;
