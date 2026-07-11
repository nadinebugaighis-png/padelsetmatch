import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShareQR } from "@/components/ShareQR";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMyAccount, getMyMatches, getMyProfile, setAwayStatus, submitFeedback, updateMyPhoto } from "@/lib/app.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decodeLocation, formatLocation } from "@/lib/types";
import { Camera, ChevronDown, GraduationCap, HelpCircle, Lock, MapPin, MessageCircle, MessageSquare, Pencil, Sparkles, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { useId, useRef, useState, type ReactNode } from "react";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { QASection } from "@/components/QASection";
import { CoachSelfSection } from "@/components/CoachSelfSection";
import { VenuesSection } from "@/components/VenuesSection";



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

  if (q.isLoading) return <div className="programme-page px-4 py-10 text-center text-[var(--ink)]/60 min-h-screen">{t("prof.loading")}</div>;
  const p = q.data;
  if (!p) {
    return (
      <main className="programme-page px-4 py-10 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center min-h-screen">
        <p className="text-[var(--ink)]/70">{t("prof.noProfile")}</p>
        <Link to="/app/onboarding" className="mt-4 inline-block underline text-[var(--plum)]">{t("prof.createLink")}</Link>
      </main>
    );
  }
  const locations = (p.locations ?? []).map(decodeLocation).map(formatLocation);
  const genderLabel = p.gender === "self-describe" ? (p.gender_custom || label("self-describe")) : label(p.gender);
  const hasDetails =
    locations.length > 0 ||
    (p.languages?.length ?? 0) > 0;

  return (
    <main className="programme-page px-4 sm:px-6 lg:px-10 py-4 sm:py-6 max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto min-h-[calc(100vh-4rem)]">

      {/* Hero: compact photo + name side-by-side, even on mobile */}
      <div className="programme-card p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-5">
          {/* Photo */}
          <div className="relative shrink-0">
            {p.photo_url ? (
              <img
                src={p.photo_url}
                alt={p.first_name}
                className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 border-[var(--ink)]/20 shadow"
              />
            ) : (
              <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-[var(--paper-2)] flex items-center justify-center text-[var(--ink)]/30 border-2 border-[var(--ink)]/15">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
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
              className={`absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--ink)] text-[var(--paper)] shadow-md border-2 border-[var(--paper)] cursor-pointer transition hover:scale-105 ${uploading ? "opacity-60 pointer-events-none" : ""}`}
            >
              <Camera className="w-3.5 h-3.5" />
            </label>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-serif text-xl sm:text-3xl lg:text-4xl leading-tight truncate text-[var(--ink)]">{p.first_name}</h1>
              <p className="mt-0.5 text-xs sm:text-sm text-[var(--ink)]/75">
                {p.age} · {label(p.level)} · {p.nationality}
              </p>
              <p className="text-xs sm:text-sm text-[var(--ink)]/55">{genderLabel}</p>
            </div>
          </div>
        </div>

        {p.bio && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/85 italic border-l-2 border-[var(--ink)]/20 pl-3">
            {p.bio}
          </p>
        )}
      </div>

      <EditSectionsStrip />


      {/* Messages — placed right under name & photo for quick access */}
      <div className="mt-3 sm:mt-4">
        <MessagesRow />
      </div>


      <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
        <AvailabilityCard awayUntil={(p as any).away_until ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ["my-profile"] })} />

        {hasDetails && (
          <CollapsibleRow
            icon={<MapPin className="w-4 h-4" />}
            title={tr("Where & languages", "Dónde y idiomas", "Où et langues")}
            subtitle={[
              locations[0],
              (p.languages ?? [])[0] ? label((p.languages ?? [])[0] as any) : null,
            ].filter(Boolean).join(" · ") || undefined}
            contentCard
          >
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              {locations.length > 0 && (
                <Section title={t("prof.playsIn")}>
                  <div className="flex flex-wrap gap-1.5">
                    {locations.map((l) => <span key={l} className="chip-ink">{l}</span>)}
                  </div>
                </Section>
              )}
              {p.languages?.length > 0 && (
                <Section title={t("prof.languages")}>
                  <div className="flex flex-wrap gap-1.5">
                    {p.languages.map((l) => <span key={l} className="chip-ink">{label(l)}</span>)}
                  </div>
                </Section>
              )}
            </div>
            {p.free_court_access && (
              <div className="mt-3 rounded-xl border border-[var(--ink)]/15 bg-[var(--ink)]/[0.04] p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--grass)] text-[var(--ink)] text-[10px] font-bold uppercase tracking-wider shrink-0">
                    {tr("🎾 Free court", "🎾 Pista gratis", "🎾 Pista gratuite")}
                  </span>
                  {p.free_court_note && <span className="text-xs text-[var(--ink)]/85">{p.free_court_note}</span>}
                </div>
              </div>
            )}
          </CollapsibleRow>
        )}

        <CollapsibleRow
          icon={<MapPin className="w-4 h-4" />}
          title={tr("Where you play", "Dónde juegas", "Où tu joues")}
          subtitle={tr("Clubs & compounds for smarter matches", "Clubes y urbanizaciones para mejor match", "Clubs et résidences pour de meilleurs matchs")}
        >
          <VenuesSection />
        </CollapsibleRow>

        <CollapsibleRow
          icon={<GraduationCap className="w-4 h-4" />}
          title={tr("Coaching", "Entrenamiento", "Coaching")}
          subtitle={(p as any).is_coach ? tr("You're listed as a coach", "Apareces como coach", "Tu es listé comme coach") : tr("Turn on coach mode", "Activa el modo coach", "Activer le mode coach")}
        >
          <CoachSelfSection isCoach={!!(p as any).is_coach} profileId={p.id} />
        </CollapsibleRow>

        <CollapsibleRow
          icon={<HelpCircle className="w-4 h-4" />}
          title={tr("Questions & answers", "Preguntas y respuestas", "Questions et réponses")}
          subtitle={tr("Shape your compatibility", "Afina tu compatibilidad", "Affine ta compatibilité")}
        >
          <QASection />
        </CollapsibleRow>

        <CollapsibleRow
          icon={<MessageSquare className="w-4 h-4" />}
          title={tr("Send feedback", "Enviar comentarios", "Envoyer un avis")}
          subtitle={tr("Anonymous — help us improve", "Anónimo — ayúdanos a mejorar", "Anonyme — aide-nous à améliorer")}
        >
          <FeedbackBox />
        </CollapsibleRow>


        <Link to="/app/hidden" className={buttonVariants({ variant: "outline", className: "w-full" })}>{tr("Hidden & blocked", "Ocultos y bloqueados", "Masqué et bloqué")}</Link>
      </div>


      <button onClick={onDelete} className="block mx-auto mt-8 text-xs uppercase tracking-widest text-red-500/80 hover:text-red-500">
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

function EditSectionsMenu() {
  const tr = useTr();
  return (
    <Link
      to="/app/onboarding"
      className="inline-flex items-center gap-1 px-2.5 sm:px-3 h-7 sm:h-8 rounded-full border border-[var(--ink)]/25 text-[10px] sm:text-xs uppercase tracking-widest text-[var(--ink)]/80 hover:text-[var(--ink)] hover:border-[var(--ink)]/50 transition shrink-0"
    >
      <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      {tr("Edit", "Editar", "Éditer")}
    </Link>
  );
}

function EditSectionsStrip() {
  const tr = useTr();
  const sections: Array<{ step: number; label: string }> = [
    { step: 0, label: tr("Basics", "Datos básicos", "Bases") },
    { step: 1, label: tr("Who to meet", "A quién conocer", "Qui rencontrer") },
    { step: 2, label: tr("Padel & where", "Pádel y dónde", "Padel et lieux") },
    { step: 3, label: tr("Photo & bio", "Foto y bio", "Photo et bio") },
    { step: 4, label: tr("Compatibility ✨", "Compatibilidad ✨", "Compatibilité ✨") },
  ];
  return (
    <div className="mt-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/55 mb-2 px-1">
        {tr("Edit a section", "Editar una sección", "Modifier une section")}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {sections.map((s) => (
          <Link
            key={s.step}
            to="/app/onboarding"
            search={{ step: s.step }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-[var(--paper)] border border-[var(--ink)]/20 text-xs text-[var(--ink)] hover:bg-[var(--paper-2)] hover:border-[var(--ink)]/40 transition whitespace-nowrap"
          >
            <Pencil className="w-3 h-3" />
            {s.label}
          </Link>
        ))}
      </div>
    </div>
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
    <div className="mt-6 programme-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--ink)]" />
        <h2 className="text-serif text-lg tracking-tight text-[var(--ink)]">{t("fb.title")}</h2>
      </div>
      <p className="text-xs text-[var(--ink)]/60 mt-1">{t("fb.anon")}</p>

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
              className={`w-5 h-5 ${rating && n <= rating ? "fill-[var(--ink)] text-[var(--ink)]" : "text-[var(--ink)]/40"}`}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value.slice(0, 2000))}
        placeholder={t("fb.placeholder")}
        className="mt-3 min-h-[110px] border-[var(--ink)]/20 text-[var(--ink)] placeholder:text-[var(--ink)]/40"
        maxLength={2000}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--ink)]/50">{msg.length >= 1800 ? `${msg.length}/2000` : ""}</span>
        <Button onClick={onSubmit} disabled={busy || msg.trim().length < 3} size="sm" variant="outline">
          {busy ? t("fb.sending") : t("fb.send")}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60 mb-2 font-medium">{title}</div>
      {children}
    </div>
  );
}

