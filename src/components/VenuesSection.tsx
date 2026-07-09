import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Plus, X, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  listMyVenues,
  searchVenues,
  createVenue,
  addMyVenue,
  removeMyVenue,
  setMyVenuePrivacy,
  type Venue,
} from "@/lib/venues.functions";
import { useTr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const TYPES: Array<{ value: Venue["venue_type"]; en: string; es: string; fr: string }> = [
  { value: "club", en: "Club", es: "Club", fr: "Club" },
  { value: "compound", en: "Compound / Community", es: "Urbanización / Comunidad", fr: "Résidence / Communauté" },
  { value: "public_court", en: "Public court", es: "Pista pública", fr: "Court public" },
  { value: "other", en: "Other", es: "Otro", fr: "Autre" },
];

export function VenuesSection() {
  const tr = useTr();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyVenues);
  const searchFn = useServerFn(searchVenues);
  const createFn = useServerFn(createVenue);
  const addFn = useServerFn(addMyVenue);
  const removeFn = useServerFn(removeMyVenue);
  const privacyFn = useServerFn(setMyVenuePrivacy);

  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCity, setNewCity] = useState("");
  const [newType, setNewType] = useState<Venue["venue_type"]>("club");

  const myQ = useQuery({ queryKey: ["my-venues"], queryFn: () => listFn() });

  const searchQ = useQuery({
    queryKey: ["venue-search", q],
    queryFn: () => searchFn({ data: { query: q } }),
    enabled: q.trim().length >= 2,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["my-venues"] });

  const addMut = useMutation({
    mutationFn: (venue_id: string) => addFn({ data: { venue_id, is_public: false } }),
    onSuccess: () => {
      invalidate();
      setQ("");
      setShowAdd(false);
      toast.success(tr("Added — kept private by default", "Añadido — privado por defecto", "Ajouté — privé par défaut"));
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const venue = await createFn({
        data: {
          name: q.trim(),
          city: newCity.trim() || null,
          country: null,
          venue_type: newType,
        },
      });
      await addFn({ data: { venue_id: venue.id, is_public: false } });
      return venue;
    },
    onSuccess: () => {
      invalidate();
      setQ("");
      setNewCity("");
      setShowAdd(false);
      toast.success(tr("Added — kept private by default", "Añadido — privado por defecto", "Ajouté — privé par défaut"));
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const removeMut = useMutation({
    mutationFn: (venue_id: string) => removeFn({ data: { venue_id } }),
    onSuccess: invalidate,
  });

  const privacyMut = useMutation({
    mutationFn: (v: { venue_id: string; is_public: boolean }) => privacyFn({ data: v }),
    onSuccess: invalidate,
  });

  const mine = myQ.data ?? [];
  const results = (searchQ.data ?? []).filter((r) => !mine.some((m) => m.venue.id === r.id));

  return (
    <section className="programme-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--ink)]">
            {tr("Where you play", "Dónde juegas", "Où tu joues")}
          </h3>
          <p className="text-xs text-[var(--ink)]/60 mt-1">
            {tr(
              "Your clubs & compounds. Private by default — we only match you with people who play there.",
              "Tus clubs y urbanizaciones. Privado por defecto — solo emparejamos con quien juega ahí.",
              "Tes clubs & résidences. Privé par défaut — on te matche avec ceux qui jouent au même endroit.",
            )}
          </p>
        </div>
      </div>

      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map((m) => (
            <li key={m.venue.id} className="flex items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-white/60 p-2.5">
              <MapPin className="w-4 h-4 text-[var(--ink)]/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.venue.name}</div>
                {m.venue.city && <div className="text-xs text-[var(--ink)]/60 truncate">{m.venue.city}</div>}
              </div>
              <button
                onClick={() => privacyMut.mutate({ venue_id: m.venue.id, is_public: !m.is_public })}
                className="text-xs px-2 py-1 rounded-lg bg-[var(--ink)]/5 hover:bg-[var(--ink)]/10 flex items-center gap-1"
                title={m.is_public
                  ? tr("Visible on your profile", "Visible en tu perfil", "Visible sur ton profil")
                  : tr("Hidden (matching only)", "Oculto (solo matching)", "Masqué (matching uniquement)")}
              >
                {m.is_public
                  ? <><Eye className="w-3 h-3" />{tr("Public", "Público", "Public")}</>
                  : <><EyeOff className="w-3 h-3" />{tr("Private", "Privado", "Privé")}</>}
              </button>
              <button
                onClick={() => removeMut.mutate(m.venue.id)}
                className="p-1 rounded-lg hover:bg-red-50 text-red-500"
                aria-label="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showAdd ? (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="w-full">
          <Plus className="w-4 h-4 mr-1" />
          {tr("Add a venue", "Añadir un lugar", "Ajouter un lieu")}
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl border border-[var(--ink)]/10 bg-white/60 p-3">
          <input
            type="text"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr("Search or type a name…", "Busca o escribe un nombre…", "Cherche ou tape un nom…")}
            className="w-full rounded-lg border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm"
          />

          {q.trim().length >= 2 && (
            <div className="space-y-1">
              {searchQ.isFetching && <div className="text-xs text-[var(--ink)]/50 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{tr("Searching…", "Buscando…", "Recherche…")}</div>}
              {results.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  onClick={() => addMut.mutate(r.id)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--ink)]/5 text-sm flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-[var(--ink)]/40" />
                  <span className="flex-1 truncate">{r.name}{r.city ? ` · ${r.city}` : ""}</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              ))}

              <div className="pt-2 mt-2 border-t border-[var(--ink)]/10 space-y-2">
                <div className="text-[11px] uppercase tracking-widest text-[var(--ink)]/50">
                  {tr("Not listed? Add it", "¿No está? Añádelo", "Absent ? Ajoute-le")}
                </div>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder={tr("City (optional)", "Ciudad (opcional)", "Ville (facultatif)")}
                  className="w-full rounded-lg border border-[var(--ink)]/15 bg-white px-3 py-1.5 text-sm"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as Venue["venue_type"])}
                  className="w-full rounded-lg border border-[var(--ink)]/15 bg-white px-3 py-1.5 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{tr(t.en, t.es, t.fr)}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={createMut.isPending || q.trim().length < 2}
                  onClick={() => createMut.mutate()}
                  className="w-full"
                >
                  {createMut.isPending
                    ? tr("Adding…", "Añadiendo…", "Ajout…")
                    : tr(`Add "${q.trim()}"`, `Añadir "${q.trim()}"`, `Ajouter "${q.trim()}"`)}
                </Button>
              </div>
            </div>
          )}

          <button onClick={() => { setShowAdd(false); setQ(""); }} className="text-xs text-[var(--ink)]/50 hover:text-[var(--ink)]">
            {tr("Cancel", "Cancelar", "Annuler")}
          </button>
        </div>
      )}
    </section>
  );
}
