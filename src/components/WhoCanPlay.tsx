import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";
import { photoSrc } from "@/lib/photo-src";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { addPlayCheckin, listPlayCheckins, removePlayCheckin } from "@/lib/who-can-play.functions";
import { PLAY_SLOTS, groupCheckins, slotStillOpen, upcomingDays, type PlayGroup, type PlaySlot } from "@/lib/who-can-play";

type Props = { focusDay?: string | undefined; focusSlot?: PlaySlot | undefined };

export function WhoCanPlay({ focusDay, focusSlot }: Props) {
  const tr = useTr();
  const { lang } = useI18n();
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : "en";
  const qc = useQueryClient();
  const list = useServerFn(listPlayCheckins);
  const add = useServerFn(addPlayCheckin);
  const remove = useServerFn(removePlayCheckin);

  const [now] = useState(() => new Date());
  const days = useMemo(() => upcomingDays(now), [now]);
  const firstOpenSlot = (d: string) => PLAY_SLOTS.find((s) => slotStillOpen(s, d, now));
  const initialDay = focusDay && days.includes(focusDay) ? focusDay : firstOpenSlot(days[0]!) ? days[0]! : days[1]!;
  const [day, setDay] = useState(initialDay);
  const [slot, setSlot] = useState<PlaySlot>(focusSlot ?? firstOpenSlot(initialDay) ?? "evening");

  const range = { from: days[0]!, to: days[days.length - 1]! };
  const q = useQuery({
    queryKey: ["play-checkins", range],
    queryFn: () => list({ data: range }),
    staleTime: 30_000,
  });
  const groups = useMemo(() => groupCheckins(q.data?.checkins ?? [], now), [q.data, now]);
  const hasAreas = (q.data?.areaLabels.length ?? 1) > 0;

  const refresh = () => qc.invalidateQueries({ queryKey: ["play-checkins"] });
  const addMut = useMutation({
    mutationFn: (v: { date: string; slot: PlaySlot }) => add({ data: v }),
    onSuccess: () => { refresh(); toast.success(tr("You're in. Players near you can join.", "Apuntado. Los jugadores de tu zona pueden unirse.", "C'est noté. Les joueurs du coin peuvent se joindre.")); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });
  const removeMut = useMutation({
    mutationFn: (v: { date: string; slot: PlaySlot }) => remove({ data: v }),
    onSuccess: refresh,
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });
  const busy = addMut.isPending || removeMut.isPending;

  const dayLabel = (iso: string, long = false) => {
    if (iso === days[0]) return tr("Today", "Hoy", "Aujourd'hui");
    if (iso === days[1]) return tr("Tomorrow", "Mañana", "Demain");
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y!, m! - 1, d!);
    return long
      ? date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" })
      : `${date.toLocaleDateString(locale, { weekday: "short" }).replace(".", "")} ${date.getDate()}`;
  };
  const slotLabel = (s: PlaySlot) =>
    s === "morning" ? tr("Morning", "Mañana", "Matin") : s === "afternoon" ? tr("Afternoon", "Tarde", "Après-midi") : tr("Evening", "Noche", "Soir");

  const pickedGroup = groups.find((g) => g.date === day && g.slot === slot);
  const pickedIn = pickedGroup?.imIn ?? false;
  const pickedOpen = slotStillOpen(slot, day, now);

  return (
    <section aria-labelledby="who-can-play" className="space-y-5">
      {/* Picker */}
      <div className="rounded-2xl bg-white border border-[var(--ink)]/10 p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]/55">{tr("When are you free?", "¿Cuándo puedes jugar?", "Quand es-tu libre ?")}</div>
        <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((d) => {
            const active = d === day;
            const anyOpen = PLAY_SLOTS.some((s) => slotStillOpen(s, d, now));
            return (
              <button
                key={d}
                type="button"
                disabled={!anyOpen}
                aria-pressed={active}
                onClick={() => { setDay(d); if (!slotStillOpen(slot, d, now)) setSlot(firstOpenSlot(d) ?? "evening"); }}
                className={`shrink-0 px-3.5 h-9 rounded-full text-[13px] font-semibold border transition capitalize disabled:opacity-35 ${active ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white text-[var(--ink)]/75 border-[var(--ink)]/15 hover:border-[var(--ink)]/35"}`}
              >
                {dayLabel(d)}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {PLAY_SLOTS.map((s) => {
            const active = s === slot;
            const open = slotStillOpen(s, day, now);
            return (
              <button
                key={s}
                type="button"
                disabled={!open}
                aria-pressed={active}
                onClick={() => setSlot(s)}
                className={`h-9 rounded-full text-[13px] font-semibold border transition disabled:opacity-35 ${active ? "bg-[var(--club-soft)] text-[var(--ink)] border-[var(--ink)]/45" : "bg-white text-[var(--ink)]/70 border-[var(--ink)]/15 hover:border-[var(--ink)]/35"}`}
              >
                {slotLabel(s)}
              </button>
            );
          })}
        </div>
        {hasAreas ? (
          <button
            type="button"
            disabled={busy || !pickedOpen}
            onClick={() => (pickedIn ? removeMut.mutate({ date: day, slot }) : addMut.mutate({ date: day, slot }))}
            className={`mt-4 w-full h-11 rounded-full text-sm font-semibold transition disabled:opacity-50 ${pickedIn ? "bg-white text-[var(--ink)] border border-[var(--ink)]/25" : "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)]/90"}`}
          >
            {pickedIn
              ? tr("You're in · Remove me", "Estás apuntado · Quitarme", "Tu es inscrit · Me retirer")
              : tr("I can play", "Puedo jugar", "Je peux jouer")}
          </button>
        ) : (
          <p className="mt-4 text-sm text-[var(--ink)]/70">
            {tr("Add your area to see who can play near you.", "Añade tu zona para ver quién puede jugar cerca.", "Ajoute ta zone pour voir qui peut jouer près de toi.")}{" "}
            <Link to="/app/profile" className="font-semibold text-[var(--ink)] underline underline-offset-2">{tr("Open Me", "Abrir Yo", "Ouvrir Moi")}</Link>
          </p>
        )}
      </div>

      {/* Who is free */}
      {hasAreas && (
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-2.5">
            <p id="who-can-play" className="text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]/55">
              {tr("Free this week", "Libres esta semana", "Libres cette semaine")}
              {q.data?.areaLabels.length ? <span> · {q.data.areaLabels.join(" · ")}</span> : null}
            </p>
          </div>
          {q.isLoading ? (
            <div className="space-y-2.5">
              {[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl bg-[var(--ink)]/5 animate-pulse" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--ink)]/20 bg-white/60 px-5 py-7 text-center">
              <p className="text-serif text-lg text-[var(--ink)]">{tr("Nobody yet this week", "Nadie todavía esta semana", "Personne encore cette semaine")}</p>
              <p className="mt-1 text-sm text-[var(--ink)]/60">{tr("Say when you're free and players near you can join.", "Di cuándo puedes y los jugadores de tu zona se unirán.", "Dis quand tu es libre et les joueurs du coin te rejoindront.")}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {groups.map((g) => (
                <GroupCard
                  key={g.key}
                  group={g}
                  title={dayLabel(g.date, true)}
                  slotLabel={slotLabel(g.slot)}
                  focused={g.date === focusDay && g.slot === focusSlot}
                  busy={busy}
                  onJoin={() => addMut.mutate({ date: g.date, slot: g.slot })}
                  onLeave={() => removeMut.mutate({ date: g.date, slot: g.slot })}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function GroupCard({ group, title, slotLabel, focused, busy, onJoin, onLeave }: {
  group: PlayGroup; title: string; slotLabel: string; focused: boolean; busy: boolean; onJoin: () => void; onLeave: () => void;
}) {
  const tr = useTr();
  const shown = group.players.slice(0, 5);
  const extra = group.players.length - shown.length;
  const names = group.players.map((p) => (p.mine ? tr("You", "Tú", "Toi") : p.first_name ?? tr("Player", "Jugador", "Joueur")));
  const nameLine = names.length <= 3 ? names.join(", ") : `${names.slice(0, 2).join(", ")} ${tr(`and ${names.length - 2} more`, `y ${names.length - 2} más`, `et ${names.length - 2} autres`)}`;
  const count = group.players.length;

  return (
    <li className={`rounded-2xl bg-white border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${focused ? "border-[var(--ink)]/50 ring-2 ring-[var(--grass)]/50" : "border-[var(--ink)]/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-serif text-lg text-[var(--ink)] leading-tight capitalize">{title}</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/55 mt-0.5">{slotLabel}</div>
        </div>
        <div className="shrink-0 text-[12px] font-semibold text-[var(--pitch)]">
          {count === 1 ? tr("1 can play", "1 puede", "1 dispo") : tr(`${count} can play`, `${count} pueden`, `${count} dispos`)}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex -space-x-2 shrink-0">
          {shown.map((p) => (
            <div key={p.profile_id} className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white bg-[var(--ink)]/10">
              <PlayerPhoto src={photoSrc(p.photo_url, 240)} seed={p.profile_id} alt={p.first_name ?? ""} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
          {extra > 0 && (
            <div className="w-9 h-9 rounded-full ring-2 ring-white bg-[var(--ink)]/8 grid place-items-center text-[11px] font-semibold text-[var(--ink)]/70">+{extra}</div>
          )}
        </div>
        <p className="text-sm text-[var(--ink)]/75 min-w-0 truncate">{nameLine}</p>
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        {group.imIn ? (
          <>
            <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--club-soft)] text-[var(--ink)] text-[13px] font-semibold">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />{tr("You're in", "Estás dentro", "Tu en es")}
            </span>
            {count >= 2 && (
              <Link to="/app/events/new" className="inline-flex items-center h-9 px-3.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px] font-semibold">
                {tr("Start a match", "Crear partido", "Lancer un match")}
              </Link>
            )}
            <button type="button" disabled={busy} onClick={onLeave} className="ml-auto text-[12px] font-medium text-[var(--ink)]/55 hover:text-[var(--ink)] underline underline-offset-2 disabled:opacity-50">
              {tr("Remove", "Quitar", "Retirer")}
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={onJoin} className="inline-flex items-center h-9 px-5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px] font-semibold hover:bg-[var(--ink)]/90 disabled:opacity-50">
            {tr("Me too", "Yo también", "Moi aussi")}
          </button>
        )}
      </div>
    </li>
  );
}
