import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Sends the first-ever message from one player to another before they've
 * mutually connected. Creates an intro thread + the first message atomically,
 * enforces the one-intro-per-pair and 5-intros-per-24h caps, and returns the
 * new match_id so the client can navigate to the chat.
 */
export const openIntroChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        targetProfileId: z.string().uuid(),
        body: z.string().trim().min(1).max(140),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: matchId, error } = await context.supabase.rpc("open_intro_chat" as never, {
      _target_profile_id: data.targetProfileId,
      _body: data.body,
      _acting_user_id: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { match_id: matchId as unknown as string };
  });

/**
 * Recipient dismisses an intro. Deletes the intro thread + its messages.
 * Sender never gets a notification about the ignore.
 */
export const ignoreIntro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("ignore_intro" as never, {
      _match_id: data.matchId,
      _acting_user_id: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
