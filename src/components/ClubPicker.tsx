import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchClubs, type ClubResult } from "@/lib/match-events.functions";
import { MapPin, Loader2 } from "lucide-react";
import { useTr } from "@/lib/i18n";


type Props = {
  value: ClubResult | null;
  onChange: (c: ClubResult | null) => void;
};

export function ClubPicker({ value, onChange }: Props) {
  const tr = useTr();
  const search = useServerFn(searchClubs);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClubResult[]>([]);

  useEffect(() => {
    if (value || !q || q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { results } = await search({ data: { query: q, near: null } });
        if (!cancelled) setResults(results);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, value, search]);

  if (value) {
    return (
      <div className="rounded-lg border border-[var(--cream)]/20 bg-black/30 p-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-[var(--cream)]">
            <MapPin className="w-4 h-4 text-[var(--cream)]" />
            <span className="font-medium truncate">{value.name}</span>
          </div>
          {value.address && <div className="text-xs text-[var(--cream)]/60 mt-1 truncate">{value.address}</div>}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQ("");
          }}
          className="text-xs uppercase tracking-widest text-[var(--cream)]/60 hover:text-[var(--cream)] shrink-0"
        >
          {tr("Change", "Cambiar", "Modifier")}

        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={tr("Search padel club (e.g. La Moraleja)", "Buscar club de pádel (p. ej. La Moraleja)", "Chercher un club de padel (p. ex. La Moraleja)")}
        className="w-full bg-black/30 border border-[var(--cream)]/20 rounded-lg px-3 py-2.5 text-[var(--cream)] placeholder:text-[var(--cream)]/40 focus:outline-none focus:border-[var(--cream)]"
      />
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-[var(--cream)]/60" />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-[var(--court-deep)] border border-[var(--cream)]/20 rounded-lg overflow-hidden shadow-xl max-h-72 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(r);
                setQ("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--cream)]/10 border-b border-[var(--cream)]/5 last:border-b-0"
            >
              <div className="text-sm text-[var(--cream)] truncate">{r.name}</div>
              <div className="text-xs text-[var(--cream)]/50 truncate">{r.address}</div>
            </button>
          ))}
        </div>
      )}
      {open && q.trim().length >= 2 && !loading && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-[var(--court-deep)] border border-[var(--cream)]/20 rounded-lg overflow-hidden shadow-xl">
          {results.length === 0 && (
            <div className="px-3 pt-3 text-xs text-[var(--cream)]/60">
              {tr("No clubs found on Google.", "No se encontraron clubes en Google.", "Aucun club trouvé sur Google.")}
            </div>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const name = q.trim();
              onChange({ place_id: "", name, address: "", lat: null, lng: null, city: "", country: "" });
              setQ("");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 hover:bg-[var(--cream)]/10"
          >
            <div className="text-sm text-[var(--cream)] truncate">
              {tr(`Use "${q.trim()}"`, `Usar "${q.trim()}"`, `Utiliser "${q.trim()}"`)}
            </div>
            <div className="text-xs text-[var(--cream)]/50">
              {tr("Keep the club name as you typed it", "Mantener el nombre del club tal como lo escribiste", "Garder le nom du club tel que saisi")}
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
