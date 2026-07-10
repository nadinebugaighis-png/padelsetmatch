import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHiddenAndBlocked, unhideProfile, unblockProfile } from "@/lib/app.functions";
import { ArrowLeft, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/hidden")({
  component: HiddenBlockedPage,
});

type Row = {
  profile_id: string;
  first_name?: string;
  photo_url?: string | null;
  zone?: string | null;
  category?: string;
  created_at: string;
};

function HiddenBlockedPage() {
  const qc = useQueryClient();
  const load = useServerFn(getHiddenAndBlocked);
  const unhide = useServerFn(unhideProfile);
  const unblock = useServerFn(unblockProfile);
  const q = useQuery({ queryKey: ["hidden-blocked"], queryFn: () => load() });

  type HideCat = "padel" | "friend" | "relationship" | "partner" | "all";
  const unhideM = useMutation({
    mutationFn: (vars: { id: string; category?: HideCat }) =>
      unhide({ data: { hiddenProfileId: vars.id, category: vars.category } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hidden-blocked"] });
      qc.invalidateQueries({ queryKey: ["discover"] });
      toast.success("Unhidden — back in your Home grid");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not unhide"),
  });
  const unblockM = useMutation({
    mutationFn: (id: string) => unblock({ data: { blockedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hidden-blocked"] });
      qc.invalidateQueries({ queryKey: ["discover"] });
      toast.success("Unblocked");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not unblock"),
  });

  const hidden = (q.data?.hidden ?? []) as Row[];
  const blocked = (q.data?.blocked ?? []) as Row[];

  const groups: Array<{ label: string; scope: HideCat; rows: Row[] }> = [
    { label: "Padel partners only", scope: "padel", rows: hidden.filter((h) => h.category === "padel") },
    { label: "Friends only", scope: "friend", rows: hidden.filter((h) => h.category === "friend") },
    { label: "Relationships only", scope: "relationship", rows: hidden.filter((h) => h.category === "relationship") },
    // Legacy "partner" category — kept so pre-existing rows still show up
    { label: "Partners only", scope: "partner", rows: hidden.filter((h) => h.category === "partner") },
    { label: "Everywhere", scope: "all", rows: hidden.filter((h) => h.category === "all") },
  ];

  return (
    <main className="px-4 py-5 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto pb-24">
      <Link to="/app/profile" className="inline-flex items-center gap-1 text-sm text-[var(--cream)]/70 hover:text-[var(--cream)]">
        <ArrowLeft className="w-4 h-4" /> Back to profile
      </Link>
      <h1 className="text-display text-3xl mt-3">Hidden &amp; blocked</h1>
      <p className="text-sm text-[var(--cream)]/70 mt-1">
        Unhide anyone to bring them back to your Home grid. Blocking is separate — you'll never see each other while blocked.
      </p>

      {q.isLoading && <p className="mt-8 text-sm text-[var(--cream)]/60">Loading…</p>}

      {/* Hidden groups */}
      <section className="mt-6 space-y-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--cream)]/60">
          <EyeOff className="w-3.5 h-3.5" /> Hidden
        </div>
        {groups.every((g) => g.rows.length === 0) && !q.isLoading && (
          <p className="text-sm text-[var(--cream)]/50">Nobody hidden.</p>
        )}
        {groups.map((g) =>
          g.rows.length === 0 ? null : (
            <div key={g.scope}>
              <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/50 mb-2">Hidden from {g.label}</div>
              <ul className="space-y-2">
                {g.rows.map((r) => (
                  <li key={`${r.profile_id}-${g.scope}`} className="surface-card flex items-center gap-3 p-3 rounded-xl">
                    {r.photo_url ? (
                      <img src={r.photo_url} alt={r.first_name ?? ""} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[var(--court)]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--cream)] truncate">{r.first_name ?? "Unknown"}</div>
                      {r.zone && <div className="text-xs text-[var(--cream)]/60 truncate">{r.zone}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => unhideM.mutate({ id: r.profile_id, category: g.scope })}
                      disabled={unhideM.isPending}
                      className="chip chip-ball text-xs"
                    >
                      Unhide
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </section>

      {/* Blocked */}
      <section className="mt-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-3">
          <Shield className="w-3.5 h-3.5" /> Blocked
        </div>
        {blocked.length === 0 ? (
          <p className="text-sm text-[var(--cream)]/50">Nobody blocked.</p>
        ) : (
          <ul className="space-y-2">
            {blocked.map((r) => (
              <li key={r.profile_id} className="surface-card flex items-center gap-3 p-3 rounded-xl">
                {r.photo_url ? (
                  <img src={r.photo_url} alt={r.first_name ?? ""} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[var(--court)]" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--cream)] truncate">{r.first_name ?? "Unknown"}</div>
                  {r.zone && <div className="text-xs text-[var(--cream)]/60 truncate">{r.zone}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Unblock ${r.first_name ?? "this person"}? They'll be able to see you again.`)) {
                      unblockM.mutate(r.profile_id);
                    }
                  }}
                  disabled={unblockM.isPending}
                  className="chip text-xs"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
