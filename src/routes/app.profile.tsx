import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShareQR } from "@/components/ShareQR";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMyAccount, getMyProfile, setAwayStatus, submitFeedback, updateMyPhoto } from "@/lib/app.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decodeLocation, formatLocation } from "@/lib/types";
import { Camera, Lock, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { useId, useRef, useState } from "react";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

async function preparePhotoFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo file.");

  const shouldCompress = file.size > 2.5 * 1024 * 1024 || /heic|heif|png/i.test(file.type);
  if (!shouldCompress && file.size <= MAX_UPLOAD_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("This photo format could not be read. Please try a JPG photo."));
      img.src = objectUrl;
    });

    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the photo. Please try another image.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("Could not prepare the photo. Please try another image.");
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Photo is too large. Please choose a smaller photo.");
    return new File([blob], "padel-photo.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isTransientUploadError(message: string) {
  return /too many connections|timeout|temporarily|503|gateway|fetch failed|network|failed to fetch/i.test(message);
}


export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Your profile · PadelMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
  const tr = useTr();
  const getProfile = useServerFn(getMyProfile);
  const deleteAcct = useServerFn(deleteMyAccount);
  const updatePhoto = useServerFn(updateMyPhoto);
  const q = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const photoInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPickPhoto = async (file: File) => {
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error("Please sign in again, then change your photo.");

      const photo = await preparePhotoFile(file);
      const path = `${user.id}/photo-${Date.now()}.jpg`;
      let upErr: { message: string } | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const { error } = await supabase.storage
          .from("padel-photos")
          .upload(path, photo, { upsert: true, contentType: photo.type });
        if (!error) { upErr = null; break; }
        upErr = error;
        if (!isTransientUploadError(error.message) || attempt === 3) break;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("padel-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("Couldn't sign URL");
      await updatePhoto({ data: { photo_url: signed.signedUrl } });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      await q.refetch();
      toast.success(tr("Photo updated", "Foto actualizada"));
    } catch (e) {
      const message = e instanceof Error ? e.message : tr("Upload failed", "No se pudo subir");
      toast.error(isTransientUploadError(message) ? tr("Upload failed because the connection was busy. Please try again.", "La conexión estaba ocupada. Inténtalo de nuevo.") : message);
    } finally {
      setUploading(false);
    }
  };


  const onDelete = async () => {
    if (!confirm(t("prof.deleteConfirm"))) return;
    try {
      await deleteAcct();
      await supabase.auth.signOut();
      qc.clear();
      toast.success(t("prof.deleted"));
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("prof.deleteFail"));
    }
  };

  if (q.isLoading) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">{t("prof.loading")}</div>;
  const p = q.data;
  if (!p) {
    return (
      <main className="px-4 py-10 max-w-md mx-auto text-center">
        <p className="text-[var(--cream)]/70">{t("prof.noProfile")}</p>
        <Link to="/app/onboarding" className="mt-4 inline-block underline">{t("prof.createLink")}</Link>
      </main>
    );
  }
  const locations = (p.locations ?? []).map(decodeLocation).map(formatLocation);
  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">{t("prof.hi", { name: p.first_name })}</h1>
      <div className="mt-4 surface-card p-5">
        {p.photo_url && (
          <div className="aspect-[3/4] rounded-xl overflow-hidden mb-3">
            <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover" />
          </div>
        )}
        <input
          ref={fileRef}
          id={photoInputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickPhoto(f);
            e.target.value = "";
          }}
        />
        <label
          htmlFor={photoInputId}
          aria-disabled={uploading}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: `w-full mb-4 ${uploading ? "pointer-events-none opacity-50" : ""}`,
          })}
        >
          <Camera className="w-4 h-4 mr-2" />
          {uploading ? tr("Uploading…", "Subiendo…") : p.photo_url ? tr("Change photo", "Cambiar foto") : tr("Add photo", "Añadir foto")}
        </label>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label={t("prof.age")} v={String(p.age)} />
          <Info label={t("prof.level")} v={label(p.level)} />
          <Info label={t("prof.nationality")} v={p.nationality} />
          <Info label={t("prof.gender")} v={p.gender === "self-describe" ? (p.gender_custom || label("self-describe")) : label(p.gender)} />
        </div>

        {locations.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">{t("prof.playsIn")}</div>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          </div>
        )}

        {p.languages?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">{t("prof.languages")}</div>
            <div className="flex flex-wrap gap-2">
              {p.languages.map((l) => <span key={l} className="chip">{label(l)}</span>)}
            </div>
          </div>
        )}

        {p.bio && <p className="mt-4 text-sm text-[var(--cream)]/80">{p.bio}</p>}

        {(p.personal_traits?.length ?? 0) > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">{tr("Personal characteristics", "Características personales")}</div>
            <div className="flex flex-wrap gap-2">
              {p.personal_traits!.map((trait) => <span key={trait} className="chip">{label(trait)}</span>)}
            </div>
          </div>
        )}

        {(p.padel_style?.length ?? 0) > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">{tr("Padel style", "Estilo de pádel")}</div>
            <div className="flex flex-wrap gap-2">
              {p.padel_style!.map((s) => <span key={s} className="chip">{s}</span>)}
            </div>
          </div>
        )}

        {p.free_court_access && (
          <div className="mt-4 rounded-lg border border-[var(--ball)]/40 bg-[var(--ball)]/10 p-3">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] font-bold uppercase tracking-wider">{tr("🎾 Free court access", "🎾 Pista gratis")}</div>
            {p.free_court_note && <p className="text-xs text-[var(--cream)]/80 mt-2">{p.free_court_note}</p>}
            <p className="text-[10px] text-[var(--cream)]/55 mt-1">{tr("Shown on your grid card. Share the exact address only in chat.", "Se muestra en tu tarjeta. Comparte la dirección exacta solo en el chat.")}</p>
          </div>
        )}
      </div>

      <AvailabilityCard awayUntil={(p as any).away_until ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ["my-profile"] })} />

      <div className="mt-4 surface-card p-4 flex items-start gap-3 text-sm text-[var(--cream)]/70">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        <p>{t("prof.privacy")}</p>
      </div>

      <Link to="/app/onboarding"><Button variant="outline" className="w-full mt-4">{t("prof.retake")}</Button></Link>
      <Link to="/app/hidden" className={buttonVariants({ variant: "outline", className: "w-full mt-2" })}>{tr("Hidden & blocked", "Ocultos y bloqueados")}</Link>

      <FeedbackBox />

      <button onClick={onDelete} className="block mx-auto mt-8 text-xs uppercase tracking-widest text-red-400/70 hover:text-red-400">
        {t("prof.delete")}
      </button>
    </main>
  );
}

