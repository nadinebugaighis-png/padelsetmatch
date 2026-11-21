import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, CalendarDays, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTr, useI18n } from "@/lib/i18n";
import { competitionPhase, formatLabel } from "@/lib/competitions";

export const Route = createFileRoute("/app/competitions/")({
  head: () => ({ meta: [
    { title: "Padel Competitions, Americanas and Pozos | PadelSetMatch" },
    { name: "description", content: "Americanas, pozos, leagues and charity cups created by players and clubs. Sign up in one tap." },
    { property: "og:title", content: "Padel Competitions | PadelSetMatch" },
    { property: "og:description", content: "Americanas, pozos, leagues and charity cups created by players and clubs." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CompetitionsPage,
});

export type CompetitionRow = {
  id: string; title: string; format: string; club_name: string; city: string | null;
  starts_at: string; ends_at: string | null; capacity: number; poster_url: string | null;
  competition_entries: { count: number }[];
};

function CompetitionsPage() {
  const tr = useTr();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id,title,format,club_name,city,starts_at,ends_at,capacity,poster_url,competition_entries(count)")
        .order("starts_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as CompetitionRow[];
    },
  });
  const live = data.filter((c) => competitionPhase(c.starts_at, c.ends_at) === "live");
  const upcoming = data.filter((c) => competitionPhase(c.starts_at, c.ends_at) === "upcoming");
  const past = data.filter((c) => competitionPhase(c.starts_at, c.ends_at) === "past").reverse().slice(0, 6);
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : "en-GB";

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-24">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-serif text-xl sm:text-3xl leading-tight text-foreground">{tr("COMPETITIONS", "COMPETICIONES", "COMPÉTITIONS")}</h1>
          <Button onClick={() => navigate({ to: "/app/competitions/new" })} className="h-9 px-3 shrink-0 shadow-none">
            <Plus />{tr("Create", "Crear", "Créer")}
          </Button>
        </div>
        <div className="mt-2 mb-4 flex gap-4 border-b border-border">
          <Link to="/app/events" className="h-9 inline-flex items-center text-sm text-muted-foreground border-b-2 border-transparent">{tr("Matches", "Partidos", "Matchs")}</Link>
          <span className="h-9 inline-flex items-center text-sm text-primary border-b-2 border-primary">{tr("Competitions", "Competiciones", "Compétitions")}</span>
        </div>

        {isLoading ? null : data.length === 0 || (live.length === 0 && upcoming.length === 0) ? (
          <div className="py-12 text-center">
            <Trophy className="mx-auto size-8 text-[var(--gold)]" strokeWidth={1.25} />
            <p className="mt-3 text-serif text-lg text-foreground">{tr("Nothing scheduled yet", "Aún no hay nada programado", "Rien de prévu pour l'instant")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{tr("Organise an Americana or a Pozo for your club.", "Organiza una Americana o un Pozo para tu club.", "Organise une Americana ou un Pozo pour ton club.")}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/app/competitions/new" })}>{tr("Create a competition", "Crear competición", "Créer une compétition")}</Button>
          </div>
        ) : null}

        <Section title={tr("Happening now", "En curso", "En cours")} items={live} live locale={locale} tr={tr} />
        <Section title={tr("Upcoming", "Próximas", "À venir")} items={upcoming} locale={locale} tr={tr} />
        <Section title={tr("Past", "Pasadas", "Passées")} items={past} muted locale={locale} tr={tr} />
      </div>
    </div>
  );
}

function Section({ title, items, live, muted, locale, tr }: { title: string; items: CompetitionRow[]; live?: boolean; muted?: boolean; locale: string; tr: ReturnType<typeof useTr> }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-7">
      <h2 className="text-serif text-[22px] text-foreground mb-3">{title}</h2>
      <div className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${muted ? "opacity-70" : ""}`}>
        {items.map((c) => <PosterCard key={c.id} c={c} live={live} locale={locale} tr={tr} />)}
      </div>
    </section>
  );
}

function PosterCard({ c, live, locale, tr }: { c: CompetitionRow; live?: boolean; locale: string; tr: ReturnType<typeof useTr> }) {
  const joined = c.competition_entries?.[0]?.count ?? 0;
  const start = new Date(c.starts_at);
  const end = c.ends_at ? new Date(c.ends_at) : null;
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const dates = end && fmt(end) !== fmt(start) ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} · ${start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
  return (
    <Link to="/app/competitions/$competitionId" params={{ competitionId: c.id }} className="block min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--ink)]">
        {c.poster_url ? (
          <img src={c.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-3 text-center">
            <span className="text-[9px] uppercase tracking-[0.3em] text-[var(--gold)]">{formatLabel(c.format, tr)}</span>
            <span className="mt-2 text-serif italic text-[22px] leading-tight text-[var(--cream)] line-clamp-3">{c.title}</span>
            <span className="mt-3 h-px w-10 bg-[var(--gold)]/60" />
            <span className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[var(--cream)]/70 line-clamp-2">{c.club_name}</span>
          </div>
        )}
        {live && <span className="absolute left-2 top-2 rounded-full bg-[var(--cream)] px-2 py-0.5 text-[10px] font-semibold text-[var(--plum)]">{tr("Live", "En curso", "En cours")}</span>}
      </div>
      <div className="mt-2 text-[14px] font-medium text-foreground truncate">{c.title}</div>
      <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground min-w-0">
        <CalendarDays className="size-3 shrink-0" /><span className="truncate">{dates}</span>
      </div>
      <div className="text-[12px] text-primary">{tr(`${joined} of ${c.capacity} signed up`, `${joined} de ${c.capacity} apuntados`, `${joined} sur ${c.capacity} inscrits`)}</div>
    </Link>
  );
}
