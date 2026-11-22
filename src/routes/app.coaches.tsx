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

const label = "text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/50";

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
      <div className="max-w-md sm:max-w-2xl mx-auto pt-2 pb-32">
        <div className="px-5">
          <button type="button" onClick={() => navigate({ to: "/app/events" })} aria-label={tr("Back", "Atrás", "Retour")} className="-ml-2 grid size-10 place-items-center rounded-full text-[var(--ink)]"><ArrowLeft className="size-5" /></button>
          <h1 className="mt-1 text-serif text-[38px] leading-[1.05] text-[var(--ink)]">{tr("Book a coach", "Reserva un entrenador", "Réserve un coach")}</h1>
          <p className="mt-2 text-[15px] text-[var(--ink)]/55">{tr("Private or in a small group, at a club or at your place", "Privada o en grupo reducido, en un club o en tu casa", "En privé ou en petit groupe, au club ou chez toi")}</p>
        </div>

        {lessons.length > 0 && (
          <section className="mx-5 mt-5 rounded-2xl border border-[var(--ink)]/10 bg-white">
            <div className={`px-4 pt-3.5 ${label}`}>{tr("Your lessons", "Tus clases", "Tes cours")}</div>
            <ul className="divide-y divide-[var(--ink)]/[0.08]">
              {lessons.map((s) => {
                const group = s.lesson_kind === "group";
                const cls = s.match_event_id ? data?.classes[s.match_event_id] : undefined;
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-medium text-[var(--ink)] truncate">{person(s.coach_profile_id)?.first_name ?? tr("Coach", "Entrenador", "Coach")} · {longDate(s.starts_at)} {time(s.starts_at)}</div>
                      <div className="text-[12.5px] text-[var(--ink)]/50 truncate">
                        {group ? tr("Group class", "Clase en grupo", "Cours collectif") : tr("Private", "Privada", "Privé")}
                        {s.status === "booked" && <span className="text-[var(--pitch)]"> · {cls ? spotsText(groupSpotsLeft(cls.people)) : tr("Confirmed", "Confirmada", "Confirmé")}</span>}
                      </div>
                    </div>
                    {s.status !== "booked" ? (
                      <span className="shrink-0 rounded-full bg-[var(--gold)]/15 px-2.5 py-1 text-[11px] font-medium text-[var(--ink)]">{tr("Waiting", "Pendiente", "En attente")}</span>
                    ) : s.match_event_id ? (
                      <Link to="/app/events/$eventId" params={{ eventId: s.match_event_id }}
                        className="inline-flex h-8 shrink-0 items-center rounded-full border border-[var(--pitch)]/35 px-3 text-[12.5px] font-medium text-[var(--pitch)]">
                        {tr("Open · Share", "Ver · Compartir", "Voir · Partager")}
                      </Link>
                    ) : <LessonMessageButton slotId={s.id} />}
                    <button type="button" onClick={() => cancelLesson(s)} aria-label={tr("Cancel", "Cancelar", "Annuler")} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)]/40"><X className="size-4" /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {openClasses.length > 0 && (
          <section className="mt-6 px-5">
            <div className={label}>{tr("Group classes you can join", "Clases en grupo con plazas", "Cours collectifs ouverts")}</div>
            <ul className="mt-2 space-y-2">
              {openClasses.map((c) => {
                const coach = person(c.host_profile_id);
                return (
                  <li key={c.id}>
                    <Link to="/app/events/$eventId" params={{ eventId: c.id }} className="flex items-center gap-3 rounded-2xl border border-[var(--plum)]/20 bg-white p-3 active:bg-[var(--plum)]/[0.04]">
                      <PlayerPhoto src={coach?.photo_url ?? undefined} seed={c.host_profile_id} alt={coach?.first_name ?? ""} className="size-12 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-medium text-[var(--ink)] truncate">{tr(`Class with ${coach?.first_name ?? "a coach"}`, `Clase con ${coach?.first_name ?? "un entrenador"}`, `Cours avec ${coach?.first_name ?? "un coach"}`)}</div>
                        <div className="text-[12.5px] text-[var(--ink)]/55 truncate">{longDate(c.starts_at)} · {time(c.starts_at)} · {c.club_name}</div>
                        <div className="text-[12.5px] font-medium text-[var(--plum)]">{spotsText(groupSpotsLeft(c.people))}{c.class_fee ? <span className="text-[var(--ink)]/60 font-normal"> · {c.class_fee}</span> : null}</div>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-[var(--ink)]/35" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className={`mt-6 px-5 ${label}`}>{tr("Coach times", "Horarios de entrenadores", "Horaires des coachs")}</div>
        <div className="mt-2 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {days.map((d) => {
            const k = dayKey(d);
            const n = counts.get(k) ?? 0;
            const on = k === day;
            return (
              <button key={k} type="button" onClick={() => setPicked(k)} aria-pressed={on}
                className={`flex h-[78px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border transition ${on ? "border-[var(--pitch)] bg-[var(--pitch)] text-[var(--cream)]" : n ? "border-[var(--ink)]/20 bg-white text-[var(--ink)]" : "border-[var(--ink)]/10 bg-transparent text-[var(--ink)]/35"}`}>
                <span className="text-[14px] font-medium leading-none">{d.toLocaleDateString(locale, { weekday: "short" })}</span>
                <span className="mt-1 text-[20px] font-semibold leading-none">{d.getDate()}</span>
                <span className={`mt-1 text-[11px] leading-none ${on ? "text-[var(--cream)]/85" : "text-[var(--pitch)]"}`}>{n ? tr(`${n} open`, `${n} libres`, `${n} libres`) : " "}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3 px-5">
          {isLoading ? (
            [0, 1].map((i) => <div key={i} className="h-36 rounded-2xl bg-[var(--ink)]/[0.05] animate-pulse" />)
          ) : groups.length > 0 ? groups.map((g) => {
            const c = person(g.coachId);
            const first = g.slots[0]!;
            return (
              <article key={g.key} className="rounded-2xl border border-[var(--ink)]/12 bg-white p-4">
                <div className="flex gap-3.5">
                  <PlayerPhoto src={c?.photo_url ?? undefined} seed={g.coachId} alt={c?.first_name ?? ""} className="size-[76px] shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[18px] font-semibold leading-tight text-[var(--ink)] truncate">{c?.first_name ?? tr("Coach", "Entrenador", "Coach")}</div>
                      <span className="shrink-0 text-[14px] text-[var(--ink)]/55">{g.duration}'</span>
                    </div>
                    <div className="mt-1 text-[13.5px] text-[var(--ink)]/60">
                      {tr("Private", "Privada", "Privé")}{g.price ? ` ${g.price}` : ""}
                      {first.offers_group && <> · {tr("Group", "Grupo", "Groupe")}{first.group_price_note ? ` ${first.group_price_note}` : ""}</>}
                    </div>
                    {offersClub(g.place) && (
                      <div className="mt-1 flex items-center gap-1 text-[12.5px] text-[var(--ink)]/45 min-w-0"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{g.club}</span></div>
                    )}
                    {offersTravel(g.place) && (
                      <div className="mt-1 flex items-center gap-1 text-[12.5px] text-[var(--pitch)] min-w-0"><Home className="size-3.5 shrink-0" /><span className="truncate">{homeLabel}{g.area ? ` · ${g.area}` : ""}</span></div>
                    )}
                  </div>
                </div>
                <div className="mt-3.5 border-t border-[var(--ink)]/[0.08] pt-3.5 grid grid-cols-4 gap-2">
                  {g.slots.map((s) => (
                    <button key={s.id} type="button" onClick={() => openRequest(s)}
                      className="h-9 rounded-full border border-[var(--ink)]/20 text-[14px] text-[var(--ink)] active:bg-[var(--ink)] active:text-[var(--cream)] transition">
                      {time(s.starts_at)}
                    </button>
                  ))}
                </div>
              </article>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-8 text-center">
              <p className="text-[15px] text-[var(--ink)]/60">
                {anyOpen ? tr("No lesson times on this day.", "No hay clases este día.", "Aucun cours ce jour-là.") : tr("No coach has shared lesson times yet.", "Ningún entrenador ha publicado horarios todavía.", "Aucun coach n'a encore publié d'horaires.")}
              </p>
              {data?.isCoach && (
                <Link to="/app/coach" className="mt-3 inline-block text-[13px] font-medium text-[var(--ink)] underline underline-offset-4">{tr("Add your lesson times", "Añade tus horarios", "Ajoute tes horaires")}</Link>
              )}
            </div>
          )}
          {data?.isCoach && groups.length > 0 && (
            <Link to="/app/coach" className="block pt-2 text-center text-[13px] text-[var(--ink)]/55 underline underline-offset-4">{tr("Your coaching", "Tu panel de entrenador", "Ton espace coach")}</Link>
          )}
        </div>
      </div>

      {confirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[var(--ink)]/45" onClick={() => setConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[var(--paper)] px-5 pt-5" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}>
            <h2 className="text-serif text-[24px] text-[var(--ink)]">{person(confirm.coach_profile_id)?.first_name ?? tr("Coach", "Entrenador", "Coach")}</h2>
            <p className="mt-1 text-[15px] text-[var(--ink)]/70">{longDate(confirm.starts_at)} · {time(confirm.starts_at)} · {confirm.duration_minutes}'</p>

            <div className={`mt-4 grid gap-2 ${confirm.offers_group ? "grid-cols-2" : "grid-cols-1"}`}>
              <KindCard on={kind === "private"} onClick={() => setKind("private")} icon={<User className="size-4" />}
                title={tr("Private", "Privada", "Privé")} sub={tr("Just you", "Solo tú", "Rien que toi")} price={confirm.price_note} />
              {confirm.offers_group && (
                <KindCard on={kind === "group"} onClick={() => setKind("group")} icon={<Users className="size-4" />}
                  title={tr("Open group", "Grupo abierto", "Groupe ouvert")}
                  sub={tr(`Up to ${GROUP_CLASS_PLAYERS} players`, `Hasta ${GROUP_CLASS_PLAYERS} jugadores`, `Jusqu'à ${GROUP_CLASS_PLAYERS} joueurs`)}
                  price={confirm.group_price_note} />
              )}
            </div>
            {kind === "group" && (
              <p className="mt-2 text-[12.5px] text-[var(--ink)]/55">{tr("Once the coach confirms, the class appears on Matches so friends and neighbours can join. You can share it on WhatsApp.", "Cuando el entrenador confirme, la clase aparece en Partidos para que amigos y vecinos se unan. Puedes compartirla por WhatsApp.", "Une fois confirmé, le cours apparaît dans Matchs pour que amis et voisins le rejoignent. Tu peux le partager sur WhatsApp.")}</p>
            )}

            {confirm.lesson_place === "both" ? (
              <div className="mt-4 grid grid-cols-2 rounded-full border border-[var(--ink)]/12 p-1">
                {([
                  ["club", tr("At the club", "En el club", "Au club")],
                  ["travel", tr("Come to me", "A domicilio", "Chez moi")],
                ] as const).map(([v, text]) => (
                  <button key={v} type="button" onClick={() => setChoice(v)} aria-pressed={choice === v}
                    className={`h-9 rounded-full text-[14px] ${choice === v ? "bg-[var(--ink)] text-[var(--cream)]" : "text-[var(--ink)]/60"}`}>{text}</button>
                ))}
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-1.5 text-[13px] text-[var(--ink)]/55">
                {confirm.lesson_place === "travel" ? <Home className="size-3.5" /> : <MapPin className="size-3.5" />}
                {confirm.lesson_place === "travel" ? `${homeLabel} · ${confirm.travel_area ?? confirm.club_name}` : confirm.club_name}
              </p>
            )}
            {(comesToMe || chosen === "club" || confirm.lesson_place === "both") && (
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2}
                placeholder={comesToMe
                  ? kind === "group"
                    ? tr("Your urbanización (shown on the class)", "Tu urbanización (se verá en la clase)", "Ta résidence (visible sur le cours)")
                    : tr("Your urbanización or address", "Tu urbanización o dirección", "Ta résidence ou adresse")
                  : tr("Anything the coach should know? (optional)", "¿Algo que deba saber el entrenador? (opcional)", "Quelque chose à dire au coach ? (optionnel)")}
                className="mt-3 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none" />
            )}
            <p className="mt-2 text-[12px] text-[var(--ink)]/45">{tr("The coach confirms. Payment is arranged with the coach.", "El entrenador confirma. El pago se acuerda con él.", "Le coach confirme. Le paiement se règle avec lui.")}</p>
            <button type="button" disabled={busy} onClick={send} className="mt-4 h-12 w-full rounded-full bg-[var(--ink)] text-[15px] font-medium text-[var(--cream)] disabled:opacity-60">
              {busy ? tr("Sending…", "Enviando…", "Envoi…") : kind === "group"
                ? tr("Request group class", "Pedir clase en grupo", "Demander le cours collectif")
                : tr("Request private lesson", "Pedir clase privada", "Demander le cours privé")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KindCard({ on, onClick, icon, title, sub, price }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; price: string | null }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-2xl border p-3 text-left transition ${on ? "border-[var(--ink)] bg-white shadow-[0_0_0_1px_var(--ink)]" : "border-[var(--ink)]/15 bg-white/60"}`}>
      <div className="flex items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]">{icon}{title}</div>
      <div className="mt-0.5 text-[12.5px] text-[var(--ink)]/55">{sub}</div>
      {price && <div className="mt-1 text-[13px] font-medium text-[var(--ink)]/80">{price}</div>}
    </button>
  );
}
