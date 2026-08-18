import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { listPublicUpcomingMatches } from "@/lib/guest.functions";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Open padel matches near you — PadelSetMatch" },
      { name: "description", content: "Browse open padel matches in your city. Join a spot in one tap — no account required." },
      { property: "og:title", content: "Open padel matches near you — PadelSetMatch" },
      { property: "og:description", content: "Browse open padel matches in your city. Join a spot in one tap — no account required." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicPlayFeed,
});

function fmtDay(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function PublicPlayFeed() {
  const tr = useTr();
  const listFn = useServerFn(listPublicUpcomingMatches);
  const q = useQuery({ queryKey: ["public-upcoming-matches"], queryFn: () => listFn({ data: { limit: 60 } }) });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((m) =>
      `${m.club_name ?? ""} ${m.city ?? ""} ${m.club_address ?? ""} ${m.host_name ?? ""}`.toLowerCase().includes(s),
    );
  }, [q.data, search]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((m) => {
      const key = new Date(m.starts_at).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <main className="min-h-screen bg-[var(--court-deep)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← PadelSetMatch</Link>
          <Link to="/auth" className="text-[11px] uppercase tracking-widest text-[var(--cream)]/70 hover:text-[var(--cream)] underline">
            {tr("Sign in", "Iniciar sesión", "Se connecter")}
          </Link>
        </div>

        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-widest text-[var(--grass)]">{tr("Open matches", "Partidos abiertos", "Matches ouverts")}</div>
          <h1 className="text-3xl text-[var(--cream)] font-medium mt-1 leading-tight">
            {tr("Find a padel match near you.", "Encuentra un partido cerca.", "Trouve un match près de toi.")}
          </h1>
          <p className="text-sm text-[var(--cream)]/70 mt-2">
            {tr("Tap any match to join a spot as a guest — no account needed.", "Toca un partido para unirte como invitado — sin cuenta.", "Touche un match pour rejoindre en invité — sans compte.")}
          </p>
        </div>

        <div className="mt-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--cream)]/50" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("Search club, city or address", "Buscar club, ciudad o dirección", "Chercher club, ville ou adresse")}
            className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-full pl-10 pr-4 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream)]/40" />
        </div>

        {q.isLoading && <p className="mt-10 text-center text-[var(--cream)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</p>}

        {!q.isLoading && filtered.length === 0 && (
          <div className="mt-10 text-center text-[var(--cream)]/60 text-sm">
            {tr("No matches found. Try another search or sign up to create your own.", "Sin partidos. Prueba otra búsqueda o crea uno.", "Aucun match. Essaie une autre recherche ou crée le tien.")}
            <div className="mt-4"><Link to="/auth" className="underline text-[var(--cream)]">{tr("Create a match", "Crear un partido", "Créer un match")}</Link></div>
          </div>
        )}

        <div className="mt-6 space-y-6 pb-16">
          {byDay.map(([day, list]) => (
            <section key={day}>
              <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-2">{fmtDay(list[0].starts_at)}</div>
              <div className="grid gap-2">
                {list.map((m) => {
                  const open = Math.max(0, 4 - (m.filled ?? 0));
                  const names = m.participant_names ?? [];
                  const started = new Date(m.starts_at).getTime() <= Date.now();
                  return (
                    <Link key={m.id} to="/g/$eventId" params={{ eventId: m.id }}
                      className="block rounded-2xl border border-[var(--cream)]/10 bg-black/30 p-4 hover:border-[var(--cream)]/30 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--cream)] truncate">{m.club_name ?? tr("Padel match", "Partido de pádel", "Match de padel")}</div>
                          <div className="text-xs text-[var(--cream)]/60 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtTime(m.starts_at)}</span>
                            {m.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.city}</span>}
                            <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {m.filled}/4</span>
                          </div>
                          {m.host_name && <div className="text-[10px] text-[var(--cream)]/50 mt-1 uppercase tracking-widest">{tr("Host", "Anfitrión", "Hôte")}: {m.host_name}</div>}
                        </div>
                        <div className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ${open > 0 ? "bg-[var(--ball)] text-[var(--court-deep)] font-semibold" : "bg-[var(--cream)]/10 text-[var(--cream)]/60"}`}>
                          {open > 0 ? `${open} ${tr("open", "libres", "libres")}` : tr("Full", "Completo", "Complet")}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
