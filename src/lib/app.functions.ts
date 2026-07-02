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

export const updateMyPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ photo_url: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles" as never)
      .update({ photo_url: data.photo_url } as never)
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

  const shared = sharedIntents(me, c);
  if (shared.length === 0) return { score: 0, reasons, categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };
  // Audience gating only matters for social intents (friend / relationship).
  // Padel-only overlap ignores gender preference — it's just a game.
  const socialOnly = shared.filter((s) => s !== "padel");
  const primary = socialOnly.includes("relationship") ? "relationship" : socialOnly.includes("friend") ? "friend" : null;
  if (primary) {
    const myAudience = primary === "relationship" ? me.partner_interested_in : me.friend_interested_in;
    const theirAudience = primary === "relationship" ? c.partner_interested_in : c.friend_interested_in;
    const myAud = (myAudience && myAudience.length > 0) ? myAudience : (me.interested_in as string[]);
    const theirAud = (theirAudience && theirAudience.length > 0) ? theirAudience : (c.interested_in as string[]);
    if (!audienceAcceptsGender(myAud, c.gender)) return { score: 0, reasons, categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };
    if (!audienceAcceptsGender(theirAud, me.gender)) return { score: 0, reasons, categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };
  }

  score += 6;

  const meLikesAge = c.age >= me.age_min && c.age <= me.age_max;
  const theyLikeAge = me.age >= c.age_min && me.age <= c.age_max;
  if (meLikesAge && theyLikeAge) { score += 22; reasons.push("Ages line up both ways"); }
  else if (meLikesAge || theyLikeAge) { score += 8; }
  else return { score: 0, reasons, categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };

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
    return { score: 0, reasons: [], categories: { playingStyle: 0, personality: 0, lifestyle: 0, vibe: 0 } };
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
  .handler(async ({ context }) => {
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
    const blockedSet = new Set(((myBlocks as Array<{ blocked_profile_id: string }> | null) ?? []).map((b) => b.blocked_profile_id));
    const hiddenMap = new Map<string, Set<string>>();
    ((myHides as Array<{ hidden_profile_id: string; category: string }> | null) ?? []).forEach((h) => {
      const set = hiddenMap.get(h.hidden_profile_id) ?? new Set<string>();
      set.add(h.category);
      hiddenMap.set(h.hidden_profile_id, set);
    });
    const likedSet = new Set(((myLikes as Array<{ liked_profile_id: string }> | null) ?? []).map((l) => l.liked_profile_id));

    const candidates = ((candRows as Profile[] | null) ?? []).filter((c) => {
      if (blockedSet.has(c.id)) return false;
      const cats = hiddenMap.get(c.id);
      // hide only when "all" — category-specific hides are filtered client-side per active filter
      return !cats || !cats.has("all");
    }).map((c) => ({ ...c, hidden_categories: Array.from(hiddenMap.get(c.id) ?? []) }));

    // QA affinity: pull my answers + all candidate answers via admin (RLS would otherwise block reading others)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [me.id, ...candidates.map((c) => c.id)];
    const { data: qaRows } = await supabaseAdmin
      .from("qa_answers" as never)
      .select("profile_id, question, answer_norm")
      .in("profile_id", ids);
    const byProfile = new Map<string, Map<string, string>>();
    ((qaRows as Array<{ profile_id: string; question: string; answer_norm: string }> | null) ?? []).forEach((r) => {
      let m = byProfile.get(r.profile_id);
      if (!m) { m = new Map(); byProfile.set(r.profile_id, m); }
      m.set(r.question, r.answer_norm);
    });
    const myAns = byProfile.get(me.id) ?? new Map<string, string>();

    const scored = candidates
      .map((c) => {
        const { score, reasons, categories } = scoreCandidate(me, c);
        // Shared-question bonus
        const theirAns = byProfile.get(c.id) ?? new Map<string, string>();
        let qaBonus = 0;
        let qSame = 0;
        let qShared = 0;
        myAns.forEach((v, q) => {
          if (theirAns.has(q)) {
            qShared++;
            if (theirAns.get(q) === v) { qaBonus += 5; qSame++; }
            else qaBonus += 1;
          }
        });
        const bonus = Math.min(30, qaBonus);
        const finalScore = Math.min(100, score + bonus);
        const reasons2 = [...reasons];
        if (qSame >= 2) reasons2.push(`${qSame} matching answers in your Q&A`);
        else if (qShared >= 3) reasons2.push(`${qShared} questions both of you answered`);
        const pub = stripPrivateFields(c);
        const vibe = Math.min(100, Math.round(categories.vibe + bonus * 2.5 + (qShared > 0 ? 15 : 0)));
        return { ...pub, score: finalScore, reasons: reasons2, liked: likedSet.has(c.id), categories: { ...categories, vibe }, hidden_categories: (c as unknown as { hidden_categories?: string[] }).hidden_categories ?? [] };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

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
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
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
      return {
        match_id: row.id,
        created_at: row.created_at,
        last_message_at: row.last_message_at,
        last_message: last ? { body: last.body, created_at: last.created_at, from_me: last.sender_profile_id === myId } : null,
        unread,
        other: map.get(row.profile_a === myId ? row.profile_b : row.profile_a),
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
      category: z.enum(["partner", "friend", "all"]).default("all"),
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
      category: z.enum(["partner", "friend", "all"]).optional(),
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

    // Log the report for staff review
    await supabaseAdmin.from("reports" as never).insert({
      reporter_profile_id: myId,
      reported_profile_id: data.reportedProfileId,
      reported_user_id: targetUserId,
      reason: data.reason,
      status: "pending",
    } as never);

    // Auto-suspend: instantly hide the reported account everywhere, pending review
    await supabaseAdmin
      .from("profiles" as never)
      .update({ suspended_at: new Date().toISOString() } as never)
      .eq("id", data.reportedProfileId);

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
    // Upsert-like behaviour: delete existing same-question, then insert
    await context.supabase
      .from("qa_answers" as never)
      .delete()
      .eq("profile_id", myId)
      .eq("question", data.question);
    const { error } = await context.supabase
      .from("qa_answers" as never)
      .insert({
        profile_id: myId,
        question: data.question,
        category: data.category,
        answer: data.answer,
        answer_norm: normalizeAnswer(data.answer),
      } as never);
    if (error) throw new Error(error.message);
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
      lang: z.enum(["en", "es"]).default("en"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: meRow } = await context.supabase
      .from("profiles" as never).select("*").eq("user_id", context.userId).maybeSingle();
    const me = meRow as Profile | null;
    if (!me) throw new Error("Create your profile first");

    const { data: existing } = await context.supabase
      .from("qa_answers" as never)
      .select("question")
      .eq("profile_id", me.id)
      .order("created_at", { ascending: false })
      .limit(40);
    const asked = ((existing as Array<{ question: string }> | null) ?? []).map((r) => r.question);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      // Fallback static questions if AI is not configured
      const fallback: GeneratedQuestion[] = FALLBACK_QUESTIONS[data.lang].filter((q) => !asked.includes(q.question)).slice(0, data.count);
      return { questions: fallback };
    }

    const { generateText } = await import("ai");
    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const sys = data.lang === "es"
      ? "Eres una IA experta en compatibilidad y psicología relacional. Generas preguntas cortas, reveladoras y de OPCIÓN MÚLTIPLE para encontrar afinidad real entre personas (amistad, pareja o alma gemela). La mezcla debe ser ~35% personalidad/valores, ~30% estilo de vida y estatus (rutina diaria, situación laboral, nivel de estudios, situación sentimental actual, hijos, hábitos, viajes, salud, fumar/beber, mascotas, vivienda, religión, política) y ~35% pádel (cómo juega, actitud en pista, estilo, mentalidad competitiva). Responde SIEMPRE en español."
      : "You are an AI expert in compatibility and relational psychology. You generate short, revealing, MULTIPLE-CHOICE questions to find real affinity between people (friendship, partner, or soulmate). The mix must be ~35% personality/values, ~30% lifestyle and status (daily routine, work situation, education level, current relationship status, kids, habits, travel, health, smoking/drinking, pets, living situation, religion, politics) and ~35% padel (how they play, on-court attitude, style, competitive mindset). Always reply in English.";

    const prompt = `Person context:
- Age ${me.age}, ${me.gender === "self-describe" ? (me.gender_custom || "self-describe") : me.gender}
- Looking for: ${me.looking_for}
- Nationality: ${me.nationality}
- Languages: ${(me.languages ?? []).join(", ") || "n/a"}
- Top values: ${(me.priorities ?? []).slice(0, 5).join(", ") || "n/a"}

They have already answered these questions (do NOT repeat or paraphrase):
${asked.map((q, i) => `${i + 1}. ${q}`).join("\n") || "(none yet)"}

Generate exactly ${data.count} NEW questions as MULTIPLE CHOICE.
Ratio: ~35% personality (love language, attachment, conflict style, humor, dealbreakers, family, ambition, social energy, intimacy comfort, what makes them feel loved), ~30% lifestyle & status (work/career stage, education, current relationship status, kids or wanting kids, living situation, smoking, drinking, diet, fitness routine, sleep schedule, travel frequency, pets, religion, politics, money mindset, ideal weekend), ~35% padel (preferred side, style aggressive/defensive, how they react to losing, how they treat partners, intensity, social vs competitive, dream playing partner).
EVERY question MUST include 3 to 5 short, mutually exclusive options. No open-ended questions. Keep options under 6 words each. Warm, specific, never generic. Never ask for income amounts.

Return ONLY valid JSON, no prose, no markdown:
{"questions":[{"question":"...","category":"lifestyle","options":["opt1","opt2","opt3","opt4"]}]}
Categories must be lowercase single words (personality, values, lifestyle, status, padel, etc.).`;



    let text = "";
    try {
      const res = await generateText({ model, system: sys, prompt, temperature: 0.9 });
      text = res.text ?? "";
    } catch (e) {
      const fallback: GeneratedQuestion[] = FALLBACK_QUESTIONS[data.lang].filter((q) => !asked.includes(q.question)).slice(0, data.count);
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
    const out: GeneratedQuestion[] = (parsed.questions ?? [])
      .filter((q) => q && typeof q.question === "string" && q.question.length > 3)
      .filter((q) => Array.isArray(q.options) && q.options.length >= 2)
      .filter((q) => !asked.includes(q.question))
      .slice(0, data.count)
      .map((q) => ({
        question: q.question.trim(),
        category: (q.category ?? "general").toLowerCase().slice(0, 30),
        options: (q.options as string[]).slice(0, 5).map((o) => String(o).slice(0, 80)),
      }));
    return { questions: out };
  });

const FALLBACK_QUESTIONS: Record<"en" | "es", GeneratedQuestion[]> = {
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
};

// ===================== Admin =====================

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never);
    return Boolean(data);
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, matchesRes, likesRes, feedbackRes, reportsRes, recentProfilesRes, recentFeedbackRes] = await Promise.all([
      supabaseAdmin.from("profiles" as never).select("id", { count: "exact", head: true }).eq("is_seed", false),
      supabaseAdmin.from("matches" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("likes" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("feedback" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("reports" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles" as never)
        .select("id, first_name, age, zone, created_at, suspended_at")
        .eq("is_seed", false)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("feedback" as never)
        .select("id, rating, message, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return {
      counts: {
        users: profilesRes.count ?? 0,
        matches: matchesRes.count ?? 0,
        likes: likesRes.count ?? 0,
        feedback: feedbackRes.count ?? 0,
        reports: reportsRes.count ?? 0,
      },
      recentProfiles: (recentProfilesRes.data ?? []) as Array<{
        id: string; first_name: string; age: number; zone: string; created_at: string; suspended_at: string | null;
      }>,
      recentFeedback: (recentFeedbackRes.data ?? []) as Array<{
        id: string; rating: number; message: string; created_at: string;
      }>,
    };
  });



