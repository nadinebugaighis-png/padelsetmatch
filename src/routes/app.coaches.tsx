import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Home, MapPin, User, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { getCoachBoard, requestCoachSlot, cancelCoachSlot } from "@/lib/coach-lessons.functions";
import { LessonMessageButton } from "@/components/LessonMessageButton";
import {
  GROUP_CLASS_PLAYERS, bookingKind, dayKey, firstOpenDay, groupDay, groupSpotsLeft, nextDays, offersClub, offersTravel,
  openCountByDay, requestPlace, type CoachSlot, type LessonKind,
} from "@/lib/coach-lessons";

export const Route = createFileRoute("/app/coaches")({
  head: () => ({ meta: [
    { title: "Book a Padel Coach | PadelSetMatch" },
    { name: "description", content: "Private padel lessons or small group classes with community coaches, at a club or at your place." },
    { property: "og:title", content: "Book a Padel Coach | PadelSetMatch" },
    { property: "og:description", content: "Private lessons or small group classes with padel coaches, at a club or at your place." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CoachesPage,
});

const label = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/76";
const sectionTitle = "text-serif text-[20px] sm:text-[28px] leading-none text-[var(--ink)]";

function CoachesPage() {
  const tr = useTr();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : "en-GB";
  const fetchBoard = useServerFn(getCoachBoard);
  const request = useServerFn(requestCoachSlot);
  const cancel = useServerFn(cancelCoachSlot);
  const { data, isLoading } = useQuery({ queryKey: ["coach-board"], queryFn: () => fetchBoard() });
  const days = useMemo(() => nextDays(14), []);
  // A coach books other coaches, never their own times.
  const visible = useMemo(() => (data?.slots ?? []).filter((s) => s.coach_profile_id !== data?.meId), [data]);
  const counts = useMemo(() => openCountByDay(visible), [visible]);
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? firstOpenDay(days, counts);
  const groups = groupDay(visible, day);
  const [confirm, setConfirm] = useState<CoachSlot | null>(null);
  const [kind, setKind] = useState<LessonKind>("private");
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<"club" | "travel" | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = confirm ? requestPlace(confirm.lesson_place ?? "club", choice) : null;
  const comesToMe = chosen === "travel";
  const homeLabel = tr("Comes to you", "A domicilio", "À domicile");
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const longDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const person = (id: string) => data?.people[id];
  const spotsText = (n: number) => n === 1
    ? tr("1 place left", "Queda 1 plaza", "1 place restante")
    : tr(`${n} places left`, `Quedan ${n} plazas`, `${n} places restantes`);

  function openRequest(s: CoachSlot) { setConfirm(s); setChoice(null); setNote(""); setKind("private"); }

  async function send() {
    if (!confirm) return;
    if (!chosen) { toast.error(tr("Choose the club or your place", "Elige el club o tu casa", "Choisis le club ou chez toi")); return; }
    if (comesToMe && !note.trim()) { toast.error(tr("Tell the coach where to come", "Dile al entrenador dónde ir", "Indique au coach où venir")); return; }
    setBusy(true);
    try {
      await request({ data: { slotId: confirm.id, note: note.trim() || null, place: chosen, kind: bookingKind(confirm, kind) } });
      toast.success(tr("Request sent. The coach will confirm.", "Solicitud enviada. El entrenador confirmará.", "Demande envoyée. Le coach confirmera."));
      setConfirm(null);
      await qc.invalidateQueries({ queryKey: ["coach-board"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not send it", "No se pudo enviar", "Envoi impossible"));
      void qc.invalidateQueries({ queryKey: ["coach-board"] });
    } finally { setBusy(false); }
  }

  async function cancelLesson(s: CoachSlot) {
    const leaving = !!s.match_event_id;
    if (!window.confirm(leaving
      ? tr("Leave this group class? It stays open for the others.", "¿Salir de esta clase en grupo? Seguirá abierta para los demás.", "Quitter ce cours collectif ? Il reste ouvert pour les autres.")
      : tr("Cancel this lesson?", "¿Cancelar esta clase?", "Annuler ce cours ?"))) return;
    try {
      await cancel({ data: { slotId: s.id } });
      toast.success(leaving ? tr("You left the class", "Has salido de la clase", "Tu as quitté le cours") : tr("Lesson cancelled", "Clase cancelada", "Cours annulé"));
      await qc.invalidateQueries({ queryKey: ["coach-board"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  }

  const lessons = data?.lessons ?? [];
  const myClassIds = new Set(lessons.map((s) => s.match_event_id).filter(Boolean));
  const openClasses = (data?.openClasses ?? []).filter((c) => c.host_profile_id !== data?.meId && !myClassIds.has(c.id) && groupSpotsLeft(c.people) > 0);
  const anyOpen = visible.length > 0;

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl mx-auto pt-2 sm:pt-4 pb-32">
        <div className="px-5 sm:px-6">
          <button type="button" onClick={() => navigate({ to: "/app/events" })} aria-label={tr("Back", "Atrás", "Retour")} className="-ml-2 grid size-10 place-items-center rounded-full text-[var(--ink)] active:opacity-60"><ArrowLeft className="size-5" strokeWidth={1.6} /></button>
          <header className="mt-1">
            <div className={label}>{tr("Coaching", "Clases", "Coaching")}</div>
            <h1 className="mt-2 text-serif text-[28px] sm:text-5xl leading-none text-[var(--ink)]">{tr("Book a coach", "Reserva un entrenador", "Réserve un coach")}</h1>
            <p className="mt-2 text-serif italic text-[14px] sm:text-[17px] text-[var(--ink)]/78">{tr("Pick a day, then a time. The coach confirms.", "Elige un día y una hora. El entrenador confirma.", "Choisis un jour, puis une heure. Le coach confirme.")}</p>
          </header>
        </div>

        {lessons.length > 0 && (
          <section className="mt-8 px-5 sm:px-6">
            <h2 className={sectionTitle}>{tr("Your lessons", "Tus clases", "Tes cours")}</h2>
            <ul className="mt-3 overflow-hidden rounded-2xl border border-[var(--ink)]/12 bg-white card-lift divide-y divide-[var(--ink)]/[0.07]">
              {lessons.map((s) => {
                const group = s.lesson_kind === "group";
                const cls = s.match_event_id ? data?.classes[s.match_event_id] : undefined;
                const coach = person(s.coach_profile_id);
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <PlayerPhoto src={coach?.photo_url ?? undefined} seed={s.coach_profile_id} alt={coach?.first_name ?? ""} className="size-10 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-serif text-[16px] leading-tight text-[var(--ink)]">{coach?.first_name ?? tr("Coach", "Entrenador", "Coach")}</div>
                      <div className="mt-0.5 truncate text-[12.5px] text-[var(--ink)]/78">
                        {longDate(s.starts_at)} · {time(s.starts_at)} · {group ? tr("Group", "Grupo", "Groupe") : tr("Private", "Privada", "Privé")}
                      </div>
                      <div className={`mt-0.5 text-[10px] uppercase tracking-[0.2em] ${s.status === "booked" ? "text-[var(--pitch)]" : "text-[var(--gold)]"}`}>
                        {s.status !== "booked" ? tr("Waiting for coach", "Esperando al entrenador", "En attente du coach") : cls ? spotsText(groupSpotsLeft(cls.people)) : tr("Confirmed", "Confirmada", "Confirmé")}
                      </div>
                    </div>
                    {s.status === "booked" && (s.match_event_id ? (
                      <Link to="/app/events/$eventId" params={{ eventId: s.match_event_id }}
                        className="inline-flex h-8 shrink-0 items-center rounded-full border border-[var(--ink)]/30 px-3 text-[10px] uppercase tracking-[0.18em] text-[var(--ink)] active:bg-[var(--ink)]/[0.05]">
                        {tr("Open", "Ver", "Voir")}
                      </Link>
                    ) : <LessonMessageButton slotId={s.id} />)}
                    <button type="button" onClick={() => cancelLesson(s)} aria-label={tr("Cancel", "Cancelar", "Annuler")} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)]/50 active:bg-[var(--ink)]/[0.05]"><X className="size-4" strokeWidth={1.6} /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {openClasses.length > 0 && (
          <section className="mt-8 px-5 sm:px-6">
            <h2 className={sectionTitle}>{tr("Open classes", "Clases abiertas", "Cours ouverts")}</h2>
            <p className="mt-1.5 text-serif italic text-[13px] text-[var(--ink)]/76">{tr("Small groups with places left", "Grupos reducidos con plazas", "Petits groupes avec des places")}</p>
            <ul className="mt-3 overflow-hidden rounded-2xl border border-[var(--ink)]/12 bg-white card-lift divide-y divide-[var(--ink)]/[0.07]">
              {openClasses.map((c) => {
                const coach = person(c.host_profile_id);
                return (
                  <li key={c.id}>
                    <Link to="/app/events/$eventId" params={{ eventId: c.id }} className="flex items-center gap-3 px-4 py-3 transition active:bg-[var(--ink)]/[0.04]">
                      <PlayerPhoto src={coach?.photo_url ?? undefined} seed={c.host_profile_id} alt={coach?.first_name ?? ""} className="size-11 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-serif text-[16px] leading-tight text-[var(--ink)]">{tr(`Class with ${coach?.first_name ?? "a coach"}`, `Clase con ${coach?.first_name ?? "un entrenador"}`, `Cours avec ${coach?.first_name ?? "un coach"}`)}</div>
                        <div className="mt-0.5 truncate text-[12.5px] text-[var(--ink)]/78">{longDate(c.starts_at)} · {time(c.starts_at)} · {c.club_name}</div>
                        <div className="mt-0.5 text-serif italic text-[13px] text-[var(--plum)]">{spotsText(groupSpotsLeft(c.people))}{c.class_fee ? <span className="not-italic text-[12.5px] text-[var(--ink)]/78"> · {c.class_fee}</span> : null}</div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-[var(--ink)]/45" strokeWidth={1.6} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <div className="px-5 sm:px-6">
            <h2 className={sectionTitle}>{tr("Lesson times", "Horarios", "Horaires")}</h2>
          </div>
          {/* Day strip, same style as Matches and Connect */}
          <div className="mt-3 flex items-stretch gap-1 overflow-x-auto px-3 sm:px-4 pb-1 no-scrollbar" aria-label={tr("Days", "Días", "Jours")}>
            {days.map((d, i) => {
              const k = dayKey(d);
              const n = counts.get(k) ?? 0;
              const on = k === day;
              return (
                <button key={k} type="button" onClick={() => setPicked(k)} aria-pressed={on}
                  aria-label={d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                  className={`shrink-0 min-w-12 flex flex-col items-center gap-1 py-1 transition active:opacity-60 ${n || on ? "" : "opacity-40"}`}>
                  <span className={`text-[10px] uppercase tracking-[0.18em] leading-none ${on ? "text-[var(--ink)]" : "text-[var(--ink)]/72"}`}>
                    {i === 0 ? tr("Today", "Hoy", "Auj.") : d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className={`text-serif text-[20px] sm:text-[24px] leading-none ${on ? "text-[var(--ink)]" : "text-[var(--ink)]/78"}`}>{d.getDate()}</span>
                  <span aria-hidden className={`h-px w-6 ${on ? "bg-[var(--gold)]" : "bg-transparent"}`} />
                  <span className="text-serif italic text-[11px] leading-none text-[var(--pitch)]">{n ? tr(`${n} open`, `${n} libres`, `${n} libres`) : "\u00a0"}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3 px-5 sm:px-6">
            {isLoading ? (
              [0, 1].map((i) => <div key={i} className="h-36 rounded-2xl border border-[var(--ink)]/12 bg-white card-lift animate-pulse" />)
            ) : groups.length > 0 ? groups.map((g) => {
              const c = person(g.coachId);
              const first = g.slots[0]!;
              return (
                <article key={g.key} className="rounded-2xl border border-[var(--ink)]/12 bg-white card-lift p-4 sm:p-5">
                  <div className="flex gap-3.5">
                    <PlayerPhoto src={c?.photo_url ?? undefined} seed={g.coachId} alt={c?.first_name ?? ""} className="size-16 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-serif text-[19px] sm:text-[22px] leading-tight text-[var(--ink)]">{c?.first_name ?? tr("Coach", "Entrenador", "Coach")}</div>
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/72">{g.duration} min</span>
                      </div>
                      <div className="mt-1 text-[13px] text-[var(--ink)]/76">
                        {tr("Private", "Privada", "Privé")}{g.price ? ` · ${g.price}` : ""}
                        {first.offers_group && <> · {tr("Group", "Grupo", "Groupe")}{first.group_price_note ? ` ${first.group_price_note}` : ""}</>}
                      </div>
                      {offersClub(g.place) && (
                        <div className="mt-1 flex min-w-0 items-center gap-1 text-[12.5px] text-[var(--ink)]/76"><MapPin className="size-3.5 shrink-0" strokeWidth={1.6} /><span className="truncate">{g.club}</span></div>
                      )}
                      {offersTravel(g.place) && (
                        <div className="mt-1 flex min-w-0 items-center gap-1 text-serif italic text-[13px] text-[var(--pitch)]"><Home className="size-3.5 shrink-0" strokeWidth={1.6} /><span className="truncate">{homeLabel}{g.area ? ` · ${g.area}` : ""}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[var(--ink)]/20 pt-3.5">
                    <div className={label}>{tr("Choose a time", "Elige una hora", "Choisis une heure")}</div>
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {g.slots.map((s) => (
                        <button key={s.id} type="button" onClick={() => openRequest(s)}
                          className="h-10 rounded-full border border-[var(--ink)]/28 text-serif text-[15px] text-[var(--ink)] transition active:scale-[0.97] active:bg-[var(--ink)] active:text-[var(--cream)] hover:border-[var(--ink)]/45">
                          {time(s.starts_at)}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-[var(--ink)]/30 px-5 py-9 text-center">
                <p className="text-serif italic text-[15px] text-[var(--ink)]/78">
                  {anyOpen ? tr("No lesson times on this day.", "No hay clases este día.", "Aucun cours ce jour-là.") : tr("No coach has shared lesson times yet.", "Ningún entrenador ha publicado horarios todavía.", "Aucun coach n'a encore publié d'horaires.")}
                </p>
                {anyOpen && <p className="mt-1 text-[12.5px] text-[var(--ink)]/72">{tr("Try a day marked open.", "Prueba un día con horas libres.", "Essaie un jour avec des créneaux.")}</p>}
                {data?.isCoach && (
                  <Link to="/app/coach" className="mt-4 inline-block text-[10.5px] uppercase tracking-[0.2em] text-[var(--ink)] underline underline-offset-4">{tr("Add your lesson times", "Añade tus horarios", "Ajoute tes horaires")}</Link>
                )}
              </div>
            )}
            {data?.isCoach && groups.length > 0 && (
              <Link to="/app/coach" className="block pt-3 text-center text-serif italic text-[13px] text-[var(--ink)]/78 underline underline-offset-4">{tr("Your coaching", "Tu panel de entrenador", "Ton espace coach")}</Link>
            )}
          </div>
        </section>
      </div>

      {confirm && (
        <div role="dialog" aria-modal="true" data-state="open" className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[var(--ink)]/45" onClick={() => setConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[var(--paper)] px-5 sm:px-6 pt-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}>
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--ink)]/15 sm:hidden" />
            <div className="flex items-start gap-3">
              <PlayerPhoto src={person(confirm.coach_profile_id)?.photo_url ?? undefined} seed={confirm.coach_profile_id} alt="" className="size-12 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-serif text-[22px] leading-tight text-[var(--ink)]">{person(confirm.coach_profile_id)?.first_name ?? tr("Coach", "Entrenador", "Coach")}</h2>
                <p className="mt-0.5 text-[13.5px] text-[var(--ink)]/82">{longDate(confirm.starts_at)} · {time(confirm.starts_at)} · {confirm.duration_minutes} min</p>
              </div>
              <button type="button" onClick={() => setConfirm(null)} aria-label={tr("Close", "Cerrar", "Fermer")} className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink)]/72 active:bg-[var(--ink)]/[0.05]"><X className="size-4" strokeWidth={1.6} /></button>
            </div>

            {confirm.offers_group && (
              <>
                <div className={`mt-5 ${label}`}>{tr("Lesson", "Clase", "Cours")}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <KindCard on={kind === "private"} onClick={() => setKind("private")} icon={<User className="size-4" strokeWidth={1.6} />}
                    title={tr("Private", "Privada", "Privé")} sub={tr("Just you", "Solo tú", "Rien que toi")} price={confirm.price_note} />
                  <KindCard on={kind === "group"} onClick={() => setKind("group")} icon={<Users className="size-4" strokeWidth={1.6} />}
                    title={tr("Open group", "Grupo abierto", "Groupe ouvert")}
                    sub={tr(`Up to ${GROUP_CLASS_PLAYERS} players`, `Hasta ${GROUP_CLASS_PLAYERS} jugadores`, `Jusqu'à ${GROUP_CLASS_PLAYERS} joueurs`)}
                    price={confirm.group_price_note} />
                </div>
                {kind === "group" && (
                  <p className="mt-2 text-serif italic text-[13px] text-[var(--ink)]/78">{tr("Once confirmed, it appears on Matches so friends can join.", "Al confirmarse, aparece en Partidos para que tus amigos se unan.", "Une fois confirmé, il apparaît dans Matchs pour que tes amis le rejoignent.")}</p>
                )}
              </>
            )}
            {!confirm.offers_group && confirm.price_note && (
              <p className="mt-4 text-[13.5px] text-[var(--ink)]/80">{tr("Private lesson", "Clase privada", "Cours privé")} · {confirm.price_note}</p>
            )}

            <div className={`mt-5 ${label}`}>{tr("Where", "Dónde", "Où")}</div>
            {confirm.lesson_place === "both" ? (
              <div className="mt-2 flex gap-6 border-b border-[var(--ink)]/24">
                {([
                  ["club", tr("At the club", "En el club", "Au club")],
                  ["travel", tr("Come to me", "A domicilio", "Chez moi")],
                ] as const).map(([v, text]) => (
                  <button key={v} type="button" onClick={() => setChoice(v)} aria-pressed={choice === v}
                    className={`-mb-px h-10 border-b-[1.5px] text-[14.5px] transition ${choice === v ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--ink)]/72"}`}>{text}</button>
                ))}
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-[14px] text-[var(--ink)]/84">
                {confirm.lesson_place === "travel" ? <Home className="size-4" strokeWidth={1.6} /> : <MapPin className="size-4" strokeWidth={1.6} />}
                {confirm.lesson_place === "travel" ? `${homeLabel} · ${confirm.travel_area ?? confirm.club_name}` : confirm.club_name}
              </p>
            )}
            {confirm.lesson_place === "both" && chosen === "club" && (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--ink)]/78"><MapPin className="size-3.5" strokeWidth={1.6} />{confirm.club_name}</p>
            )}
            {(comesToMe || chosen === "club" || confirm.lesson_place === "both") && (
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2}
                placeholder={comesToMe
                  ? kind === "group"
                    ? tr("Your urbanización (shown on the class)", "Tu urbanización (se verá en la clase)", "Ta résidence (visible sur le cours)")
                    : tr("Your urbanización or address", "Tu urbanización o dirección", "Ta résidence ou adresse")
                  : tr("A note for the coach (optional)", "Una nota para el entrenador (opcional)", "Un mot pour le coach (optionnel)")}
                className="mt-3 w-full rounded-xl border border-[var(--ink)]/30 bg-white px-3.5 py-3 text-[14.5px] text-[var(--ink)] placeholder:text-[var(--ink)]/68 outline-none focus:border-[var(--ink)]/40 transition" />
            )}

            <button type="button" disabled={busy} onClick={send} className="mt-5 h-12 w-full rounded-full bg-[var(--ink)] text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[var(--cream)] transition active:scale-[0.99] disabled:opacity-60">
              {busy ? tr("Sending…", "Enviando…", "Envoi…") : kind === "group"
                ? tr("Request group class", "Pedir clase en grupo", "Demander le cours collectif")
                : tr("Request lesson", "Pedir clase", "Demander le cours")}
            </button>
            <p className="mt-2.5 text-center text-serif italic text-[12.5px] text-[var(--ink)]/76">{tr("The coach confirms. Payment is arranged with the coach.", "El entrenador confirma. El pago se acuerda con él.", "Le coach confirme. Le paiement se règle avec lui.")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function KindCard({ on, onClick, icon, title, sub, price }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; price: string | null }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-2xl border bg-white p-3.5 text-left transition active:scale-[0.98] ${on ? "border-[var(--ink)] shadow-[0_0_0_1px_var(--ink)]" : "border-[var(--ink)]/26"}`}>
      <div className="flex items-center gap-1.5 text-serif text-[16px] text-[var(--ink)]">{icon}{title}</div>
      <div className="mt-0.5 text-[12.5px] text-[var(--ink)]/78">{sub}</div>
      {price && <div className="mt-1.5 text-[13px] text-[var(--ink)]/88">{price}</div>}
    </button>
  );
}
