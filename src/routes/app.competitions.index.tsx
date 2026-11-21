import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPosterUrls } from "@/lib/competitions.functions";
import { Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTr, useI18n } from "@/lib/i18n";
import { canRegisterInApp, competitionPhase, formatLabel } from "@/lib/competitions";

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
  starts_at: string; ends_at: string | null; capacity: number; poster_url: string | null; hosted: boolean;
  competition_entries: { count: number }[];
};

function CompetitionsPage() {
  const tr = useTr();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const posterUrls = useServerFn(getPosterUrls);
  const { data = [], isLoading } = useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id,title,format,club_name,city,starts_at,ends_at,capacity,poster_path,hosted")
        .order("starts_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as unknown as (Omit<CompetitionRow, "competition_entries" | "poster_url"> & { poster_path: string | null })[];
      // Sign-up names are private; counts come from a count-only lookup.
      const { data: counts } = rows.length
        ? await supabase.rpc("competition_entry_counts", { _ids: rows.map((r) => r.id) })
        : { data: [] as { competition_id: string; entries: number }[] };
      const byComp = new Map((counts ?? []).map((c) => [c.competition_id, c.entries]));
      // Posters are private files shown through links that expire after an hour.
      const withPoster = rows.filter((r) => r.poster_path).map((r) => r.id);
      const posters = withPoster.length ? await posterUrls({ data: { ids: withPoster } }).catch(() => ({} as Record<string, string>)) : {};
      return rows.map(({ poster_path: _p, ...r }) => ({ ...r, poster_url: posters[r.id] ?? null, competition_entries: [{ count: byComp.get(r.id) ?? 0 }] })) as CompetitionRow[];
    },
  });
  const live = data.filter((c) => competitionPhase(c.starts_at, c.ends_at) === "live");
  const upcoming = data.filter((c) => competitionPhase(c.starts_at, c.ends_at) === "upcoming");
  const past = data.filter((c) => competitionPhase(c.starts_at, c.ends_at) === "past").reverse().slice(0, 8);
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : "en-GB";
  const nothing = tr("Nothing scheduled yet", "Aún no hay nada programado", "Rien de prévu pour l'instant");

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto pt-2 pb-32">
        {/* Same heading and tabs as the Matches page, with Competitions selected. */}
        <div className="px-4 sm:px-6 lg:px-10 pt-1 sm:pt-2">
          <h1 className="text-serif text-xl sm:text-3xl leading-tight tracking-normal text-foreground">
            {tr("MATCHES", "PARTIDOS", "MATCHES")}
          </h1>
          <div role="tablist" aria-label={tr("Matches", "Partidos", "Matchs")} className="mt-2 mb-2 flex min-w-0 gap-3 sm:gap-5 border-b border-border">
            <Button role="tab" aria-selected={false} variant="ghost" onClick={() => navigate({ to: "/app/events" })}
              className="h-9 rounded-none px-0 text-sm shadow-none border-b-2 border-transparent text-muted-foreground hover:bg-transparent">
              {tr("Find a match", "Buscar partido", "Trouver un match")}
            </Button>
            <Button role="tab" aria-selected={false} variant="ghost"
              onClick={() => { try { sessionStorage.setItem("psm-matches-tab", "mine"); } catch { /* ignore */ } navigate({ to: "/app/events" }); }}
              className="h-9 rounded-none px-0 text-sm shadow-none border-b-2 border-transparent text-muted-foreground hover:bg-transparent">
              {tr("My matches", "Mis partidos", "Mes matchs")}
            </Button>
            <Button role="tab" aria-selected variant="ghost"
              className="h-9 rounded-none px-0 text-sm shadow-none border-b-2 border-primary text-primary hover:bg-transparent">
              {tr("Competitions", "Competiciones", "Compétitions")}
            </Button>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-10 pt-4">
          <div className="-mt-1 mb-5 flex justify-end">
            <button type="button" onClick={() => navigate({ to: "/app/competitions/new" })}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--ink)]/20 bg-white px-3.5 text-[13px] font-medium text-[var(--ink)]">
              <Plus className="size-4" strokeWidth={1.75} />{tr("Announce a competition", "Anunciar competición", "Annoncer une compétition")}
            </button>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map((i) => <div key={i} className="aspect-[4/5] rounded-[22px] bg-[var(--ink)]/[0.06] animate-pulse" />)}
            </div>
          ) : (
            <>
              <Section title={tr("Happening now", "En curso", "En cours")} items={live} live empty={tr("Nothing happening right now", "Nada en curso ahora mismo", "Rien en cours pour l'instant")} locale={locale} tr={tr} />
              <Section title={tr("Upcoming", "Próximas", "À venir")} items={upcoming} empty={nothing} locale={locale} tr={tr} />
              <div className="mt-2 border-t border-[var(--ink)]/10 pt-6">
                <h2 className="text-serif text-[24px] leading-tight text-[var(--ink)]">{tr("Past competitions", "Competiciones pasadas", "Compétitions passées")}</h2>
                {past.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 items-start gap-x-4 gap-y-6 opacity-75">
                    {past.map((c) => <PosterCard key={c.id} c={c} past locale={locale} tr={tr} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

function Section({ title, items, live, empty, locale, tr }: { title: string; items: CompetitionRow[]; live?: boolean; empty: string; locale: string; tr: ReturnType<typeof useTr> }) {
  return (
    <section className="mb-8">
      <h2 className="text-serif text-[24px] leading-tight text-[var(--ink)]">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-[15px] text-[var(--ink)]/50">{empty}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 items-start gap-x-4 gap-y-6">
          {items.map((c) => <PosterCard key={c.id} c={c} live={live} locale={locale} tr={tr} />)}
        </div>
      )}
    </section>
  );
}

function PosterCard({ c, live, past, locale, tr }: { c: CompetitionRow; live?: boolean; past?: boolean; locale: string; tr: ReturnType<typeof useTr> }) {
  const joined = c.competition_entries?.[0]?.count ?? 0;
  const start = new Date(c.starts_at);
  const end = c.ends_at ? new Date(c.ends_at) : null;
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const multiDay = !!end && fmt(end) !== fmt(start);
  const dates = live && !multiDay
    ? `${tr("Since", "Desde", "Depuis")} ${fmt(start)} · ${c.club_name}`
    : multiDay ? `${fmt(start)} – ${fmt(end!)}` : `${fmt(start)} · ${c.club_name}`;
  const hosted = canRegisterInApp(c);
  const count = !hosted
    ? formatLabel(c.format, tr)
    : past
    ? tr(`${joined} played`, `${joined} jugaron`, `${joined} ont joué`)
    : tr(`${joined} of ${c.capacity} signed up`, `${joined} de ${c.capacity} apuntados`, `${joined} sur ${c.capacity} inscrits`);
  return (
    <Link to="/app/competitions/$competitionId" params={{ competitionId: c.id }} className="group block min-w-0">
      {/* Posters show whole, never cropped; only the drawn fallback keeps a fixed shape. */}
      <div className={`relative overflow-hidden rounded-[22px] bg-[var(--ink)] shadow-[0_14px_30px_-18px_rgba(15,62,46,0.6)] ${c.poster_url ? "" : "aspect-[4/5]"}`}>
        {c.poster_url ? (
          <img src={c.poster_url} alt="" className="block h-auto w-full transition-transform duration-500 group-active:scale-[1.02]" loading="lazy" />
        ) : (
          <div className="relative flex h-full flex-col items-center justify-center px-4 pt-4 text-center bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_60%)]">
            <span className="absolute inset-2.5 rounded-[16px] border border-[var(--gold)]/35" />
            <span className="text-[8.5px] uppercase tracking-[0.35em] text-[var(--gold)]">PadelSetMatch</span>
            <span className="mt-3 text-serif italic text-[21px] leading-[1.08] text-[var(--cream)] line-clamp-3">{c.title}</span>
            <span className="mt-3 flex items-center gap-2 text-[var(--gold)]"><span className="h-px w-6 bg-current" /><span className="text-[9px] uppercase tracking-[0.3em]">{formatLabel(c.format, tr)}</span><span className="h-px w-6 bg-current" /></span>
            <span className="mt-3 max-w-full text-[9.5px] uppercase tracking-[0.2em] text-[var(--cream)]/75 truncate">{c.club_name}</span>
            <span className="mt-1 text-serif text-[13px] text-[var(--cream)]">{start.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
        )}
        {hosted && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--ink)]/85 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--gold)] ring-1 ring-[var(--gold)]/40">
            {tr("Sign up", "Inscripción", "Inscription")}
          </span>
        )}
        {live && (
          <span className="absolute left-3 top-3 rounded-full border border-[var(--plum)]/30 bg-[var(--cream)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--plum)] shadow-sm">
            {tr("Live", "En curso", "En cours")}
          </span>
        )}
      </div>
      <div className="mt-2.5 text-serif text-[18px] leading-snug text-[var(--ink)] line-clamp-2">{c.title}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-[var(--ink)]/50 min-w-0">
        <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.5} /><span className="truncate">{dates}</span>
      </div>
      <div className="mt-0.5 text-[13.5px] text-[var(--pitch)]">{count}</div>
    </Link>
  );
}
