import type { SVGProps } from "react";

/** Padel racket with a ball beside it, the familiar "play" mark. Follows currentColor. */
export function RacketIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...rest}>
      <g transform="rotate(-35 10 12)">
        <ellipse cx="10" cy="8" rx="5" ry="5.8" />
        <path d="M8.6 13.6 9.2 15.6M11.4 13.6 10.8 15.6" />
        <path d="M9 15.6h2v5.2a1 1 0 0 1-2 0Z" />
        <g fill="currentColor" stroke="none">
          <circle cx="8.3" cy="6.3" r="0.6" /><circle cx="11.7" cy="6.3" r="0.6" />
          <circle cx="10" cy="8.2" r="0.6" />
          <circle cx="8.3" cy="10.1" r="0.6" /><circle cx="11.7" cy="10.1" r="0.6" />
        </g>
      </g>
      <circle cx="19" cy="5.5" r="2.5" />
      <path d="M16.7 4.6c1.2.2 2.1 1.1 2.3 3.3M21.3 6.4c-1.2-.2-2.1-1.1-2.3-3.3" strokeWidth={1.1} />
    </svg>
  );
}

export default RacketIcon;
