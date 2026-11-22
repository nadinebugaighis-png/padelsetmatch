import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { LessonMessageButton } from "@/components/LessonMessageButton";
import { addCoachSlots, cancelCoachSlot, getMyCoachSlots, respondCoachSlot } from "@/lib/coach-lessons.functions";
import { COACH_HOURS, GROUP_CLASS_PLAYERS, dayKey, nextDays, offersClub, offersTravel, placeFields, slotStarts, type CoachSlot, type LessonPlace } from "@/lib/coach-lessons";

export const Route = createFileRoute("/app/coach")({
  head: () => ({ meta: [
    { title: "Coaching | PadelSetMatch" },
    { name: "description", content: "Answer lesson requests, see your classes and share your lesson times." },
    { property: "og:title", content: "Coaching | PadelSetMatch" },
    { property: "og:description", content: "Answer lesson requests, see your classes and share your lesson times." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CoachTimesPage,
});

const label = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/68";
const LAST_CLUB = "coach-last-club";
const LAST_PLACE = "coach-last-place";
const LAST_AREA = "coach-last-area";
const LAST_PRICE = "coach-last-price";
const LAST_GROUP_PRICE = "coach-last-group-price";
const LAST_GROUPS = "coach-last-groups";
const remembered = (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };

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
  const [club, setClub] = useState(() => remembered(LAST_CLUB));
  const [place, setPlace] = useState<LessonPlace>(() => {
    const v = remembered(LAST_PLACE);
    return v === "travel" || v === "both" ? v : "club";
  });
  const [area, setArea] = useState(() => remembered(LAST_AREA));
  const [price, setPrice] = useState(() => remembered(LAST_PRICE));
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = Date.now();
  const starts = slotStarts(day, hours);
  const pastHour = (h: number) => {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y!, m! - 1, d!, h).getTime() <= now;
  };

  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const longDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const where = (s: CoachSlot) => {
    if (s.student_place === "travel") return tr("At their place", "A domicilio", "À domicile");
    if (s.student_place === "club" || s.lesson_place === "club") return s.club_name;
    if (s.lesson_place === "travel") return `${tr("At players' homes", "A domicilio", "À domicile")} · ${s.travel_area ?? s.club_name}`;
    return `${s.club_name} · ${tr("or at home", "o a domicilio", "ou à domicile")}`;
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-coach-slots"] }).then(() => qc.invalidateQueries({ queryKey: ["coach-board"] }));

  async function save() {
    if (offersClub(place) && !club.trim()) { toast.error(tr("Add the club", "Añade el club", "Ajoute le club")); return; }
    if (offersTravel(place) && !area.trim()) { toast.error(tr("Add the areas you cover", "Añade las zonas que cubres", "Ajoute les zones couvertes")); return; }
    if (!placeFields(place, club, area)) return;
    if (!starts.length) { toast.error(tr("Pick at least one time", "Elige al menos una hora", "Choisis au moins une heure")); return; }
    setSaving(true);
    try {
      const r = await add({ data: { starts, duration_minutes: duration, lesson_place: place, club_name: club.trim(), travel_area: area.trim(), price_note: price.trim() || null, offers_group: false, group_price_note: null } });
      try {
        localStorage.setItem(LAST_PLACE, place);
        if (club.trim()) localStorage.setItem(LAST_CLUB, club.trim());
        if (area.trim()) localStorage.setItem(LAST_AREA, area.trim());
        localStorage.setItem(LAST_PRICE, price.trim());
      } catch { /* ignore */ }
      toast.success(r.added === 1
        ? tr("1 lesson time shared", "1 horario publicado", "1 horaire publié")
        : tr(`${r.added} lesson times shared`, `${r.added} horarios publicados`, `${r.added} horaires publiés`));
      setHours([]);
      setAdding(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not save", "No se pudo guardar", "Enregistrement impossible"));
    } finally { setSaving(false); }
  }

  async function answer(s: CoachSlot, accept: boolean) {
    try {
      await respond({ data: { slotId: s.id, accept } });
      if (accept && s.lesson_kind === "group") toast.success(tr("Group class confirmed. It's now on Matches so others can join.", "Clase en grupo confirmada. Ya está en Partidos para que se unan otros.", "Cours collectif confirmé. Il est dans Matchs pour que d'autres le rejoignent."));
      else if (accept) toast.success(tr("Lesson confirmed. Your chat is open in Messages.", "Clase confirmada. Tenéis un chat abierto en Mensajes.", "Cours confirmé. Votre conversation est ouverte dans Messages."));
      else toast.success(tr("Time reopened", "Hora disponible de nuevo", "Horaire rouvert"));
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  }

  async function remove(s: CoachSlot) {
    if ((s.student_profile_id || s.match_event_id) && !window.confirm(s.match_event_id
      ? tr("Cancel this group class? Everyone in it will be told.", "¿Cancelar esta clase en grupo? Avisaremos a todos.", "Annuler ce cours collectif ? Tout le monde sera prévenu.")
      : tr("Cancel this lesson? The player will be told.", "¿Cancelar esta clase? Avisaremos al jugador.", "Annuler ce cours ? Le joueur sera prévenu."))) return;
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
          <h1 className="text-serif text-[30px] text-[var(--ink)]">{tr("Coaching", "Entrenador", "Coaching")}</h1>
          <p className="mt-3 text-[15px] text-[var(--ink)]/72">{tr("Turn on \"I'm a padel coach\" in Edit profile to share lesson times.", "Activa \"Soy entrenador de pádel\" en Editar perfil para publicar horarios.", "Active « Je suis coach de padel » dans Modifier le profil pour publier tes horaires.")}</p>
          <Link to="/app/onboarding" className="mt-5 inline-flex h-11 items-center rounded-full bg-[var(--ink)] px-6 text-[14px] font-medium text-[var(--cream)]">{tr("Edit profile", "Editar perfil", "Modifier le profil")}</Link>
        </div>
      </div>
    );
  }

  const requests = data.slots.filter((s) => s.status === "requested");
  const booked = data.slots.filter((s) => s.status === "booked");
  const open = data.slots.filter((s) => s.status === "open");
  const showForm = adding || data.slots.length === 0;
  const kindLabel = (s: CoachSlot) => s.lesson_kind === "group"
    ? tr("Group class", "Clase en grupo", "Cours collectif")
    : tr("Private lesson", "Clase privada", "Cours privé");

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl mx-auto px-5 pt-2 pb-32">
        <button type="button" onClick={() => navigate({ to: "/app/profile" })} aria-label={tr("Back", "Atrás", "Retour")} className="-ml-2 grid size-10 place-items-center rounded-full text-[var(--ink)]"><ArrowLeft className="size-5" /></button>
        <h1 className="mt-1 text-serif text-[34px] leading-[1.05] text-[var(--ink)]">{tr("Coaching", "Entrenador", "Coaching")}</h1>
        <p className="mt-2 text-[15px] text-[var(--ink)]/68">{tr("Share your times. Players ask for a private lesson or an open group. You confirm.", "Publica tus horas. Los jugadores piden clase privada o grupo abierto. Tú confirmas.", "Publie tes horaires. Les joueurs demandent un cours privé ou un groupe ouvert. Tu confirmes.")}</p>

        {requests.length > 0 && (
          <section className="mt-6">
            <div className={label}>{tr("To answer", "Por responder", "À répondre")}</div>
            <ul className="mt-2 space-y-2">
              {requests.map((s) => {
                const p = s.student_profile_id ? data.people[s.student_profile_id] : undefined;
                return (
                  <li key={s.id} className="rounded-2xl border border-[var(--gold)]/45 bg-white p-3.5">
                    <div className="flex items-center gap-3">
                      <PlayerPhoto src={p?.photo_url ?? undefined} seed={s.student_profile_id} alt={p?.first_name ?? ""} className="size-11 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-medium text-[var(--ink)] truncate">{p?.first_name ?? tr("A player", "Un jugador", "Un joueur")} · <span className={s.lesson_kind === "group" ? "text-[var(--plum)]" : ""}>{kindLabel(s)}</span></div>
                        <div className="text-[12.5px] text-[var(--ink)]/68 truncate">{longDate(s.starts_at)} · {time(s.starts_at)} · {where(s)}</div>
                      </div>
                    </div>
                    {s.student_note && <p className="mt-2 text-[13.5px] text-[var(--ink)]/75">"{s.student_note}"</p>}
                    {s.lesson_kind === "group" && (
                      <p className="mt-2 text-[12.5px] text-[var(--ink)]/65">{tr(`If you accept, the class goes on Matches with ${GROUP_CLASS_PLAYERS - 1} places open for others.`, `Si aceptas, la clase aparece en Partidos con ${GROUP_CLASS_PLAYERS - 1} plazas libres.`, `Si tu acceptes, le cours apparaît dans Matchs avec ${GROUP_CLASS_PLAYERS - 1} places libres.`)}</p>
                    )}
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

        {booked.length > 0 && (
          <section className="mt-6">
            <div className={label}>{tr("Coming up", "Próximas clases", "À venir")}</div>
            <ul className="mt-2 divide-y divide-[var(--ink)]/[0.08] rounded-2xl border border-[var(--ink)]/16 bg-white">
              {booked.map((s) => {
                const p = s.student_profile_id ? data.people[s.student_profile_id] : undefined;
                const cls = s.match_event_id ? data.classes[s.match_event_id] : undefined;
                const cancelled = cls?.status === "cancelled";
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] text-[var(--ink)]">{longDate(s.starts_at)} · {time(s.starts_at)} · {s.duration_minutes}'</div>
                      <div className="text-[12.5px] text-[var(--ink)]/65 truncate">
                        {s.match_event_id ? (
                          <span className="text-[var(--plum)]">
                            <Users className="mr-1 inline size-3.5 -mt-0.5" />
                            {cancelled ? tr("Cancelled", "Cancelada", "Annulé") : cls
                              ? tr(`${cls.people - 1} of ${GROUP_CLASS_PLAYERS} players`, `${cls.people - 1} de ${GROUP_CLASS_PLAYERS} jugadores`, `${cls.people - 1} sur ${GROUP_CLASS_PLAYERS} joueurs`)
                              : kindLabel(s)}
                          </span>
                        ) : <span className="text-[var(--pitch)]">{p?.first_name ?? tr("Booked", "Reservada", "Réservé")}</span>}
                        {" · "}{where(s)}
                      </div>
                    </div>
                    {s.match_event_id ? (
                      <Link to="/app/events/$eventId" params={{ eventId: s.match_event_id }}
                        className="inline-flex h-8 shrink-0 items-center rounded-full border border-[var(--plum)]/35 px-3 text-[12.5px] font-medium text-[var(--plum)]">
                        {tr("Open", "Ver", "Voir")}
                      </Link>
                    ) : <LessonMessageButton slotId={s.id} />}
                    <button type="button" onClick={() => remove(s)} aria-label={tr("Cancel", "Cancelar", "Annuler")} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)]/55"><Trash2 className="size-4" /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <div className={label}>{open.length === 0 && showForm ? tr("Add your lesson times", "Añade tus horas de clase", "Ajoute tes horaires") : tr("Your open times", "Tus horas libres", "Tes horaires libres")}</div>
            {!showForm && (
              <button type="button" onClick={() => setAdding(true)} className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--ink)] px-3 text-[12.5px] font-medium text-[var(--cream)]">
                <Plus className="size-3.5" />{tr("Add times", "Añadir horas", "Ajouter")}
              </button>
            )}
          </div>
          {open.length === 0 ? (
            !showForm && <p className="mt-2 text-[14px] text-[var(--ink)]/65">{tr("No open times. Add some so players can book you.", "No tienes horas libres. Añade algunas para que te reserven.", "Aucun horaire libre. Ajoutes-en pour être réservé.")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--ink)]/[0.08] rounded-2xl border border-[var(--ink)]/16 bg-white">
              {open.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] text-[var(--ink)]">{longDate(s.starts_at)} · {time(s.starts_at)} · {s.duration_minutes}'</div>
                    <div className="text-[12px] text-[var(--ink)]/60 truncate">
                      {where(s)}
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(s)} aria-label={tr("Remove", "Quitar", "Retirer")} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)]/55"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {showForm && (
          <section className="mt-4 rounded-2xl border border-[var(--ink)]/16 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className={label}>{tr("1 · Day and hours", "1 · Día y horas", "1 · Jour et heures")}</div>
              {data.slots.length > 0 && <button type="button" onClick={() => setAdding(false)} className="text-[12.5px] text-[var(--ink)]/65 underline underline-offset-4">{tr("Close", "Cerrar", "Fermer")}</button>}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
              {days.map((d) => {
                const k = dayKey(d);
                const on = k === day;
                return (
                  <button key={k} type="button" onClick={() => { setDay(k); setHours([]); }} aria-pressed={on}
                    className={`flex h-[60px] w-[54px] shrink-0 flex-col items-center justify-center rounded-xl border ${on ? "border-[var(--pitch)] bg-[var(--pitch)] text-[var(--cream)]" : "border-[var(--ink)]/22 text-[var(--ink)]"}`}>
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
            <div className="grid grid-cols-2 rounded-full border border-[var(--ink)]/18 p-1">
              {([60, 90] as const).map((m) => (
                <button key={m} type="button" onClick={() => setDuration(m)} aria-pressed={duration === m}
                  className={`h-8 rounded-full text-[13px] ${duration === m ? "bg-[var(--ink)] text-[var(--cream)]" : "text-[var(--ink)]/72"}`}>{m} min</button>
              ))}
            </div>

            <div className={`pt-1 ${label}`}>{tr("2 · Where", "2 · Dónde", "2 · Où")}</div>
            <div className="grid grid-cols-3 rounded-full border border-[var(--ink)]/18 p-1">
              {([
                ["club", tr("At a club", "En un club", "En club")],
                ["travel", tr("I come to you", "A domicilio", "À domicile")],
                ["both", tr("Both", "Ambos", "Les deux")],
              ] as const).map(([v, text]) => (
                <button key={v} type="button" onClick={() => setPlace(v)} aria-pressed={place === v}
                  className={`h-8 rounded-full text-[13px] ${place === v ? "bg-[var(--ink)] text-[var(--cream)]" : "text-[var(--ink)]/72"}`}>{text}</button>
              ))}
            </div>
            {offersClub(place) && (
              <Input value={club} maxLength={120} onChange={(e) => setClub(e.target.value)} placeholder={tr("Club name", "Nombre del club", "Nom du club")} aria-label={tr("Club", "Club", "Club")} />
            )}
            {offersTravel(place) && (
              <div className="space-y-1.5">
                <Input value={area} maxLength={120} onChange={(e) => setArea(e.target.value)} aria-label={tr("Areas you cover", "Zonas que cubres", "Zones couvertes")} placeholder={tr("Urbanizaciones you cover, e.g. La Moraleja, El Soto", "Urbanizaciones que cubres, ej. La Moraleja, El Soto", "Résidences couvertes, ex. La Moraleja, El Soto")} />
                <p className="text-[12px] text-[var(--ink)]/60">{tr("Players with a court at home or in their urbanización can ask you to come.", "Los jugadores con pista en casa o en su urbanización pueden pedirte que vayas.", "Les joueurs avec un court chez eux ou dans leur résidence peuvent te demander de venir.")}</p>
              </div>
            )}

            <div className={`pt-1 ${label}`}>{tr("3 · Lesson price (optional)", "3 · Precio de la clase (opcional)", "3 · Prix du cours (optionnel)")}</div>
            <Input value={price} maxLength={40} onChange={(e) => setPrice(e.target.value)} aria-label={tr("Private lesson price", "Precio clase privada", "Prix cours privé")} placeholder={tr("Private lesson, e.g. €50", "Clase privada, ej. 50 €", "Cours privé, ex. 50 €")} />
            <p className="text-[12px] text-[var(--ink)]/60">{tr("Players who want to bring friends can ask you in the chat.", "Si un jugador quiere traer amigos, te lo puede pedir por el chat.", "Un joueur qui veut venir avec des amis peut te le demander par message.")}</p>
            <button type="button" disabled={saving} onClick={save} className="h-12 w-full rounded-full bg-[var(--ink)] text-[15px] font-medium text-[var(--cream)] disabled:opacity-60">
              {saving ? tr("Saving…", "Guardando…", "Enregistrement…") : starts.length
                ? tr(`Publish ${starts.length} ${starts.length === 1 ? "slot" : "slots"}`, `Publicar ${starts.length} ${starts.length === 1 ? "horario" : "horarios"}`, `Publier ${starts.length} horaire${starts.length === 1 ? "" : "s"}`)
                : tr("Pick your hours above", "Elige tus horas arriba", "Choisis tes heures plus haut")}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
