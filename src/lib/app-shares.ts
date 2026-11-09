import { supabase } from "@/integrations/supabase/client";

export type ShareChannel = "share_sheet" | "whatsapp" | "copy_link";

/** Remember that the signed-in player shared the app (fire-and-forget; signed-out taps are ignored server-side). */
export function recordAppShare(channel: ShareChannel) {
  void supabase.rpc("record_app_share", { _channel: channel }).then(({ error }) => {
    if (error) console.warn("record_app_share failed", error.message);
  });
}
