import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { cultureAffinity, languageOverlap, locationAffinity, zoneAffinity } from "./affinity";
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
  locations: z.array(z.string().min(1).max(120)).max(8).default([]),
  languages: z.array(z.string().min(1).max(30)).max(10).default([]),
  level: z.enum(PADEL_LEVELS),
  priorities: z.array(z.string().min(1).max(40)).min(3).max(10),
  looking_for: z.enum(LOOKING_FOR),
  bio: z.string().max(280).nullable().optional(),
  photo_url: z.string().min(1).max(2000).nullable().optional(),
  availability: z.array(z.string().min(1).max(40)).max(10).default([]),
  court_side: z.enum(["right", "left", "both"]).nullable().optional(),
  mixed_doubles: z.boolean().default(false),
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

  const loc = locationAffinity(me.locations ?? [], c.locations ?? []);
  if (loc.score === 0) { score += 16; reasons.push(`Both play in ${loc.sharedCity}`); }
  else if (loc.score === 1) { score += 8; reasons.push(`Both in ${loc.sharedCountry}`); }
  else {
    const za = zoneAffinity(me.zone, c.zone);
    if (za === 0) { score += 14; reasons.push(`Both in ${me.zone}`); }
    else if (za === 2) score += 5;
  }

  const langs = languageOverlap(me.languages ?? [], c.languages ?? []);
  if (langs.length > 0) {
    score += Math.min(10, langs.length * 5);
    reasons.push(`Speak ${langs.slice(0, 3).join(", ")}`);
  }

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
    const blockedSet = new Set(((myBlocks as Array<{ blocked_profile_id: string }> | null) ?? []).map((b) => b.blocked_profile_id));
    const likedSet = new Set(((myLikes as Array<{ liked_profile_id: string }> | null) ?? []).map((l) => l.liked_profile_id));

    const candidates = ((candRows as Profile[] | null) ?? []).filter((c) => !blockedSet.has(c.id));

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
        const { score, reasons } = scoreCandidate(me, c);
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
        return { ...c, score: finalScore, reasons: reasons2, liked: likedSet.has(c.id) };
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
      .from("profiles" as never).select("*").in("id", otherIds).is("suspended_at", null);
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
      ? "Generas preguntas cortas y reveladoras de compatibilidad para emparejar jugadores de pádel, ya sea como amigos o pareja. Responde SIEMPRE en español."
      : "You generate short, revealing compatibility questions for matching padel players, either as friends or partners. Always reply in English.";

    const prompt = `Player context:
- Age ${me.age}, ${me.gender}, level ${me.level}
- Looking for: ${me.looking_for}
- Nationality: ${me.nationality}
- Languages: ${(me.languages ?? []).join(", ") || "n/a"}
- Top values: ${(me.priorities ?? []).slice(0, 5).join(", ") || "n/a"}

They have already answered these questions (do NOT repeat or paraphrase):
${asked.map((q, i) => `${i + 1}. ${q}`).join("\n") || "(none yet)"}

Generate exactly ${data.count} NEW questions that mix categories: values, lifestyle, communication, conflict, humor, padel-on-court behaviour, weekend habits, money, family, travel, social energy.
Each question must be answerable in one short sentence or by picking one of 3-5 short options.

Return ONLY valid JSON, no prose, no markdown, with this exact shape:
{"questions":[{"question":"...","category":"values","options":["opt1","opt2","opt3"]}]}
Options is OPTIONAL — include 3-5 short choices only when natural. Categories must be lowercase single words.`;

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
      .filter((q) => !asked.includes(q.question))
      .slice(0, data.count)
      .map((q) => ({
        question: q.question.trim(),
        category: (q.category ?? "general").toLowerCase().slice(0, 30),
        options: Array.isArray(q.options) ? q.options.slice(0, 5).map((o) => String(o).slice(0, 80)) : undefined,
      }));
    return { questions: out };
  });

const FALLBACK_QUESTIONS: Record<"en" | "es", GeneratedQuestion[]> = {
  en: [
    { question: "After a tough match, do you prefer to vent, joke about it, or stay quiet?", category: "communication", options: ["Vent it out", "Joke about it", "Stay quiet", "Analyse every point"] },
    { question: "Ideal weekend energy?", category: "lifestyle", options: ["Slow and cozy", "Sport + social", "Travel & explore", "Party mode"] },
    { question: "How important is shared humour to you?", category: "values", options: ["Essential", "Very", "Nice to have", "Not really"] },
    { question: "Money mindset?", category: "money", options: ["Save first", "Spend on experiences", "Spend on quality things", "Live for today"] },
    { question: "On court, when a partner makes a mistake you…", category: "padel", options: ["Encourage them", "Stay silent", "Coach gently", "Get visibly frustrated"] },
    { question: "Pick one: deep 1-on-1 dinner or group night out?", category: "social", options: ["1-on-1 dinner", "Group night", "Depends on mood"] },
    { question: "How often do you want to play padel together per week?", category: "padel", options: ["Once", "2–3 times", "4+ times", "Whenever"] },
  ],
  es: [
    { question: "Después de un partido duro, ¿prefieres desahogarte, bromear o quedarte en silencio?", category: "comunicación", options: ["Desahogarme", "Bromear", "Silencio", "Analizar cada punto"] },
    { question: "¿Energía de fin de semana ideal?", category: "estilo de vida", options: ["Tranquilo y casero", "Deporte + social", "Viajar y explorar", "Modo fiesta"] },
    { question: "¿Qué tan importante es para ti el humor compartido?", category: "valores", options: ["Esencial", "Mucho", "Está bien", "No tanto"] },
    { question: "¿Mentalidad con el dinero?", category: "dinero", options: ["Ahorrar primero", "Gastar en experiencias", "Gastar en calidad", "Vivir el hoy"] },
    { question: "En la pista, cuando tu pareja falla…", category: "pádel", options: ["La animo", "Callo", "Le doy consejos", "Me frustro visiblemente"] },
    { question: "Elige: cena íntima o salida en grupo", category: "social", options: ["Cena íntima", "Salida en grupo", "Depende del ánimo"] },
    { question: "¿Cuántas veces a la semana te gustaría jugar pádel juntos?", category: "pádel", options: ["1", "2–3", "4+", "Cuando se pueda"] },
  ],
};

