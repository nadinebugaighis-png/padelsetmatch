import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MatchDateTimePicker } from "@/components/MatchDateTimePicker";
import { useTr } from "@/lib/i18n";
import { COMPETITION_FORMATS, formatLabel, myProfileId } from "@/lib/competitions";

export const Route = createFileRoute("/app/competitions/new")({
  head: () => ({ meta: [
    { title: "Create a Padel Competition | PadelSetMatch" },
    { name: "description", content: "Organise an Americana, Pozo, tournament or league and let players sign up." },
    { property: "og:title", content: "Create a Padel Competition | PadelSetMatch" },
    { property: "og:description", content: "Organise an Americana, Pozo, tournament or league and let players sign up." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: NewCompetition,
});

const label = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/60";

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

  async function submit() {
    if (title.trim().length < 2 || !club.trim() || !start) {
      toast.error(tr("Add a name, a club and a start date.", "Añade nombre, club y fecha de inicio.", "Ajoute un nom, un club et une date."));
      return;
    }
    setSaving(true);
    try {
      const profileId = await myProfileId();
      if (!profileId) throw new Error(tr("Please sign in first", "Inicia sesión primero", "Connecte-toi d'abord"));
      let posterUrl: string | null = null;
      if (poster) {
        const { data: u } = await supabase.auth.getUser();
        const ext = (poster.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${u.user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("competition-posters").upload(path, poster, { contentType: poster.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("competition-posters").createSignedUrl(path, 60 * 60 * 24 * 365 * 2);
        posterUrl = signed?.signedUrl ?? null;
      }
      const { data, error } = await supabase.from("competitions").insert({
        creator_profile_id: profileId,
        title: title.trim(),
        format,
        club_name: club.trim(),
        starts_at: new Date(start).toISOString(),
        ends_at: end ? new Date(end).toISOString() : null,
        capacity,
        level_note: level.trim() || null,
        description: description.trim() || null,
        poster_url: posterUrl,
      }).select("id").single();
      if (error) throw error;
      toast.success(tr("Competition published", "Competición publicada", "Compétition publiée"));
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
          <h1 className="text-serif text-xl text-foreground">{tr("New competition", "Nueva competición", "Nouvelle compétition")}</h1>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className={label}>{tr("Players", "Jugadores", "Joueurs")}</div>
            <Input type="number" inputMode="numeric" min={4} max={128} value={capacity} onChange={(e) => setCapacity(Math.max(4, Math.min(128, Number(e.target.value) || 4)))} />
          </div>
          <div className="space-y-1.5">
            <div className={label}>{tr("Level (optional)", "Nivel (opcional)", "Niveau (optionnel)")}</div>
            <Input value={level} maxLength={60} onChange={(e) => setLevel(e.target.value)} placeholder={tr("All levels", "Todos los niveles", "Tous niveaux")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className={label}>{tr("Details (optional)", "Detalles (opcional)", "Détails (optionnel)")}</div>
          <Textarea value={description} maxLength={1500} rows={4} onChange={(e) => setDescription(e.target.value)} placeholder={tr("Price, prizes, dress code, how pairs are made", "Precio, premios, dress code, cómo se forman las parejas", "Prix, lots, tenue, formation des paires")} />
        </div>
        <div className="space-y-1.5">
          <div className={label}>{tr("Poster (optional)", "Cartel (opcional)", "Affiche (optionnelle)")}</div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--ink)]/25 px-3 py-3 text-sm text-[var(--ink)]/70">
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
