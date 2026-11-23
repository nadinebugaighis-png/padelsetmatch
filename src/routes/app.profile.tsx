import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { withRating } from "@/lib/level-label";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMyAccount, getMyMatches, getMyProfile, setAwayStatus, setMyAvailability, submitFeedback, updateMyPhoto } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decodeLocation } from "@/lib/types";
import { formatNationalities } from "@/lib/affinity";
import { Camera, ChevronRight, Mail, MessageCircle } from "lucide-react";
import { nativeShare, openExternal, openMailTo } from "@/lib/native";
import { recordAppShare } from "@/lib/app-shares";
import { DOWNLOAD_URL, shareAppText } from "@/lib/store-link";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { getMyCoachSlots } from "@/lib/coach-lessons.functions";
import { VenuesSection } from "@/components/VenuesSection";
import { GearEditor } from "@/components/GearShelf";
import { MemberGuide, openMemberGuide } from "@/components/MemberGuide";
import { QaAnswers, QA_TOTAL, useQaAnswers } from "@/components/QaAnswers";
import { isTelemetryEnabled, setTelemetryEnabled } from "@/lib/telemetry";




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
      { name: "description", content: "Update your padel details, availability and private answers." },
      { property: "og:title", content: "Your player profile \u00b7 PadelSetMatch" },
      { property: "og:description", content: "Update your padel details, availability and private answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Your profile · PadelSetMatch" },
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

  if (q.isLoading) return <div className="programme-page px-4 py-10 text-center text-[var(--ink)]/82 min-h-screen">{t("prof.loading")}</div>;
  const p = q.data;
  if (!p) {
    return (
      <main className="programme-page px-4 py-10 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center min-h-screen">
        <p className="text-[var(--ink)]/80">{t("prof.noProfile")}</p>
        <Link to="/app/onboarding" className="mt-4 inline-block underline text-[var(--ink)]">{t("prof.createLink")}</Link>
        <Button variant="outline" className="mt-5" onClick={onDelete}>{t("prof.delete")}</Button>
      </main>
    );
  }
  const firstArea = (() => {
    const first = ((p as any).locations ?? [])[0] as string | undefined;
    if (!first) return "";
    const l = decodeLocation(first);
    return l.area || l.city || "";
  })();
  const metaLine = [withRating(label(p.level), p.level), formatNationalities(p), firstArea].filter(Boolean).join(" · ");

  return (
    <main className="programme-page px-5 sm:px-8 pt-4 sm:pt-8 pb-10 max-w-md sm:max-w-xl lg:max-w-2xl mx-auto min-h-[calc(100vh-4rem)]">

      {/* Header: arched portrait, name, one quiet line, bio, Edit profile */}
      <header className="flex flex-col items-center text-center pb-7">
        <div className="relative">
          <div className="w-36 h-44 sm:w-44 sm:h-52 rounded-t-full rounded-b-[18px] overflow-hidden border border-[var(--ink)]/16 bg-[var(--paper-2)]">
            {p.photo_url ? (
              <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--ink)]/30">
                <Camera className="w-7 h-7" />
              </div>
            )}
          </div>
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
            aria-label={tr("Change photo", "Cambiar foto", "Changer la photo")}
            title={uploading ? tr("Uploading…", "Subiendo…", "Téléversement…") : tr("Change photo", "Cambiar foto", "Changer la photo")}
            className={`absolute -bottom-1 -right-1 inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--ink)]/22 shadow-sm cursor-pointer transition active:scale-95 ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <Camera className="w-4 h-4" />
          </label>
        </div>

        <h1 className="mt-5 text-serif text-[28px] sm:text-[40px] leading-none text-[var(--ink)]">{p.first_name}</h1>
        {metaLine && (
          <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/82">{metaLine}</p>
        )}
        {p.bio && (
          <p className="mt-4 max-w-sm text-serif italic text-[15px] sm:text-[17px] leading-snug text-[var(--ink)]/88">
            “{p.bio}”
          </p>
        )}
        <Link
          to="/app/onboarding"
          className="mt-5 inline-flex items-center h-10 px-6 rounded-full border border-[var(--ink)]/30 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)] hover:bg-[var(--ink)]/[0.04] active:scale-[0.98] transition"
        >
          {tr("Edit profile", "Editar perfil", "Modifier le profil")}
        </Link>
      </header>

      <div className="border-t border-[var(--ink)]/18">
        {(p as any).is_coach && <CoachBar />}

        <MessagesRow />

        {/* My kit */}
        <section className="border-b border-[var(--ink)]/18 py-5">
          <h2 className="text-serif text-[18px] sm:text-[22px] leading-tight text-[var(--ink)]">{tr("My kit", "Mi equipo", "Mon matériel")}</h2>
          <p className="text-xs text-[var(--ink)]/78 mt-1 mb-3">
            {tr("Shows on your player card.", "Se ve en tu ficha.", "Visible sur ta fiche.")}
          </p>
          <GearEditor profileId={p.id} />
        </section>

        <AvailabilityCard awayUntil={(p as any).away_until ?? null} slots={((p as any).availability ?? []) as string[]} onSaved={() => qc.invalidateQueries({ queryKey: ["my-profile"] })} />

        <CollapsibleRow title={tr("Your clubs", "Tus clubes", "Tes clubs")}>
          <VenuesSection />
        </CollapsibleRow>

        <QaRow />

        <InviteFriendsRow />

        <CollapsibleRow title={tr("Help & feedback", "Ayuda y comentarios", "Aide et avis")}>
          <button type="button" onClick={openMemberGuide} className="mb-3 w-full h-11 rounded-full border border-[var(--ink)]/20 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/88 hover:text-[var(--ink)] hover:border-[var(--ink)]/40 transition">
            {tr("How PadelSetMatch works", "Cómo funciona PadelSetMatch", "Comment fonctionne PadelSetMatch")}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                await openMailTo("nadine@padelsetmatch.com", "PadelSetMatch");
                toast.success(
                  tr(
                    "Opening your email app… Our address is also copied: nadine@padelsetmatch.com",
                    "Abriendo tu app de correo… También hemos copiado nuestro email: nadine@padelsetmatch.com",
                    "Ouverture de votre app mail… Notre adresse est aussi copiée : nadine@padelsetmatch.com",
                  ),
                  { duration: 6000 },
                );
              }}
              className="h-11 rounded-full border border-[var(--ink)]/20 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/88 hover:text-[var(--ink)] hover:border-[var(--ink)]/40 transition inline-flex items-center justify-center gap-2"
            >
              <Mail className="w-3.5 h-3.5" />
              {tr("Email", "Email", "Email")}
            </button>
            <button
              type="button"
              onClick={() => void openExternal("https://wa.me/34620296060?text=" + encodeURIComponent(tr("Hi! I play on PadelSetMatch.", "¡Hola! Juego en PadelSetMatch.", "Bonjour ! Je joue sur PadelSetMatch.")))}
              className="h-11 rounded-full border border-[var(--ink)]/20 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/88 hover:text-[var(--ink)] hover:border-[var(--ink)]/40 transition inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
          <FeedbackBox />
        </CollapsibleRow>

        <CollapsibleRow title={tr("Privacy", "Privacidad", "Confidentialité")}>
          <AnalyticsConsent />
        </CollapsibleRow>

        <LinkRow to="/app/settings" title={tr("Settings", "Ajustes", "Réglages")} />
      </div>

      <MemberGuide />

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

/** One hairline row: serif title on the left, quiet detail and chevron on the right. */
function RowInner({ title, meta, dot = false, open }: { title: string; meta?: ReactNode; dot?: boolean; open?: boolean }) {
  return (
    <>
      <span className="text-serif text-[18px] sm:text-[22px] leading-tight text-[var(--ink)] truncate">{title}</span>
      <span className="flex items-center gap-2 shrink-0 text-[13px] text-[var(--ink)]/78">
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]" aria-hidden="true" />}
        {meta}
        <ChevronRight className={`w-4 h-4 text-[var(--ink)]/70 transition-transform ${open ? "rotate-90" : ""}`} />
      </span>
    </>
  );
}

const ROW_CLASS = "w-full min-h-[60px] flex items-center justify-between gap-3 py-4 text-left border-b border-[var(--ink)]/18 active:bg-[var(--ink)]/[0.03] transition-colors";

function LinkRow({ to, title, meta, dot }: { to: "/app/hidden" | "/app/matches" | "/app/coach" | "/app/settings"; title: string; meta?: ReactNode; dot?: boolean }) {
  return (
    <Link to={to} className={ROW_CLASS}>
      <RowInner title={title} meta={meta} dot={dot} />
    </Link>
  );
}

function CollapsibleRow({
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={open ? "border-b border-[var(--ink)]/18 pb-5" : ""}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={open ? ROW_CLASS.replace("border-b border-[var(--ink)]/18", "") : ROW_CLASS}
      >
        <RowInner title={title} meta={meta} open={open} />
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
}

function FeedbackBox() {
  const { t } = useI18n();
  const send = useServerFn(submitFeedback);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const trimmed = msg.trim();
    if (trimmed.length < 3) {
      toast.error(t("fb.tooShort"));
      return;
    }
    setBusy(true);
    try {
      await send({ data: { message: trimmed, rating: null } });
      toast.success(t("fb.thanks"));
      setMsg("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("fb.fail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5">
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/82">{t("fb.title")}</h3>
      <Textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value.slice(0, 2000))}
        placeholder={t("fb.placeholder")}
        className="mt-2 min-h-[110px] bg-[var(--card)] border-[var(--ink)]/22 text-[var(--ink)] placeholder:text-[var(--ink)]/55"
        maxLength={2000}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--ink)]/76">{msg.length >= 1800 ? `${msg.length}/2000` : ""}</span>
        <Button onClick={onSubmit} disabled={busy || msg.trim().length < 3} size="sm" variant="outline" className="rounded-full">
          {busy ? t("fb.sending") : t("fb.send")}
        </Button>
      </div>
    </div>
  );
}

function Switch({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${on ? "bg-[var(--ink)]" : "bg-[var(--ink)]/15"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[var(--card)] shadow-sm transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

// Weekday "lunchtime" is the middle slot on weekdays; its English label reads "afternoons".
const RHYTHM_ROWS: Array<{ key: "weekday" | "weekend"; slots: [string, string, string] }> = [
  { key: "weekday", slots: ["Weekday mornings", "Weekday lunchtime", "Weekday evenings"] },
  { key: "weekend", slots: ["Weekend mornings", "Weekend afternoons", "Weekend evenings"] },
];

function AvailabilityCard({ awayUntil, slots, onSaved }: { awayUntil: string | null; slots: string[]; onSaved: () => void }) {
  const setAway = useServerFn(setAwayStatus);
  const saveAvail = useServerFn(setMyAvailability);
  const { label } = useI18n();
  const tr = useTr();
  const today = new Date().toISOString().slice(0, 10);
  const isAway = !!awayUntil && awayUntil >= today;
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>(slots);
  const dirty = picked.length !== slots.length || picked.some((s) => !slots.includes(s));

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

  const saveSlots = async () => {
    setBusy(true);
    try {
      await saveAvail({ data: { availability: picked } });
      toast.success(tr("Saved", "Guardado", "Enregistré"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not update", "No se pudo actualizar", "Impossible de mettre à jour"));
    } finally {
      setBusy(false);
    }
  };

  const cols = [
    tr("Morning", "Mañana", "Matin"),
    tr("Afternoon", "Mediodía", "Après-midi"),
    tr("Evening", "Noche", "Soir"),
  ];
  const rowLabel = (k: "weekday" | "weekend") =>
    k === "weekday" ? tr("Weekdays", "Entre semana", "En semaine") : tr("Weekends", "Fines de semana", "Week-end");

  return (
    <section className="border-b border-[var(--ink)]/18 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-serif text-[18px] sm:text-[22px] leading-tight text-[var(--ink)]">{tr("My rhythm", "Mi ritmo", "Mon rythme")}</h2>
          <p className="text-xs text-[var(--ink)]/78 mt-1">
            {isAway ? tr("✈️ On holidays", "✈️ De vacaciones", "✈️ En vacances") : tr("🎾 Available / in city", "🎾 Disponible / en la ciudad", "🎾 Disponible / en ville")}
          </p>
        </div>
        <Switch on={isAway} onClick={toggle} disabled={busy} label={tr("On holidays", "De vacaciones", "En vacances")} />
      </div>

      <div className="mt-4" role="group" aria-label={tr("When do you usually play?", "¿Cuándo sueles jugar?", "Quand joues-tu d'habitude ?")}>
        <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] items-center">
          <span />
          {cols.map((c) => (
            <span key={c} className="text-center text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]/76 pb-1">{c}</span>
          ))}
          {RHYTHM_ROWS.map((row) => (
            <div key={row.key} className="contents">
              <span className="text-sm text-[var(--ink)] py-1">{rowLabel(row.key)}</span>
              {row.slots.map((s) => {
                const on = picked.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    aria-label={label(s)}
                    onClick={() => setPicked((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                    className="h-11 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <span className={`w-4 h-4 rounded-full border transition-colors ${on ? "bg-[var(--ink)] border-[var(--ink)]" : "border-[var(--ink)]/35"}`} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {dirty && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={saveSlots}
              disabled={busy}
              className="h-9 px-5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-[0.2em] disabled:opacity-60"
            >
              {tr("Save", "Guardar", "Enregistrer")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function AnalyticsConsent() {
  const tr = useTr();
  const [enabled, setEnabled] = useState(true);
  // localStorage is client-only: read after hydration.
  useEffect(() => { setEnabled(isTelemetryEnabled()); }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setTelemetryEnabled(next);
    toast.success(
      next
        ? tr("Analytics on, thanks for helping", "Analítica activada, gracias por ayudar", "Analytique activée, merci")
        : tr("Analytics off", "Analítica desactivada", "Analytique désactivée"),
    );
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-[var(--ink)]">
          {tr("Share usage & crash data", "Compartir uso y fallos", "Partager l'usage et les plantages")}
        </div>
        <p className="text-xs text-[var(--ink)]/82 mt-1">
          {tr(
            "Anonymous app events and crash reports help us fix bugs. Never sold, never used for ads.",
            "Eventos anónimos e informes de fallos nos ayudan a corregir errores. Nunca se venden ni se usan para anuncios.",
            "Des événements anonymes et rapports de plantage nous aident à corriger les bugs. Jamais vendus, jamais pour la publicité.",
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        aria-label={tr("Share usage & crash data", "Compartir uso y fallos", "Partager l'usage et les plantages")}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${enabled ? "bg-[var(--ink)]" : "bg-[var(--ink)]/15"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function InviteFriendsRow() {
  const tr = useTr();
  const { lang } = useI18n();
  const onShare = async () => {
    const text = shareAppText(lang);
    const outcome = await nativeShare({ title: "PadelSetMatch", text, url: DOWNLOAD_URL });
    if (outcome === "shared") {
      recordAppShare("share_sheet");
    } else if (outcome === "copied") {
      recordAppShare("copy_link");
      toast.success(tr("Link copied, paste it in WhatsApp", "Enlace copiado, pégalo en WhatsApp", "Lien copié, colle-le dans WhatsApp"));
    } else if (outcome === "unavailable") {
      recordAppShare("whatsapp");
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${DOWNLOAD_URL}`)}`, "_blank", "noopener");
    }
  };
  return (
    <button type="button" onClick={onShare} className={ROW_CLASS}>
      <RowInner title={tr("Invite friends", "Invitar amigos", "Inviter des amis")} meta="WhatsApp" />
    </button>
  );
}

function MessagesRow() {
  const tr = useTr();
  const getMatches = useServerFn(getMyMatches);
  const q = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches() });
  const unread = (q.data ?? []).reduce((n: number, m: any) => n + (m.unread ?? 0), 0);
  const count = (q.data ?? []).length;
  const meta = unread > 0
    ? tr(`${unread > 9 ? "9+" : unread} new`, `${unread > 9 ? "9+" : unread} nuevos`, `${unread > 9 ? "9+" : unread} nouveaux`)
    : count > 0
      ? tr(`${count} conversation${count > 1 ? "s" : ""}`, (count > 1 ? `${count} conversaciones` : `${count} conversación`), `${count} conversation${count > 1 ? "s" : ""}`)
      : undefined;
  return <LinkRow to="/app/matches" title={tr("Messages", "Mensajes", "Messages")} meta={meta} dot={unread > 0} />;
}

function QaRow() {
  const tr = useTr();
  const { saved, query } = useQaAnswers();
  const n = saved.size;
  return (
    <CollapsibleRow
      title={tr("Playing style", "Afinidad de juego", "Style de jeu")}
      meta={query.isSuccess ? tr(`${n} of ${QA_TOTAL}`, `${n} de ${QA_TOTAL}`, `${n} sur ${QA_TOTAL}`) : undefined}
    >
      <QaAnswers />
    </CollapsibleRow>
  );
}

function CoachBar() {
  const tr = useTr();
  const fetchMine = useServerFn(getMyCoachSlots);
  const { data } = useQuery({ queryKey: ["my-coach-slots"], queryFn: () => fetchMine() });
  const requests = (data?.slots ?? []).filter((s) => s.status === "requested").length;
  return (
    <LinkRow
      to="/app/coach"
      title={tr("Coaching", "Entrenador", "Coaching")}
      dot={requests > 0}
      meta={requests > 0
        ? tr(`${requests} to answer`, `${requests} por responder`, `${requests} à répondre`)
        : tr("Requests and times", "Solicitudes y horas", "Demandes et horaires")}
    />
  );
}
