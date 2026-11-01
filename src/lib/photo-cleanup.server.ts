/** Delete a withdrawn photo only from its verified owner's upload folder. */
export async function removeWithdrawnPhoto(url: string | null | undefined, ownerId: string | null | undefined) {
  if (!url || !ownerId) return;
  const base = process.env.SUPABASE_URL;
  if (!base) return;
  let path: string;
  try {
    const photo = new URL(url);
    const prefix = "/storage/v1/object/sign/padel-photos/";
    if (photo.origin !== new URL(base).origin || !photo.pathname.startsWith(prefix)) return;
    path = decodeURIComponent(photo.pathname.slice(prefix.length));
    if (!path.startsWith(`${ownerId}/`) || path.includes("..") || path.includes("\\")) return;
  } catch { return; }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from("padel-photos").remove([path]);
  if (error) throw new Error("Photo was withdrawn, but file cleanup needs a retry.");
}