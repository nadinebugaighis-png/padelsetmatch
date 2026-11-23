import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { BOOK_COURT_REGIONS, bookCourtClubs, bookCourtRegionFor, type BookCourtRegion } from "@/lib/club-booking";

export const Route = createFileRoute("/app/book-court")({
  head: () => ({ meta: [
    { title: "Book a Padel Court | PadelSetMatch" },
    { name: "description", content: "Reserve a court at padel clubs in Madrid, London, Marbella, Dubai and Miami in one tap." },
    { property: "og:title", content: "Book a Padel Court | PadelSetMatch" },
    { property: "og:description", content: "Reserve a court at padel clubs in Madrid, London, Marbella, Dubai and Miami in one tap." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BookCourtPage,
});

function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function BookCourtPage() {
  const tr = useTr();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = qc.getQueryData<{ locations?: string[] }>(["my-profile"]);
  const [region, setRegion] = useState<BookCourtRegion>(() => bookCourtRegionFor(profile?.locations));
  const [q, setQ] = useState("");
  const clubs = useMemo(() => bookCourtClubs(), []);
  const shown = clubs.filter((c) => c.region === region && (!q.trim() || norm(c.name).includes(norm(q.trim()))));
  const viaLabel = (v: string) => v === "playtomic" ? "Playtomic" : v === "padelmates" ? "Padel Mates" : tr("Club website", "Web del club", "Site du club");

  const smallCaps = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/76";

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl mx-auto px-5 sm:px-6 pt-2 sm:pt-4 pb-32">
        <button type="button" onClick={() => navigate({ to: "/app/events" })} aria-label={tr("Back", "Atrás", "Retour")} className="-ml-2 grid size-10 place-items-center rounded-full text-[var(--ink)] active:opacity-60"><ArrowLeft className="size-5" strokeWidth={1.6} /></button>

        <header className="mt-1">
          <div className={smallCaps}>{tr("Play", "Juega", "Jouer")}</div>
          <h1 className="mt-2 text-serif text-[28px] sm:text-5xl leading-none text-[var(--ink)]">{tr("Book a court", "Reserva pista", "Réserve un court")}</h1>
          <p className="mt-2 text-serif italic text-[14px] sm:text-[17px] text-[var(--ink)]/78">{tr("Pick a club, book on its own page.", "Elige un club y reserva en su página.", "Choisis un club, réserve sur sa page.")}</p>
        </header>

        {/* City tabs, same style as Matches */}
        <div role="tablist" aria-label={tr("City", "Ciudad", "Ville")} className="mt-6 flex gap-5 sm:gap-6 overflow-x-auto [scrollbar-width:none] border-b border-[var(--ink)]/16">
          {BOOK_COURT_REGIONS.map((r) => {
            const on = region === r;
            return (
              <button key={r} type="button" role="tab" aria-selected={on} onClick={() => setRegion(r)}
                className={`-mb-px h-10 shrink-0 border-b-[1.5px] text-[14px] sm:text-[15px] transition ${on ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--ink)]/72"}`}>
                {r === "london" ? tr("London", "Londres", "Londres") : r === "madrid" ? "Madrid" : r === "marbella" ? "Marbella" : r === "dubai" ? tr("Dubai", "Dubái", "Dubaï") : "Miami"}
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex items-center gap-2.5 border-b border-[var(--ink)]/22 h-11 focus-within:border-[var(--ink)]/45 transition">
          <Search className="size-4 text-[var(--ink)]/70" strokeWidth={1.6} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search a club", "Busca un club", "Chercher un club")}
            className="w-full bg-transparent text-[15px] text-[var(--ink)] placeholder:text-[var(--ink)]/55 placeholder:italic outline-none" />
        </label>

        <div className="mt-5 flex items-baseline justify-between">
          <span className={smallCaps}>{shown.length === 1 ? tr("1 club", "1 club", "1 club") : tr(`${shown.length} clubs`, `${shown.length} clubes`, `${shown.length} clubs`)}</span>
          <span className="text-serif italic text-[12.5px] text-[var(--ink)]/72">{tr("Tap to book", "Toca para reservar", "Touche pour réserver")}</span>
        </div>

        <ul className="mt-2 overflow-hidden rounded-2xl card-pop divide-y divide-[var(--ink)]/[0.07]">
          {shown.map((c) => (
            <li key={c.key}>
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                onClick={() => window.__lovableEvents?.track?.("project.book_court_clicked", { club: c.key, source: "club", placement: "book_court_page" })}
                className="group flex items-center gap-3 px-4 sm:px-5 py-3.5 transition active:bg-[var(--ink)]/[0.04] hover:bg-[var(--ink)]/[0.02]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-serif text-[17px] sm:text-[19px] leading-tight text-[var(--ink)]">{c.name}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/72">{viaLabel(c.via)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10.5px] uppercase tracking-[0.2em] text-[var(--ink)]">
                  {tr("Book", "Reservar", "Réserver")}<ArrowUpRight className="size-3.5 transition group-active:translate-x-0.5 group-active:-translate-y-0.5" strokeWidth={1.6} />
                </span>
              </a>
            </li>
          ))}
          {shown.length === 0 && <li className="px-5 py-8 text-center text-serif italic text-[15px] text-[var(--ink)]/76">{tr("No club with that name yet.", "Aún no hay un club con ese nombre.", "Aucun club de ce nom pour l'instant.")}</li>}
        </ul>

        <div className="mt-8 text-center">
          <p className="text-serif italic text-[14px] text-[var(--ink)]/76">{tr("Club not listed?", "¿No está tu club?", "Club absent ?")}</p>
          <a href="https://playtomic.com/?utm_source=padelsetmatch&utm_medium=app&utm_campaign=book_court" target="_blank" rel="noopener noreferrer"
            onClick={() => window.__lovableEvents?.track?.("project.book_court_clicked", { club: "other", source: "search", placement: "book_court_page" })}
            className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--ink)]/30 px-5 text-[10.5px] uppercase tracking-[0.2em] text-[var(--ink)] transition active:scale-[0.98] active:bg-[var(--ink)]/[0.04]">
            {tr("Search on Playtomic", "Buscar en Playtomic", "Chercher sur Playtomic")}<ArrowUpRight className="size-3.5" strokeWidth={1.6} />
          </a>
        </div>
      </div>
    </div>
  );
}
