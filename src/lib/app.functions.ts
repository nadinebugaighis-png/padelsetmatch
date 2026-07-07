import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { cultureAffinity, languageOverlap, locationAffinity, zoneAffinity } from "./affinity";
import { GENDERS, LOOKING_FOR, PADEL_LEVELS, type Profile } from "./types";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const LEVEL_IDX: Record<string, number> = Object.fromEntries(PADEL_LEVELS.map((l, i) => [l, i]));

const ProfileInput = z.object({
  first_name: z.string().min(1).max(40),
  age: z.number().int().min(18).max(120),
  gender: z.enum(GENDERS),
  interested_in: z.array(z.enum(GENDERS)).min(1),
  friend_interested_in: z.array(z.string()).default([]),
  partner_interested_in: z.array(z.string()).default([]),
  age_min: z.number().int().min(18).max(120),
  age_max: z.number().int().min(18).max(120),
  nationality: z.string().min(1).max(40),
  zone: z.string().min(1).max(60),
  locations: z.array(z.string().min(1).max(120)).max(8).default([]),
  languages: z.array(z.string().min(1).max(30)).max(10).default([]),
  level: z.enum(PADEL_LEVELS),
  priorities: z.array(z.string().min(1).max(40)).min(3).max(8),
  looking_for: z.enum(LOOKING_FOR),
  intents: z.array(z.enum(["padel", "friend", "relationship"])).default([]),
  bio: z.string().max(280).nullable().optional(),
  photo_url: z.string().min(1).max(2000).nullable().optional(),
  availability: z.array(z.string().min(1).max(40)).max(10).default([]),
  court_side: z.enum(["right", "left", "both"]).nullable().optional(),
  mixed_doubles: z.boolean().default(false),
  free_court_access: z.boolean().default(false),
  free_court_note: z.string().max(200).nullable().optional(),
  gender_custom: z.string().max(40).nullable().optional(),
  sexual_orientation: z.string().max(60).nullable().optional(),
  personal_traits: z.array(z.string().min(1).max(40)).max(10).default([]),
  padel_style: z.array(z.string().min(1).max(40)).max(3).default([]),
  world_mode: z.boolean().default(false).optional(),
});

function audienceAcceptsGender(audience: string[], gender: string): boolean {
  if (!audience || audience.length === 0) return true;
  if (audience.includes("everyone") || audience.includes("bisexual") || audience.includes("queer")) return true;
  if (gender === "man" && (audience.includes("men") || audience.includes("gay men"))) return true;
  if (gender === "woman" && (audience.includes("women") || audience.includes("lesbian women"))) return true;
  if (gender === "non-binary" && audience.includes("non-binary")) return true;
  if (gender === "self-describe" && (audience.includes("non-binary") || audience.includes("everyone") || audience.includes("bisexual") || audience.includes("queer"))) return true;
  return false;
}

// Returns the list of shared intents between two profiles.
// Falls back to legacy looking_for so users who haven't re-saved still match.
function deriveIntents(p: { intents?: string[] | null; looking_for?: string | null }): string[] {
  if (p.intents && p.intents.length > 0) return p.intents;
  switch (p.looking_for) {
    case "partner": return ["relationship", "padel"];
    case "friend": return ["friend", "padel"];
    case "both": return ["relationship", "friend", "padel"];
    default: return ["padel"];
  }
}
function sharedIntents(a: Profile, b: Profile): string[] {
  const av = new Set(deriveIntents(a));
  return deriveIntents(b).filter((x) => av.has(x));
}

function stripPrivateFields(p: Profile): any {
  const clone = { ...p } as any;
  delete clone.interested_in;
  delete clone.partner_interested_in;
  delete clone.friend_interested_in;
  delete clone.age_min;
  delete clone.age_max;
  delete clone.sexual_orientation;
  return clone;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles" as never)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (data as Profile | null) ?? null;
  });

export const upsertMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    const row = { ...data, user_id: context.userId, is_seed: false };
    const { data: existing } = await context.supabase
      .from("profiles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { data: updated, error } = await context.supabase
        .from("profiles" as never)
        .update(row as never)
        .eq("user_id", context.userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return updated as Profile;
    }
    const { data: inserted, error } = await context.supabase
      .from("profiles" as never)
      .insert(row as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted as Profile;
  });

