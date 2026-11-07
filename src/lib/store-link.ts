/**
 * One shareable app link (padelsetmatch.com/download) that sends each phone
 * to its own store. Store URLs live in the badge components; this module only
 * decides which store a device belongs to, so it stays browser-safe and testable.
 */
export const DOWNLOAD_URL = "https://padelsetmatch.com/download";

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

export function shareAppText(lang: "en" | "es" | "fr"): string {
  if (lang === "es") {
    return "🎾 ¡Únete a PadelSetMatch! Encuentra jugadores y partidos de pádel en La Moraleja y Madrid. Descárgala gratis:";
  }
  if (lang === "fr") {
    return "🎾 Rejoins PadelSetMatch ! Trouve des joueurs et des matchs de padel à La Moraleja et Madrid. Télécharge-la gratuitement :";
  }
  return "🎾 Join PadelSetMatch! Find padel players and matches in La Moraleja and Madrid. Download it free:";
}