function FeedbackBox() {
  const { t } = useI18n();
  const send = useServerFn(submitFeedback);
  const [msg, setMsg] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const trimmed = msg.trim();
    if (trimmed.length < 3) {
      toast.error(t("fb.tooShort"));
      return;
    }
    setBusy(true);
    try {
      await send({ data: { message: trimmed, rating } });
      toast.success(t("fb.thanks"));
      setMsg("");
      setRating(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("fb.fail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 surface-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--ball)]" />
        <h2 className="text-display text-lg tracking-wider">{t("fb.title")}</h2>
      </div>
      <p className="text-xs text-[var(--cream)]/60 mt-1">{t("fb.sub")}</p>

      <div className="flex items-center gap-1 mt-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(rating === n ? null : n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="p-1"
          >
            <Star
              className={`w-5 h-5 ${rating && n <= rating ? "fill-[var(--ball)] text-[var(--ball)]" : "text-[var(--cream)]/40"}`}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value.slice(0, 2000))}
        placeholder={t("fb.placeholder")}
        className="mt-3 min-h-[110px]"
        maxLength={2000}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--cream)]/50">{msg.length}/2000</span>
        <Button onClick={onSubmit} disabled={busy || msg.trim().length < 3} size="sm">
          {busy ? t("fb.sending") : t("fb.send")}
        </Button>
      </div>
    </div>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">{label}</div>
      <div>{v}</div>
    </div>
  );
}

function AvailabilityCard({ awayUntil, onSaved }: { awayUntil: string | null; onSaved: () => void }) {
  const setAway = useServerFn(setAwayStatus);
  const tr = useTr();
  const today = new Date().toISOString().slice(0, 10);
  const isAway = !!awayUntil && awayUntil >= today;
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const payload = isAway ? null : "2999-12-31";
      await setAway({ data: { away_until: payload } });
      toast.success(payload ? tr("Marked as on holidays", "Marcado como de vacaciones") : tr("You're available again", "Ya estás disponible de nuevo"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not update", "No se pudo actualizar"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-display text-lg tracking-wider">{tr("Availability", "Disponibilidad")}</h2>
          <p className="text-xs text-[var(--cream)]/60 mt-1">
            {isAway ? tr("✈️ On holidays", "✈️ De vacaciones") : tr("🎾 Available / in city", "🎾 Disponible / en la ciudad")}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`relative w-12 h-7 rounded-full transition-colors ${isAway ? "bg-amber-500" : "bg-[var(--cream)]/25"}`}
          aria-label="Toggle holiday status"
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${isAway ? "translate-x-5" : ""}`} />
        </button>
      </div>
      <p className="mt-3 text-[10px] text-[var(--cream)]/55">
        {tr(
          'When on holidays, other players see an "On holidays" badge on your card and you drop to the bottom of their grid.',
          'Cuando estás de vacaciones, los demás ven una etiqueta "De vacaciones" en tu tarjeta y apareces al final de la cuadrícula.',
        )}
      </p>
    </div>
  );
}

