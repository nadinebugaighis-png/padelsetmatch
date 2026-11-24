import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getIsAdmin } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MatchDateTimePicker } from "@/components/MatchDateTimePicker";
import { useTr } from "@/lib/i18n";
import { shrinkPhoto } from "@/lib/shrink-photo";
import { COMPETITION_FORMATS, formatLabel, myProfileId, safeSignupUrl, safeWhatsAppUrl } from "@/lib/competitions";

export const Route = createFileRoute("/app/competitions/new")({
  head: () => ({ meta: [
    { title: "Announce a Padel Competition | PadelSetMatch" },
    { name: "description", content: "Announce an Americana, Pozo, tournament or league to the PadelSetMatch community." },
    { property: "og:title", content: "Announce a Padel Competition | PadelSetMatch" },
    { property: "og:description", content: "Announce an Americana, Pozo, tournament or league to the PadelSetMatch community." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: NewCompetition,
});

const label = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/82";

function NewCompetition() {
  const tr = useTr();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<string>("americana");
  const [club, setClub] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState(16);
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [poster, setPoster] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [hosted, setHosted] = useState(false);
  const [signupUrl, setSignupUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const checkAdmin = useServerFn(getIsAdmin);
  const { data: isAdmin } = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin(), retry: false });

  async function submit() {
    if (title.trim().length < 2 || !club.trim() || !start) {
      toast.error(tr("Add a name, a club and a start date.", "Añade nombre, club y fecha de inicio.", "Ajoute un nom, un club et une date."));
      return;
    }
    const link = signupUrl.trim() ? safeSignupUrl(signupUrl) : null;
    if (signupUrl.trim() && !link) {
      toast.error(tr("Check the sign-up link", "Revisa el enlace de inscripción", "Vérifie le lien d'inscription"));
      return;
    }
    const wa = whatsapp.trim() ? safeWhatsAppUrl(whatsapp) : null;
    if (whatsapp.trim() && !wa) {
      toast.error(tr("Check the WhatsApp group link", "Revisa el enlace del grupo de WhatsApp", "Vérifie le lien du groupe WhatsApp"));
      return;
    }
    setSaving(true);
    try {
      const profileId = await myProfileId();
      if (!profileId) throw new Error(tr("Please sign in first", "Inicia sesión primero", "Connecte-toi d'abord"));
      let posterPath: string | null = null;
      if (poster) {
        const { data: u } = await supabase.auth.getUser();
        // Shrink big phone pictures first so the poster appears quickly for everyone.
        const small = await shrinkPhoto(poster, { maxSide: 1600, minBytes: 600 * 1024, name: "poster.jpg" });
        const ext = (small.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${u.user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("competition-posters").upload(path, small, { contentType: small.type });
        if (upErr) throw upErr;
        posterPath = path;
      }
      const { data, error } = await supabase.from("competitions").insert({
        creator_profile_id: profileId,
        title: title.trim(),
        format,
        club_name: club.trim(),
        starts_at: new Date(start).toISOString(),
        ends_at: end ? new Date(end).toISOString() : null,
        capacity: hosted && isAdmin ? capacity : 16,
        hosted: !!(hosted && isAdmin),
        signup_url: hosted && isAdmin ? null : link,
        level_note: level.trim() || null,
        description: description.trim() || null,
        poster_path: posterPath,
        whatsapp_url: wa,
      }).select("id").single();
      if (error) {
        if (posterPath) await supabase.storage.from("competition-posters").remove([posterPath]);
        throw error;
      }
      toast.success(tr("Competition announced", "Competición anunciada", "Compétition annoncée"));
      navigate({ to: "/app/competitions/$competitionId", params: { competitionId: data.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not create it", "No se pudo crear", "Impossible de créer"));
    } finally { setSaving(false); }
  }

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md mx-auto px-4 pt-3 pb-24 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app/competitions" })} aria-label={tr("Back", "Atrás", "Retour")}><ArrowLeft /></Button>
          <h1 className="text-serif text-xl text-foreground">{tr("Announce a competition", "Anunciar una competición", "Annoncer une compétition")}</h1>
        </div>

        <div className="space-y-1.5">
          <div className={label}>{tr("Format", "Formato", "Format")}</div>
          <div className="flex flex-wrap gap-1.5">
            {COMPETITION_FORMATS.map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)}
                className={`rounded-full border px-3 py-1.5 text-xs ${format === f ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)]" : "border-[var(--ink)]/20 text-[var(--ink)]"}`}>
                {formatLabel(f, tr)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className={label}>{tr("Name", "Nombre", "Nom")}</div>
          <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Sunday Americana", "Americana del domingo", "Americana du dimanche")} />
        </div>
        <div className="space-y-1.5">
          <div className={label}>{tr("Club", "Club", "Club")}</div>
          <Input value={club} maxLength={120} onChange={(e) => setClub(e.target.value)} placeholder="Club de Pádel La Moraleja" />
        </div>
        <div className="space-y-1.5">
          <div className={label}>{tr("Starts", "Empieza", "Début")}</div>
          <MatchDateTimePicker value={start} onChange={setStart} />
        </div>
        <div className="space-y-1.5">
          <div className={label}>{tr("Ends (optional, for leagues)", "Termina (opcional, para ligas)", "Fin (optionnel, pour les ligues)")}</div>
          <MatchDateTimePicker value={end} onChange={setEnd} />
        </div>
        {isAdmin && (
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--gold)]/45 bg-white px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-[var(--ink)]">{tr("Hosted by PadelSetMatch", "Organizada por PadelSetMatch", "Organisée par PadelSetMatch")}</span>
              <span className="block text-xs text-[var(--ink)]/78">{tr("Players register in the app", "Los jugadores se inscriben en la app", "Les joueurs s'inscrivent dans l'app")}</span>
            </span>
            <Switch checked={hosted} onCheckedChange={setHosted} />
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          {hosted && isAdmin && (
            <div className="space-y-1.5">
              <div className={label}>{tr("Players", "Jugadores", "Joueurs")}</div>
              <Input type="number" inputMode="numeric" min={4} max={128} value={capacity} onChange={(e) => setCapacity(Math.max(4, Math.min(128, Number(e.target.value) || 4)))} />
            </div>
          )}
          <div className={`space-y-1.5 ${hosted && isAdmin ? "" : "col-span-2"}`}>
            <div className={label}>{tr("Level (optional)", "Nivel (opcional)", "Niveau (optionnel)")}</div>
            <Input value={level} maxLength={60} onChange={(e) => setLevel(e.target.value)} placeholder={tr("All levels", "Todos los niveles", "Tous niveaux")} />
          </div>
        </div>
        {!(hosted && isAdmin) && (
          <div className="space-y-1.5">
            <div className={label}>{tr("Sign-up link (optional)", "Enlace de inscripción (opcional)", "Lien d'inscription (optionnel)")}</div>
            <Input value={signupUrl} maxLength={500} inputMode="url" onChange={(e) => setSignupUrl(e.target.value)} placeholder="playtomic.com/…" />
          </div>
        )}
        <div className="space-y-1.5">
          <div className={label}>{tr("WhatsApp group (optional)", "Grupo de WhatsApp (opcional)", "Groupe WhatsApp (optionnel)")}</div>
          <Input value={whatsapp} maxLength={300} inputMode="url" onChange={(e) => setWhatsapp(e.target.value)} placeholder="chat.whatsapp.com/…" />
        </div>
        <div className="space-y-1.5">
          <div className={label}>{tr("Details (optional)", "Detalles (opcional)", "Détails (optionnel)")}</div>
          <Textarea value={description} maxLength={1500} rows={4} onChange={(e) => setDescription(e.target.value)} placeholder={tr("Price, prizes, dress code, how pairs are made", "Precio, premios, dress code, cómo se forman las parejas", "Prix, lots, tenue, formation des paires")} />
        </div>
        <div className="space-y-1.5">
          <div className={label}>{tr("Poster (optional)", "Cartel (opcional)", "Affiche (optionnelle)")}</div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--ink)]/25 px-3 py-3 text-sm text-[var(--ink)]/80">
            <ImagePlus className="size-4" />
            <span className="truncate">{poster ? poster.name : tr("Add a poster image", "Añadir imagen del cartel", "Ajouter une affiche")}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setPoster(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <Button className="w-full" disabled={saving} onClick={submit}>{saving ? tr("Publishing…", "Publicando…", "Publication…") : tr("Publish", "Publicar", "Publier")}</Button>
      </div>
    </div>
  );
}
