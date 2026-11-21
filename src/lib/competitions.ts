import { supabase } from "@/integrations/supabase/client";

export const COMPETITION_FORMATS = ["americana", "pozo", "tournament", "league", "charity"] as const;
export type CompetitionFormat = (typeof COMPETITION_FORMATS)[number];

type Tr = (en: string, es: string, fr?: string) => string;

export function formatLabel(f: string, tr: Tr): string {
  switch (f) {
    case "pozo": return tr("Pozo", "Pozo", "Pozo");
    case "tournament": return tr("Tournament", "Torneo", "Tournoi");
    case "league": return tr("League", "Liga", "Ligue");
    case "charity": return tr("Charity cup", "Copa benéfica", "Coupe caritative");
    default: return tr("Americana", "Americana", "Americana");
  }
}

/** Upcoming / happening now / past, from start and optional end. */
export function competitionPhase(startsAt: string, endsAt: string | null, now = new Date()): "upcoming" | "live" | "past" {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 5 * 60 * 60 * 1000;
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t <= end) return "live";
  return "past";
}

export async function myProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase.from("profiles").select("id").eq("user_id", data.user.id).maybeSingle();
  return p?.id ?? null;
}
