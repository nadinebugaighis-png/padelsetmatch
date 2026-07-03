import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PADEL_LEVELS } from "@/lib/types";
import { getMyProfile } from "@/lib/app.functions";
import { joinMatchEvent, saveLiteProfile } from "@/lib/match-events.functions";

export const Route = createFileRoute("/app/join-setup")({
  head: () => ({ meta: [{ title: "Quick setup — PadelMatch" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    join: typeof s.join === "string" ? s.join : undefined,
  }),
  component: JoinSetupPage,
});

function JoinSetupPage() {
  const { join } = Route.useSearch();
  const navigate = useNavigate();
  const getMe = useServerFn(getMyProfile);
  const saveLite = useServerFn(saveLiteProfile);
  const joinFn = useServerFn(joinMatchEvent);

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
      toast.error("Add your name and padel level");
      return;
    }
    setBusy(true);
    try {
      await saveLite({ data: { first_name: firstName.trim(), level, city: city.trim() || null } });
      if (join) {
        try {
          await joinFn({ data: { id: join } });
          toast.success("You're in! See you on court 🎾");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not join");
        }
        navigate({ to: "/app/events/$eventId", params: { eventId: join } });
      } else {
        navigate({ to: "/app" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--court-deep)]">
      <div className="max-w-md mx-auto px-5 py-8">
        <div className="text-[10px] uppercase tracking-widest text-[var(--ball)]">Quick setup</div>
        <h1 className="text-3xl text-[var(--cream)] font-medium mt-1">Just two things and you're in.</h1>
        <p className="text-sm text-[var(--cream)]/70 mt-2">
          You can complete your full profile later — this is enough to join a match.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">First name</label>
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
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">Padel level</label>
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
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">City (optional)</label>
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
            {busy ? "Saving…" : join ? "Save & join the match" : "Save & continue"}
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/app/onboarding" })}
            className="w-full py-2 text-xs uppercase tracking-widest text-[var(--cream)]/60"
          >
            Complete full profile instead
          </button>
        </form>
      </div>
    </main>
  );
}