export const setAwayStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ away_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles" as never)
      .update({ away_until: data.away_until } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setWorldMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ world_mode: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles" as never)
      .update({ world_mode: data.world_mode } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function moderatePhotoWithAi(photoUrl: string): Promise<{ verdict: "approved" | "rejected"; reason: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    // Fail-open if AI isn't configured; community reports still cover it.
    return { verdict: "approved", reason: "ai_unavailable" };
  }
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You moderate profile photos for a padel social app. Reject photos that contain: nudity, sexual content, explicit or suggestive poses, exposed genitals or breasts, hateful symbols, weapons used threateningly, graphic violence, illegal drug use, or clearly minor children shown alone as the main subject. Photos of people in normal clothing (including sportswear, swimwear on a beach/court context), group photos, or non-people photos (pets, scenery) are fine. Respond with ONLY compact JSON: {\"verdict\":\"approved\"|\"rejected\",\"reason\":\"short reason\"}",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Moderate this profile photo." },
              { type: "image_url", image_url: { url: photoUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { verdict: "approved", reason: `ai_error_${res.status}` };
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { verdict: "approved", reason: "ai_no_json" };
    const parsed = JSON.parse(match[0]) as { verdict?: string; reason?: string };
    if (parsed.verdict === "rejected") {
      return { verdict: "rejected", reason: String(parsed.reason ?? "inappropriate").slice(0, 200) };
    }
    return { verdict: "approved", reason: String(parsed.reason ?? "ok").slice(0, 200) };
  } catch {
    return { verdict: "approved", reason: "ai_exception" };
  }
}

export const updateMyPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ photo_url: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const moderation = await moderatePhotoWithAi(data.photo_url);
    if (moderation.verdict === "rejected") {
      throw new Error(
        `Photo rejected by automated review: ${moderation.reason}. Please choose a different photo. If you believe this is a mistake, contact support.`,
      );
    }
    const { error } = await context.supabase
      .from("profiles" as never)
      .update({
        photo_url: data.photo_url,
        photo_moderation_status: "approved",
        photo_moderation_reason: moderation.reason,
      } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


function overlapCount(a: string[], b: string[]) {
  const bs = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => bs.has(x.toLowerCase())).length;
}

function scoreCandidate(me: Profile, c: Profile) {
  const reasons: string[] = [];
  let score = 0;

  // Category buckets (0-100 each)
  let playingStyle = 0;
  let personality = 0;
  let lifestyle = 0;
  let vibe = 0;

  const intentOverlapRaw = sharedIntents(me, c);
  if (intentOverlapRaw.length === 0) return { score: 0, reasons, categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };
  // For each social intent (relationship/friend), check gender-audience both ways.
  // If it fails, drop just that intent — don't reject the whole person, because they may
  // still be a great padel partner or friend.
  const passesAudience = (kind: "relationship" | "friend") => {
    const myAudience = kind === "relationship" ? me.partner_interested_in : me.friend_interested_in;
    const theirAudience = kind === "relationship" ? c.partner_interested_in : c.friend_interested_in;
    const myAud = (myAudience && myAudience.length > 0) ? myAudience : (me.interested_in as string[]);
    const theirAud = (theirAudience && theirAudience.length > 0) ? theirAudience : (c.interested_in as string[]);
    return audienceAcceptsGender(myAud, c.gender) && audienceAcceptsGender(theirAud, me.gender);
  };
  const intentOverlap = intentOverlapRaw.filter((s) => {
    if (s === "relationship") return passesAudience("relationship");
    if (s === "friend") return passesAudience("friend");
    return true; // padel has no gender-audience gate
  });
  if (intentOverlap.length === 0) return { score: 0, reasons, categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };

  score += 6;

  const meLikesAge = c.age >= me.age_min && c.age <= me.age_max;
  const theyLikeAge = me.age >= c.age_min && me.age <= c.age_max;
  // Hard filter: only show people inside the user's chosen age range.
  if (!meLikesAge) return { score: 0, reasons, categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };
  if (theyLikeAge) { score += 22; reasons.push("Ages line up both ways"); }
  else { score += 8; }

  const levelGap = Math.abs((LEVEL_IDX[me.level] ?? 0) - (LEVEL_IDX[c.level] ?? 0));
  if (levelGap === 0) { score += 18; reasons.push("Same padel level — fair match"); playingStyle += 40; }
  else if (levelGap === 1) { score += 12; reasons.push("Close padel levels"); playingStyle += 28; }
  else if (levelGap === 2) { score += 4; playingStyle += 12; }
  else { playingStyle += 5; }

  const loc = locationAffinity(me.locations ?? [], c.locations ?? []);
  const za = zoneAffinity(me.zone, c.zone);
  if (loc.score === 0) {
    score += 16;
    reasons.push(`Both play in ${loc.sharedCity}`);
    lifestyle += 30;
  } else if (za === 0 && me.zone) {
    score += 14;
    reasons.push(`Both in ${me.zone}`);
    lifestyle += 26;
  } else {
    // No shared city or zone — still show them, just no location bonus.
    // (Previously we hard-filtered these out, which hid people you actually know.)
    score += 2;
    lifestyle += 8;
  }

  const langs = languageOverlap(me.languages ?? [], c.languages ?? []);
  if (langs.length > 0) {
    score += Math.min(10, langs.length * 5);
    reasons.push(`Speak ${langs.slice(0, 3).join(", ")}`);
    lifestyle += Math.min(25, langs.length * 12);
  }

  const ca = cultureAffinity(me.nationality, c.nationality);
  if (ca === 0) { score += 10; reasons.push(`Both ${me.nationality}`); lifestyle += 20; }
  else if (ca === 1) { score += 8; reasons.push(`${me.nationality} × ${c.nationality}, neighboring cultures`); lifestyle += 16; }

  let priorityScore = 0;
  const shared: string[] = [];
  me.priorities.slice(0, 5).forEach((p, i) => {
    const j = c.priorities.indexOf(p);
    if (j !== -1 && j < 5) {
      priorityScore += (5 - i) + (5 - j);
      shared.push(p);
    }
  });
  score += Math.min(36, priorityScore * 2);
  if (shared.length >= 2) reasons.push(`Shared values: ${shared.slice(0, 3).join(", ")}`);
  personality += Math.min(55, priorityScore * 3);

  const traitOverlap = overlapCount(me.personal_traits ?? [], c.personal_traits ?? []);
  if (traitOverlap > 0) {
    personality += Math.min(30, traitOverlap * 10);
  }

  // Padel-style overlap
  const styleOverlap = overlapCount(me.padel_style ?? [], c.padel_style ?? []);
  if (styleOverlap > 0) {
    playingStyle += Math.min(25, styleOverlap * 12);
  }
  if (me.court_side && c.court_side) {
    if (me.court_side === "both" || c.court_side === "both" || me.court_side === c.court_side) {
      playingStyle += 10;
    }
  }
  if (me.mixed_doubles && c.mixed_doubles) playingStyle += 8;
  if (me.free_court_access || c.free_court_access) playingStyle += 8;

  // Normalize each category to 0-100 with a generous baseline so decent matches look good
  playingStyle = Math.min(100, Math.round(playingStyle * 1.4 + 20));
  personality = Math.min(100, Math.round(personality * 1.6 + 15));
  lifestyle = Math.min(100, Math.round(lifestyle * 1.3 + 18));
  vibe = 0; // filled in by QA bonus in getDiscoverFeed

  return { score: Math.min(100, score), reasons, categories: { playingStyle, personality, lifestyle, vibe } };
}

export const getDiscoverFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ world: z.boolean().optional() }).optional().parse(d) ?? {})
  .handler(async ({ data, context }) => {
    const world = data?.world === true;
    const { data: meRow } = await context.supabase
      .from("profiles" as never)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    const me = meRow as Profile | null;
    if (!me) return { me: null, candidates: [] as Array<Profile & { score: number; reasons: string[]; liked: boolean }> };

    const { data: candRows } = await context.supabase
      .from("profiles" as never)
      .select("*")
      .is("suspended_at", null)
      .neq("id", me.id);
    const { data: myLikes } = await context.supabase
      .from("likes" as never)
      .select("liked_profile_id")
      .eq("liker_profile_id", me.id);
    const { data: myBlocks } = await context.supabase
      .from("blocks" as never)
      .select("blocked_profile_id")
      .eq("blocker_profile_id", me.id);
    const { data: myHides } = await context.supabase
      .from("hides" as never)
      .select("hidden_profile_id, category")
      .eq("hider_profile_id", me.id);
    // Reciprocal: if they hid me under category X, treat that as if I hid them under X too — no awkwardness.
    // Uses admin because RLS on `hides` only exposes rows to the hider (privacy).
    const { supabaseAdmin: _adminForHides } = await import("@/integrations/supabase/client.server");
    const { data: hidesOfMe } = await _adminForHides
      .from("hides" as never)
      .select("hider_profile_id, category")
      .eq("hidden_profile_id", me.id);
    // Reciprocal blocks: a one-way block would let the blocker keep seeing/liking the victim.
    // RLS on `blocks` only exposes rows to the blocker, so read via admin.
    const { data: blocksOfMe } = await _adminForHides
      .from("blocks" as never)
      .select("blocker_profile_id")
      .eq("blocked_profile_id", me.id);
    const blockedSet = new Set<string>([
      ...((myBlocks as Array<{ blocked_profile_id: string }> | null) ?? []).map((b) => b.blocked_profile_id),
      ...((blocksOfMe as Array<{ blocker_profile_id: string }> | null) ?? []).map((b) => b.blocker_profile_id),
    ]);
    const hiddenMap = new Map<string, Set<string>>();
    ((myHides as Array<{ hidden_profile_id: string; category: string }> | null) ?? []).forEach((h) => {
      const set = hiddenMap.get(h.hidden_profile_id) ?? new Set<string>();
      set.add(h.category);
      hiddenMap.set(h.hidden_profile_id, set);
    });
    ((hidesOfMe as Array<{ hider_profile_id: string; category: string }> | null) ?? []).forEach((h) => {
      const set = hiddenMap.get(h.hider_profile_id) ?? new Set<string>();
      set.add(h.category);
      hiddenMap.set(h.hider_profile_id, set);
    });
    const likedSet = new Set(((myLikes as Array<{ liked_profile_id: string }> | null) ?? []).map((l) => l.liked_profile_id));

    // Strict city gate: only show people who share at least one city with me
    // (either a location city or my zone). People will not fly to play.
    const { decodeLocation } = await import("./types");
    const myCities = new Set<string>();
    (me.locations ?? []).forEach((l) => {
      const d = decodeLocation(l);
      if (d.city) myCities.add(d.city.trim().toLowerCase());
    });
    if (me.zone) myCities.add(me.zone.trim().toLowerCase());

    const candidates = ((candRows as Profile[] | null) ?? []).filter((c) => {
      if (blockedSet.has(c.id)) return false;
      const cats = hiddenMap.get(c.id);
      if (cats && cats.has("all")) return false;
      if (world) return true;
      if (myCities.size === 0) return false;
      const theirCities = new Set<string>();
      (c.locations ?? []).forEach((l) => {
        const d = decodeLocation(l);
        if (d.city) theirCities.add(d.city.trim().toLowerCase());
      });
      if (c.zone) theirCities.add(c.zone.trim().toLowerCase());
      for (const city of theirCities) if (myCities.has(city)) return true;
      return false;
    }).map((c) => ({ ...c, hidden_categories: Array.from(hiddenMap.get(c.id) ?? []) }));

    // QA affinity: pull my answers + all candidate answers via admin (RLS would otherwise block reading others).
    // Include the embedding so we can score by MEANING (semantic), not just exact-string equality.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { parsePgVector, cosineSim } = await import("./embeddings.server");
    const ids = [me.id, ...candidates.map((c) => c.id)];
    const { data: qaRows } = await supabaseAdmin
      .from("qa_answers" as never)
      .select("profile_id, question, answer_norm, answer_embedding")
      .in("profile_id", ids);
    type QAEntry = { norm: string; vec: number[] | null };
    const byProfile = new Map<string, Map<string, QAEntry>>();
    ((qaRows as Array<{ profile_id: string; question: string; answer_norm: string; answer_embedding: unknown }> | null) ?? []).forEach((r) => {
      let m = byProfile.get(r.profile_id);
      if (!m) { m = new Map(); byProfile.set(r.profile_id, m); }
      m.set(r.question, { norm: r.answer_norm, vec: parsePgVector(r.answer_embedding) });
    });
    const myAns = byProfile.get(me.id) ?? new Map<string, QAEntry>();

    // ---- Learned personal weights from user feedback ----
    // Positive signals: 4-5 star match ratings + thumbs-up on AI compat.
    // Negative signals: 1-2 star match ratings + thumbs-down.
    // For each signal, extract the other profile's priorities/personal_traits/padel_style
    // and increment/decrement a per-tag weight for THIS user.
    const [fbRes, ratingRes] = await Promise.all([
      supabaseAdmin
        .from("compatibility_feedback" as never)
        .select("subject_profile_id, thumbs")
        .eq("rater_profile_id", me.id)
        .limit(500),
      supabaseAdmin
        .from("match_ratings" as never)
        .select("rated_profile_id, stars")
        .eq("rater_profile_id", me.id)
        .limit(500),
    ]);
    type Signal = { profileId: string; weight: number };
    const signals: Signal[] = [];
    ((fbRes.data as Array<{ subject_profile_id: string; thumbs: number }> | null) ?? []).forEach((r) => {
      signals.push({ profileId: r.subject_profile_id, weight: r.thumbs === 1 ? 1 : -1 });
    });
    ((ratingRes.data as Array<{ rated_profile_id: string; stars: number }> | null) ?? []).forEach((r) => {
      if (r.stars >= 4) signals.push({ profileId: r.rated_profile_id, weight: r.stars === 5 ? 2 : 1 });
      else if (r.stars <= 2) signals.push({ profileId: r.rated_profile_id, weight: r.stars === 1 ? -2 : -1 });
    });
    const tagWeights = new Map<string, number>(); // key: "kind:value"
    let learnedCount = 0;
    if (signals.length > 0) {
      const sigIds = Array.from(new Set(signals.map((s) => s.profileId)));
      const { data: sigProfiles } = await supabaseAdmin
        .from("profiles" as never)
        .select("id, priorities, personal_traits, padel_style")
        .in("id", sigIds);
      const byId = new Map<string, { priorities: string[]; personal_traits: string[]; padel_style: string[] }>();
      ((sigProfiles as Array<{ id: string; priorities: string[] | null; personal_traits: string[] | null; padel_style: string[] | null }> | null) ?? []).forEach((p) => {
        byId.set(p.id, {
          priorities: p.priorities ?? [],
          personal_traits: p.personal_traits ?? [],
          padel_style: p.padel_style ?? [],
        });
      });
      signals.forEach(({ profileId, weight }) => {
        const p = byId.get(profileId);
        if (!p) return;
        learnedCount++;
        const bump = (kind: string, list: string[]) => {
          list.forEach((v) => {
            const k = `${kind}:${v}`;
            tagWeights.set(k, (tagWeights.get(k) ?? 0) + weight);
          });
        };
        bump("prio", p.priorities);
        bump("trait", p.personal_traits);
        bump("style", p.padel_style);
      });
      // Clamp to ±4 so a few strong signals don't dominate deterministic scoring.
      tagWeights.forEach((v, k) => tagWeights.set(k, Math.max(-4, Math.min(4, v))));
    }
    const personalBoost = (c: Profile): { delta: number; reason: string | null } => {
      if (tagWeights.size === 0) return { delta: 0, reason: null };
      let delta = 0;
      let posHits = 0;
      let negHits = 0;
      const posTags: string[] = [];
      const applyList = (kind: string, list: string[]) => {
        list.forEach((v) => {
          const w = tagWeights.get(`${kind}:${v}`) ?? 0;
          if (w === 0) return;
          delta += w;
          if (w > 0) { posHits++; if (posTags.length < 3) posTags.push(v); }
          else negHits++;
        });
      };
      applyList("prio", c.priorities ?? []);
      applyList("trait", c.personal_traits ?? []);
      applyList("style", c.padel_style ?? []);
      // Cap the total learned nudge so it complements (not replaces) deterministic score.
      delta = Math.max(-10, Math.min(12, Math.round(delta * 0.75)));
      const reason = posHits >= 2 && posTags.length > 0
        ? `Matches what you've liked before (${posTags.slice(0, 2).join(", ")})`
        : (negHits >= 3 ? null : null);
      return { delta, reason };
    };


    const scored = candidates
      .filter((c) => world || (c.age >= me.age_min && c.age <= me.age_max))
      .map((c) => {
        const { score, reasons, categories } = scoreCandidate(me, c);
        // Semantic Q&A affinity — same question, compare answers by meaning.
        const theirAns = byProfile.get(c.id) ?? new Map<string, QAEntry>();
        let qaBonus = 0;
        let qSame = 0;
        let qClose = 0;
        let qShared = 0;
        myAns.forEach((mine, q) => {
          const theirs = theirAns.get(q);
          if (!theirs) return;
          qShared++;
          if (theirs.norm === mine.norm) { qaBonus += 5; qSame++; return; }
          const sim = cosineSim(mine.vec, theirs.vec);
          if (sim >= 0.85) { qaBonus += 4; qClose++; }
          else if (sim >= 0.7) { qaBonus += 3; qClose++; }
          else if (sim >= 0.55) { qaBonus += 2; }
          else qaBonus += 1;
        });
        const bonus = Math.min(30, qaBonus);
        const learned = personalBoost(c);
        const finalScore = Math.max(0, Math.min(100, score + bonus + learned.delta));
        const reasons2 = [...reasons];
        if (qSame >= 2) reasons2.push(`${qSame} matching answers in your Q&A`);
        else if (qClose >= 2) reasons2.push(`${qClose} similar answers in your Q&A`);
        else if (qShared >= 3) reasons2.push(`${qShared} questions both of you answered`);
        if (learned.reason) reasons2.push(learned.reason);
        const pub = stripPrivateFields(c);
        const vibe = Math.min(100, Math.round(categories.vibe + bonus * 2.5 + (qShared > 0 ? 15 : 0)));
        return { ...pub, score: finalScore, reasons: reasons2, liked: likedSet.has(c.id), categories: { ...categories, vibe }, hidden_categories: (c as unknown as { hidden_categories?: string[] }).hidden_categories ?? [] };
      })

      .filter((c) => c.score > 0)
      .sort((a, b) => {
        const today = new Date().toISOString().slice(0, 10);
        const aAway = (a as any).away_until && (a as any).away_until >= today ? 1 : 0;
        const bAway = (b as any).away_until && (b as any).away_until >= today ? 1 : 0;
        if (aAway !== bAway) return aAway - bAway;
        return b.score - a.score;
      });

    // Override heuristic score with cached AI compatibility score when available,
    // so the badge on the profile grid matches the AI % shown on the profile card.
    const candIds = scored.map((c) => c.id);
    if (candIds.length > 0) {
      const { data: aiRows } = await supabaseAdmin
        .from("compatibility_scores" as never)
        .select("profile_a, profile_b, score")
        .or(candIds.map((id) => {
          const [a2, b2] = me.id < id ? [me.id, id] : [id, me.id];
          return `and(profile_a.eq.${a2},profile_b.eq.${b2})`;
        }).join(","));
      const aiScoreByOther = new Map<string, number>();
      ((aiRows as Array<{ profile_a: string; profile_b: string; score: number }> | null) ?? []).forEach((r) => {
        const other = r.profile_a === me.id ? r.profile_b : r.profile_a;
        if (typeof r.score === "number") aiScoreByOther.set(other, Math.round(r.score));
      });
      if (aiScoreByOther.size > 0) {
        for (const c of scored) {
          const ai = aiScoreByOther.get(c.id);
          if (typeof ai === "number") c.score = ai;
        }
        scored.sort((a, b) => b.score - a.score);
      }
    }

    return { me, candidates: scored };
  });


