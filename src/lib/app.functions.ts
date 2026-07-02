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
  priorities: z.array(z.string().min(1).max(40)).min(3).max(10),
  looking_for: z.enum(LOOKING_FOR),
  bio: z.string().max(280).nullable().optional(),
  photo_url: z.string().min(1).max(2000).nullable().optional(),
  availability: z.array(z.string().min(1).max(40)).max(10).default([]),
  court_side: z.enum(["right", "left", "both"]).nullable().optional(),
  mixed_doubles: z.boolean().default(false),
  free_court_access: z.boolean().default(false),
  free_court_note: z.string().max(200).nullable().optional(),
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

function stripPrivateFields(p: Profile): any {
  const clone = { ...p } as any;
  delete clone.interested_in;
  delete clone.partner_interested_in;
  delete clone.friend_interested_in;
  delete clone.age_min;
  delete clone.age_max;
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

  // HARD GATE: only match people who will actually play in the same area.
  // We require an overlapping city in their listed play locations, OR (legacy)
  // the same single zone. No shared city => not a match, regardless of score.
  const loc = locationAffinity(me.locations ?? [], c.locations ?? []);
  const za = zoneAffinity(me.zone, c.zone);
  if (loc.score === 0) {
    score += 16;
    reasons.push(`Both play in ${loc.sharedCity}`);
  } else if (za === 0 && me.zone) {
    score += 14;
    reasons.push(`Both in ${me.zone}`);
  } else {
    return { score: 0, reasons: [] };
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
    const { data: myHides } = await context.supabase
      .from("hides" as never)
      .select("hidden_profile_id")
      .eq("hider_profile_id", me.id);
    const blockedSet = new Set(((myBlocks as Array<{ blocked_profile_id: string }> | null) ?? []).map((b) => b.blocked_profile_id));
    const hiddenSet = new Set(((myHides as Array<{ hidden_profile_id: string }> | null) ?? []).map((h) => h.hidden_profile_id));
    const likedSet = new Set(((myLikes as Array<{ liked_profile_id: string }> | null) ?? []).map((l) => l.liked_profile_id));

    const candidates = ((candRows as Profile[] | null) ?? []).filter((c) => !blockedSet.has(c.id) && !hiddenSet.has(c.id));

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
        const pub = stripPrivateFields(c);
        return { ...pub, score: finalScore, reasons: reasons2, liked: likedSet.has(c.id) };
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
    const { data: messages } = await context.supabase
      .from("messages" as never).select("*").eq("match_id", data.matchId).order("created_at", { ascending: true });
    return {
      match_id: mr.id,
      my_profile_id: myId,
      other: other as unknown as Profile,
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
  .inputValidator((d: unknown) => z.object({ hiddenProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles" as never).select("id").eq("user_id", context.userId).maybeSingle();
    const myId = (me as { id: string } | null)?.id;
    if (!myId) throw new Error("No profile");
    const { error } = await context.supabase
      .from("hides" as never)
      .insert({ hider_profile_id: myId, hidden_profile_id: data.hiddenProfileId } as never);
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
      lang: z.enum(["en", "es", "ar"]).default("en"),
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
      ? "Eres una IA experta en compatibilidad y psicología relacional. Generas preguntas cortas, reveladoras y de OPCIÓN MÚLTIPLE para encontrar afinidad real entre personas (amistad, pareja o alma gemela). La mezcla debe ser ~60% personalidad/valores/estilo de vida y ~40% pádel (cómo juega, actitud en pista, estilo de juego, mentalidad competitiva, etc.). Responde SIEMPRE en español."
      : data.lang === "ar"
      ? "أنت ذكاء اصطناعي خبير في التوافق وعلم نفس العلاقات. تُولِّد أسئلة قصيرة وكاشفة من نوع الاختيار من متعدد لإيجاد توافق حقيقي بين الأشخاص (صداقة، شريك، أو توأم روح). يجب أن يكون المزيج ~60٪ شخصية/قيم/أسلوب حياة و~40٪ بادل (كيف يلعب، موقفه على الملعب، أسلوب لعبه، عقلية المنافسة، إلخ). أجب دائمًا باللغة العربية الفصحى الواضحة."
      : "You are an AI expert in compatibility and relational psychology. You generate short, revealing, MULTIPLE-CHOICE questions to find real affinity between people (friendship, partner, or soulmate). The mix must be ~60% personality/values/lifestyle and ~40% padel (how they play, on-court attitude, playing style, competitive mindset, etc.). Always reply in English.";

    const prompt = `Person context:
- Age ${me.age}, ${me.gender}
- Looking for: ${me.looking_for}
- Nationality: ${me.nationality}
- Languages: ${(me.languages ?? []).join(", ") || "n/a"}
- Top values: ${(me.priorities ?? []).slice(0, 5).join(", ") || "n/a"}

They have already answered these questions (do NOT repeat or paraphrase):
${asked.map((q, i) => `${i + 1}. ${q}`).join("\n") || "(none yet)"}

Generate exactly ${data.count} NEW questions as MULTIPLE CHOICE.
Ratio: about 60% personal (personality, love language, attachment, conflict style, humor, lifestyle, values, dealbreakers, family, ambition, social energy, intimacy comfort, money mindset, ideal weekend, what makes them feel loved) and about 40% padel (preferred side left/right, style aggressive/defensive, how they react to losing, how they treat partners, intensity, social vs competitive, dream playing partner).
EVERY question MUST include 3 to 5 short, mutually exclusive options. No open-ended questions. Keep options under 6 words each. Warm, specific, never generic.

Return ONLY valid JSON, no prose, no markdown:
{"questions":[{"question":"...","category":"personality","options":["opt1","opt2","opt3","opt4"]}]}
Categories must be lowercase single words.`;


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

const FALLBACK_QUESTIONS: Record<"en" | "es" | "ar", GeneratedQuestion[]> = {
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
  ],
  ar: [
    { question: "ما هي لغة الحب التي تفضّلها؟", category: "personality", options: ["كلمات التقدير", "وقت نوعي", "اللمس الجسدي", "أفعال الخدمة", "الهدايا"] },
    { question: "ما الذي يجعلك تثق بشخص فورًا؟", category: "values", options: ["الثبات", "الصدق تحت الضغط", "اللطف مع الغرباء", "حفظ الأسرار"] },
    { question: "انطوائي، انبساطي، أم بينهما؟", category: "personality", options: ["انطوائي", "انبساطي", "بينهما"] },
    { question: "أكبر شيء مرفوض في العلاقة؟", category: "dealbreakers", options: ["الكذب", "الغيرة", "سرعة الغضب", "بدون طموح", "انغلاق الفكر"] },
    { question: "عندما تنزعج، تفضّل…", category: "conflict", options: ["التحدث عنه", "أن تُترك وحدك", "قليل من الاثنين"] },
    { question: "حسّ الفكاهة لديك غالبًا…", category: "humor", options: ["ساخر", "مرح وطفولي", "ذكي", "أسود", "لطيف"] },
    { question: "الأحد المثالي؟", category: "lifestyle", options: ["فطور متأخر ومشي", "رياضة وقيلولة", "بحر/طبيعة", "بيت وفيلم", "خروج مع الأصدقاء"] },
    { question: "هل تؤمن بتوأم الروح؟", category: "values", options: ["نعم", "لا", "نوعًا ما"] },
    { question: "اختر سهرة:", category: "social", options: ["عشاء ثنائي", "خروج جماعي", "حفلة بيت", "البقاء في المنزل"] },
    { question: "ما أهمية المال بالنسبة لك؟", category: "lifestyle", options: ["ادّخر أولًا", "أنفق على التجارب", "دلّل نفسك", "استثمر طويل الأمد"] },
    { question: "أي جانب تفضل في البادل؟", category: "padel", options: ["اليمين (درايف)", "اليسار (ريفيس)", "كلاهما", "ما زلت أكتشف"] },
    { question: "أسلوب لعبك…", category: "padel", options: ["هجومي وقوي", "دفاعي كالجدار", "تكتيكي صبور", "اجتماعي للمتعة"] },
    { question: "بعد مباراة صعبة…", category: "padel", options: ["أُفرّغ مشاعري", "أمزح", "أصمت", "أحلّل كل نقطة"] },
    { question: "شريكك يخطئ كرة سهلة — أنت…", category: "padel", options: ["أشجّعه", "أصمت", "أعطي نصائح", "أنزعج"] },
    { question: "كم أنت تنافسي على الملعب؟", category: "padel", options: ["الفوز بأي ثمن", "تنافسي وهادئ", "للمتعة", "للتواصل فقط"] },
    { question: "جلسة البادل المثالية؟", category: "padel", options: ["أمريكانو ودّي", "مباراة جدية", "تمارين ومباراة", "لعب سريع ممتع"] },
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


// ===================== Padel Quiz (Learn) =====================

type QuizQuestion = {
  question: string;
  category: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const generatePadelQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      count: z.number().int().min(1).max(8).default(5),
      lang: z.enum(["en", "es", "ar"]).default("en"),
      topic: z.string().max(60).optional(),
      level: z.enum(["beginner", "intermediate", "advanced", "mixed"]).default("mixed"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { questions: QUIZ_FALLBACK[data.lang].slice(0, data.count) };
    }

    const { generateText } = await import("ai");
    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const sys = data.lang === "es"
      ? "Eres un entrenador profesional de pádel. Creas preguntas tipo quiz multiple choice claras y correctas según las reglas oficiales de la FIP, con foco en reglas, posicionamiento, táctica, comunicación con el compañero (voces: '¡mía!', '¡tuya!', '¡fuera!', '¡bote pronto!', '¡cambio!'), golpes (bandeja, víbora, globo, chiquita, bajada de pared) y juego en pareja. Responde SIEMPRE en español."
      : "You are a professional padel coach. You create clear multiple-choice quiz questions correct per official FIP rules, focused on rules, court positioning, tactics, partner communication (calling shots: 'mine!', 'yours!', 'out!', 'bounce!', 'switch!'), shots (bandeja, víbora, lob, chiquita, wall return) and doubles play. Always reply in English.";

    const prompt = `Generate exactly ${data.count} NEW padel quiz questions.
Level focus: ${data.level}.${data.topic ? ` Topic: ${data.topic}.` : ""}
Mix categories across: rules, scoring, positioning, partner communication & calls, shots & technique, tactics, etiquette.

CLARITY RULES (very important):
- Write the question as ONE plain sentence, max 20 words. If you use a padel term (bandeja, víbora, chiquita, globo), add a quick hint in parentheses.
- Make the scenario unambiguous: state who is serving/returning, where players stand (net vs baseline), and the score only if it matters.
- No trick wording, double negatives, "all of the above", "none of the above", or "both A and C".
- 3 or 4 options, each under 8 words, mutually exclusive, all plausible — no joke answers.
- Exactly one correct option (correctIndex 0-based). The wrong options must be clearly wrong to an expert but believable to a learner.
- Explanation: 1-2 short sentences that restate the correct answer in plain words AND give the reason/rule.
- ${data.lang === "es" ? "Escribe TODO en español natural y claro." : "Write EVERYTHING in clear, natural English."}

Return ONLY valid JSON, no prose, no markdown:
{"questions":[{"question":"...","category":"rules","options":["a","b","c","d"],"correctIndex":1,"explanation":"..."}]}
Categories lowercase single words.`;

    let text = "";
    try {
      const res = await generateText({ model, system: sys, prompt, temperature: 0.8 });
      text = res.text ?? "";
    } catch (e) {
      return { questions: QUIZ_FALLBACK[data.lang].slice(0, data.count), warning: e instanceof Error ? e.message : "AI unavailable" };
    }

    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    let parsed: { questions?: QuizQuestion[] } = {};
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      parsed = { questions: [] };
    }
    const out: QuizQuestion[] = (parsed.questions ?? [])
      .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correctIndex === "number")
      .slice(0, data.count)
      .map((q) => ({
        question: String(q.question).trim().slice(0, 240),
        category: String(q.category ?? "padel").toLowerCase().slice(0, 24),
        options: q.options.slice(0, 4).map((o) => String(o).slice(0, 80)),
        correctIndex: Math.max(0, Math.min(q.options.length - 1, q.correctIndex | 0)),
        explanation: String(q.explanation ?? "").slice(0, 400),
      }));
    if (out.length === 0) return { questions: QUIZ_FALLBACK[data.lang].slice(0, data.count) };
    return { questions: out };
  });

const QUIZ_FALLBACK: Record<"en" | "es" | "ar", QuizQuestion[]> = {
  en: [
    { question: "Your partner is about to hit a ball coming down the middle. What should you call?", category: "communication", options: ["'Mine!'", "'Yours!'", "Stay quiet", "'Out!'"], correctIndex: 1, explanation: "Call 'Yours!' clearly and early so your partner commits. Middle balls are the #1 cause of doubles confusion — the call decides who takes it." },
    { question: "The ball bounces in your court, hits the back glass, and comes back. Is it still in play?", category: "rules", options: ["Yes, play it", "No, point lost", "Only if it bounces again", "Only on serve"], correctIndex: 0, explanation: "Yes — after one bounce on the floor the ball may hit your own walls and you must return it before it bounces twice on the floor." },
    { question: "Best shot when opponents lob you deep to the back glass?", category: "shots", options: ["Smash hard", "Bandeja", "Drop shot", "Drive"], correctIndex: 1, explanation: "The bandeja is a sliced overhead that keeps you at the net. A full smash from deep usually loses position; the bandeja keeps pressure on." },
    { question: "Where should the net team stand?", category: "positioning", options: ["On the service line", "1-2 m from the net, side by side", "One up, one back", "Against the back glass"], correctIndex: 1, explanation: "Stay together about 1-2 m from the net. 'One up, one back' opens the middle. Padel doubles is played as a unit — move together." },
    { question: "On the serve, the ball must…", category: "rules", options: ["Be hit overhead", "Bounce first, hit at or below waist", "Be hit on the volley", "Bounce twice before hit"], correctIndex: 1, explanation: "Serve is underarm: bounce the ball once in your own box, then strike it at or below waist height into the opponent's diagonal box." },
    { question: "The ball hits a wall before bouncing on the floor. What's the call?", category: "rules", options: ["Play on", "Point for hitter", "Point against hitter", "Replay"], correctIndex: 2, explanation: "The ball must bounce on the floor first. If it hits any wall before touching the ground, the hitter loses the point." },
    { question: "Your partner chases a lob to the back. What should you do?", category: "tactics", options: ["Stay at the net", "Retreat to the service line and mirror them", "Run to the back too", "Switch sides immediately"], correctIndex: 1, explanation: "Drop back to around the service line and stay parallel. Staying at the net leaves a huge gap; mirroring keeps the team connected." },
    { question: "Best response to a low, slow ball at your feet at the net?", category: "shots", options: ["Smash", "Chiquita (soft low volley)", "Lob", "Hard drive"], correctIndex: 1, explanation: "A chiquita — soft, low volley back to the opponents' feet — forces them to hit up, giving you the next attacking ball. Don't try to smash a low ball." },
  ],
  es: [
    { question: "Tu compañero va a golpear una bola por el medio. ¿Qué dices?", category: "comunicación", options: ["'¡Mía!'", "'¡Tuya!'", "Callar", "'¡Fuera!'"], correctIndex: 1, explanation: "Di '¡Tuya!' claro y pronto para que tu compañero se comprometa. Las bolas por el medio son la #1 causa de confusión; la voz decide quién la toma." },
    { question: "La bola bota en tu pista, toca el cristal del fondo y vuelve. ¿Sigue en juego?", category: "reglas", options: ["Sí, juégala", "No, punto perdido", "Solo si bota otra vez", "Solo en el saque"], correctIndex: 0, explanation: "Sí: tras un bote en el suelo la bola puede tocar tus paredes y debes devolverla antes de un segundo bote en el suelo." },
    { question: "¿Mejor golpe cuando te globean profundo al cristal?", category: "golpes", options: ["Remate fuerte", "Bandeja", "Dejada", "Drive"], correctIndex: 1, explanation: "La bandeja es un remate cortado que te mantiene en la red. Un remate completo desde el fondo suele perder posición." },
    { question: "¿Dónde debe colocarse la pareja en la red?", category: "posicionamiento", options: ["En la línea de saque", "A 1-2 m de la red, juntos", "Uno arriba, uno atrás", "Pegados al cristal de fondo"], correctIndex: 1, explanation: "Juntos a 1-2 m de la red. 'Uno arriba, uno atrás' abre el medio. El pádel se juega como bloque, moviéndose a la vez." },
    { question: "En el saque, la bola debe…", category: "reglas", options: ["Golpearse por encima de la cabeza", "Botar primero y golpearse a la cintura o por debajo", "Golpearse de volea", "Botar dos veces"], correctIndex: 1, explanation: "El saque es por debajo: deja botar la bola en tu cuadro y golpéala a la altura de la cintura o por debajo, en diagonal." },
    { question: "La bola toca la pared antes de botar en el suelo. ¿Qué pasa?", category: "reglas", options: ["Se juega", "Punto para quien golpeó", "Punto en contra de quien golpeó", "Se repite"], correctIndex: 2, explanation: "La bola debe botar primero en el suelo. Si toca cualquier pared antes del suelo, pierde el punto quien la golpeó." },
    { question: "Tu compañero persigue un globo al fondo. ¿Qué haces?", category: "táctica", options: ["Quedarte en la red", "Retroceder en paralelo a la línea de saque", "Correr al fondo también", "Cambiar de lado"], correctIndex: 1, explanation: "Baja en paralelo a la línea de saque. Pegado a la red dejas un hueco enorme; en paralelo el equipo sigue conectado." },
    { question: "¿Mejor respuesta a una bola baja y lenta a tus pies en la red?", category: "golpes", options: ["Remate", "Chiquita (volea baja suave)", "Globo", "Drive fuerte"], correctIndex: 1, explanation: "Una chiquita a los pies del rival lo obliga a golpear hacia arriba y te da la siguiente bola de ataque. No intentes rematar una bola baja." },
  ],
  ar: [
    { question: "شريكك على وشك ضرب كرة قادمة من المنتصف. ماذا تنادي؟", category: "communication", options: ["«ليّ!»", "«لك!»", "اصمت", "«خارج!»"], correctIndex: 1, explanation: "نادِ «لك!» بوضوح وبسرعة ليلتزم شريكك. كرات المنتصف هي السبب الأول للارتباك في الزوجي." },
    { question: "ترتد الكرة في ملعبك، تصطدم بالزجاج الخلفي وتعود. هل لا تزال في اللعب؟", category: "rules", options: ["نعم، العبها", "لا، خسرت النقطة", "فقط إذا ارتدت مرة ثانية", "فقط في الإرسال"], correctIndex: 0, explanation: "نعم — بعد ارتداد واحد على الأرض يمكن للكرة أن تلمس جدرانك وعليك إعادتها قبل أن ترتد مرتين على الأرض." },
    { question: "أفضل ضربة عندما يرسل الخصم لوبًا عميقًا للزجاج الخلفي؟", category: "shots", options: ["سماش قوي", "بانديخا", "كرة قصيرة", "درايف"], correctIndex: 1, explanation: "البانديخا ضربة علوية مقطوعة تُبقيك على الشبكة. السماش الكامل من العمق يخسرك المركز." },
    { question: "أين يجب أن يقف فريق الشبكة؟", category: "positioning", options: ["على خط الإرسال", "على بُعد 1-2 م من الشبكة جنبًا إلى جنب", "واحد للأمام وواحد للخلف", "ملتصقين بالزجاج الخلفي"], correctIndex: 1, explanation: "ابقَوا معًا على بُعد 1-2 م من الشبكة. التشكيل «واحد أمام وواحد خلف» يفتح المنتصف." },
    { question: "في الإرسال، يجب أن…", category: "rules", options: ["تُضرب فوق الرأس", "ترتد أولًا وتُضرب عند الخصر أو أدنى", "تُضرب طائرة", "ترتد مرتين قبل الضرب"], correctIndex: 1, explanation: "الإرسال من الأسفل: اترك الكرة ترتد مرة في مربعك ثم اضربها عند الخصر أو أدنى نحو المربع القطري للخصم." },
    { question: "الكرة تصطدم بالجدار قبل أن ترتد على الأرض. ماذا يحدث؟", category: "rules", options: ["استمر باللعب", "نقطة للضارب", "نقطة ضد الضارب", "إعادة"], correctIndex: 2, explanation: "يجب أن ترتد الكرة على الأرض أولًا. إذا لمست أي جدار قبل الأرض، يخسر الضارب النقطة." },
    { question: "شريكك يطارد لوبًا للخلف. ماذا تفعل؟", category: "tactics", options: ["ابقَ على الشبكة", "تراجع موازيًا له إلى خط الإرسال", "اركض للخلف أيضًا", "بدّل الجهات فورًا"], correctIndex: 1, explanation: "تراجع إلى خط الإرسال وابقَ موازيًا. البقاء على الشبكة يفتح فجوة كبيرة." },
    { question: "أفضل رد على كرة بطيئة منخفضة عند قدميك على الشبكة؟", category: "shots", options: ["سماش", "تشيكيتا (طائرة منخفضة ناعمة)", "لوب", "درايف قوي"], correctIndex: 1, explanation: "التشيكيتا — طائرة ناعمة منخفضة عند أقدام الخصم — تجبره على الرفع وتمنحك الكرة الهجومية التالية." },
  ],
};

