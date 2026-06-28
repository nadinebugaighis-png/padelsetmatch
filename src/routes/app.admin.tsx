import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, getIsAdmin } from "@/lib/app.functions";

export const Route = createFileRoute("/app/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const isAdmin = await getIsAdmin();
      if (!isAdmin) throw redirect({ to: "/app" });
    } catch {
      throw redirect({ to: "/app" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const fetchStats = useServerFn(getAdminStats);
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });

  if (q.isLoading) return <div className="p-6 text-[var(--cream)]/70">Loading…</div>;
  if (q.error || !q.data) return <div className="p-6 text-[var(--cream)]/70">Could not load admin data.</div>;

  const { counts, recentProfiles, recentFeedback } = q.data;

  return (
    <div className="max-w-3xl mx-auto p-5 space-y-8">
      <header>
        <h1 className="text-display text-3xl tracking-wider">Admin</h1>
        <p className="text-sm text-[var(--cream)]/60">Creator-only dashboard.</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Users" value={counts.users} />
        <Stat label="Matches" value={counts.matches} />
        <Stat label="Likes" value={counts.likes} />
        <Stat label="Feedback" value={counts.feedback} />
        <Stat label="Reports" value={counts.reports} />
      </section>

      <section>
        <h2 className="text-display text-xl tracking-wider mb-3">New signups</h2>
        <div className="space-y-2">
          {recentProfiles.length === 0 && <p className="text-sm text-[var(--cream)]/60">No users yet.</p>}
          {recentProfiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-[var(--cream)]/10 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <div className="truncate">
                  {p.first_name}, {p.age} · <span className="text-[var(--cream)]/60">{p.zone}</span>
                  {p.suspended_at && <span className="ml-2 text-xs text-red-400">suspended</span>}
                </div>
                <div className="text-xs text-[var(--cream)]/50">{new Date(p.created_at).toLocaleString()}</div>
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