export const likeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ likedProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("Create your profile first");
    const { error } = await context.supabase
      .from("likes" as never)
      .insert({ liker_profile_id: myId, liked_profile_id: data.likedProfileId } as never);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    // Check if a match was created (trigger handles reciprocal)
    const a = myId < data.likedProfileId ? myId : data.likedProfileId;
    const b = myId < data.likedProfileId ? data.likedProfileId : myId;
    const { data: m } = await context.supabase
      .from("matches" as never)
      .select("id")
      .eq("profile_a", a)
      .eq("profile_b", b)
      .maybeSingle();
    const matchId = (m as { id: string } | null)?.id ?? null;
    return { ok: true, matchId };
  });

export const unlikeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ likedProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    await context.supabase
      .from("likes" as never)
      .delete()
      .eq("liker_profile_id", myId)
      .eq("liked_profile_id", data.likedProfileId);
    return { ok: true };
  });

export const getMyMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: meRow } = await context.supabase
      .from("profiles" as never).select("*").eq("user_id", context.userId).maybeSingle();
    const me = meRow as Profile | null;
    const myId = me?.id;
    if (!myId) return [];
    const { data: matches } = await context.supabase
      .from("matches" as never)
      .select("*")
      .order("last_message_at", { ascending: false });
    const m = (matches as Array<{ id: string; profile_a: string; profile_b: string; created_at: string; last_message_at: string }> | null) ?? [];
    const otherIds = m.map((x) => (x.profile_a === myId ? x.profile_b : x.profile_a));
    if (otherIds.length === 0) return [];
    const matchIds = m.map((x) => x.id);
    const [{ data: profiles }, { data: reads }, { data: msgs }] = await Promise.all([
      context.supabase.from("profiles" as never).select("*").in("id", otherIds).is("suspended_at", null),
      context.supabase.from("match_reads" as never).select("match_id,last_read_at").eq("profile_id", myId).in("match_id", matchIds),
      context.supabase.from("messages" as never).select("match_id,sender_profile_id,body,created_at").in("match_id", matchIds).order("created_at", { ascending: false }),
    ]);
    const map = new Map<string, any>(((profiles as Profile[] | null) ?? []).map((p) => [p.id, stripPrivateFields(p)]));
    const readMap = new Map<string, string>(((reads as Array<{ match_id: string; last_read_at: string }> | null) ?? []).map((r) => [r.match_id, r.last_read_at]));
    const allMsgs = (msgs as Array<{ match_id: string; sender_profile_id: string; body: string; created_at: string }> | null) ?? [];
    return m.map((row) => {
      const lastRead = readMap.get(row.id) ?? "1970-01-01";
      const matchMsgs = allMsgs.filter((x) => x.match_id === row.id);
      const last = matchMsgs[0];
      const unread = matchMsgs.filter((x) => x.sender_profile_id !== myId && x.created_at > lastRead).length;
      const other = map.get(row.profile_a === myId ? row.profile_b : row.profile_a);
      return {
        match_id: row.id,
        created_at: row.created_at,
        last_message_at: row.last_message_at,
        last_message: last ? { body: last.body, created_at: last.created_at, from_me: last.sender_profile_id === myId } : null,
        unread,
        other,
        shared_intents: other ? sharedIntents(me, other) : [],
      };
    }).filter((x) => x.other);
  });

export const markMatchRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) return { ok: false };
    await context.supabase
      .from("match_reads" as never)
      .upsert({ match_id: data.matchId, profile_id: myId, last_read_at: new Date().toISOString() } as never, { onConflict: "match_id,profile_id" } as never);
    return { ok: true };
  });

export const getMatchDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { data: match } = await context.supabase
      .from("matches" as never).select("*").eq("id", data.matchId).maybeSingle();
    const mr = match as { id: string; profile_a: string; profile_b: string } | null;
    if (!mr) throw new Error("Match not found");
    const otherId = mr.profile_a === myId ? mr.profile_b : mr.profile_a;
    const { data: other } = await context.supabase
      .from("profiles" as never).select("*").eq("id", otherId).maybeSingle();
    if (!other) throw new Error("Other profile not found");
    const { data: myFull } = await context.supabase
      .from("profiles" as never).select("*").eq("id", myId).maybeSingle();
    const { data: messages } = await context.supabase
      .from("messages" as never).select("*").eq("match_id", data.matchId).order("created_at", { ascending: true });
    const meP = (myFull ?? {}) as Profile;
    const otP = other as Profile;
    const overlap = (a?: string[] | null, b?: string[] | null) => {
      const bs = new Set((b ?? []).map((x) => x.toLowerCase()));
      return (a ?? []).filter((x) => bs.has(x.toLowerCase()));
    };
    const shared = {
      priorities: overlap(meP.priorities, otP.priorities),
      personal_traits: overlap(meP.personal_traits, otP.personal_traits),
      padel_style: overlap(meP.padel_style, otP.padel_style),
      languages: overlap(meP.languages, otP.languages),
    };
    return {
      match_id: mr.id,
      my_profile_id: myId,
      other: stripPrivateFields(other as Profile) as unknown as Profile,
      shared,
      shared_intents: sharedIntents(meP, otP),
      messages: ((messages as Array<{ id: string; match_id: string; sender_profile_id: string; body: string; created_at: string; edited_at: string | null }> | null) ?? []),
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ matchId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("messages" as never)
      .insert({ match_id: data.matchId, sender_profile_id: myId, body: data.body } as never);
    if (error) throw new Error(error.message);

    // Auto-reply from seed players to keep the demo chat alive
    const { data: match } = await context.supabase
      .from("matches" as never).select("*").eq("id", data.matchId).maybeSingle();
    const mr = match as { profile_a: string; profile_b: string } | null;
    if (mr) {
      const otherId = mr.profile_a === myId ? mr.profile_b : mr.profile_a;
      const { data: other } = await context.supabase
        .from("profiles" as never).select("is_seed, first_name").eq("id", otherId).maybeSingle();
      const o = other as { is_seed: boolean; first_name: string } | null;
      if (o?.is_seed) {
        const replies = [
          `Nice to meet you! When works to play?`,
          `Hola! I'm free Tuesday or Thursday evening — courts in your zone?`,
          `Let's book on Playtomic 👌`,
          `Game on. Level honest, I warn you 😅`,
          `Saturday morning? I know a good club.`,
        ];
        const reply = replies[Math.floor(Math.random() * replies.length)];
        await context.supabase
          .from("messages" as never)
          .insert({ match_id: data.matchId, sender_profile_id: otherId, body: reply } as never);
      }
    }
    return { ok: true };
  });

export const editMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ messageId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("messages" as never)
      .update({ body: data.body, edited_at: new Date().toISOString() } as never)
      .eq("id", data.messageId)
      .eq("sender_profile_id", myId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ messageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("messages" as never)
      .delete()
      .eq("id", data.messageId)
      .eq("sender_profile_id", myId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (myId) {
      await supabaseAdmin.from("messages" as never).delete().eq("sender_profile_id", myId);
      await supabaseAdmin.from("likes" as never).delete().or(`liker_profile_id.eq.${myId},liked_profile_id.eq.${myId}`);
      await supabaseAdmin.from("matches" as never).delete().or(`profile_a.eq.${myId},profile_b.eq.${myId}`);
      await supabaseAdmin.from("profiles" as never).delete().eq("id", myId);
    }
    await supabaseAdmin.auth.admin.deleteUser(context.userId);
    return { ok: true };
  });

