import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw redirect({ to: "/auth", search: { redirect: undefined, join: undefined } });

    const { data, error } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !data) throw redirect({ to: "/app" });
  },
  component: AdminPage,
});

function AdminPage() {
  const fetchStats = useServerFn(getAdminStats);
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });

  if (q.isLoading) return <div className="p-6 text-[var(--cream)]/70">Loading…</div>;
  if (q.error || !q.data) return <div className="p-6 text-[var(--cream)]/70">Could not load admin data.</div>;

  const { counts, allSignups, recentFeedback } = q.data;
  const incomplete = allSignups.filter((u) => !u.profile_completed);
  const completed = allSignups.filter((u) => u.profile_completed);

  return (
    <div className="max-w-3xl mx-auto p-5 space-y-8">
      <header>
        <h1 className="text-display text-3xl tracking-wider">Admin</h1>
        <p className="text-sm text-[var(--cream)]/60">Creator-only dashboard.</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Signups" value={counts.signups} />
        <Stat label="Profiles" value={counts.users} />
        <Stat label="Incomplete" value={counts.incomplete} />
        <Stat label="Matches" value={counts.matches} />
        <Stat label="Reports" value={counts.reports} />
      </section>

      {incomplete.length > 0 && (
        <section>
          <h2 className="text-display text-xl tracking-wider mb-3">Signed up but no profile ({incomplete.length})</h2>
          <p className="text-xs text-[var(--cream)]/50 mb-2">Registered an account but didn't finish onboarding — they won't appear in the Grid.</p>
          <div className="space-y-2">
            {incomplete.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between border border-amber-500/30 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm">{u.email ?? "(no email)"}</div>
                  <div className="text-xs text-[var(--cream)]/50">
                    signed up {new Date(u.signed_up_at).toLocaleString()}
                    {!u.email_confirmed && <span className="ml-2 text-amber-400">email not confirmed</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-display text-xl tracking-wider mb-3">All members ({completed.length})</h2>
        <div className="space-y-2">
          {completed.length === 0 && <p className="text-sm text-[var(--cream)]/60">No users yet.</p>}
          {completed.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between border border-[var(--cream)]/10 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <div className="truncate">
                  {u.first_name}{u.age ? `, ${u.age}` : ""} · <span className="text-[var(--cream)]/60">{u.zone ?? "—"}</span>
                  {u.suspended && <span className="ml-2 text-xs text-red-400">suspended</span>}
                </div>
                <div className="text-xs text-[var(--cream)]/50 truncate">
                  {u.email} · joined {new Date(u.signed_up_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-display text-xl tracking-wider mb-3">Recent feedback</h2>
        <div className="space-y-2">
          {recentFeedback.length === 0 && <p className="text-sm text-[var(--cream)]/60">No feedback yet.</p>}
          {recentFeedback.map((f) => (
            <div key={f.id} className="border border-[var(--cream)]/10 rounded-lg px-3 py-2">
              <div className="text-sm">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</div>
              <div className="text-sm text-[var(--cream)]/80 whitespace-pre-wrap">{f.message}</div>
              <div className="text-xs text-[var(--cream)]/50 mt-1">{new Date(f.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--cream)]/10 rounded-lg px-3 py-3">
      <div className="text-2xl text-display">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60">{label}</div>
    </div>
  );
}