function CollapsibleRow({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  contentCard = false,
  children,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  contentCard?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--ink)]/15 bg-[var(--paper)] px-4 py-3.5 text-left hover:bg-[var(--paper-2)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--ink)]/[0.06] text-[var(--ink)] shrink-0">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[var(--ink)] leading-tight truncate">{title}</div>
            {subtitle && <div className="text-xs text-[var(--ink)]/60 truncate mt-0.5">{subtitle}</div>}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--ink)]/50 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={contentCard ? "mt-2 programme-card p-4 sm:p-5" : "mt-2"}>
          {children}
        </div>
      )}
    </div>
  );
}


function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/60">{label}</div>
      <div className="text-sm sm:text-base font-medium text-[var(--ink)]">{v}</div>
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
      toast.success(payload ? tr("On holidays 🌴", "De vacaciones 🌴", "En vacances 🌴") : tr("Back on 🎾", "De vuelta 🎾", "De retour 🎾"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not update", "No se pudo actualizar", "Impossible de mettre à jour"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 programme-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-serif text-lg tracking-tight text-[var(--ink)]">{tr("Availability", "Disponibilidad", "Disponibilité")}</h2>
          <p className="text-xs text-[var(--ink)]/60 mt-1">
            {isAway ? tr("✈️ On holidays", "✈️ De vacaciones", "✈️ En vacances") : tr("🎾 Available / in city", "🎾 Disponible / en la ciudad", "🎾 Disponible / en ville")}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`relative w-12 h-7 rounded-full transition-colors ${isAway ? "bg-[var(--plum)]" : "bg-[var(--ink)]/20"}`}
          aria-label="Toggle holiday status"
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${isAway ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </div>
  );
}

