import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, MapPin } from "lucide-react";
import { useI18n, useTr } from "@/lib/i18n";
import { photoSrc } from "@/lib/photo-src";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { SlotChat } from "@/components/SlotChat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addPlayCheckin, listPlayCheckins, removePlayCheckin } from "@/lib/who-can-play.functions";
import { PLAY_SLOTS, groupCheckins, slotStillOpen, upcomingDays, type PlayGroup, type PlaySlot } from "@/lib/who-can-play";

type Props = {
  focusDay?: string | undefined;
  focusSlot?: PlaySlot | undefined;
  focusArea?: string | undefined;
};

export function WhoCanPlay({ focusDay, focusSlot, focusArea }: Props) {
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
  // Browsing another area never changes the player's home area or their alerts.
  const [areaKey, setAreaKey] = useState<string | undefined>(focusArea);

  const range = { from: days[0]!, to: days[days.length - 1]! };
  const q = useQuery({
    queryKey: ["play-checkins", range, areaKey ?? "home"],
    queryFn: () => list({ data: { ...range, ...(areaKey ? { area: areaKey } : {}) } }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  // A link to an area we can't show falls back to the home area.
  useEffect(() => {
    if (areaKey && q.data && !q.isPlaceholderData && !q.data.area) setAreaKey(undefined);
  }, [areaKey, q.data, q.isPlaceholderData]);

  const area = q.data?.area ?? null;
  const groups = useMemo(() => groupCheckins(q.data?.checkins ?? [], now), [q.data, now]);
  const hasAreas = (q.data?.mine.length ?? 1) > 0 || !!area;

  const refresh = () => qc.invalidateQueries({ queryKey: ["play-checkins"] });
  const addMut = useMutation({
    mutationFn: (v: { date: string; slot: PlaySlot }) => add({ data: { ...v, area: area!.key } }),
    onSuccess: (_r, v) => {
      refresh();
      toast.success(tr(`You're available in ${area?.label}.`, `Disponible en ${area?.label}.`, `Disponible à ${area?.label}.`));
    },
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
  const weekdayShort = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
  };
  const dayNumber = (iso: string) => Number(iso.slice(8, 10));
  const slotLabel = (s: PlaySlot) =>
    s === "morning" ? tr("Morning", "Mañana", "Matin") : s === "afternoon" ? tr("Afternoon", "Tarde", "Après-midi") : tr("Evening", "Noche", "Soir");

  const pickedGroup = groups.find((g) => g.date === day && g.slot === slot);
  const pickedIn = pickedGroup?.imIn ?? false;
  const pickedOpen = slotStillOpen(slot, day, now);
  // Already free at this time in another area: one place per time, so offer to remove it there.
  const elsewhereMine = !pickedIn && area
    ? q.data?.myCheckins.find((c) => c.date === day && c.slot === slot && !c.areaKeys.includes(area.key))
    : undefined;

  const smallCaps = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/55";

  return (
    <section aria-labelledby="who-can-play" className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:items-start">
      {/* Left: where and when */}
      <div className="lg:sticky lg:top-24 space-y-4">
        {hasAreas && q.data && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)] transition hover:text-[var(--ink)]/65">
                <MapPin className="w-3.5 h-3.5 text-[var(--pitch)]" strokeWidth={1.75} />
                {area?.label ?? tr("Choose area", "Elige zona", "Choisir une zone")}
                <ChevronDown className="w-3 h-3 text-[var(--ink)]/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56 bg-white text-[var(--ink)] border-[var(--ink)]/10">
              <DropdownMenuRadioGroup value={area?.key ?? ""} onValueChange={(v) => { setAreaKey(v === q.data?.mine[0]?.key ? undefined : v); }}>
                {q.data.mine.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/50 font-medium">{tr("Your areas", "Tus zonas", "Tes zones")}</DropdownMenuLabel>
                    {q.data.mine.map((a) => (
                      <DropdownMenuRadioItem key={a.key} value={a.key} className="text-sm">{a.label}</DropdownMenuRadioItem>
                    ))}
                  </>
                )}
                {q.data.elsewhere.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="bg-[var(--ink)]/10" />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/50 font-medium">{tr("Travelling", "De viaje", "En voyage")}</DropdownMenuLabel>
                    {q.data.elsewhere.map((a) => (
                      <DropdownMenuRadioItem key={a.key} value={a.key} className="text-sm">{a.label}</DropdownMenuRadioItem>
                    ))}
                  </>
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="rounded-[22px] bg-white border border-[var(--ink)]/10 px-4 pt-5 pb-5 sm:px-6">
          <div className={smallCaps}>{tr("When are you free?", "¿Cuándo puedes jugar?", "Quand es-tu libre ?")}</div>

          {/* Days: the same quiet strip as Matches */}
          <div className="mt-4 -mx-1 flex items-stretch justify-between gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map((d, i) => {
              const active = d === day;
              const anyOpen = PLAY_SLOTS.some((s) => slotStillOpen(s, d, now));
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!anyOpen}
                  aria-pressed={active}
                  aria-label={dayLabel(d, true)}
                  onClick={() => { setDay(d); if (!slotStillOpen(slot, d, now)) setSlot(firstOpenSlot(d) ?? "evening"); }}
                  className="shrink-0 min-w-10 flex-1 flex flex-col items-center gap-1 py-1 transition active:opacity-70 disabled:opacity-30"
                >
                  <span className={`text-[10px] uppercase tracking-[0.18em] leading-none ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/45"}`}>
                    {i === 0 ? tr("Today", "Hoy", "Auj.") : weekdayShort(d)}
                  </span>
                  <span className={`text-serif text-[24px] leading-none ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/55"}`}>{dayNumber(d)}</span>
                  <span aria-hidden className={`h-px w-6 ${active ? "bg-[var(--gold)]" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>

          {/* Part of the day */}
          <div className="mt-4 grid grid-cols-3 border-t border-[var(--ink)]/8 pt-3">
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
                  className="flex flex-col items-center gap-1.5 py-1.5 transition active:opacity-70 disabled:opacity-25"
                >
                  <span className={`text-serif text-[17px] leading-none ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/50"}`}>{slotLabel(s)}</span>
                  <span aria-hidden className={`h-px w-6 ${active ? "bg-[var(--gold)]" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>

          {hasAreas ? (
            <div className="mt-5 flex flex-col items-center">
              <button
                type="button"
                disabled={busy || !pickedOpen || !area}
                onClick={() => (pickedIn || elsewhereMine ? removeMut.mutate({ date: day, slot }) : addMut.mutate({ date: day, slot }))}
                className={`max-w-full truncate h-10 px-6 rounded-full text-[11.5px] font-semibold uppercase tracking-[0.18em] transition active:scale-[0.98] disabled:opacity-50 ${pickedIn || elsewhereMine ? "border border-[var(--ink)]/25 text-[var(--ink)]/75 hover:border-[var(--ink)]/45" : "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)]/90"}`}
              >
                {pickedIn
                  ? tr("You're available · Remove", "Estás disponible · Quitarme", "Tu es disponible · Me retirer")
                  : elsewhereMine
                  ? tr(`Available in ${elsewhereMine.areaLabel ?? "another area"} · Remove`, `Disponible en ${elsewhereMine.areaLabel ?? "otra zona"} · Quitar`, `Disponible à ${elsewhereMine.areaLabel ?? "une autre zone"} · Retirer`)
                  : tr("I can play", "Puedo jugar", "Je peux jouer")}
              </button>
              {area && !pickedIn && !elsewhereMine && (
                <p className="mt-2 text-serif italic text-[13px] text-[var(--ink)]/50">
                  {tr(`Shared with players in ${area.label}`, `Visible para jugadores de ${area.label}`, `Visible par les joueurs de ${area.label}`)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--ink)]/70">
              {tr("Add your area to see who can play near you.", "Añade tu zona para ver quién puede jugar cerca.", "Ajoute ta zone pour voir qui peut jouer près de toi.")}{" "}
              <Link to="/app/profile" className="font-semibold text-[var(--ink)] underline underline-offset-2">{tr("Open Me", "Abrir Yo", "Ouvrir Moi")}</Link>
            </p>
          )}
        </div>
      </div>

      {/* Right: who is free this week */}
      {hasAreas && (
        <div className="mt-10 lg:mt-0">
          <div className="flex items-baseline gap-3">
            <h2 id="who-can-play" className="text-serif text-[28px] sm:text-[32px] leading-none text-[var(--ink)]">
              {tr("This week", "Esta semana", "Cette semaine")}
            </h2>
            {groups.length > 0 && (
              <span className={smallCaps}>
                {groups.length === 1 ? tr("1 time", "1 hora", "1 créneau") : tr(`${groups.length} times`, `${groups.length} horas`, `${groups.length} créneaux`)}
              </span>
            )}
          </div>
          <div aria-hidden className="mt-3 mb-5 h-px bg-[var(--gold)]/45" />
          {q.isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <div key={i} className="h-36 rounded-[22px] bg-[var(--ink)]/5 animate-pulse" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-8">
              <p className="text-serif italic text-[22px] text-[var(--ink)]">{tr("Nobody yet this week", "Nadie todavía esta semana", "Personne encore cette semaine")}</p>
              <p className="mt-2 text-[14px] text-[var(--ink)]/60">{tr("Say when you're free and players near you can join.", "Di cuándo puedes y los jugadores de tu zona se unirán.", "Dis quand tu es libre et les joueurs du coin te rejoindront.")}</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {groups.map((g) => (
                <GroupCard
                  key={`${area?.key}|${g.key}`}
                  group={g}
                  areaKey={area!.key}
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

function GroupCard({ group, areaKey, title, slotLabel, focused, busy, onJoin, onLeave }: {
  group: PlayGroup; areaKey: string; title: string; slotLabel: string;
  focused: boolean; busy: boolean; onJoin: () => void; onLeave: () => void;
}) {
  const tr = useTr();
  const { label, lang } = useI18n();
  const count = group.players.length;
  const [confirmLeave, setConfirmLeave] = useState(false);
  const words = lang === "es" ? ["", "Uno", "Dos", "Tres", "Cuatro"] : lang === "fr" ? ["", "Un", "Deux", "Trois", "Quatre"] : ["", "One", "Two", "Three", "Four"];
  const countLabel = `${words[count] ?? count} ${count === 1 ? tr("available", "disponible", "disponible") : tr("available", "disponibles", "disponibles")}`;

  return (
    <li className={`overflow-hidden rounded-[22px] bg-white border border-[var(--ink)]/10 px-5 pt-5 sm:px-6 sm:pt-6 ${group.imIn ? "" : "pb-5 sm:pb-6"} ${focused ? "ring-2 ring-[var(--gold)]/50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-serif text-[26px] sm:text-[30px] leading-none text-[var(--ink)] capitalize truncate">{title}</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/55">{slotLabel}</div>
        </div>
        <div className="shrink-0 pt-1 text-serif italic text-[15px] text-[var(--plum)]">{countLabel}</div>
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-4">
        {group.players.map((p) => {
          const name = p.mine ? tr("You", "Tú", "Toi") : p.first_name ?? tr("Player", "Jugador", "Joueur");
          const inner = (
            <>
              <span className="block w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[var(--ink)]/10 ring-1 ring-[var(--ink)]/10">
                <PlayerPhoto src={photoSrc(p.photo_url, 240)} seed={p.profile_id} alt={p.first_name ?? ""} className="w-full h-full object-cover" loading="lazy" />
              </span>
              <span className="mt-1.5 block max-w-16 truncate text-[12.5px] text-[var(--ink)]">{name}</span>
              {p.level && <span className="block text-[9px] uppercase tracking-[0.16em] text-[var(--ink)]/45">{label(p.level)}</span>}
            </>
          );
          return (
            <li key={p.profile_id} className="flex flex-col items-center text-center">
              {p.mine ? (
                <button type="button" onClick={() => setConfirmLeave(true)} className="flex flex-col items-center active:opacity-70">{inner}</button>
              ) : inner}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center gap-3 border-t border-[var(--ink)]/8 pt-4">
        {group.imIn ? (
          <>
            <button type="button" disabled={busy} onClick={onLeave} className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/45 hover:text-[var(--ink)] disabled:opacity-50">
              {tr("Leave", "Salir", "Quitter")}
            </button>
            {count >= 2 ? (
              <Link
                to="/app/events/new"
                search={{ day: group.date, slot: group.slot }}
                className="ml-auto inline-flex items-center h-9 px-4 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] font-semibold uppercase tracking-[0.16em] active:scale-[0.98]"
              >
                {tr("Start a match", "Crear partido", "Lancer un match")}
              </Link>
            ) : (
              <span className="ml-auto text-serif italic text-[13px] text-[var(--ink)]/45">{tr("Waiting for a second player", "Esperando a otro jugador", "En attente d'un second joueur")}</span>
            )}
          </>
        ) : (
          <>
            <span className="min-w-0 text-[13px] text-[var(--ink)]/55">{tr("Free then too? Join to chat.", "¿Libre también? Únete al chat.", "Libre aussi ? Rejoins le chat.")}</span>
            <button type="button" disabled={busy} onClick={onJoin} className="ml-auto shrink-0 inline-flex items-center h-9 px-4 rounded-full border border-[var(--ink)]/30 text-[var(--ink)] text-[11px] font-semibold uppercase tracking-[0.18em] hover:border-[var(--ink)]/60 active:scale-[0.98] disabled:opacity-50">
              {tr("Me too", "Yo también", "Moi aussi")}
            </button>
          </>
        )}
      </div>

      {group.imIn && (
        <SlotChat
          area={areaKey}
          date={group.date}
          slot={group.slot}
          canWrite
          onJoin={onJoin}
          joining={busy}
        />
      )}

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent className="bg-white text-[var(--ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-serif text-lg">{tr("Leave this time?", "¿Salir de esta hora?", "Quitter ce créneau ?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[var(--ink)]/60">
              {tr(`You'll disappear from ${title} · ${slotLabel}.`, `Dejarás ${title} · ${slotLabel}.`, `Tu quitteras ${title} · ${slotLabel}.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{tr("Stay", "Me quedo", "Rester")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)]/90"
              onClick={() => { setConfirmLeave(false); onLeave(); }}
            >
              {tr("Leave", "Salir", "Quitter")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
