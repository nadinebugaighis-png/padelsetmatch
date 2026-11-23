/**
 * One shareable app link (padelsetmatch.com/download) that sends each phone
 * to its own store. Store URLs live in the badge components; this module only
 * decides which store a device belongs to, so it stays browser-safe and testable.
 */
export const DOWNLOAD_URL = "https://padelsetmatch.com/download";

/**
 * What printed and in-app QR codes must encode. The download link opens each
 * phone's own store straight away, so a scan never stops at the website.
 */
export const QR_TARGET_URL = DOWNLOAD_URL;

export type StorePlatform = "ios" | "android" | null;

/** Link-preview bots must get the page (with its banner), never a redirect. */
const BOT_RE = /bot|crawl|spider|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|preview|embedly|skype/i;

export function pickStore(userAgent: string, maxTouchPoints = 0): StorePlatform {
  const ua = userAgent || "";
  if (BOT_RE.test(ua)) return null;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  return null;
}

/**
 * The invite a player sends when sharing the app. It names the sharer's own
 * community ("Dubai", "Chelsea & Battersea") so every place gets its own
 * invite; without one it stays general.
 */
export function shareAppText(lang: "en" | "es" | "fr", place?: string | null): string {
  const where = place?.trim();
  if (lang === "es") {
    return `🎾 ¡Únete a PadelSetMatch! Encuentra jugadores y partidos de pádel ${where ? `en ${where}` : "cerca de ti"}. Descárgala gratis:`;
  }
  if (lang === "fr") {
    return `🎾 Rejoins PadelSetMatch ! Trouve des joueurs et des matchs de padel ${where ? `à ${where}` : "près de chez toi"}. Télécharge-la gratuitement :`;
  }
  return `🎾 Join PadelSetMatch! Find padel players and matches ${where ? `in ${where}` : "near you"}. Download it free:`;
}
