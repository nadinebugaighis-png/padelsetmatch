import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteCompetition, getPosterUrls } from "@/lib/competitions.functions";
import { getIsAdmin } from "@/lib/admin.functions";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTr, useI18n } from "@/lib/i18n";
import { canRegisterInApp, competitionPhase, formatLabel, myProfileId, safeSignupUrl, safeWhatsAppUrl } from "@/lib/competitions";

export const Route = createFileRoute("/app/competitions/$competitionId")({
  head: () => ({ meta: [
    { title: "Padel Competition | PadelSetMatch" },
    { name: "description", content: "Format, club, dates and how to take part." },
    { property: "og:title", content: "Padel Competition | PadelSetMatch" },
    { property: "og:description", content: "Format, club, dates and how to take part." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CompetitionDetail,
});

function CompetitionDetail() {
  const { competitionId } = Route.useParams();
  const tr = useTr();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const posterUrls = useServerFn(getPosterUrls);
  const removeComp = useServerFn(deleteCompetition);
  const checkAdmin = useServerFn(getIsAdmin);
  const { data: isAdmin } = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin(), retry: false });
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : "en-GB";

  const { data, isLoading } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: async () => {
      const [me, comp, entries, counts] = await Promise.all([
        myProfileId(),
        supabase.from("competitions").select("*").eq("id", competitionId).maybeSingle(),
        // Names are visible only to signed-up players, the organiser and admins.
        supabase.from("competition_entries").select("profile_id, created_at").eq("competition_id", competitionId).order("created_at"),
        supabase.rpc("competition_entry_counts", { _ids: [competitionId] }),
      ]);
      if (comp.error) throw comp.error;
      const ids = [...new Set([...(entries.data ?? []).map((e) => e.profile_id), comp.data?.creator_profile_id].filter(Boolean))] as string[];
      const { data: people } = ids.length ? await supabase.from("profiles").select("id, first_name, photo_url").in("id", ids) : { data: [] };
      const byId = new Map<string, any>(((people as any[]) ?? []).map((p: any) => [p.id, p]));
      const total = counts.data?.[0]?.entries ?? 0;
      const posters = comp.data?.poster_path
        ? await posterUrls({ data: { ids: [competitionId] } }).catch(() => ({} as Record<string, string>))
        : {};
      const posterUrl = posters[competitionId] ?? null;
      return { me, comp: comp.data, entries: entries.data ?? [], total, byId, posterUrl };
    },
  });

  if (isLoading) return <div className="programme-page min-h-screen" />;
  if (!data?.comp) return <div className="programme-page min-h-screen p-6 text-foreground">{tr("Competition not found", "Competición no encontrada", "Compétition introuvable")}</div>;
  const { comp, entries, total, me, byId, posterUrl } = data;
  const joined = !!me && entries.some((e) => e.profile_id === me);
  const isCreator = me === comp.creator_profile_id;
  const full = total >= comp.capacity;
  const seesNames = entries.length > 0;
  const phase = competitionPhase(comp.starts_at, comp.ends_at);
  const start = new Date(comp.starts_at);
  const end = comp.ends_at ? new Date(comp.ends_at) : null;
  const when = start.toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    + (end ? ` – ${end.toLocaleDateString(locale, { day: "numeric", month: "short" })}` : "");
  const creator = byId.get(comp.creator_profile_id);
  const hosted = canRegisterInApp(comp);
  const signupLink = safeSignupUrl(comp.signup_url);
  const whatsappLink = safeWhatsAppUrl(comp.whatsapp_url);

  async function toggle() {
    if (!me) return;
    setBusy(true);
    try {
      if (joined) {
        const { error } = await supabase.from("competition_entries").delete().eq("competition_id", comp!.id).eq("profile_id", me);
        if (error) throw error;
        toast.success(tr("You've left", "Te has salido", "Tu t'es retiré·e"));
      } else {
        const { error } = await supabase.from("competition_entries").insert({ competition_id: comp!.id, profile_id: me });
        if (error) throw error;
        toast.success(tr("You're in", "Estás dentro", "Tu es inscrit·e"));
      }
      await qc.invalidateQueries({ queryKey: ["competition", competitionId] });
      qc.invalidateQueries({ queryKey: ["competitions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Something went wrong", "Algo salió mal", "Une erreur est survenue"));
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm(tr("Delete this competition?", "¿Eliminar esta competición?", "Supprimer cette compétition ?"))) return;
    try {
      await removeComp({ data: { id: comp!.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not delete it", "No se pudo eliminar", "Impossible de supprimer"));
      return;
    }
    qc.invalidateQueries({ queryKey: ["competitions"] });
    navigate({ to: "/app/competitions" });
  }

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md mx-auto px-4 pt-3 pb-24">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app/competitions" })} aria-label={tr("Back", "Atrás", "Retour")}><ArrowLeft /></Button>
        {posterUrl && <img src={posterUrl} alt="" className="mt-2 block h-auto w-full rounded-2xl" />}
        <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
          <span>{formatLabel(comp.format, tr)}</span>
          <span className="h-px w-4 bg-current" />
          <span>{hosted ? "PadelSetMatch" : tr("Announcement", "Anuncio", "Annonce")}</span>
        </div>
        <h1 className="mt-1 text-serif text-[28px] leading-tight text-foreground">{comp.title}</h1>
        <div className="mt-3 space-y-1.5 text-sm text-foreground/80">
          <div className="flex items-center gap-2"><CalendarDays className="size-4" />{when}</div>
          <div className="flex items-center gap-2"><MapPin className="size-4" />{comp.club_name}</div>
          {hosted ? (
            <div className="flex items-center gap-2"><Users className="size-4" />{tr(`${total} of ${comp.capacity} signed up`, `${total} de ${comp.capacity} apuntados`, `${total} sur ${comp.capacity} inscrits`)}{comp.level_note ? ` · ${comp.level_note}` : ""}</div>
          ) : comp.level_note ? (
            <div className="flex items-center gap-2"><Users className="size-4" />{comp.level_note}</div>
          ) : null}
        </div>
        {comp.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{comp.description}</p>}
        {/* Announcements are posted by players, not organised by them, so only hosted events name an organiser. */}
        {hosted && creator && <p className="mt-3 text-xs text-muted-foreground">{tr("Organised by", "Organiza", "Organisé par")} {creator.first_name}</p>}

        {hosted ? (
          <>
            {phase !== "past" && (
              <Button className="mt-5 w-full" disabled={busy || (!joined && full)} variant={joined ? "outline" : "default"} onClick={toggle}>
                {joined ? tr("Leave", "Salir", "Se retirer") : full ? tr("Full", "Completo", "Complet") : tr("Sign up", "Apuntarme", "M'inscrire")}
              </Button>
            )}
            {(total === 0 || seesNames) && (
              <h2 className="mt-7 mb-2 text-[10px] uppercase tracking-[0.25em] text-foreground/60">{tr("Players", "Jugadores", "Joueurs")}</h2>
            )}
            {total === 0 ? (
              <p className="text-sm text-muted-foreground">{tr("Be the first to sign up.", "Sé el primero en apuntarte.", "Sois le premier à t'inscrire.")}</p>
            ) : !seesNames ? null : (
              <div className="flex flex-wrap gap-2">
                {entries.map((e) => {
                  const p = byId.get(e.profile_id);
                  return (
                    <div key={e.profile_id} className="flex items-center gap-2 rounded-full border border-[var(--ink)]/16 bg-white pl-1 pr-3 py-1">
                      <div className="size-7 overflow-hidden rounded-full bg-[var(--paper-2)]">{p?.photo_url && <img src={p.photo_url} alt="" className="h-full w-full object-cover" />}</div>
                      <span className="text-xs text-[var(--ink)]">{p?.first_name ?? tr("Player", "Jugador", "Joueur")}{e.profile_id === me ? tr(" (you)", " (tú)", " (toi)") : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : phase !== "past" && signupLink ? (
          <a href={signupLink} target="_blank" rel="noopener noreferrer"
            className="mt-5 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--ink)] text-sm font-medium text-[var(--cream)]">
            {tr("Sign up with the organiser", "Inscríbete con el organizador", "S'inscrire auprès de l'organisateur")}<ArrowUpRight className="size-4" />
          </a>
        ) : null}
        {phase !== "past" && whatsappLink && (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--ink)]/20 bg-white text-sm font-medium text-[var(--ink)]">
            {tr("Join the WhatsApp group", "Únete al grupo de WhatsApp", "Rejoindre le groupe WhatsApp")}<ArrowUpRight className="size-4" />
          </a>
        )}
        {/* Only the organiser or an admin may delete; the database enforces the same rule. */}
        {(isCreator || isAdmin === true) && <button type="button" onClick={remove} className="mt-8 text-xs text-destructive underline underline-offset-2">{tr("Delete competition", "Eliminar competición", "Supprimer la compétition")}</button>}
      </div>
    </div>
  );
}
