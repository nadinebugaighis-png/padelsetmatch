import { useTr } from "@/lib/i18n";

/**
 * Google Play storefront link for the Android app.
 */
export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.moorisharches.padelsetmatch";

export function GooglePlayBadge({ className = "" }: { className?: string }) {
  const tr = useTr();

  return (
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={tr(
        "Get PadelSetMatch on Google Play",
        "Consigue PadelSetMatch en Google Play",
        "Télécharger PadelSetMatch sur Google Play",
      )}
      className={
        "inline-flex shrink-0 items-center rounded-lg transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--plum)] " +
        className
      }
    >
      <img
        src="/google-play-badge.png"
        alt=""
        width={135}
        height={40}
        className="h-11 w-auto sm:h-12"
        loading="lazy"
      />
    </a>
  );
}
