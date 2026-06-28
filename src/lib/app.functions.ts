import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { cultureAffinity, zoneAffinity } from "./affinity";
import { GENDERS, LOOKING_FOR, PADEL_LEVELS, type Profile } from "./types";

const LEVEL_IDX: Record<string, number> = Object.fromEntries(PADEL_LEVELS.map((l, i) => [l, i]));

const ProfileInput = z.object({
  first_name: z.string().min(1).max(40),
  age: z.number().int().min(18).max(99),
  gender: z.enum(GENDERS),
  interested_in: z.array(z.enum(GENDERS)).min(1),
  friend_interested_in: z.array(z.string()).default([]),
  partner_interested_in: z.array(z.string()).default([]),
  age_min: z.number().int().min(18).max(99),
  age_max: z.number().int().min(18).max(99),
  nationality: z.string().min(1).max(40),
  zone: z.string().min(1).max(60),
  level: z.enum(PADEL_LEVELS),
  priorities: z.array(z.string().min(1).max(40)).min(3).max(10),
  looking_for: z.enum(LOOKING_FOR),
  bio: z.string().max(280).nullable().optional(),
  photo_url: z.string().min(1).max(2000).nullable().optional(),
});

function audienceAcceptsGender(audience: string[], gender: string): boolean {
  if (!audience || audience.length === 0) return true;
  if (audience.includes("everyone") || audience.includes("bisexual") || audience.includes("queer")) return true;
  if (gender === "man" && (audience.includes("men") || audience.includes("gay men"))) return true;
  if (gender === "woman" && (audience.includes("women") || audience.includes("lesbian women"))) return true;
  if (gender === "non-binary" && audience.includes("non-binary")) return true;
  return false;
}

function sharedPurpose(a: string, b: string): "partner" | "friend" | null {
  if (a === "partner" && (b === "partner" || b === "both")) return "partner";
  if (b === "partner" && (a === "partner" || a === "both")) return "partner";
  if (a === "friend" && (b === "friend" || b === "both")) return "friend";
  if (b === "friend" && (a === "friend" || a === "both")) return "friend";
  if (a === "both" && b === "both") return "partner";
  return null;
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

function scoreCandidate(me: Profile, c: Profile) {
  const reasons: string[] = [];
  let score = 0;

  const purpose = sharedPurpose(me.looking_for, c.looking_for);
  if (!purpose) return { score: 0, reasons };

  const myAudience = purpose === "partner" ? me.partner_interested_in : me.friend_interested_in;
  const theirAudience = purpose === "partner" ? c.partner_interested_in : c.friend_interested_in;
  // Fallback to legacy interested_in if the purpose-specific list is empty
  const myAud = (myAudience && myAudience.length > 0) ? myAudience : (me.interested_in as string[]);
  const theirAud = (theirAudience && theirAudience.length > 0) ? theirAudience : (c.interested_in as string[]);

  if (!audienceAcceptsGender(myAud, c.gender)) return { score: 0, reasons };
  if (!audienceAcceptsGender(theirAud, me.gender)) return { score: 0, reasons };

  reasons.push(purpose === "partner" ? "Both open to a relationship" : "Both open to friendship");
  score += 6;

  const meLikesAge = c.age >= me.age_min && c.age <= me.age_max;
  const theyLikeAge = me.age >= c.age_min && me.age <= c.age_max;
  if (meLikesAge && theyLikeAge) { score += 22; reasons.push("Ages line up both ways"); }
  else if (meLikesAge || theyLikeAge) { score += 8; }
  else return { score: 0, reasons }; // hard age gate

  const levelGap = Math.abs((LEVEL_IDX[me.level] ?? 0) - (LEVEL_IDX[c.level] ?? 0));
  if (levelGap === 0) { score += 18; reasons.push("Same padel level — fair match"); }
  else if (levelGap === 1) { score += 12; reasons.push("Close padel levels"); }
  else if (levelGap === 2) score += 4;

  const za = zoneAffinity(me.zone, c.zone);
  if (za === 0) { score += 14; reasons.push(`Both in ${me.zone}`); }
  else if (za === 1) { score += 10; reasons.push(`${me.zone} ↔ ${c.zone}, close by`); }
  else if (za === 2) score += 5;

  const ca = cultureAffinity(me.nationality, c.nationality);
  if (ca === 0) { score += 10; reasons.push(`Both ${me.nationality}`); }
  else if (ca === 1) { score += 8; reasons.push(`${me.nationality} × ${c.nationality}, neighboring cultures`); }

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

  return { score: Math.min(100, score), reasons };
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
      .neq("id", me.id);
    const { data: myLikes } = await context.supabase
      .from("likes" as never)
      .select("liked_profile_id")
      .eq("liker_profile_id", me.id);
    const likedSet = new Set(((myLikes as Array<{ liked_profile_id: string }> | null) ?? []).map((l) => l.liked_profile_id));

    const scored = ((candRows as Profile[] | null) ?? [])
      .map((c) => {
        const { score, reasons } = scoreCandidate(me, c);
        return { ...c, score, reasons, liked: likedSet.has(c.id) };
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
    return { ok: true };
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
      .order("created_at", { ascending: false });
    const m = (matches as Array<{ id: string; profile_a: string; profile_b: string; created_at: string }> | null) ?? [];
    const otherIds = m.map((x) => (x.profile_a === myId ? x.profile_b : x.profile_a));
    if (otherIds.length === 0) return [];
    const { data: profiles } = await context.supabase
      .from("profiles" as never).select("*").in("id", otherIds);
    const map = new Map<string, Profile>(((profiles as Profile[] | null) ?? []).map((p) => [p.id, p]));
    return m.map((row) => ({
      match_id: row.id,
      created_at: row.created_at,
      other: map.get(row.profile_a === myId ? row.profile_b : row.profile_a),
    })).filter((x) => x.other);
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
    const { data: messages } = await context.supabase
      .from("messages" as never).select("*").eq("match_id", data.matchId).order("created_at", { ascending: true });
    return {
      match_id: mr.id,
      my_profile_id: myId,
      other: other as unknown as Profile,
      messages: ((messages as Array<{ id: string; match_id: string; sender_profile_id: string; body: string; created_at: string }> | null) ?? []),
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