export const blockProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ blockedProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    // Remove any likes and matches between the two
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("likes" as never).delete()
      .or(`and(liker_profile_id.eq.${myId},liked_profile_id.eq.${data.blockedProfileId}),and(liker_profile_id.eq.${data.blockedProfileId},liked_profile_id.eq.${myId})`);
    await supabaseAdmin.from("matches" as never).delete()
      .or(`and(profile_a.eq.${myId},profile_b.eq.${data.blockedProfileId}),and(profile_a.eq.${data.blockedProfileId},profile_b.eq.${myId})`);
    const { error } = await context.supabase
      .from("blocks" as never)
      .insert({ blocker_profile_id: myId, blocked_profile_id: data.blockedProfileId } as never);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const hideProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      hiddenProfileId: z.string().uuid(),
      category: z.enum(["padel", "friend", "relationship", "partner", "all"]).default("all"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("hides" as never)
      .insert({ hider_profile_id: myId, hidden_profile_id: data.hiddenProfileId, category: data.category } as never);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const unhideProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      hiddenProfileId: z.string().uuid(),
      category: z.enum(["padel", "friend", "relationship", "partner", "all"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    let q = context.supabase.from("hides" as never).delete()
      .eq("hider_profile_id", myId)
      .eq("hidden_profile_id", data.hiddenProfileId);
    if (data.category) q = q.eq("category", data.category);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unblockProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ blockedProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("blocks" as never).delete()
      .eq("blocker_profile_id", myId)
      .eq("blocked_profile_id", data.blockedProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getHiddenAndBlocked = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) return { hidden: [], blocked: [] };
    const { data: hides } = await context.supabase
      .from("hides" as never)
      .select("hidden_profile_id, category, created_at")
      .eq("hider_profile_id", myId);
    const { data: blocks } = await context.supabase
      .from("blocks" as never)
      .select("blocked_profile_id, created_at")
      .eq("blocker_profile_id", myId);
    const hideRows = (hides as Array<{ hidden_profile_id: string; category: string; created_at: string }> | null) ?? [];
    const blockRows = (blocks as Array<{ blocked_profile_id: string; created_at: string }> | null) ?? [];
    const ids = Array.from(new Set([...hideRows.map((h) => h.hidden_profile_id), ...blockRows.map((b) => b.blocked_profile_id)]));
    let profileMap = new Map<string, { id: string; first_name: string; photo_url: string | null; zone: string | null }>();
    if (ids.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = await supabaseAdmin
        .from("profiles" as never)
        .select("id, first_name, photo_url, zone")
        .in("id", ids);
      ((profs as Array<{ id: string; first_name: string; photo_url: string | null; zone: string | null }> | null) ?? []).forEach((p) => profileMap.set(p.id, p));
    }
    const hidden = hideRows.map((h) => ({ ...profileMap.get(h.hidden_profile_id), profile_id: h.hidden_profile_id, category: h.category, created_at: h.created_at }));
    const blocked = blockRows.map((b) => ({ ...profileMap.get(b.blocked_profile_id), profile_id: b.blocked_profile_id, created_at: b.created_at }));
    return { hidden, blocked };
  });

export const reportProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reportedProfileId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up reported user's auth id for the report record
    const { data: target } = await supabaseAdmin
      .from("profiles" as never)
      .select("user_id")
      .eq("id", data.reportedProfileId)
      .maybeSingle();
    const targetUserId = (target as { user_id: string | null } | null)?.user_id ?? null;

    // Prevent duplicate pending reports from the same reporter against the same target
    const { data: existing } = await supabaseAdmin
      .from("reports" as never)
      .select("id")
      .eq("reporter_profile_id", myId)
      .eq("reported_profile_id", data.reportedProfileId)
      .eq("status", "pending")
      .maybeSingle();

    if (!existing) {
      // Log the report for staff review
      await supabaseAdmin.from("reports" as never).insert({
        reporter_profile_id: myId,
        reported_profile_id: data.reportedProfileId,
        reported_user_id: targetUserId,
        reason: data.reason,
        status: "pending",
      } as never);
    }

    // Auto-suspend ONLY after 3+ distinct reporters have flagged this account.
    // A single unverified report must not disable an account (DoS risk).
    const { data: distinctReports } = await supabaseAdmin
      .from("reports" as never)
      .select("reporter_profile_id")
      .eq("reported_profile_id", data.reportedProfileId)
      .eq("status", "pending");
    const distinctReporterCount = new Set(
      ((distinctReports as Array<{ reporter_profile_id: string }> | null) ?? []).map((r) => r.reporter_profile_id),
    ).size;
    if (distinctReporterCount >= 3) {
      await supabaseAdmin
        .from("profiles" as never)
        .update({ suspended_at: new Date().toISOString() } as never)
        .eq("id", data.reportedProfileId)
        .is("suspended_at", null);
    }

    // Auto-block from the reporter's side so they never see the account again
    await supabaseAdmin
      .from("blocks" as never)
      .insert({ blocker_profile_id: myId, blocked_profile_id: data.reportedProfileId } as never);


    return { ok: true };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      message: z.string().trim().min(3).max(2000),
      rating: z.number().int().min(1).max(5).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myProfileId = (me as { id: string } | null)?.id ?? null;
    const { error } = await context.supabase
      .from("feedback" as never)
      .insert({
        user_id: context.userId,
        profile_id: myProfileId,
        message: data.message,
        rating: data.rating ?? null,
      } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const confirmPlayed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("played_confirmations" as never)
      .insert({ match_id: data.matchId, profile_id: myId } as never);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const reportNoShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { data: match } = await context.supabase
      .from("matches" as never).select("*").eq("id", data.matchId).maybeSingle();
    const mr = match as { profile_a: string; profile_b: string } | null;
    if (!mr) throw new Error("Match not found");
    const otherId = mr.profile_a === myId ? mr.profile_b : mr.profile_a;
    const { error } = await context.supabase
      .from("no_shows" as never)
      .insert({ match_id: data.matchId, reporter_profile_id: myId, reported_profile_id: otherId } as never);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const getPlayedStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) return { iConfirmed: false, count: 0 };
    const { data: rows } = await context.supabase
      .from("played_confirmations" as never)
      .select("profile_id")
      .eq("match_id", data.matchId);
    const list = ((rows as Array<{ profile_id: string }> | null) ?? []);
    return {
      iConfirmed: list.some((r) => r.profile_id === myId),
      count: list.length,
    };
  });

// ============================================================
// Ongoing AI-generated compatibility Q&A
// ============================================================

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

export const getMyQaAnswers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) return [] as Array<{ id: string; question: string; category: string; answer: string; created_at: string }>;
    const { data } = await context.supabase
      .from("qa_answers" as never)
      .select("id, question, category, answer, created_at")
      .eq("profile_id", myId)
      .order("created_at", { ascending: false });
    return (data as Array<{ id: string; question: string; category: string; answer: string; created_at: string }> | null) ?? [];
  });

export const submitQaAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      question: z.string().trim().min(3).max(400),
      category: z.string().trim().min(1).max(40).default("general"),
      answer: z.string().trim().min(1).max(400),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("Create your profile first");
    // Best-effort semantic embedding — never blocks the save.
    const { embedText, toPgVector } = await import("./embeddings.server");
    const embedding = await embedText(`${data.question}\n${data.answer}`);
    // Upsert-like behaviour: delete existing same-question, then insert
    await context.supabase
      .from("qa_answers" as never)
      .delete()
      .eq("profile_id", myId)
      .eq("question", data.question);
    const row: Record<string, unknown> = {
      profile_id: myId,
      question: data.question,
      category: data.category,
      answer: data.answer,
      answer_norm: normalizeAnswer(data.answer),
    };
    if (embedding) row.answer_embedding = toPgVector(embedding);
    const { error } = await context.supabase
      .from("qa_answers" as never)
      .insert(row as never);
    if (error) throw new Error(error.message);
    // Any cached AI compatibility involving me is stale — clear it.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("compatibility_scores" as never)
      .delete()
      .or(`profile_a.eq.${myId},profile_b.eq.${myId}`);
    return { ok: true };
  });

export const deleteQaAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    await context.supabase
      .from("qa_answers" as never)
      .delete()
      .eq("id", data.id)
      .eq("profile_id", myId);
    return { ok: true };
  });

type GeneratedQuestion = { question: string; category: string; options?: string[] };

