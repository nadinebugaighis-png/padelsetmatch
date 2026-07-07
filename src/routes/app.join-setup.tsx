import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PADEL_LEVELS } from "@/lib/types";
import { getMyProfile } from "@/lib/app.functions";
import { claimMatchInviteByToken, joinMatchEvent, saveLiteProfile } from "@/lib/match-events.functions";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/join-setup")({
  head: () => ({ meta: [{ title: "Quick setup — PadelMatch" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    join: typeof s.join === "string" ? s.join : undefined,
    i: typeof s.i === "string" ? s.i : undefined,
  }),
  component: JoinSetupPage,
});

function JoinSetupPage() {
  const { join, i: inviteToken } = Route.useSearch();
  const navigate = useNavigate();
  const tr = useTr();
  const getMe = useServerFn(getMyProfile);
  const saveLite = useServerFn(saveLiteProfile);
  const joinFn = useServerFn(joinMatchEvent);
  const claimInvite = useServerFn(claimMatchInviteByToken);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe() });

  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState<(typeof PADEL_LEVELS)[number] | "">("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const me = meQ.data as { first_name?: string | null; level?: string | null; locations?: string[] | null } | null;
    if (me?.first_name) setFirstName(me.first_name);
    if (me?.level) setLevel(me.level as (typeof PADEL_LEVELS)[number]);
    if (me?.locations?.[0]) setCity(me.locations[0]);
  }, [meQ.data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !level) {
      toast.error(tr("Add your name and padel level", "Añade tu nombre y nivel de pádel", "Ajoute ton prénom et ton niveau de padel"));
      return;
    }
    setBusy(true);
    try {
      await saveLite({ data: { first_name: firstName.trim(), level, city: city.trim() || null } });
      if (join) {
        try {
          if (inviteToken) {
            try { await claimInvite({ data: { token: inviteToken } }); } catch { /* ignore */ }
          }
          await joinFn({ data: { id: join } });
          toast.success(tr("You're in! See you on court 🎾", "¡Estás dentro! Nos vemos en la pista 🎾", "Tu es inscrit·e ! À bientôt sur la pista 🎾"));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.startsWith("INVITE_LOCK:")) {
            const opensAt = new Date(msg.slice("INVITE_LOCK:".length)).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
            toast.error(tr(`Reserved for invited players until ${opensAt}. Come back then!`, `Reservado para invitados hasta ${opensAt}. ¡Vuelve entonces!`));
          } else {
            toast.error(msg || tr("Could not join", "No te pudimos unir", "Impossible de rejoindre"));
          }
        }
        navigate({ to: "/app/events/$eventId", params: { eventId: join } });
      } else {
        navigate({ to: "/app" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not save", "No se pudo guardar", "Impossible d'enregistrer"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--court-deep)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 py-8">
        <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]">{tr("Quick setup", "Configuración rápida", "Configuration rapide")}</div>
        <h1 className="text-3xl text-[var(--cream)] font-medium mt-1">{tr("Just two things and you're in.", "Solo dos cosas y estás dentro.", "Deux choses et tu es dedans.")}</h1>
        <p className="text-sm text-[var(--cream)]/70 mt-2">
          {tr("You can complete your full profile later — this is enough to join a match.", "Puedes completar tu perfil después — con esto ya puedes unirte a un partido.", "Tu peux compléter ton profil entier plus tard — c'est suffisant pour rejoindre un match.")}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("First name", "Nombre", "Prénom")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              maxLength={40}
              required
              className="w-full mt-1 bg-black/30 border border-[var(--cream)]/20 rounded-xl px-4 py-3 text-[var(--cream)] placeholder:text-[var(--cream)]/40"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Padel level", "Nivel de pádel", "Niveau de padel")}</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PADEL_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-2 rounded-full border text-xs uppercase tracking-widest ${
                    level === lvl
                      ? "bg-[var(--ball)] text-[var(--court-deep)] border-[var(--ball)]"
                      : "border-[var(--cream)]/20 text-[var(--cream)]/80"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("City (optional)", "Ciudad (opcional)", "Ville (optionnel)")}</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Madrid"
              maxLength={120}
              className="w-full mt-1 bg-black/30 border border-[var(--cream)]/20 rounded-xl px-4 py-3 text-[var(--cream)] placeholder:text-[var(--cream)]/40"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-sm uppercase tracking-widest font-semibold disabled:opacity-50"
          >
            {busy ? tr("Saving…", "Guardando…", "Enregistrement…") : join ? tr("Save & join the match", "Guardar y unirme al partido", "Enregistrer et rejoindre le match") : tr("Save & continue", "Guardar y continuar", "Enregistrer et continuer")}
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/app/onboarding" })}
            className="w-full py-2 text-xs uppercase tracking-widest text-[var(--cream)]/60"
          >
            {tr("Complete full profile instead", "Completar el perfil completo", "Compléter le profil entier")}
          </button>
        </form>
      </div>
    </main>
  );
}