function MessagesRow() {
  const tr = useTr();
  const getMatches = useServerFn(getMyMatches);
  const q = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches() });
  const unread = (q.data ?? []).reduce((n: number, m: any) => n + (m.unread ?? 0), 0);
  const count = (q.data ?? []).length;
  return (
    <Link
      to="/app/matches"
      className="group flex items-center justify-between gap-3 w-full rounded-2xl border border-[var(--plum)]/30 bg-gradient-to-r from-[var(--plum)] to-[var(--plum)]/90 px-4 py-3.5 shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--plum)_55%,transparent)] hover:shadow-[0_12px_28px_-10px_color-mix(in_oklab,var(--plum)_60%,transparent)] hover:scale-[1.01] transition-all"
    >
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--paper)]/15 backdrop-blur-sm">
          <MessageCircle className="w-5 h-5 text-[var(--paper)]" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--grass)] text-[var(--ink)] text-[10px] font-bold flex items-center justify-center border-2 border-[var(--plum)]">{unread > 9 ? "9+" : unread}</span>
          )}
        </div>
        <div>
          <div className="text-[15px] sm:text-base font-bold text-[var(--paper)] tracking-tight">{tr("Messages", "Mensajes", "Messages")}</div>
          <div className="text-[12px] text-[var(--paper)]/80">
            {count > 0
              ? tr(`${count} conversation${count > 1 ? "s" : ""}`, `${count} conversación${count > 1 ? "es" : ""}`, `${count} conversation${count > 1 ? "s" : ""}`)
              : tr("Chat with your matches", "Chatea con tus matches", "Discute avec tes matchs")}
          </div>
        </div>
      </div>
      <span className="text-[var(--paper)]/80 text-lg group-hover:text-[var(--paper)] transition-colors">›</span>
    </Link>
  );
}