export const generateQaQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      count: z.number().int().min(1).max(8).default(5),
      lang: z.enum(["en", "es", "fr"]).default("en"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: meRow } = await context.supabase
      .from("profiles" as never).select("*").eq("user_id", context.userId).maybeSingle();
    const me = meRow as Profile | null;
    if (!me) throw new Error("Create your profile first");

    // Derive intent flags from profile so we tailor questions silently.
    const myIntents = deriveIntents({ intents: me.intents, looking_for: me.looking_for });
    const wantsRelationship = myIntents.includes("relationship");
    const wantsFriend = myIntents.includes("friend");
    const padelOnly = !wantsRelationship && !wantsFriend;

    const { data: existing } = await context.supabase
      .from("qa_answers" as never)
      .select("question")
      .eq("profile_id", me.id)
      .order("created_at", { ascending: false })
      .limit(40);
    const asked = ((existing as Array<{ question: string }> | null) ?? []).map((r) => r.question);

    // Filter fallback pool based on intent (silent — driven by profile only).
    const isRelationshipQuestion = (q: GeneratedQuestion): boolean => {
      const t = `${q.question} ${q.category}`.toLowerCase();
      return /(relationship|dealbreaker|soulmate|love language|partner|dating|romance|romantic|kids|children|pareja|relaci[oó]n|alma gemela|lenguaje del amor|dating|hijos|sentimental|intimacy|intimidad|attraction|atracci[oó]n)/.test(t);
    };
    const filterPool = (pool: GeneratedQuestion[]): GeneratedQuestion[] => {
      if (wantsRelationship) return pool;
      return pool.filter((q) => !isRelationshipQuestion(q));
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      const fallback: GeneratedQuestion[] = filterPool(FALLBACK_QUESTIONS[data.lang])
        .filter((q) => !asked.includes(q.question))
        .slice(0, data.count);
      return { questions: fallback };
    }

    const { generateText } = await import("ai");
    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    // Build intent-aware guidance appended to the system prompt.
    const intentGuidanceEs = padelOnly
      ? " El usuario SOLO busca compañeros de pádel — NO hagas preguntas sobre citas, relaciones, romance, atracción física, lenguajes del amor, dealbreakers de pareja, hijos deseados ni intimidad. Céntrate casi todo en pádel (estilo, actitud, competitividad, disponibilidad) y en personalidad/estilo de vida ligeros y adecuados para amistad. Proporción: ~60% pádel, ~40% personalidad/estilo de vida amistosos."
      : !wantsRelationship
      ? " El usuario busca amistad, NO pareja — NO hagas preguntas sobre citas, romance, atracción, lenguajes del amor, dealbreakers de pareja, hijos deseados ni intimidad. Céntrate en pádel, personalidad, valores y estilo de vida. Proporción: ~40% pádel, ~35% personalidad/valores, ~25% estilo de vida."
      : "";
    const intentGuidanceEn = padelOnly
      ? " The user is ONLY looking for padel partners — do NOT ask about dating, relationships, romance, physical attraction, love languages, partner dealbreakers, wanting kids, or intimacy. Focus almost entirely on padel (style, attitude, competitiveness, availability) and light, friendship-appropriate personality/lifestyle. Ratio: ~60% padel, ~40% friendship-friendly personality/lifestyle."
      : !wantsRelationship
      ? " The user is looking for friendship, NOT a partner — do NOT ask about dating, romance, attraction, love languages, partner dealbreakers, wanting kids, or intimacy. Focus on padel, personality, values, and lifestyle. Ratio: ~40% padel, ~35% personality/values, ~25% lifestyle."
      : "";
    const intentGuidanceFr = padelOnly
      ? " L'utilisateur cherche UNIQUEMENT des partenaires de padel — NE pose PAS de questions sur les rencontres, relations, romance, attirance physique, langages de l'amour, dealbreakers de couple, envie d'enfants ou intimité. Concentre-toi presque tout sur le padel (style, attitude, compétitivité, disponibilité) et sur une personnalité/style de vie légers et adaptés à l'amitié. Ratio : ~60% padel, ~40% personnalité/style de vie amicaux."
      : !wantsRelationship
      ? " L'utilisateur cherche de l'amitié, PAS un·e partenaire — NE pose PAS de questions sur les rencontres, romance, attirance, langages de l'amour, dealbreakers de couple, envie d'enfants ou intimité. Concentre-toi sur le padel, la personnalité, les valeurs et le style de vie. Ratio : ~40% padel, ~35% personnalité/valeurs, ~25% style de vie."
      : "";

    const sysEs = "Eres una IA experta en compatibilidad y psicología relacional. Generas preguntas cortas, reveladoras y de OPCIÓN MÚLTIPLE para encontrar afinidad real entre personas (amistad, pareja o alma gemela). La mezcla por defecto es ~35% personalidad/valores, ~30% estilo de vida y estatus (rutina diaria, situación laboral, nivel de estudios, situación sentimental actual, hijos, hábitos, viajes, salud, fumar/beber, mascotas, vivienda, religión, política) y ~35% pádel (cómo juega, actitud en pista, estilo, mentalidad competitiva). Responde SIEMPRE en español.";
    const sysEn = "You are an AI expert in compatibility and relational psychology. You generate short, revealing, MULTIPLE-CHOICE questions to find real affinity between people (friendship, partner, or soulmate). Default mix: ~35% personality/values, ~30% lifestyle and status (daily routine, work situation, education level, current relationship status, kids, habits, travel, health, smoking/drinking, pets, living situation, religion, politics) and ~35% padel (how they play, on-court attitude, style, competitive mindset). Always reply in English.";
    const sysFr = "Tu es une IA experte en compatibilité et psychologie relationnelle. Tu génères des questions courtes, révélatrices et à CHOIX MULTIPLE pour trouver une vraie affinité entre les personnes (amitié, partenaire ou âme sœur). Mélange par défaut : ~35% personnalité/valeurs, ~30% style de vie et statut (routine quotidienne, situation professionnelle, niveau d'études, situation sentimentale actuelle, enfants, habitudes, voyages, santé, tabac/alcool, animaux, logement, religion, politique) et ~35% padel (comment on joue, attitude sur pista, style, mentalité compétitive). Réponds TOUJOURS en français.";
    const sys = (data.lang === "es" ? sysEs : data.lang === "fr" ? sysFr : sysEn)
      + (data.lang === "es" ? intentGuidanceEs : data.lang === "fr" ? intentGuidanceFr : intentGuidanceEn);

    const ratioEs = padelOnly
      ? "Proporción OBLIGATORIA: ~60% pádel, ~40% personalidad ligera y estilo de vida (rutina, deporte, viajes, humor, energía social, mascotas). NADA de romance, citas, pareja, hijos ni atracción."
      : !wantsRelationship
      ? "Proporción OBLIGATORIA: ~40% pádel, ~35% personalidad/valores (humor, energía social, estilo de conflicto, ambición), ~25% estilo de vida (rutina, viajes, comida, fumar/beber, mascotas). NADA de romance, citas, pareja ni hijos."
      : "Proporción: ~35% personalidad (lenguaje del amor, apego, estilo de conflicto, humor, dealbreakers, familia, ambición, energía social, comodidad con la intimidad, qué les hace sentir queridos), ~30% estilo de vida y estatus (etapa laboral, estudios, situación sentimental, hijos o querer hijos, vivienda, fumar, beber, dieta, deporte, sueño, viajes, mascotas, religión, política, mentalidad con el dinero, fin de semana ideal), ~35% pádel (lado preferido, estilo agresivo/defensivo, cómo reacciona al perder, cómo trata a compañeros, intensidad, social vs competitivo, compañero ideal).";
    const ratioEn = padelOnly
      ? "MANDATORY ratio: ~60% padel, ~40% light personality and lifestyle (routine, fitness, travel, humor, social energy, pets). NOTHING about romance, dating, partners, kids, or attraction."
      : !wantsRelationship
      ? "MANDATORY ratio: ~40% padel, ~35% personality/values (humor, social energy, conflict style, ambition), ~25% lifestyle (routine, travel, food, smoking/drinking, pets). NOTHING about romance, dating, partners, or kids."
      : "Ratio: ~35% personality (love language, attachment, conflict style, humor, dealbreakers, family, ambition, social energy, intimacy comfort, what makes them feel loved), ~30% lifestyle & status (work/career stage, education, current relationship status, kids or wanting kids, living situation, smoking, drinking, diet, fitness routine, sleep schedule, travel frequency, pets, religion, politics, money mindset, ideal weekend), ~35% padel (preferred side, style aggressive/defensive, how they react to losing, how they treat partners, intensity, social vs competitive, dream playing partner).";
    const ratioFr = padelOnly
      ? "Ratio OBLIGATOIRE : ~60% padel, ~40% personnalité légère et style de vie (routine, fitness, voyages, humour, énergie sociale, animaux). RIEN sur la romance, les rencontres, les partenaires, les enfants ou l'attirance."
      : !wantsRelationship
      ? "Ratio OBLIGATOIRE : ~40% padel, ~35% personnalité/valeurs (humour, énergie sociale, style de conflit, ambition), ~25% style de vie (routine, voyages, cuisine, tabac/alcool, animaux). RIEN sur la romance, les rencontres, les partenaires ou les enfants."
      : "Ratio : ~35% personnalité (langage de l'amour, attachement, style de conflit, humour, dealbreakers, famille, ambition, énergie sociale, aisance avec l'intimité, ce qui fait se sentir aimé), ~30% style de vie et statut (étape professionnelle, études, situation sentimentale, enfants ou envie d'enfants, logement, tabac, alcool, régime, sport, sommeil, voyages, animaux, religion, politique, rapport à l'argent, week-end idéal), ~35% padel (côté préféré, style agressif/défensif, réaction à la défaite, comportement avec les partenaires, intensité, social vs compétitif, partenaire idéal).";
    const ratioLine = data.lang === "es" ? ratioEs : data.lang === "fr" ? ratioFr : ratioEn;

    const prompt = `Person context:
- Age ${me.age}, ${me.gender === "self-describe" ? (me.gender_custom || "self-describe") : me.gender}
- Looking for: ${myIntents.join(", ") || me.looking_for}
- Nationality: ${me.nationality}
- Languages: ${(me.languages ?? []).join(", ") || "n/a"}
- Top values: ${(me.priorities ?? []).slice(0, 5).join(", ") || "n/a"}

They have already answered these questions (do NOT repeat or paraphrase):
${asked.map((q, i) => `${i + 1}. ${q}`).join("\n") || "(none yet)"}

Generate exactly ${data.count} NEW questions as MULTIPLE CHOICE.
${ratioLine}
EVERY question MUST include 3 to 5 short, mutually exclusive options. No open-ended questions. Keep options under 6 words each. Warm, specific, never generic. Never ask for income amounts.

Return ONLY valid JSON, no prose, no markdown:
{"questions":[{"question":"...","category":"lifestyle","options":["opt1","opt2","opt3","opt4"]}]}
Categories must be lowercase single words (personality, values, lifestyle, status, padel, etc.).`;

    let text = "";
    try {
      const res = await generateText({ model, system: sys, prompt, temperature: 0.9 });
      text = res.text ?? "";
    } catch (e) {
      const fallback: GeneratedQuestion[] = filterPool(FALLBACK_QUESTIONS[data.lang])
        .filter((q) => !asked.includes(q.question))
        .slice(0, data.count);
      return { questions: fallback, warning: e instanceof Error ? e.message : "AI unavailable" };
    }

    // Extract JSON
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    let parsed: { questions?: GeneratedQuestion[] } = {};
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      parsed = { questions: [] };
    }
    let out: GeneratedQuestion[] = (parsed.questions ?? [])
      .filter((q) => q && typeof q.question === "string" && q.question.length > 3)
      .filter((q) => Array.isArray(q.options) && q.options.length >= 2)
      .filter((q) => !asked.includes(q.question))
      .map((q) => ({
        question: q.question.trim(),
        category: (q.category ?? "general").toLowerCase().slice(0, 30),
        options: (q.options as string[]).slice(0, 5).map((o) => String(o).slice(0, 80)),
      }));

    // Safety net: even if the model ignored guidance, strip relationship questions
    // when the user's profile intents don't include "relationship".
    out = filterPool(out);

    // If filtering left us short, top up from the (also-filtered) fallback pool.
    if (out.length < data.count) {
      const topUp = filterPool(FALLBACK_QUESTIONS[data.lang])
        .filter((q) => !asked.includes(q.question) && !out.some((o) => o.question === q.question))
        .slice(0, data.count - out.length);
      out = [...out, ...topUp];
    }

    return { questions: out.slice(0, data.count) };
  });


