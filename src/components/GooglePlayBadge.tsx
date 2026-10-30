import { useTr } from "@/lib/i18n";

/**
 * Google Play storefront link for the Android app.
 */
export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.moorisharches.padelsetmatch";

/**
 * Until Google Play approves the release, the badge is shown as a
 * non-clickable "coming soon" chip instead of a dead storefront link.
 * Flip this to false once the listing is publicly visible.
 */
export const GOOGLE_PLAY_LIVE = false;

export function GooglePlayBadge({ className = "" }: { className?: string }) {
  const tr = useTr();

  if (!GOOGLE_PLAY_LIVE) {
    return (
      <span
        className={
          "relative inline-flex shrink-0 select-none items-center opacity-90 " +
          className
        }
        aria-label={tr(
          "PadelSetMatch is coming soon to Google Play",
          "PadelSetMatch llegará pronto a Google Play",
          "PadelSetMatch arrive bientôt sur Google Play",
        )}
      >
        <img
          src="/google-play-badge.png"
          alt=""
          width={135}
          height={40}
          className="h-11 w-auto sm:h-12"
          style={{ filter: "grayscale(0.35) brightness(0.92)" }}
          loading="lazy"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-[var(--plum)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--paper)] sm:text-[11px]">
            {tr("Coming soon", "Próximamente", "Bientôt")}
          </span>
        </span>
      </span>
    );
  }

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
