import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShareQR } from "@/components/ShareQR";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMyAccount, getMyProfile, setAwayStatus, submitFeedback, updateMyPhoto } from "@/lib/app.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decodeLocation, formatLocation } from "@/lib/types";
import { Camera, Lock, Pencil, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { useId, useRef, useState } from "react";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { QASection } from "@/components/QASection";

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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
      toast.success(tr("Photo updated", "Foto actualizada", "Photo mise à jour"));
    } catch (e) {
      const message = e instanceof Error ? e.message : tr("Upload failed", "No se pudo subir", "Échec du téléversement");
      toast.error(isTransientUploadError(message) ? tr("Upload failed because the connection was busy. Please try again.", "La conexión estaba ocupada. Inténtalo de nuevo.", "Échec du téléversement, connexion occupée. Réessaie.") : message);
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
      <main className="px-4 py-10 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center">
        <p className="text-[var(--cream)]/70">{t("prof.noProfile")}</p>
        <Link to="/app/onboarding" className="mt-4 inline-block underline">{t("prof.createLink")}</Link>
      </main>
    );
  }
  const locations = (p.locations ?? []).map(decodeLocation).map(formatLocation);
  const genderLabel = p.gender === "self-describe" ? (p.gender_custom || label("self-describe")) : label(p.gender);
  return (
    <main className="px-4 py-6 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
      {/* Hero: big photo + name + quick edit */}
      <div className="surface-card p-6 sm:p-7">
        <div className="flex flex-col items-center sm:flex-row sm:items-start sm:gap-7">
          {/* Photo */}
          <div className="relative shrink-0">
            {p.photo_url ? (
              <img
                src={p.photo_url}
                alt={p.first_name}
                className="w-40 h-40 sm:w-44 sm:h-44 rounded-full object-cover border-2 border-[var(--cream)]/20 shadow-lg"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-[var(--muted)] flex items-center justify-center text-[var(--cream)]/30 border-2 border-[var(--cream)]/15">
                <Camera className="w-10 h-10" />
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
                if (f) setPendingFile(f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor={photoInputId}
              aria-disabled={uploading}
              title={uploading ? tr("Uploading…", "Subiendo…", "Téléversement…") : tr("Change photo", "Cambiar foto", "Changer la photo")}
              className={`absolute bottom-1 right-1 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--ball)] text-[var(--court-deep)] shadow-md border-2 border-[var(--court-deep)]/10 cursor-pointer transition hover:scale-105 ${uploading ? "opacity-60 pointer-events-none" : ""}`}
            >
              <Camera className="w-5 h-5" />
            </label>
          </div>

          {/* Name + meta */}
          <div className="mt-5 sm:mt-0 flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-start justify-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-display text-3xl sm:text-4xl leading-tight">{p.first_name}</h1>
                <p className="mt-1 text-sm text-[var(--cream)]/70">
                  {p.age} · {label(p.level)} · {p.nationality}
                </p>
                <p className="text-sm text-[var(--cream)]/60">{genderLabel}</p>
              </div>
              <Link
                to="/app/onboarding"
                aria-label={t("prof.retake")}
                title={t("prof.retake")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-[var(--cream)]/25 text-xs uppercase tracking-widest text-[var(--cream)]/80 hover:text-[var(--cream)] hover:border-[var(--cream)]/50 transition shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                {tr("Edit", "Editar", "Éditer")}
              </Link>
            </div>

            {p.bio && (
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--cream)]/85 italic border-l-2 border-[var(--cream)]/20 pl-3 text-left">
                {p.bio}
              </p>
            )}

            <Link
              to="/app/onboarding"
              className="sm:hidden mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-full border border-[var(--cream)]/25 text-xs uppercase tracking-widest text-[var(--cream)]/80"
            >
              <Pencil className="w-3.5 h-3.5" />
              {tr("Edit profile", "Editar perfil", "Éditer le profil")}
            </Link>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 surface-card p-5 sm:p-6 space-y-5">
        {locations.length > 0 && (
          <Section title={t("prof.playsIn")}>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          </Section>
        )}

        {p.languages?.length > 0 && (
          <Section title={t("prof.languages")}>
            <div className="flex flex-wrap gap-2">
              {p.languages.map((l) => <span key={l} className="chip">{label(l)}</span>)}
            </div>
          </Section>
        )}

        {(p.personal_traits?.length ?? 0) > 0 && (
          <Section title={tr("Personal characteristics", "Características personales", "Traits personnels")}>
            <div className="flex flex-wrap gap-2">
              {p.personal_traits!.map((trait) => <span key={trait} className="chip">{label(trait)}</span>)}
            </div>
          </Section>
        )}

        {(p.padel_style?.length ?? 0) > 0 && (
          <Section title={tr("Padel style", "Estilo de pádel", "Style de padel")}>
            <div className="flex flex-wrap gap-2">
              {p.padel_style!.map((s) => <span key={s} className="chip">{label(s)}</span>)}
            </div>
          </Section>
        )}

        {p.free_court_access && (
          <div className="rounded-xl border border-[var(--cream)]/30 bg-[var(--cream)]/10 p-4">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[11px] font-bold uppercase tracking-wider">
              {tr("🎾 Free court access", "🎾 Pista gratis", "🎾 Pista gratuite")}
            </div>
            {p.free_court_note && <p className="text-sm text-[var(--cream)]/85 mt-2.5">{p.free_court_note}</p>}
            <p className="text-[11px] text-[var(--cream)]/55 mt-1.5">{tr("Shown on your grid card. Share the exact address only in chat.", "Se muestra en tu tarjeta. Comparte la dirección exacta solo en el chat.", "Affiché sur ta carte grid. Partage l'adresse exacte seulement en chat.")}</p>
          </div>
        )}
      </div>

      <AvailabilityCard awayUntil={(p as any).away_until ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ["my-profile"] })} />

      <div className="mt-4 surface-card p-4 flex items-start gap-3 text-sm text-[var(--cream)]/70">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        <p>{t("prof.privacy")}</p>
      </div>

      <Link to="/app/hidden" className={buttonVariants({ variant: "outline", className: "w-full mt-4" })}>{tr("Hidden & blocked", "Ocultos y bloqueados", "Masqué et bloqué")}</Link>

      <QASection />

      <FeedbackBox />

      <button onClick={onDelete} className="block mx-auto mt-8 text-xs uppercase tracking-widest text-red-400/70 hover:text-red-400">
        {t("prof.delete")}
      </button>
      <PhotoCropDialog
        file={pendingFile}
        onCancel={() => setPendingFile(null)}
        onConfirm={(cropped) => {
          setPendingFile(null);
          onPickPhoto(cropped);
        }}
      />
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
        <Sparkles className="w-4 h-4 text-[var(--cream)]" />
        <h2 className="text-display text-lg tracking-wider">{t("fb.title")}</h2>
      </div>
      <p className="text-xs text-[var(--cream)]/60 mt-1">{t("fb.sub")}</p>
      <p className="text-[10px] text-[var(--cream)]/40 mt-1">{t("fb.anon")}</p>

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
              className={`w-5 h-5 ${rating && n <= rating ? "fill-[var(--cream)] text-[var(--cream)]" : "text-[var(--cream)]/40"}`}
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
      <div className="text-sm sm:text-base font-medium text-[var(--cream)]">{v}</div>
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
      toast.success(payload ? tr("Marked as on holidays", "Marcado como de vacaciones", "Marqué comme en vacances") : tr("You're available again", "Ya estás disponible de nuevo", "Tu es à nouveau disponible"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not update", "No se pudo actualizar", "Impossible de mettre à jour"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-display text-lg tracking-wider">{tr("Availability", "Disponibilidad", "Disponibilité")}</h2>
          <p className="text-xs text-[var(--cream)]/60 mt-1">
            {isAway ? tr("✈️ On holidays", "✈️ De vacaciones", "✈️ En vacances") : tr("🎾 Available / in city", "🎾 Disponible / en la ciudad", "🎾 Disponible / en ville")}
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

