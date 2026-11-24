import { THUMB_BUCKET, thumbKeys } from "./photo-thumbs";

const SIGN_PREFIX = "/storage/v1/object/sign/padel-photos/";
const YEAR = 60 * 60 * 24 * 365;

/** Storage path of a signed photo link, only when it sits in its owner's folder. */
function ownedPhotoPath(url: string | null | undefined, ownerId: string | null | undefined): string | null {
  if (!url || !ownerId) return null;
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  try {
    const photo = new URL(url);
    if (photo.origin !== new URL(base).origin || !photo.pathname.startsWith(SIGN_PREFIX)) return null;
    const path = decodeURIComponent(photo.pathname.slice(SIGN_PREFIX.length));
    if (!path.startsWith(`${ownerId}/`) || path.includes("..") || path.includes("\\")) return null;
    return path;
  } catch { return null; }
}

/** Delete a withdrawn photo only from its verified owner's upload folder. */
export async function removeWithdrawnPhoto(url: string | null | undefined, ownerId: string | null | undefined) {
  const path = ownedPhotoPath(url, ownerId);
  if (!path) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from("padel-photos").remove([path]);
  if (error) throw new Error("Photo was withdrawn, but file cleanup needs a retry.");
  await removeThumbs(path);
}

/** Delete the ready-made small copies of a photo that has been moved or removed. */
async function removeThumbs(path: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from(THUMB_BUCKET).remove(thumbKeys(path));
  if (error) throw new Error("Photo was withdrawn, but file cleanup needs a retry.");
}

/**
 * Move the owner's profile and kit photos to new paths and save fresh signed
 * links. Signed links cannot be revoked, so moving the file is what makes any
 * link a blocked player saved stop working. Each photo is moved back if its
 * new link cannot be saved, so a failure never leaves a broken photo.
 */
export async function rotateOwnedPhotoLinks(ownerUserId: string, profileId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bucket = supabaseAdmin.storage.from("padel-photos");
  const rotate = async (url: string | null, save: (next: string) => Promise<boolean>) => {
    const path = ownedPhotoPath(url, ownerUserId);
    if (!path) return;
    const ext = (path.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const nextPath = `${ownerUserId}/r-${crypto.randomUUID()}.${ext}`;
    const { error: moveErr } = await bucket.move(path, nextPath);
    if (moveErr) return;
    const { data: signed } = await bucket.createSignedUrl(nextPath, YEAR);
    if (signed?.signedUrl && (await save(signed.signedUrl))) {
      await removeThumbs(path).catch(() => undefined);
      return;
    }
    await bucket.move(nextPath, path);
  };

  const { data: profile } = await supabaseAdmin.from("profiles").select("photo_url").eq("id", profileId).maybeSingle();
  await rotate(profile?.photo_url ?? null, async (next) => {
    const { error } = await supabaseAdmin.from("profiles").update({ photo_url: next }).eq("id", profileId).eq("photo_url", profile?.photo_url ?? "");
    return !error;
  });

  const { data: gear } = await supabaseAdmin.from("profile_gear").select("id, image_url").eq("profile_id", profileId);
  for (const item of gear ?? []) {
    await rotate(item.image_url, async (next) => {
      const { error } = await supabaseAdmin.from("profile_gear").update({ image_url: next }).eq("id", item.id);
      return !error;
    });
  }
}
