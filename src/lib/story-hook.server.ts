import type { Profile } from "./types";

const MODEL = "google/gemini-2.5-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Lang = "en" | "es" | "fr";

/** Deterministic fallback hook — always safe, no AI call. */
export function templateHook(p: Partial<Profile>, lang: Lang): string {
  const parts: string[] = [];
  const level = p.level ?? null;
  const zone = (p.zone ?? "").trim();
  const availability = (p.availability ?? []) as string[];
  const isCoach = (p as { is_coach?: boolean }).is_coach === true;

  const when = (() => {
    const has = (k: string) => availability.some((a) => a.toLowerCase().includes(k));
    if (has("morning") || has("mañana") || has("matin")) {
      return lang === "es" ? "mañanas" : lang === "fr" ? "matins" : "mornings";
    }
    if (has("evening") || has("noche") || has("soir")) {
      return lang === "es" ? "noches" : lang === "fr" ? "soirs" : "evenings";
    }
    if (has("weekend") || has("finde") || has("week-end")) {
      return lang === "es" ? "findes" : lang === "fr" ? "week-ends" : "weekends";
    }
    return null;
  })();

  if (isCoach) {
    parts.push(lang === "es" ? "Entrenador" : lang === "fr" ? "Coach" : "Coach");
  }
  if (level) parts.push(`Level ${level}`.replace("Level", lang === "es" ? "Nivel" : lang === "fr" ? "Niveau" : "Level"));
  if (when && zone) {
    parts.push(
      lang === "es"
        ? `juega ${when} en ${zone}`
        : lang === "fr"
          ? `joue les ${when} à ${zone}`
          : `plays ${when} in ${zone}`,
    );
  } else if (zone) {
    parts.push(lang === "es" ? `en ${zone}` : lang === "fr" ? `à ${zone}` : `in ${zone}`);
  } else if (when) {
    parts.push(lang === "es" ? `juega ${when}` : lang === "fr" ? `joue les ${when}` : `plays ${when}`);
  }
  if (parts.length === 0) {
    return lang === "es" ? "Buscando compañeros de pádel" : lang === "fr" ? "Cherche des partenaires de padel" : "Looking for padel partners";
  }
  return parts.join(" · ");
}

/**
 * Generate a warm one-liner in all three languages via the AI Gateway.
 * Fails silently — returns null so callers can fall back to templateHook().
 */
export async function generateStoryHooks(p: Profile): Promise<{ en: string; es: string; fr: string } | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;

  const summary = {
    first_name: p.first_name,
    level: p.level,
    zone: p.zone,
    locations: (p.locations ?? []).slice(0, 3),
    availability: p.availability ?? [],
    padel_style: p.padel_style ?? [],
    personal_traits: (p.personal_traits ?? []).slice(0, 4),
    intents: p.intents ?? [],
    is_coach: (p as { is_coach?: boolean }).is_coach ?? false,
  };

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You write ONE short warm hook line for a padel player card. " +
              "Max 90 characters. No emojis. No hype. Use concrete details from the profile " +
              "(level, zone, when they play, style). Sound like a friend introducing them. " +
              'Respond as compact JSON exactly: {"en":"...","es":"...","fr":"..."}. ' +
              "Use castellano for es. No line breaks.",
          },
          { role: "user", content: JSON.stringify(summary) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { en?: string; es?: string; fr?: string };
    if (!parsed.en || !parsed.es || !parsed.fr) return null;
    // Truncate hard just in case.
    const trim = (s: string) => (s.length > 100 ? s.slice(0, 97) + "…" : s);
    return { en: trim(parsed.en), es: trim(parsed.es), fr: trim(parsed.fr) };
  } catch {
    return null;
  }
}
