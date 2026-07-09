import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CATEGORIES = ["traveling", "selling", "looking_to_play", "looking_for_coach", "question", "news", "other"] as const;

export type ConnectCategory = (typeof CATEGORIES)[number];

export type ConnectPost = {
  id: string;
  author_profile_id: string;
  category: ConnectCategory;
  city: string | null;
  title: string;
  body: string;
  created_at: string;
  expires_at: string;
  author: { first_name: string | null; photo_url: string | null } | null;
  comment_count: number;
  latest_comments: ConnectComment[];
};

export type ConnectComment = {
  id: string;
  post_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
  author: { first_name: string | null; photo_url: string | null } | null;
};

async function myProfileId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  const id = (data as { id: string } | null)?.id;
  if (!id) throw new Error("No profile");
  return id;
}

export const listConnectPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ city: z.string().optional().nullable(), category: z.enum(CATEGORIES).optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("connect_posts" as never)
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.city && data.city.trim()) q = q.ilike("city", `%${data.city.trim()}%`);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw error;
    const posts = (rows ?? []) as unknown as Array<Omit<ConnectPost, "author" | "comment_count" | "latest_comments">>;
    const authorIds = Array.from(new Set(posts.map((p) => p.author_profile_id)));
    const postIds = posts.map((p) => p.id);

    const [{ data: authors }, { data: comments }] = await Promise.all([
      authorIds.length
        ? context.supabase.from("profiles" as never).select("id, first_name, photo_url").in("id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? context.supabase
            .from("connect_comments" as never)
            .select("*")
            .in("post_id", postIds)
            .order("created_at", { ascending: false })
            .limit(300)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const authorMap = new Map(
      ((authors ?? []) as Array<{ id: string; first_name: string | null; photo_url: string | null }>).map((a) => [a.id, a]),
    );
    const countMap = new Map<string, number>();
    const latestMap = new Map<string, ConnectComment[]>();
    ((comments ?? []) as Array<Omit<ConnectComment, "author">>).forEach((c) => {
      countMap.set(c.post_id, (countMap.get(c.post_id) ?? 0) + 1);
      const list = latestMap.get(c.post_id) ?? [];
      if (list.length < 2) {
        latestMap.set(c.post_id, [
          ...list,
          { ...c, author: authorMap.get(c.author_profile_id) ?? null } as ConnectComment,
        ]);
      }
    });
    return posts.map<ConnectPost>((p) => ({
      ...p,
      author: authorMap.get(p.author_profile_id)
        ? { first_name: authorMap.get(p.author_profile_id)!.first_name, photo_url: authorMap.get(p.author_profile_id)!.photo_url }
        : null,
      comment_count: countMap.get(p.id) ?? 0,
      latest_comments: (latestMap.get(p.id) ?? []).reverse(),
    }));
  });

export const createConnectPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      category: z.enum(CATEGORIES),
      city: z.string().max(80).optional().nullable(),
      title: z.string().min(3).max(120),
      body: z.string().min(3).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const myId = await myProfileId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("connect_posts" as never)
      .insert({
        author_profile_id: myId,
        category: data.category,
        city: data.city?.trim() || null,
        title: data.title.trim(),
        body: data.body.trim(),
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });

export const deleteConnectPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("connect_posts" as never).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateConnectPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      category: z.enum(CATEGORIES),
      city: z.string().max(80).optional().nullable(),
      title: z.string().min(3).max(120),
      body: z.string().min(3).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("connect_posts" as never)
      .update({
        category: data.category,
        city: data.city?.trim() || null,
        title: data.title.trim(),
        body: data.body.trim(),
      } as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listConnectComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("connect_comments" as never)
      .select("*")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const comments = (rows ?? []) as unknown as Array<Omit<ConnectComment, "author">>;
    const ids = Array.from(new Set(comments.map((c) => c.author_profile_id)));
    const { data: authors } = ids.length
      ? await context.supabase.from("profiles" as never).select("id, first_name, photo_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map(
      ((authors ?? []) as Array<{ id: string; first_name: string | null; photo_url: string | null }>).map((a) => [a.id, a]),
    );
    return comments.map<ConnectComment>((c) => ({
      ...c,
      author: map.get(c.author_profile_id) ?? null,
    }));
  });

export const addConnectComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ postId: z.string().uuid(), body: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const myId = await myProfileId(context.supabase, context.userId);
    const { error } = await context.supabase.from("connect_comments" as never).insert({
      post_id: data.postId,
      author_profile_id: myId,
      body: data.body.trim(),
    } as never);
    if (error) throw error;
    return { ok: true };
  });

export const updateConnectComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), body: z.string().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("connect_comments" as never).update({ body: data.body.trim() } as never).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteConnectComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("connect_comments" as never).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getConnectLatest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nowIso = new Date().toISOString();
    let myPid: string | null = null;
    try { myPid = await myProfileId(context.supabase, context.userId); } catch { myPid = null; }
    const [{ data: posts }, { data: comments }] = await Promise.all([
      context.supabase
        .from("connect_posts" as never)
        .select("created_at,author_profile_id")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(5),
      context.supabase
        .from("connect_comments" as never)
        .select("created_at,author_profile_id")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const notMine = <T extends { author_profile_id: string | null }>(rows: T[]) =>
      rows.filter((r) => !myPid || r.author_profile_id !== myPid);
    const latestPost = notMine(((posts ?? []) as Array<{ created_at: string; author_profile_id: string }>))[0]?.created_at ?? null;
    const latestComment = notMine(((comments ?? []) as Array<{ created_at: string; author_profile_id: string }>))[0]?.created_at ?? null;
    const latest = [latestPost, latestComment].filter(Boolean).sort().slice(-1)[0] ?? null;
    return { latest: latest as string | null };
  });
