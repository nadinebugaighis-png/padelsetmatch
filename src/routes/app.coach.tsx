import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { addCoachSlots, cancelCoachSlot, getMyCoachSlots, respondCoachSlot } from "@/lib/coach-lessons.functions";
import { COACH_HOURS, dayKey, nextDays, slotStarts, type CoachSlot } from "@/lib/coach-lessons";

export const Route = createFileRoute("/app/coach")({
  head: () => ({ meta: [
    { title: "Your Lesson Times | PadelSetMatch" },
    { name: "description", content: "Share when you can give padel lessons and answer lesson requests." },
    { property: "og:title", content: "Your Lesson Times | PadelSetMatch" },
    { property: "og:description", content: "Share when you can give padel lessons and answer lesson requests." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CoachTimesPage,
});

const label = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/55";
const LAST_CLUB = "coach-last-club";

function CoachTimesPage() {
  const tr = useTr();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : "en-GB";
  const fetchMine = useServerFn(getMyCoachSlots);
  const add = useServerFn(addCoachSlots);
  const respond = useServerFn(respondCoachSlot);
  const cancel = useServerFn(cancelCoachSlot);
  const { data, isLoading } = useQuery({ queryKey: ["my-coach-slots"], queryFn: () => fetchMine() });

  const days = useMemo(() => nextDays(21), []);
  const [day, setDay] = useState(dayKey(days[0]!));
  const [hours, setHours] = useState<number[]>([]);
  const [duration, setDuration] = useState<60 | 90>(60);
  const [club, setClub] = useState(() => { try { return localStorage.getItem(LAST_CLUB) ?? ""; } catch { return ""; } });
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const now = Date.now();
  const starts = slotStarts(day, hours);
  const pastHour = (h: number) => {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y!, m! - 1, d!, h).getTime() <= now;
  };

  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const longDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-coach-slots"] }).then(() => qc.invalidateQueries({ queryKey: ["coach-board"] }));

  async function save() {
    if (!club.trim()) { toast.error(tr("Add the club", "Añade el club", "Ajoute le club")); return; }
    if (!starts.length) { toast.error(tr("Pick at least one time", "Elige al menos una hora", "Choisis au moins une heure")); return; }
    setSaving(true);
    try {
      const r = await add({ data: { starts, duration_minutes: duration, club_name: club.trim(), price_note: price.trim() || null } });
      try { localStorage.setItem(LAST_CLUB, club.trim()); } catch { /* ignore */ }
      toast.success(tr(`${r.added} lesson times shared`, `${r.added} horarios publicados`, `${r.added} horaires publiés`));
      setHours([]);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not save", "No se pudo guardar", "Enregistrement impossible"));
    } finally { setSaving(false); }
  }

  async function answer(s: CoachSlot, accept: boolean) {
    try {
      await respond({ data: { slotId: s.id, accept } });
      toast.success(accept ? tr("Lesson confirmed", "Clase confirmada", "Cours confirmé") : tr("Time reopened", "Hora disponible de nuevo", "Horaire rouvert"));
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  }

  async function remove(s: CoachSlot) {
    if (s.student_profile_id && !window.confirm(tr("Cancel this lesson? The player will be told.", "¿Cancelar esta clase? Avisaremos al jugador.", "Annuler ce cours ? Le joueur sera prévenu."))) return;
    try {
      await cancel({ data: { slotId: s.id } });
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  }

  if (isLoading) return <div className="programme-page min-h-screen" />;
  if (!data?.isCoach) {
    return (
      <div className="programme-page min-h-[calc(100vh-4rem)]">
        <div className="max-w-md mx-auto px-5 pt-10 text-center">
          <h1 className="text-serif text-[30px] text-[var(--ink)]">{tr("Your lesson times", "Tus horarios de clases", "Tes horaires de cours")}</h1>
          <p className="mt-3 text-[15px] text-[var(--ink)]/60">{tr("Turn on coach mode in Me, under Coaching, to share lesson times.", "Activa el modo entrenador en Yo, en Entrenamiento, para publicar horarios.", "Active le mode coach dans Moi, rubrique Coaching, pour publier tes horaires.")}</p>
          <Link to="/app/profile" className="mt-5 inline-flex h-11 items-center rounded-full bg-[var(--ink)] px-6 text-[14px] font-medium text-[var(--cream)]">{tr("Go to Me", "Ir a Yo", "Aller à Moi")}</Link>
        </div>
      </div>
    );
  }

  const requests = data.slots.filter((s) => s.status === "requested");
  const upcoming = data.slots.filter((s) => s.status !== "requested");

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl mx-auto px-5 pt-2 pb-32">
        <button type="button" onClick={() => navigate({ to: "/app/coaches" })} aria-label={tr("Back", "Atrás", "Retour")} className="-ml-2 grid size-10 place-items-center rounded-full text-[var(--ink)]"><ArrowLeft className="size-5" /></button>
        <h1 className="mt-1 text-serif text-[34px] leading-[1.05] text-[var(--ink)]">{tr("Your lesson times", "Tus horarios", "Tes horaires")}</h1>
        <p className="mt-2 text-[15px] text-[var(--ink)]/55">{tr("Players see these on Book a coach and send you requests.", "Los jugadores los ven en Reservar entrenador y te envían solicitudes.", "Les joueurs les voient dans Réserver un coach et t'envoient des demandes.")}</p>

        {requests.length > 0 && (
          <section className="mt-6">
            <div className={label}>{tr("Requests", "Solicitudes", "Demandes")}</div>
            <ul className="mt-2 space-y-2">
              {requests.map((s) => {
                const p = s.student_profile_id ? data.people[s.student_profile_id] : undefined;
                return (
                  <li key={s.id} className="rounded-2xl border border-[var(--gold)]/45 bg-white p-3.5">
                    <div className="flex items-center gap-3">
                      <PlayerPhoto src={p?.photo_url ?? undefined} seed={s.student_profile_id} alt={p?.first_name ?? ""} className="size-11 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-medium text-[var(--ink)] truncate">{p?.first_name ?? tr("A player", "Un jugador", "Un joueur")}</div>
                        <div className="text-[12.5px] text-[var(--ink)]/55 truncate">{longDate(s.starts_at)} · {time(s.starts_at)} · {s.club_name}</div>
                      </div>
                    </div>
                    {s.student_note && <p className="mt-2 text-[13.5px] text-[var(--ink)]/75">"{s.student_note}"</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => answer(s, false)} className="h-10 rounded-full border border-[var(--ink)]/20 text-[14px] text-[var(--ink)]">{tr("Decline", "Rechazar", "Refuser")}</button>
                      <button type="button" onClick={() => answer(s, true)} className="h-10 rounded-full bg-[var(--ink)] text-[14px] font-medium text-[var(--cream)]">{tr("Accept", "Aceptar", "Accepter")}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-[var(--ink)]/10 bg-white p-4 space-y-4">
          <div className={label}>{tr("Add times", "Añadir horarios", "Ajouter des horaires")}</div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {days.map((d) => {
              const k = dayKey(d);
              const on = k === day;
              return (
                <button key={k} type="button" onClick={() => { setDay(k); setHours([]); }} aria-pressed={on}
                  className={`flex h-[60px] w-[54px] shrink-0 flex-col items-center justify-center rounded-xl border ${on ? "border-[var(--pitch)] bg-[var(--pitch)] text-[var(--cream)]" : "border-[var(--ink)]/15 text-[var(--ink)]"}`}>
                  <span className="text-[12px] leading-none">{d.toLocaleDateString(locale, { weekday: "short" })}</span>
                  <span className="mt-1 text-[18px] font-semibold leading-none">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {COACH_HOURS.map((h) => {
              const on = hours.includes(h);
              const past = pastHour(h);
              return (
                <button key={h} type="button" disabled={past} aria-pressed={on}
                  onClick={() => setHours((v) => on ? v.filter((x) => x !== h) : [...v, h])}
                  className={`h-9 rounded-full border text-[14px] transition disabled:opacity-25 ${on ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)]" : "border-[var(--ink)]/20 text-[var(--ink)]"}`}>
                  {String(h).padStart(2, "0")}:00
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 rounded-full border border-[var(--ink)]/12 p-1">
            {([60, 90] as const).map((m) => (
              <button key={m} type="button" onClick={() => setDuration(m)} aria-pressed={duration === m}
                className={`h-8 rounded-full text-[13px] ${duration === m ? "bg-[var(--ink)] text-[var(--cream)]" : "text-[var(--ink)]/60"}`}>{m} min</button>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className={label}>{tr("Club", "Club", "Club")}</div>
            <Input value={club} maxLength={120} onChange={(e) => setClub(e.target.value)} placeholder="Club de Pádel La Moraleja" />
          </div>
          <div className="space-y-1.5">
            <div className={label}>{tr("Price (optional)", "Precio (opcional)", "Prix (optionnel)")}</div>
            <Input value={price} maxLength={40} onChange={(e) => setPrice(e.target.value)} placeholder={tr("€50 per hour", "50 € la hora", "50 € l'heure")} />
          </div>
          <button type="button" disabled={saving} onClick={save} className="h-12 w-full rounded-full bg-[var(--ink)] text-[15px] font-medium text-[var(--cream)] disabled:opacity-60">
            {saving ? tr("Saving…", "Guardando…", "Enregistrement…") : starts.length
              ? tr(`Share ${starts.length} ${starts.length === 1 ? "time" : "times"}`, `Publicar ${starts.length} ${starts.length === 1 ? "hora" : "horas"}`, `Publier ${starts.length} horaire${starts.length === 1 ? "" : "s"}`)
              : tr("Pick your times", "Elige tus horas", "Choisis tes horaires")}
          </button>
        </section>

        <section className="mt-6">
          <div className={label}>{tr("Upcoming", "Próximas", "À venir")}</div>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-[14px] text-[var(--ink)]/50">{tr("No lesson times yet.", "Aún no hay horarios.", "Aucun horaire pour l'instant.")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--ink)]/[0.08] rounded-2xl border border-[var(--ink)]/10 bg-white">
              {upcoming.map((s) => {
                const p = s.student_profile_id ? data.people[s.student_profile_id] : undefined;
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] text-[var(--ink)]">{longDate(s.starts_at)} · {time(s.starts_at)} · {s.duration_minutes}'</div>
                      <div className="text-[12.5px] text-[var(--ink)]/50 truncate">{s.club_name}{s.price_note ? ` · ${s.price_note}` : ""}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${s.status === "booked" ? "bg-[var(--pitch)]/12 text-[var(--pitch)]" : "bg-[var(--ink)]/[0.05] text-[var(--ink)]/60"}`}>
                      {s.status === "booked" ? (p?.first_name ?? tr("Booked", "Reservada", "Réservé")) : tr("Open", "Libre", "Libre")}
                    </span>
                    <button type="button" onClick={() => remove(s)} aria-label={tr("Remove", "Quitar", "Retirer")} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)]/40"><Trash2 className="size-4" /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