const FALLBACK_QUESTIONS: Record<"en" | "es" | "fr", GeneratedQuestion[]> = {
  en: [
    { question: "What's your love language?", category: "personality", options: ["Words of affirmation", "Quality time", "Physical touch", "Acts of service", "Gifts"] },
    { question: "What makes you instantly trust someone?", category: "values", options: ["Consistency", "Honesty under pressure", "Kindness to strangers", "Keeps secrets"] },
    { question: "Introvert, extrovert, or somewhere in between?", category: "personality", options: ["Introvert", "Extrovert", "Ambivert"] },
    { question: "Biggest relationship dealbreaker?", category: "dealbreakers", options: ["Dishonesty", "Jealousy", "Bad temper", "No ambition", "Closed-mindedness"] },
    { question: "When you're upset, you prefer to…", category: "conflict", options: ["Talk it out", "Be left alone", "A bit of both"] },
    { question: "Your humour is mostly…", category: "humor", options: ["Dry/sarcastic", "Silly/playful", "Witty/clever", "Dark", "Wholesome"] },
    { question: "Perfect Sunday?", category: "lifestyle", options: ["Brunch + walk", "Sport + nap", "Beach/nature", "Home + movie", "Out with friends"] },
    { question: "Do you believe in soulmates?", category: "values", options: ["Yes", "No", "Sort of"] },
    { question: "Pick one night out:", category: "social", options: ["1-on-1 dinner", "Group night out", "House party", "Stay home"] },
    { question: "How important is shared humour?", category: "values", options: ["Essential", "Very", "Nice to have", "Not really"] },
    { question: "Money mindset?", category: "lifestyle", options: ["Save first", "Spend on experiences", "Treat yourself often", "Invest long-term"] },
    { question: "Which padel side do you prefer?", category: "padel", options: ["Right (drive)", "Left (revés)", "Both", "Still figuring out"] },
    { question: "Your playing style is…", category: "padel", options: ["Aggressive smasher", "Defensive wall", "Tactical/patient", "Fun-first social"] },
    { question: "After a tough match you…", category: "padel", options: ["Vent it out", "Joke about it", "Stay quiet", "Analyse every point"] },
    { question: "Your partner misses an easy ball — you…", category: "padel", options: ["Encourage them", "Stay quiet", "Give tips", "Get frustrated"] },
    { question: "How competitive are you on court?", category: "padel", options: ["Win at all costs", "Competitive but chill", "Mostly for fun", "Just to socialise"] },
    { question: "Ideal padel session?", category: "padel", options: ["Friendly Americano", "Serious match", "Drills + match", "Quick fun game"] },
    { question: "Current relationship status?", category: "status", options: ["Single", "Dating around", "In a situationship", "Recently out of one", "It's complicated"] },
    { question: "Do you want kids (or more)?", category: "status", options: ["Yes, definitely", "Maybe someday", "Not sure", "No"] },
    { question: "Do you already have kids?", category: "status", options: ["No", "Yes, they live with me", "Yes, part-time", "Grown up already"] },
    { question: "Your work life right now?", category: "lifestyle", options: ["Employed 9–6", "Self-employed", "Founder/entrepreneur", "Studying", "Between things"] },
    { question: "Highest education level?", category: "status", options: ["High school", "Bachelor's", "Master's", "PhD", "Self-taught"] },
    { question: "Living situation?", category: "lifestyle", options: ["Alone", "With partner", "With family", "Flatmates", "Move around a lot"] },
    { question: "Do you smoke?", category: "lifestyle", options: ["Never", "Socially", "Regularly", "Trying to quit"] },
    { question: "Drinking habits?", category: "lifestyle", options: ["Never", "Socially", "Weekends", "Wine with dinner", "Sober"] },
    { question: "Fitness routine?", category: "lifestyle", options: ["Daily", "3–4x a week", "Just padel", "When I feel like it"] },
    { question: "Diet style?", category: "lifestyle", options: ["Anything goes", "Mostly healthy", "Vegetarian", "Vegan", "Pescatarian"] },
    { question: "How often do you travel?", category: "lifestyle", options: ["Every month", "A few times a year", "Once a year", "Rarely"] },
    { question: "Pets?", category: "lifestyle", options: ["Dog person", "Cat person", "Both", "Neither", "Allergic"] },
    { question: "How religious are you?", category: "values", options: ["Very", "Spiritual not religious", "Culturally", "Not at all"] },
    { question: "Politics matter in a partner?", category: "values", options: ["A lot", "Somewhat", "Not really", "Prefer not to say"] },
    { question: "Sleep schedule?", category: "lifestyle", options: ["Early bird", "Night owl", "Depends on the day"] },
    { question: "Ambition level?", category: "status", options: ["Career-driven", "Balanced", "Life first, work second", "Still figuring it out"] },

  ],
  es: [
    { question: "¿Cuál es tu lenguaje del amor?", category: "personalidad", options: ["Palabras de afirmación", "Tiempo de calidad", "Contacto físico", "Actos de servicio", "Regalos"] },
    { question: "¿Qué hace que confíes en alguien al instante?", category: "valores", options: ["Consistencia", "Honestidad bajo presión", "Amabilidad con extraños", "Guarda secretos"] },
    { question: "¿Introvertido, extrovertido o ambivertido?", category: "personalidad", options: ["Introvertido", "Extrovertido", "Ambivertido"] },
    { question: "¿Mayor dealbreaker en una relación?", category: "dealbreakers", options: ["Deshonestidad", "Celos", "Mal carácter", "Sin ambición", "Mente cerrada"] },
    { question: "Cuando estás molesto prefieres…", category: "conflicto", options: ["Hablarlo", "Que te dejen en paz", "Un poco de ambos"] },
    { question: "Tu humor es sobre todo…", category: "humor", options: ["Sarcástico", "Tonto/juguetón", "Ingenioso", "Oscuro", "Sano"] },
    { question: "¿Domingo perfecto?", category: "estilo de vida", options: ["Brunch + paseo", "Deporte + siesta", "Playa/naturaleza", "Casa + peli", "Salir con amigos"] },
    { question: "¿Crees en las almas gemelas?", category: "valores", options: ["Sí", "No", "Más o menos"] },
    { question: "Elige una salida:", category: "social", options: ["Cena 1 a 1", "Salida en grupo", "Fiesta en casa", "Quedarme en casa"] },
    { question: "¿Qué tan importante es el humor compartido?", category: "valores", options: ["Esencial", "Mucho", "Está bien", "No tanto"] },
    { question: "¿Mentalidad con el dinero?", category: "estilo de vida", options: ["Ahorrar primero", "Gastar en experiencias", "Darte caprichos", "Invertir a largo plazo"] },
    { question: "¿Qué lado del pádel prefieres?", category: "pádel", options: ["Derecha (drive)", "Izquierda (revés)", "Ambos", "Aún descubriéndolo"] },
    { question: "Tu estilo de juego es…", category: "pádel", options: ["Agresivo, remate", "Defensivo, muro", "Táctico/paciente", "Social, por diversión"] },
    { question: "Después de un partido duro…", category: "pádel", options: ["Me desahogo", "Bromeo", "Silencio", "Analizo cada punto"] },
    { question: "Tu compañero falla una fácil — tú…", category: "pádel", options: ["Lo animo", "Callo", "Doy consejos", "Me frustro"] },
    { question: "¿Qué tan competitivo en pista?", category: "pádel", options: ["Ganar a toda costa", "Competitivo pero tranqui", "Por diversión", "Solo por socializar"] },
    { question: "¿Sesión ideal de pádel?", category: "pádel", options: ["Americano amistoso", "Partido serio", "Drills + partido", "Juego rápido divertido"] },
    { question: "¿Situación sentimental actual?", category: "estatus", options: ["Soltero/a", "Conociendo gente", "En un lío", "Recién salido/a de una relación", "Es complicado"] },
    { question: "¿Quieres tener hijos (o más)?", category: "estatus", options: ["Sí, seguro", "Quizás algún día", "No lo sé", "No"] },
    { question: "¿Ya tienes hijos?", category: "estatus", options: ["No", "Sí, viven conmigo", "Sí, a tiempo parcial", "Ya son mayores"] },
    { question: "¿Tu vida laboral ahora?", category: "estilo de vida", options: ["Empleado 9–6", "Autónomo", "Emprendedor/fundador", "Estudiando", "Entre etapas"] },
    { question: "¿Nivel de estudios?", category: "estatus", options: ["Bachillerato", "Grado", "Máster", "Doctorado", "Autodidacta"] },
    { question: "¿Con quién vives?", category: "estilo de vida", options: ["Solo/a", "Con mi pareja", "Con familia", "Con compañeros", "Me muevo mucho"] },
    { question: "¿Fumas?", category: "estilo de vida", options: ["Nunca", "Socialmente", "Con frecuencia", "Intentando dejarlo"] },
    { question: "¿Bebes alcohol?", category: "estilo de vida", options: ["Nunca", "Socialmente", "Fines de semana", "Vino con la cena", "Sobrio/a"] },
    { question: "¿Rutina de deporte?", category: "estilo de vida", options: ["Diaria", "3–4 veces/semana", "Solo pádel", "Cuando me apetece"] },
    { question: "¿Tipo de dieta?", category: "estilo de vida", options: ["De todo", "Sano en general", "Vegetariana", "Vegana", "Pescetariana"] },
    { question: "¿Con qué frecuencia viajas?", category: "estilo de vida", options: ["Cada mes", "Varias veces al año", "Una vez al año", "Casi nunca"] },
    { question: "¿Mascotas?", category: "estilo de vida", options: ["Perros", "Gatos", "Ambos", "Ninguno", "Alérgico/a"] },
    { question: "¿Qué tan religioso/a eres?", category: "valores", options: ["Mucho", "Espiritual, no religioso/a", "Culturalmente", "Nada"] },
    { question: "¿La política importa en tu pareja?", category: "valores", options: ["Mucho", "Algo", "No mucho", "Prefiero no decirlo"] },
    { question: "¿Horario de sueño?", category: "estilo de vida", options: ["Madrugador/a", "Noctámbulo/a", "Depende del día"] },
    { question: "¿Nivel de ambición?", category: "estatus", options: ["Enfocado/a en carrera", "Equilibrado/a", "Vida primero, trabajo segundo", "Aún descubriéndolo"] },

  ],
  fr: [
    { question: "Quel est ton langage de l'amour ?", category: "personnalité", options: ["Paroles valorisantes", "Temps de qualité", "Contact physique", "Actes de service", "Cadeaux"] },
    { question: "Qu'est-ce qui te fait faire confiance à quelqu'un immédiatement ?", category: "valeurs", options: ["La constance", "L'honnêteté sous pression", "La gentillesse envers les inconnus", "Garder les secrets"] },
    { question: "Introverti·e, extraverti·e ou entre les deux ?", category: "personnalité", options: ["Introverti·e", "Extraverti·e", "Ambiverti·e"] },
    { question: "Ton plus gros dealbreaker en couple ?", category: "dealbreakers", options: ["Malhonnêteté", "Jalousie", "Mauvais caractère", "Sans ambition", "Esprit fermé"] },
    { question: "Quand tu es contrarié·e, tu préfères…", category: "conflit", options: ["En parler", "Être seul·e", "Un peu des deux"] },
    { question: "Ton humour est surtout…", category: "humour", options: ["Sec/sarcastique", "Bête/espiègle", "Spirituel/malin", "Sombre", "Bon enfant"] },
    { question: "Dimanche parfait ?", category: "style de vie", options: ["Brunch + balade", "Sport + sieste", "Plage/nature", "Maison + film", "Sortie entre amis"] },
    { question: "Tu crois aux âmes sœurs ?", category: "valeurs", options: ["Oui", "Non", "Un peu"] },
    { question: "Choisis une soirée :", category: "social", options: ["Dîner en tête-à-tête", "Soirée en groupe", "Fête à la maison", "Rester chez soi"] },
    { question: "Importance d'un humour partagé ?", category: "valeurs", options: ["Essentiel", "Très", "Sympa", "Pas vraiment"] },
    { question: "Rapport à l'argent ?", category: "style de vie", options: ["Épargner d'abord", "Dépenser en expériences", "Se faire plaisir souvent", "Investir long terme"] },
    { question: "Quel côté du padel préfères-tu ?", category: "padel", options: ["Droite (drive)", "Gauche (revers)", "Les deux", "Encore à déterminer"] },
    { question: "Ton style de jeu est…", category: "padel", options: ["Smasheur agressif", "Mur défensif", "Tactique/patient", "Fun avant tout"] },
    { question: "Après un match difficile tu…", category: "padel", options: ["Je déballe tout", "Je plaisante", "Je reste silencieux·se", "J'analyse chaque point"] },
    { question: "Ton partenaire rate une balle facile — tu…", category: "padel", options: ["L'encourage", "Reste silencieux·se", "Donne des conseils", "Je m'agace"] },
    { question: "Ton niveau de compétitivité sur pista ?", category: "padel", options: ["Gagner à tout prix", "Compétitif mais cool", "Surtout pour le fun", "Juste pour socialiser"] },
    { question: "Session de padel idéale ?", category: "padel", options: ["Americano amical", "Match sérieux", "Drills + match", "Partie rapide et fun"] },
    { question: "Situation sentimentale actuelle ?", category: "statut", options: ["Célibataire", "Je rencontre du monde", "Dans une situationship", "Sortie récente d'une relation", "C'est compliqué"] },
    { question: "Tu veux des enfants (ou plus) ?", category: "statut", options: ["Oui, sûr", "Peut-être un jour", "Je ne sais pas", "Non"] },
    { question: "Tu as déjà des enfants ?", category: "statut", options: ["Non", "Oui, ils vivent avec moi", "Oui, à temps partiel", "Déjà grands"] },
    { question: "Ta vie pro en ce moment ?", category: "style de vie", options: ["Salarié·e 9–18h", "Indépendant·e", "Fondateur/entrepreneur", "Études", "Entre deux"] },
    { question: "Niveau d'études le plus élevé ?", category: "statut", options: ["Bac", "Licence", "Master", "Doctorat", "Autodidacte"] },
    { question: "Situation de logement ?", category: "style de vie", options: ["Seul·e", "Avec mon·ma partenaire", "Avec la famille", "Colocation", "Je bouge souvent"] },
    { question: "Tu fumes ?", category: "style de vie", options: ["Jamais", "En société", "Régulièrement", "J'essaie d'arrêter"] },
    { question: "Habitudes d'alcool ?", category: "style de vie", options: ["Jamais", "En société", "Week-ends", "Un verre au dîner", "Sobre"] },
    { question: "Routine sportive ?", category: "style de vie", options: ["Quotidienne", "3–4x par semaine", "Que du padel", "Quand j'en ai envie"] },
    { question: "Type d'alimentation ?", category: "style de vie", options: ["Je mange de tout", "Plutôt sain", "Végétarien·ne", "Végan·e", "Pescétarien·ne"] },
    { question: "À quelle fréquence voyages-tu ?", category: "style de vie", options: ["Chaque mois", "Quelques fois par an", "Une fois par an", "Rarement"] },
    { question: "Animaux ?", category: "style de vie", options: ["Chien", "Chat", "Les deux", "Aucun", "Allergique"] },
    { question: "Ton degré de religion ?", category: "valeurs", options: ["Très", "Spirituel·le non religieux·se", "Culturellement", "Pas du tout"] },
    { question: "La politique compte chez un·e partenaire ?", category: "valeurs", options: ["Beaucoup", "Un peu", "Pas vraiment", "Je préfère ne pas dire"] },
    { question: "Horaire de sommeil ?", category: "style de vie", options: ["Lève-tôt", "Couche-tard", "Ça dépend"] },
    { question: "Niveau d'ambition ?", category: "statut", options: ["Focus carrière", "Équilibré·e", "Vie d'abord, travail ensuite", "Je cherche encore"] },
  ],
};

