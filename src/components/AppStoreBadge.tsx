import { useTr } from "@/lib/i18n";

/**
 * Apple's own storefront link: it sends each visitor to their own country's
 * App Store page for the same app.
 */
export const APP_STORE_URL = "https://apps.apple.com/app/padel-set-match/id6798219696";

export function AppStoreBadge({ className = "" }: { className?: string }) {
  const tr = useTr();

  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={tr(
        "Download PadelSetMatch on the App Store",
        "Descarga PadelSetMatch en App Store",
        "Télécharger PadelSetMatch sur l’App Store",
      )}
      className={
        "inline-flex shrink-0 items-center rounded-lg transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--plum)] " +
        className
      }
    >
      <img
        src="/app-store-badge.svg"
        alt=""
        width={120}
        height={40}
        className="h-10 w-auto sm:h-11"
        loading="lazy"
      />
    </a>
  );
}
