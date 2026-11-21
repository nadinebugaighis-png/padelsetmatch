import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { bookCourtClubs, type BookCourtRegion } from "@/lib/club-booking";

export const Route = createFileRoute("/app/book-court")({
  head: () => ({ meta: [
    { title: "Book a Padel Court | PadelSetMatch" },
    { name: "description", content: "Reserve a court at padel clubs in Madrid and London in one tap." },
    { property: "og:title", content: "Book a Padel Court | PadelSetMatch" },
    { property: "og:description", content: "Reserve a court at padel clubs in Madrid and London in one tap." },
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
  const inLondon = (profile?.locations ?? []).some((l) => /london|londres/i.test(l));
  const [region, setRegion] = useState<BookCourtRegion>(inLondon ? "london" : "madrid");
  const [q, setQ] = useState("");
  const clubs = useMemo(() => bookCourtClubs(), []);
  const shown = clubs.filter((c) => c.region === region && (!q.trim() || norm(c.name).includes(norm(q.trim()))));
  const viaLabel = (v: string) => v === "playtomic" ? "Playtomic" : v === "padelmates" ? "Padel Mates" : tr("Club website", "Web del club", "Site du club");

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl mx-auto px-5 pt-2 pb-32">
        <button type="button" onClick={() => navigate({ to: "/app/events" })} aria-label={tr("Back", "Atrás", "Retour")} className="-ml-2 grid size-10 place-items-center rounded-full text-[var(--ink)]"><ArrowLeft className="size-5" /></button>
        <h1 className="mt-1 text-serif text-[38px] leading-[1.05] text-[var(--ink)]">{tr("Book a court", "Reserva pista", "Réserve un court")}</h1>
        <p className="mt-2 text-[15px] text-[var(--ink)]/55">{tr("Choose a club and reserve on its booking page.", "Elige un club y reserva en su página.", "Choisis un club et réserve sur sa page.")}</p>

        <div className="mt-5 grid grid-cols-2 rounded-full border border-[var(--ink)]/12 bg-white p-1">
          {(["madrid", "london"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)} aria-pressed={region === r}
              className={`h-9 rounded-full text-[13px] font-medium transition ${region === r ? "bg-[var(--ink)] text-[var(--cream)]" : "text-[var(--ink)]/60"}`}>
              {r === "madrid" ? "Madrid" : tr("London", "Londres", "Londres")}
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-full border border-[var(--ink)]/12 bg-white px-4 h-11">
          <Search className="size-4 text-[var(--ink)]/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search clubs", "Buscar clubes", "Chercher un club")}
            className="w-full bg-transparent text-[15px] text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none" />
        </label>

        <ul className="mt-4 divide-y divide-[var(--ink)]/[0.08] rounded-2xl border border-[var(--ink)]/10 bg-white">
          {shown.map((c) => (
            <li key={c.key}>
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                onClick={() => window.__lovableEvents?.track?.("project.book_court_clicked", { club: c.key, source: "club", placement: "book_court_page" })}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-[var(--ink)]/[0.03]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-[var(--ink)]">{c.name}</span>
                  <span className="block text-[12.5px] text-[var(--ink)]/45">{viaLabel(c.via)}</span>
                </span>
                <span className="flex items-center gap-1 rounded-full border border-[var(--ink)]/15 px-3 py-1.5 text-[12px] font-medium text-[var(--ink)]">
                  {tr("Book", "Reservar", "Réserver")}<ArrowUpRight className="size-3.5" />
                </span>
              </a>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-[var(--ink)]/50">{tr("No club with that name yet.", "Aún no hay un club con ese nombre.", "Aucun club de ce nom pour l'instant.")}</li>}
        </ul>

        <a href="https://playtomic.com/?utm_source=padelsetmatch&utm_medium=app&utm_campaign=book_court" target="_blank" rel="noopener noreferrer"
          onClick={() => window.__lovableEvents?.track?.("project.book_court_clicked", { club: "other", source: "search", placement: "book_court_page" })}
          className="mt-4 block text-center text-[13px] text-[var(--ink)]/55 underline underline-offset-4">
          {tr("Club not listed? Search on Playtomic", "¿No está tu club? Búscalo en Playtomic", "Club absent ? Cherche sur Playtomic")}
        </a>
      </div>
    </div>
  );
}