// ===================== Admin =====================

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return Boolean(data);
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const [profilesRes, matchesRes, likesRes, feedbackRes, reportsRes, allProfilesRes, recentFeedbackRes, authUsersRes] = await Promise.all([
      supabaseAdmin.from("profiles" as never).select("id", { count: "exact", head: true }).eq("is_seed", false),
      supabaseAdmin.from("matches" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("likes" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("feedback" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("reports" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles" as never)
        .select("id, user_id, first_name, age, zone, created_at, suspended_at")
        .eq("is_seed", false)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("feedback" as never)
        .select("id, rating, message, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    type ProfileRow = { id: string; user_id: string; first_name: string | null; age: number | null; zone: string | null; created_at: string; suspended_at: string | null };
    const profileRows = (allProfilesRes.data ?? []) as ProfileRow[];
    const profilesByUser = new Map(profileRows.map((p) => [p.user_id, p]));

    const authUsers = authUsersRes.data?.users ?? [];
    const allSignups = authUsers.map((u) => {
      const p = profilesByUser.get(u.id);
      return {
        user_id: u.id,
        email: u.email ?? null,
        signed_up_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed: Boolean(u.email_confirmed_at),
        profile_completed: Boolean(p),
        first_name: p?.first_name ?? null,
        age: p?.age ?? null,
        zone: p?.zone ?? null,
        suspended: Boolean(p?.suspended_at),
      };
    }).sort((a, b) => (b.signed_up_at ?? "").localeCompare(a.signed_up_at ?? ""));

    return {
      counts: {
        users: profilesRes.count ?? 0,
        signups: authUsers.length,
        incomplete: authUsers.length - profileRows.length,
        matches: matchesRes.count ?? 0,
        likes: likesRes.count ?? 0,
        feedback: feedbackRes.count ?? 0,
        reports: reportsRes.count ?? 0,
      },
      allSignups,
      recentFeedback: (recentFeedbackRes.data ?? []) as Array<{
        id: string; rating: number; message: string; created_at: string;
      }>,
    };
  });


// AI-generated compatibility summary between me and another profile.
// Cached in compatibility_scores to keep it cheap and stable.
export const getAiCompatibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ otherProfileId: z.string().uuid(), lang: z.enum(["en", "es", "fr"]).optional().default("en") }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: meRow } = await context.supabase
      .from("profiles" as never).select("*").eq("user_id", context.userId).maybeSingle();
    const me = meRow as Profile | null;
    if (!me) throw new Error("Create your profile first");
    if (me.id === data.otherProfileId) throw new Error("Cannot compare to yourself");

    const [a, b] = me.id < data.otherProfileId ? [me.id, data.otherProfileId] : [data.otherProfileId, me.id];

    // Content-aware cache key: prompt version + shared intent shape + QA volume.
    // Regenerates when either person's intents change or they answer more Qs.
    const { count: myQaCount } = await context.supabase
      .from("qa_answers" as never).select("*", { count: "exact", head: true }).eq("profile_id", me.id);

    // 1. Cache hit? (we build the full version key after loading the other profile below)

    const { data: cached } = await context.supabase
      .from("compatibility_scores" as never)
      .select("score, blurb, reasons, friction, sub_scores, model_version, created_at")
      .eq("profile_a", a)
      .eq("profile_b", b)
      .maybeSingle();


    // 2. Gather both profiles + Q&A (via admin — reading other user data)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: otherRow } = await supabaseAdmin
      .from("profiles" as never).select("*").eq("id", data.otherProfileId).maybeSingle();
    const other = otherRow as Profile | null;
    if (!other) throw new Error("Profile not found");

    const { data: qaRows, count: theirQaCount } = await supabaseAdmin
      .from("qa_answers" as never)
      .select("profile_id, question, answer", { count: "exact" })
      .in("profile_id", [me.id, other.id])
      .limit(200);
    const qa = ((qaRows as Array<{ profile_id: string; question: string; answer: string }> | null) ?? []);
    const myQA = qa.filter((r) => r.profile_id === me.id).slice(0, 20);
    const theirQA = qa.filter((r) => r.profile_id === other.id).slice(0, 20);

    // Version key incorporates intents + QA volume so the cache invalidates
    // when either person changes what they're looking for or answers more Qs.
    const myIntentsArr = ((me.intents ?? []) as string[]).slice().sort();
    const theirIntentsArr = ((other.intents ?? []) as string[]).slice().sort();
    const lang = data.lang ?? "en";
    const versionKey = `v10-${lang}-${myIntentsArr.join(",") || "-"}|${theirIntentsArr.join(",") || "-"}|${myQaCount ?? 0}x${theirQaCount ?? 0}`;

    if (cached && (cached as { model_version?: string }).model_version === versionKey) {
      return cached as unknown as { score: number; blurb: string; reasons: string[]; friction: string | null; sub_scores: { padel?: number; personality?: number; friend?: number; relationship?: number; padel_analysis?: string; personality_analysis?: string } | null; model_version: string; created_at: string };
    }

    const summarizeProfile = (p: Profile, tag: string) => `${tag}: ${p.first_name}, ${p.age}, ${p.gender}${p.gender_custom ? ` (${p.gender_custom})` : ""}
- Padel level: ${p.level}
- Nationality: ${p.nationality}
- Languages: ${(p.languages ?? []).join(", ") || "n/a"}
- Looking for: ${(p.intents ?? []).join(", ") || p.looking_for || "n/a"}
- Values (top): ${(p.priorities ?? []).slice(0, 5).join(", ") || "n/a"}
- Personal traits: ${(p.personal_traits ?? []).join(", ") || "n/a"}
- Padel style: ${(p.padel_style ?? []).join(", ") || "n/a"}
- Availability: ${(p.availability ?? []).join(", ") || "n/a"}
- Bio: ${p.bio ?? "n/a"}`;

    const qaBlock = (rows: Array<{ question: string; answer: string }>) =>
      rows.length ? rows.map((r) => `- ${r.question} → ${r.answer}`).join("\n") : "(no answers)";

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      const fallback = { score: 60, blurb: "Not enough signal to run AI compatibility right now — try again later.", reasons: [] as string[], friction: null as string | null, sub_scores: null as null | { padel?: number; personality?: number; friend?: number; relationship?: number; padel_analysis?: string; personality_analysis?: string }, model_version: "fallback", created_at: new Date().toISOString() };
      return fallback;
    }

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const myIntents = new Set(myIntentsArr);
    const theirIntents = new Set(theirIntentsArr);
    const sharedIntents = myIntentsArr.filter((i) => theirIntents.has(i));
    const asymmetric = [...myIntents, ...theirIntents].filter((i) => !sharedIntents.includes(i));
    const focusFor = (intent: string) => {
      if (intent === "relationship") return `RELATIONSHIP FOCUS — both are open to dating. Weight (but do not limit to): shared values, emotional style, lifestyle fit and aspirations, attraction-related preferences, communication tone. Padel skill matters less here.`;
      if (intent === "padel") return `TEAMMATE FOCUS — both want a padel partner. Weight (but do not limit to): skill level, competitiveness, schedule/availability, reliability, communication, on-court role balance (e.g. right/left side, aggressive/defensive).`;
      if (intent === "friend") return `FRIENDSHIP FOCUS — both are open to friendship. Weight (but do not limit to): shared interests, ease of interaction, lifestyle overlap where relevant, openness, consistency, mutual enjoyment. Remember: people with very different life situations (income, marital status, kids, career stage) can be excellent friends — personality, shared interests, background and shared experiences matter far more than surface life-stage differences.`;
      return "";
    };
    const intentGuidance = sharedIntents.length > 0
      ? sharedIntents.map(focusFor).filter(Boolean).join("\n")
      : `GENERAL FOCUS — intents don't clearly overlap. Focus on padel fit and easy friendship rather than romance.`;

    const asymNote = asymmetric.length > 0 && sharedIntents.length > 0
      ? `NOTE ON ASYMMETRIC INTENTS: one of you is also open to "${asymmetric.join(", ")}" while the other isn't. Score for the SHARED intent(s) only. You may add a single gentle line in "watch_out" that expectations differ on that dimension — never moralize, never say anyone is wrong.`
      : "";

    const extraSubs = sharedIntents.filter((k) => k === "friend" || k === "relationship");

    const langInstruction = lang === "es"
      ? "Responde SIEMPRE en español."
      : lang === "fr"
        ? "Réponds TOUJOURS en français."
        : "Always reply in English.";

    const prompt = `You are a thoughtful, respectful compatibility analyst for a padel-focused connection app (padel partners, friendship, sometimes more). Give the reader a clear, accurate, useful read — honest, warm, diplomatic, wise and kind.

${langInstruction}

INTENT-BASED FOCUS (apply the ones that fit this pair; these are guidance, not hard rules):
${intentGuidance}
${asymNote}

Rules for judgment:
- Most people can enjoy padel together and even become good friends despite different lifestyles, life stages, ages, incomes, or family situations (single, married, with or without kids). Treat differences as normal and often enriching, not as problems. Personality, shared interests, background and shared experiences matter more than surface life-stage differences.
- Only flag something as a real consideration when the answers themselves point to a concrete thing that would actually affect playing together, getting along, or (if both want dating) building a relationship — e.g. very different available time slots, very different on-court intensity, one wants competitive tournaments and the other purely social hits.
- Distinguish COMPLEMENTARY differences (introvert + extrovert who both value calm; aggressive + defensive on court) from actual mismatches. When unsure, treat as complementary or neutral.
- Same nationality, same city, or both "open-minded / friendly / flexible" are filler — skip them.
- ANTI-HALLUCINATION: Only cite a trait, answer, or bio detail if it actually appears in the profile data above. Never invent hobbies, jobs, family status, preferences or life details. If evidence is thin, say so gently and score in the 60-70 range.
- Grade fairly on this curve: 85-100 rare and truly strong, 70-84 solid fit, 55-69 good with a couple of things to be aware of, 40-54 mixed, 0-39 poor fit.
- CRITICAL — the two sub-scores MUST match the tone of their analysis paragraphs. A 90+ score requires a genuinely enthusiastic paragraph; a 60 score requires a paragraph that explicitly names what's mixed. The blurb, reasons, and both analyses must all point at the same overall picture. Do not write a warm paragraph and then a low score, or a lukewarm paragraph and then a high score.
- The overall picture is a blend of on-court fit (padel) and off-court fit (personality). Weight them roughly equally.
- The "watch_out" field is OPTIONAL and should usually be null. Only fill it when there is a concrete, evidence-based thing to gently be aware of. Never fill it for lifestyle / life-stage / personality differences alone.
- Blurb should be warm, grounded, diplomatic and accurate — no flattery, no empty praise, no verdicts about their lives.

RESPECT & TONE RULES (very important):
- Language must be truthful but diplomatic, wise, and kind. Avoid strong or harsh words entirely — they are often misleading and always feel bad to read.
- Never compare one person's life situation to the other's in a way that could feel like a value judgment. Do NOT say things like "unlike them, you are single / have no kids / are not married / don't have a family". Never imply someone's life is lesser, emptier, behind, or missing something.
- Life-stage or lifestyle topics (relationship status, kids, family, religion, income, career stage, living situation, age gap) should generally NOT be mentioned. Only mention them if BOTH people clearly signalled them AND it directly affects whether they can play padel together or hang out (e.g. very different available time slots). Frame it neutrally as "your available time slots differ" — never as one being better than the other.
- Do not moralize about drinking, smoking, partying, dating history, body, appearance, career choices, or income.
- Address the reader as "you two" — never single out one person as the problem.
- BANNED words and phrasings: "friction", "clash", "clashing", "conflict", "mismatch" (as a label), "incompatible", "problem", "issue", "red flag", "warning", "sadly", "unfortunately", "shame", "wasted", "behind", "missing out". Use gentle phrasing like "worth being aware of", "something to check together", "differs from yours", "keep in mind".
- Also avoid empty praise: "wonderful", "amazing", "great connection", "click", "beautiful".

Return ONLY valid JSON with this exact shape:
{
  "sub_scores": {
    "padel": <0-100 integer — on-court fit: level, style, intensity, availability, reliability>,
    "personality": <0-100 integer — off-court fit: values, humor, social energy, communication, shared interests>${extraSubs.length ? ", " + extraSubs.map((k) => `"${k}": <0-100 integer>`).join(", ") : ""}
  },
  "padel_analysis": "<2-4 complete sentences (max 600 chars, always end with a full stop) explaining the padel/on-court compatibility SPECIFICALLY. Reference their actual levels, styles, availability, on-court preferences. The tone MUST match the padel sub-score above.>",
  "personality_analysis": "<2-4 complete sentences (max 600 chars, always end with a full stop) explaining the personality/off-court compatibility SPECIFICALLY. Reference their actual values, traits, Q&A answers, communication style. The tone MUST match the personality sub-score above.>",
  "blurb": "<one to two grounded, respectful sentences addressed to the reader ('you two...'). Max 220 chars. Summarizes the overall picture — must be consistent with both analyses. IMPORTANT: do NOT repeat facts, traits or phrases that also appear in padel_analysis or personality_analysis. The blurb is the headline; the analyses do the detail.>",
  "watch_out": "<one short, respectful line naming a concrete thing to gently be aware of, grounded in their answers. Null if none — this is usually null.>"
}

${summarizeProfile(me, "PERSON A (the viewer)")}
Q&A:
${qaBlock(myQA)}

${summarizeProfile(other, "PERSON B")}
Q&A:
${qaBlock(theirQA)}`;

    let score = 60;
    let blurb = "Not enough signal yet — answer more questions to sharpen this.";
    let reasons: string[] = [];
    let friction: string | null = null;
    type SubScoresShape = { padel?: number; personality?: number; friend?: number; relationship?: number; padel_analysis?: string; personality_analysis?: string };
    let subScores: SubScoresShape | null = null;
    const allowedSubKeys = new Set(["padel", "personality", ...extraSubs]);
    try {
      const res = await generateText({ model, prompt, temperature: 0.6 });
      const text = (res.text ?? "").replace(/```json|```/g, "").trim();
      const s = text.indexOf("{"); const e = text.lastIndexOf("}");
      const parsed = JSON.parse(text.slice(s, e + 1)) as { score?: number; blurb?: string; reasons?: unknown; friction?: unknown; watch_out?: unknown; sub_scores?: unknown; padel_analysis?: unknown; personality_analysis?: unknown };
      if (typeof parsed.blurb === "string" && parsed.blurb.trim().length > 0) blurb = parsed.blurb.trim().slice(0, 280);
      if (Array.isArray(parsed.reasons)) {
        reasons = parsed.reasons.filter((r): r is string => typeof r === "string").map((r) => r.trim().slice(0, 120)).filter((r) => r.length > 0).slice(0, 3);
      }
      const watchRaw = typeof parsed.watch_out === "string" ? parsed.watch_out : typeof parsed.friction === "string" ? parsed.friction : "";
      if (watchRaw.trim().length > 0 && watchRaw.trim().toLowerCase() !== "null") {
        friction = watchRaw.trim().slice(0, 160);
      }
      const cleanSub: Record<string, number> = {};
      if (parsed.sub_scores && typeof parsed.sub_scores === "object") {
        for (const [k, v] of Object.entries(parsed.sub_scores as Record<string, unknown>)) {
          if (allowedSubKeys.has(k) && typeof v === "number") {
            cleanSub[k] = Math.max(0, Math.min(100, Math.round(v)));
          }
        }
      }
      const padelAnalysis = typeof parsed.padel_analysis === "string" ? parsed.padel_analysis.trim().slice(0, 700) : "";
      const personalityAnalysis = typeof parsed.personality_analysis === "string" ? parsed.personality_analysis.trim().slice(0, 700) : "";
      if (Object.keys(cleanSub).length > 0 || padelAnalysis || personalityAnalysis) {
        subScores = { ...cleanSub, padel_analysis: padelAnalysis, personality_analysis: personalityAnalysis };
      }
      // Derive overall score from sub-scores so header % matches the analyses.
      const parts: number[] = [];
      if (typeof cleanSub.padel === "number") parts.push(cleanSub.padel);
      if (typeof cleanSub.personality === "number") parts.push(cleanSub.personality);
      if (parts.length > 0) {
        score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
      } else if (typeof parsed.score === "number") {
        score = Math.max(0, Math.min(100, Math.round(parsed.score)));
      }
    } catch (e) {
      blurb = e instanceof Error && e.message.includes("402")
        ? "AI credits exhausted — top up in Settings to unlock this."
        : blurb;
    }

    const insertRow = { profile_a: a, profile_b: b, score, blurb, reasons, friction, sub_scores: subScores, model_version: versionKey };
    await supabaseAdmin.from("compatibility_scores" as never).upsert(insertRow as never, { onConflict: "profile_a,profile_b" } as never);
    return { ...insertRow, created_at: new Date().toISOString() };
  });


