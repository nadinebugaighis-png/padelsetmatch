import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchClubs, getClubDetails, type ClubResult } from "@/lib/match-events.functions";
import { MapPin, Loader2 } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { CLUB_SEARCH_DELAY_MS, createClubSuggestionCache } from "@/lib/club-suggestions";

type Props = {
  value: ClubResult | null;
  onChange: (c: ClubResult | null) => void;
};

export function ClubPicker({ value, onChange }: Props) {
  const tr = useTr();
  const search = useServerFn(searchClubs);
  const details = useServerFn(getClubDetails);
  const [cache] = useState(() => createClubSuggestionCache<ClubResult>());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [results, setResults] = useState<ClubResult[]>([]);
  const selection = useRef(0);
  const query = q.trim();

  useEffect(() => {
    if (value || query.length < 2) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    const cached = cache.exact(query);
    setFailed(false);
    if (cached !== undefined) {
      setResults(cached);
      setLoading(false);
      return;
    }
    setResults(cache.matching(query));
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await search({ data: { query, near: null } });
        if (!cancelled) {
          cache.remember(query, response.results);
          setResults(response.results);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, CLUB_SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, value, search, cache]);

  async function selectClub(club: ClubResult) {
    const selected = ++selection.current;
    onChange(club);
    setQ("");
    setOpen(false);
    if (club.lat === null && club.place_id) {
      try {
        const { result } = await details({ data: { place_id: club.place_id } });
        if (result && selection.current === selected) onChange(result);
      } catch {
        // Keep the chosen suggestion if its additional details are unavailable.
      }
    }
  }

  if (value) {
    return (
      <div className="rounded-lg border border-club-border bg-club-soft p-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-ink">
            <MapPin className="w-4 h-4 shrink-0 text-ink/70" />
            <span className="font-medium break-words">{value.name}</span>
          </div>
          {value.address && <div className="text-xs text-ink/60 mt-1 break-words">{value.address}</div>}
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={() => {
          selection.current++;
          onChange(null);
          setQ("");
        }} className="text-xs text-ink/70 hover:bg-club-hover hover:text-ink shrink-0">
          {tr("Change", "Cambiar", "Modifier")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={tr("Search clubs or areas", "Buscar clubes o zonas", "Chercher des clubs ou quartiers")}
        aria-expanded={open && query.length >= 2}
        aria-controls="club-suggestions"
        aria-autocomplete="list"
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder={tr("Search any club or city (e.g. La Moraleja, Marbella)", "Busca cualquier club o ciudad (p. ej. La Moraleja, Marbella)", "Cherche n'importe quel club ou ville (p. ex. La Moraleja, Marbella)")}
        className="w-full bg-club-soft border border-club-border rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-ink placeholder:text-ink/50 focus:outline-none focus:ring-1 focus:ring-club-border transition"
      />
      <p className="mt-1 text-[11px] text-ink/55">
        {tr("Anywhere in the world — add the city to narrow it down.", "En cualquier parte del mundo: añade la ciudad para afinar.", "Partout dans le monde — ajoute la ville pour affiner.")}
      </p>
      {loading && <Loader2 aria-label={tr("Searching", "Buscando", "Recherche")} className="w-4 h-4 animate-spin motion-reduce:animate-none absolute right-3 top-3 text-ink/60" />}
      {open && query.length >= 2 && (
        <div id="club-suggestions" className="absolute z-50 mt-1 left-0 right-0 bg-club-surface border border-club-border rounded-lg overflow-hidden shadow-[var(--shadow-elevated)] max-h-72 overflow-y-auto">
          {results.map((club) => (
            <Button variant="ghost" key={club.place_id || `${club.name}|${club.address}`} type="button"
              onMouseDown={(e) => e.preventDefault()} onClick={() => void selectClub(club)}
              className="w-full h-auto min-h-12 justify-start rounded-none text-left whitespace-normal px-3 py-2 hover:bg-club-hover border-b border-club-border/30 text-ink">
              <MapPin className="shrink-0 text-ink/55" />
              <span className="min-w-0">
                <span className="block text-sm font-medium break-words">{club.name}</span>
                <span className="block text-xs font-normal text-ink/60 break-words">{club.address}</span>
              </span>
            </Button>
          ))}
          {results.length === 0 && (
            <div role="status" className="px-3 py-3 text-xs text-ink/60">
              {loading ? tr("Searching clubs…", "Buscando clubes…", "Recherche de clubs…") : failed ? tr("Search unavailable. Try again.", "Búsqueda no disponible. Inténtalo de nuevo.", "Recherche indisponible. Réessaie.") : tr("No clubs found on Google.", "No se encontraron clubes en Google.", "Aucun club trouvé sur Google.")}
            </div>
          )}
          <Button variant="ghost" type="button" onMouseDown={(e) => e.preventDefault()}
            onClick={() => void selectClub({ place_id: "", name: query, address: "", lat: null, lng: null, city: "", country: "" })}
            className="w-full h-auto min-h-12 justify-start rounded-none text-left whitespace-normal px-3 py-2.5 hover:bg-club-hover text-ink">
            <span className="min-w-0">
              <span className="block text-sm break-words">{tr(`Use "${query}"`, `Usar "${query}"`, `Utiliser « ${query} »`)}</span>
              <span className="block text-xs font-normal text-ink/60">{tr("Keep the club name as you typed it", "Mantener el nombre del club tal como lo escribiste", "Garder le nom du club tel que saisi")}</span>
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
