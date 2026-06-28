import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { MADRID_PLAYERS, cultureAffinity, zoneAffinity } from "./madrid-players";
import { GENDERS, MADRID_ZONES, PADEL_LEVELS, PRIORITY_TRAITS, type Candidate, type Profile, type RankedMatch } from "./types";

const ProfileSchema = z.object({
  handle: z.string().min(1).max(40),
  avatar: z.string().min(1).max(8),
  gender: z.enum(GENDERS),
  age: z.number().int().min(18).max(99),
  ageMin: z.number().int().min(18).max(99),
  ageMax: z.number().int().min(18).max(99),
  interestedIn: z.array(z.enum(GENDERS)).min(1),
  nationality: z.string().min(1).max(40),
  zone: z.enum(MADRID_ZONES),
  level: z.enum(PADEL_LEVELS),
  priorities: z.array(z.enum(PRIORITY_TRAITS)).min(3).max(10),
  bio: z.string().max(200).optional(),
});

const LEVEL_IDX: Record<string, number> = Object.fromEntries(PADEL_LEVELS.map((l, i) => [l, i]));

function scoreCandidate(me: Profile, c: Candidate): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Mutual interest gate
  const mutual = me.interestedIn.includes(c.gender) && c.interestedIn.includes(me.gender);
  if (!mutual) return { score: 0, reasons: [] };

  // Age preference (both directions)
  const meLikesAge = c.age >= me.ageMin && c.age <= me.ageMax;
  const theyLikeAge = me.age >= c.ageMin && me.age <= c.ageMax;
  if (meLikesAge && theyLikeAge) { score += 22; reasons.push("Ages line up both ways"); }
  else if (meLikesAge || theyLikeAge) { score += 10; }

  // Padel level proximity
  const levelGap = Math.abs((LEVEL_IDX[me.level] ?? 0) - (LEVEL_IDX[c.level] ?? 0));
  if (levelGap === 0) { score += 18; reasons.push("Same padel level — fair match"); }
  else if (levelGap === 1) { score += 12; reasons.push("Close padel levels"); }
  else if (levelGap === 2) score += 4;

  // Zone proximity in Madrid
  const za = zoneAffinity(me.zone, c.zone);
  if (za === 0) { score += 14; reasons.push(`Both in ${me.zone}`); }
  else if (za === 1) { score += 10; reasons.push(`${me.zone} ↔ ${c.zone}, walking distance`); }
  else if (za === 2) score += 5;

  // Culture / nationality affinity
  const ca = cultureAffinity(me.nationality, c.nationality);
  if (ca === 0) { score += 10; reasons.push(`Both ${me.nationality}`); }
  else if (ca === 1) { score += 8; reasons.push(`${me.nationality} × ${c.nationality}, neighboring cultures`); }

  // Priorities overlap (weighted by rank)
  let priorityScore = 0;
  let shared: string[] = [];
  me.priorities.slice(0, 5).forEach((p, i) => {
    const theirIdx = c.priorities.indexOf(p);
    if (theirIdx !== -1 && theirIdx < 5) {
      const weight = (5 - i) + (5 - theirIdx); // both ranked high → more
      priorityScore += weight;
      shared.push(p);
    }
  });
  score += Math.min(36, priorityScore * 2);
  if (shared.length >= 2) reasons.push(`Shared top values: ${shared.slice(0, 3).join(", ")}`);

  return { score: Math.min(100, score), reasons };
}

export const findMatches = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ProfileSchema.parse(input))
  .handler(async ({ data: me }): Promise<{ matches: (RankedMatch & { candidate: Candidate })[] }> => {
    const scored = MADRID_PLAYERS.map((c) => {
      const { score, reasons } = scoreCandidate(me, c);
      return { candidate: c, score, reasons };
    })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const key = process.env.LOVABLE_API_KEY;
    let blurbs: string[] = scored.map(() => "");

    if (key && scored.length > 0) {
      try {
        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const prompt = `You are matchmaker for an anonymous Madrid padel-meets-dating app. Players stay anonymous (handles + emoji avatars only). For each candidate, write ONE punchy sentence (max 22 words) telling "${me.handle}" why they'd click on court with this person. Reference 1-2 specifics: shared values, level, neighborhood, or culture. Warm, witty, never thirsty. No emojis. No names of body parts. Output ONLY a numbered list 1. 2. 3. ... matching the order.

ME: ${me.handle}, ${me.age}, ${me.nationality}, ${me.zone}, padel ${me.level}, top values: ${me.priorities.slice(0, 5).join(", ")}.

CANDIDATES:
${scored.map((m, i) => `${i + 1}. ${m.candidate.handle}, ${m.candidate.age}, ${m.candidate.nationality}, ${m.candidate.zone}, padel ${m.candidate.level}, top values: ${m.candidate.priorities.slice(0, 5).join(", ")}. Shared reasons: ${m.reasons.join("; ") || "—"}.`).join("\n")}`;

        const { text } = await generateText({ model, prompt });
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => /^\d+[.)]/.test(l))
          .map((l) => l.replace(/^\d+[.)]\s*/, ""));
        if (lines.length === scored.length) blurbs = lines;
      } catch (e) {
        console.error("AI blurb failed:", e);
      }
    }

    return {
      matches: scored.map((m, i) => ({
        id: m.candidate.id,
        candidate: m.candidate,
        score: m.score,
        reasons: m.reasons,
        blurb: blurbs[i] || `Solid padel + values overlap. Worth a court hour to find out.`,
      })),
    };
  });