// Thumbs up/down on the AI compatibility take for a specific profile.
export const rateAiCompatibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    otherProfileId: z.string().uuid(),
    thumbs: z.union([z.literal(1), z.literal(-1)]),
    reason: z.string().max(60).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("compatibility_feedback" as never)
      .upsert(
        { rater_profile_id: myId, subject_profile_id: data.otherProfileId, thumbs: data.thumbs, feedback_reason: data.reason ?? null } as never,
        { onConflict: "rater_profile_id,subject_profile_id" } as never,
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const getMyAiCompatibilityFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ otherProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) return { thumbs: 0 as 0 | 1 | -1 };
    const { data: row } = await context.supabase
      .from("compatibility_feedback" as never)
      .select("thumbs")
      .eq("rater_profile_id", myId)
      .eq("subject_profile_id", data.otherProfileId)
      .maybeSingle();
    return { thumbs: ((row as { thumbs: number } | null)?.thumbs ?? 0) as 0 | 1 | -1 };
  });

// Post-play match rating (1–5 stars + optional tags/comment).
export const submitMatchRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    matchId: z.string().uuid(),
    stars: z.number().int().min(1).max(5),
    tags: z.array(z.string().max(40)).max(8).default([]),
    comment: z.string().max(400).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { data: match } = await context.supabase
      .from("matches" as never).select("profile_a, profile_b").eq("id", data.matchId).maybeSingle();
    const mr = match as { profile_a: string; profile_b: string } | null;
    if (!mr) throw new Error("Match not found");
    if (mr.profile_a !== myId && mr.profile_b !== myId) throw new Error("Not your match");
    const otherId = mr.profile_a === myId ? mr.profile_b : mr.profile_a;
    const { error } = await context.supabase
      .from("match_ratings" as never)
      .upsert(
        {
          match_id: data.matchId,
          rater_profile_id: myId,
          rated_profile_id: otherId,
          stars: data.stars,
          tags: data.tags,
          comment: data.comment ?? null,
        } as never,
        { onConflict: "match_id,rater_profile_id" } as never,
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyMatchRating = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) return null;
    const { data: row } = await context.supabase
      .from("match_ratings" as never)
      .select("stars, tags, comment, created_at")
      .eq("match_id", data.matchId)
      .eq("rater_profile_id", myId)
      .maybeSingle();
    return (row as { stars: number; tags: string[]; comment: string | null; created_at: string } | null);
  });


export const reportPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      reportedProfileId: z.string().uuid(),
      reason: z.string().min(3).max(500).default("Inappropriate photo"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    if (myId === data.reportedProfileId) throw new Error("Cannot report yourself");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles" as never)
      .select("user_id, photo_url")
      .eq("id", data.reportedProfileId)
      .maybeSingle();
    const targetRow = target as { user_id: string | null; photo_url: string | null } | null;

    // Log report with photo category (idempotent per reporter+target+category)
    const { data: existing } = await supabaseAdmin
      .from("reports" as never)
      .select("id")
      .eq("reporter_profile_id", myId)
      .eq("reported_profile_id", data.reportedProfileId)
      .eq("category", "photo")
      .eq("status", "pending")
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("reports" as never).insert({
        reporter_profile_id: myId,
        reported_profile_id: data.reportedProfileId,
        reported_user_id: targetRow?.user_id ?? null,
        reason: data.reason,
        category: "photo",
        status: "pending",
      } as never);
    }

    // Auto-hide photo after 2+ distinct reporters flag it (community moderation)
    const { data: distinct } = await supabaseAdmin
      .from("reports" as never)
      .select("reporter_profile_id")
      .eq("reported_profile_id", data.reportedProfileId)
      .eq("category", "photo")
      .eq("status", "pending");
    const distinctCount = new Set(
      ((distinct as Array<{ reporter_profile_id: string }> | null) ?? []).map((r) => r.reporter_profile_id),
    ).size;
    if (distinctCount >= 2 && targetRow?.photo_url) {
      await supabaseAdmin
        .from("profiles" as never)
        .update({
          photo_url: null,
          photo_moderation_status: "rejected",
          photo_moderation_reason: "community_flagged",
        } as never)
        .eq("id", data.reportedProfileId);
    }

    return { ok: true, distinctCount };
  });
