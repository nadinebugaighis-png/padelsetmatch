import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellRing, X, Trash2, Plus } from "lucide-react";
import {
  listMyMatchAlerts,
  upsertMatchAlert,
  deleteMatchAlert,
  toggleMatchAlert,
  type MatchAlert,
} from "@/lib/match-alerts.functions";
import { useTr } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  seedCity?: string | null;
};

const DEFAULT_DRAFT = {
  id: null as string | null,
  label: "",
  city: "",
  days_of_week: [0, 1, 2, 3, 4, 5, 6],
  hour_start: 7,
  hour_end: 23,
  level_only: false,
  active: true,
};

export function AlertsSheet({ open, onClose, seedCity }: Props) {
  const tr = useTr();
  const qc = useQueryClient();
  const list = useServerFn(listMyMatchAlerts);
  const upsert = useServerFn(upsertMatchAlert);
  const del = useServerFn(deleteMatchAlert);
  const toggle = useServerFn(toggleMatchAlert);

  const alertsQ = useQuery({
    queryKey: ["my-match-alerts"],
    queryFn: () => list(),
    enabled: open,
    staleTime: 30_000,
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...DEFAULT_DRAFT, city: seedCity ?? "" });

  useEffect(() => {
    if (!open) { setEditing(false); }
  }, [open]);

  if (!open) return null;

  const dayLabels = [
    tr("Sun", "Dom", "Dim"), tr("Mon", "Lun", "Lun"), tr("Tue", "Mar", "Mar"),
    tr("Wed", "Mié", "Mer"), tr("Thu", "Jue", "Jeu"), tr("Fri", "Vie", "Ven"), tr("Sat", "Sáb", "Sam"),
  ];

  const items = alertsQ.data?.items ?? [];

  async function save() {
    try {
      await upsert({ data: {
        id: draft.id,
        label: draft.label || null,
        city: draft.city || null,
        days_of_week: draft.days_of_week,
        hour_start: draft.hour_start,
        hour_end: draft.hour_end,
        level_only: draft.level_only,
        active: draft.active,
      }});
      toast.success(tr("Alert saved", "Alerta guardada", "Alerte enregistrée"));
      setEditing(false);
      setDraft({ ...DEFAULT_DRAFT, city: seedCity ?? "" });
      qc.invalidateQueries({ queryKey: ["my-match-alerts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  function startEdit(a: MatchAlert) {
    setDraft({
      id: a.id,
      label: a.label ?? "",
      city: a.city ?? "",
      days_of_week: a.days_of_week,
      hour_start: a.hour_start,
      hour_end: a.hour_end,
      level_only: a.level_only,
      active: a.active,
    });
    setEditing(true);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center sm:justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-[var(--paper)] rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[var(--paper)] flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--ink)]/10">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-[var(--plum)]" />
            <h2 className="text-serif text-xl">{tr("Match alerts", "Alertas de partidos", "Alertes de matchs")}</h2>
          </div>
          <button onClick={onClose} className="p-1 -m-1 text-[var(--ink)]/60"><X className="w-5 h-5" /></button>
        </div>

        {!editing ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-[var(--ink)]/70 leading-relaxed">
              {tr(
                "Get notified when a match opens up that fits your times and area — even a spot in an existing one.",
                "Recibe una notificación cuando aparezca un partido en tus horarios y zona — también si se libera una plaza.",
                "Recevez une notification quand un match apparaît selon vos créneaux — ou qu'une place se libère.",
              )}
            </p>

            {alertsQ.isLoading ? (
              <div className="text-sm text-[var(--ink)]/50 text-center py-4">…</div>
            ) : items.length === 0 ? (
              <div className="text-center py-6 text-sm text-[var(--ink)]/60">
                {tr("No alerts yet.", "Aún no tienes alertas.", "Aucune alerte pour l'instant.")}
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-[var(--ink)]/12 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <button className="text-left flex-1" onClick={() => startEdit(a)}>
                        <div className="font-semibold text-[var(--ink)]">
                          {a.city || tr("Anywhere", "Cualquier ciudad", "Partout")}
                          {a.level_only && <span className="ml-2 text-[10px] uppercase tracking-widest text-[var(--plum)]">{tr("My level", "Mi nivel", "Mon niveau")}</span>}
                        </div>
                        <div className="text-xs text-[var(--ink)]/60 mt-1">
                          {a.days_of_week.length === 7
                            ? tr("Every day", "Todos los días", "Tous les jours")
                            : a.days_of_week.map((d) => dayLabels[d]).join(", ")}
                          {" · "}
                          {String(a.hour_start).padStart(2,"0")}:00–{String(a.hour_end).padStart(2,"0")}:00
                        </div>
                      </button>
                      <label className="inline-flex items-center gap-2 shrink-0">
                        <input
                          type="checkbox"
                          checked={a.active}
                          onChange={async (e) => {
                            await toggle({ data: { id: a.id, active: e.target.checked } });
                            qc.invalidateQueries({ queryKey: ["my-match-alerts"] });
                          }}
                          className="w-4 h-4 accent-[var(--plum)]"
                        />
                      </label>
                      <button
                        onClick={async () => {
                          if (!confirm(tr("Delete this alert?", "¿Eliminar esta alerta?", "Supprimer cette alerte ?"))) return;
                          await del({ data: { id: a.id } });
                          qc.invalidateQueries({ queryKey: ["my-match-alerts"] });
                        }}
                        className="p-1.5 text-red-500/70 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => { setDraft({ ...DEFAULT_DRAFT, city: seedCity ?? "" }); setEditing(true); }}
              className="w-full rounded-full bg-[var(--plum)] text-white font-semibold py-3 inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> {tr("New alert", "Nueva alerta", "Nouvelle alerte")}
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-widest font-bold text-[var(--ink)]/60">
                {tr("City (optional)", "Ciudad (opcional)", "Ville (optionnel)")}
              </label>
              <input
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder={tr("Any city", "Cualquier ciudad", "Toutes les villes")}
                className="mt-1 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest font-bold text-[var(--ink)]/60">
                {tr("Days", "Días", "Jours")}
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dayLabels.map((lbl, i) => {
                  const on = draft.days_of_week.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const next = on
                          ? draft.days_of_week.filter((d) => d !== i)
                          : [...draft.days_of_week, i].sort();
                        if (next.length === 0) return;
                        setDraft({ ...draft, days_of_week: next });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        on ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-white text-[var(--ink)]/70 border-[var(--ink)]/15"
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-[var(--ink)]/60">
                  {tr("From", "Desde", "De")}
                </label>
                <select
                  value={draft.hour_start}
                  onChange={(e) => setDraft({ ...draft, hour_start: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-[var(--ink)]/60">
                  {tr("To", "Hasta", "À")}
                </label>
                <select
                  value={draft.hour_end}
                  onChange={(e) => setDraft({ ...draft, hour_end: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.level_only}
                onChange={(e) => setDraft({ ...draft, level_only: e.target.checked })}
                className="w-4 h-4 accent-[var(--plum)]"
              />
              {tr("Only matches for my level", "Solo partidos para mi nivel", "Uniquement pour mon niveau")}
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="w-4 h-4 accent-[var(--plum)]"
              />
              {tr("Active", "Activa", "Active")}
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setEditing(false); setDraft({ ...DEFAULT_DRAFT, city: seedCity ?? "" }); }}
                className="flex-1 rounded-full border border-[var(--ink)]/20 text-[var(--ink)]/80 font-semibold py-3"
              >
                {tr("Cancel", "Cancelar", "Annuler")}
              </button>
              <button onClick={save} className="flex-1 rounded-full bg-[var(--plum)] text-white font-semibold py-3">
                {tr("Save alert", "Guardar alerta", "Enregistrer")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AlertsButton({ seedCity, count }: { seedCity?: string | null; count?: number }) {
  const [open, setOpen] = useState(false);
  const tr = useTr();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={tr("Match alerts", "Alertas", "Alertes")}
        className="shrink-0 relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--ink)]/15 text-[var(--ink)]/70 hover:border-[var(--ink)]/35"
      >
        <Bell className="w-4 h-4" />
        {count && count > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold bg-[var(--plum)] text-white">
            {count}
          </span>
        ) : null}
      </button>
      <AlertsSheet open={open} onClose={() => setOpen(false)} seedCity={seedCity} />
    </>
  );
}
