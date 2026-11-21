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
  const slotLabel = (s: PlaySlot) =>
    s === "morning" ? tr("Morning", "Mañana", "Matin") : s === "afternoon" ? tr("Afternoon", "Tarde", "Après-midi") : tr("Evening", "Noche", "Soir");

  const pickedGroup = groups.find((g) => g.date === day && g.slot === slot);
  const pickedIn = pickedGroup?.imIn ?? false;
  const pickedOpen = slotStillOpen(slot, day, now);
  // Already free at this time in another area: one place per time, so offer to remove it there.
  const elsewhereMine = !pickedIn && area
    ? q.data?.myCheckins.find((c) => c.date === day && c.slot === slot && !c.areaKeys.includes(area.key))
    : undefined;

  return (
    <section aria-labelledby="who-can-play" className="space-y-5">
      {/* Area switcher */}
      {hasAreas && q.data && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 pl-3 pr-2.5 -mt-1 rounded-full border border-[var(--ink)]/15 bg-white text-[13px] font-semibold text-[var(--ink)] hover:border-[var(--ink)]/35 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-[var(--pitch)]" />
              {area?.label ?? tr("Choose area", "Elige zona", "Choisir une zone")}
              <ChevronDown className="w-3.5 h-3.5 text-[var(--ink)]/50" />
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
          <>
            <div className="mt-3.5 flex justify-center">
              <button
                type="button"
                disabled={busy || !pickedOpen || !area}
                onClick={() => (pickedIn || elsewhereMine ? removeMut.mutate({ date: day, slot }) : addMut.mutate({ date: day, slot }))}
                className={`max-w-full truncate h-9 px-5 rounded-full text-[13px] font-semibold transition disabled:opacity-50 ${pickedIn || elsewhereMine ? "bg-white text-[var(--ink)]/70 border border-[var(--ink)]/20 hover:border-[var(--ink)]/40" : "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)]/90"}`}
              >
                {pickedIn
                  ? tr("You're available · Remove", "Estás disponible · Quitarme", "Tu es disponible · Me retirer")
                  : elsewhereMine
                  ? tr(`Available in ${elsewhereMine.areaLabel ?? "another area"} · Remove`, `Disponible en ${elsewhereMine.areaLabel ?? "otra zona"} · Quitar`, `Disponible à ${elsewhereMine.areaLabel ?? "une autre zone"} · Retirer`)
                  : tr("I can play", "Puedo jugar", "Je peux jouer")}
              </button>
            </div>
            {area && !pickedIn && !elsewhereMine && (
              <p className="mt-1.5 text-center text-[11.5px] text-[var(--ink)]/50">
                {tr(`Shared with players in ${area.label}`, `Visible para jugadores de ${area.label}`, `Visible par les joueurs de ${area.label}`)}
              </p>
            )}
          </>
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
          <p id="who-can-play" className="mb-2.5 text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]/55">
            {tr("Free this week", "Libres esta semana", "Libres cette semaine")}
          </p>
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
  const { label } = useI18n();
  const count = group.players.length;
  const [confirmLeave, setConfirmLeave] = useState(false);

  return (
    <li className={`rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${focused ? "ring-2 ring-[var(--grass)]/50" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 text-serif text-lg text-[var(--ink)] leading-tight capitalize truncate">
          {title} <span className="text-[var(--ink)]/45">· {slotLabel}</span>
        </div>
        <div className="shrink-0 text-[12px] font-semibold text-[var(--pitch)]">
          {count === 1 ? tr("1 available", "1 disponible", "1 dispo") : tr(`${count} available`, `${count} disponibles`, `${count} dispos`)}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3.5 gap-y-2">
        {group.players.map((p) => (
          <li key={p.profile_id} className="inline-flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full overflow-hidden bg-[var(--ink)]/10 shrink-0">
              <PlayerPhoto src={photoSrc(p.photo_url, 240)} seed={p.profile_id} alt={p.first_name ?? ""} className="w-full h-full object-cover" loading="lazy" />
            </span>
            {p.mine ? (
              <button
                type="button"
                onClick={() => setConfirmLeave(true)}
                className="text-[13px] text-[var(--ink)] whitespace-nowrap underline decoration-[var(--ink)]/25 decoration-1 underline-offset-4 hover:decoration-[var(--ink)]/60"
              >
                {tr("You", "Tú", "Toi")}
                {p.level ? <span className="text-[var(--ink)]/45 capitalize"> · {label(p.level)}</span> : null}
              </button>
            ) : (
              <span className="text-[13px] text-[var(--ink)] whitespace-nowrap">
                {p.first_name ?? tr("Player", "Jugador", "Joueur")}
                {p.level ? <span className="text-[var(--ink)]/45 capitalize"> · {label(p.level)}</span> : null}
              </span>
            )}
          </li>
        ))}
      </ul>

      {!group.imIn && (
        <div className="mt-3.5">
          <button type="button" disabled={busy} onClick={onJoin} className="inline-flex items-center h-9 px-5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px] font-semibold hover:bg-[var(--ink)]/90 disabled:opacity-50">
            {tr("Me too", "Yo también", "Moi aussi")}
          </button>
        </div>
      )}
      {group.imIn && (
        <div className="mt-3.5 flex items-center gap-2">
          {count >= 2 && (
            <Link
              to="/app/events/new"
              search={{ day: group.date, slot: group.slot }}
              className="inline-flex items-center h-9 px-4 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[13px] font-semibold"
            >
              {tr("Start a match", "Crear partido", "Lancer un match")}
            </Link>
          )}
          <button type="button" disabled={busy} onClick={onLeave} className="ml-auto text-[12px] font-medium text-[var(--ink)]/45 hover:text-[var(--ink)] disabled:opacity-50">
            {tr("Leave", "Salir", "Quitter")}
          </button>
        </div>
      )}

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
