import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, adminResolveReport, adminClearProfilePhoto, adminSetSuspended } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({
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
  const qc = useQueryClient();
  const fetchStats = useServerFn(getAdminStats);
  const resolveReport = useServerFn(adminResolveReport);
  const clearPhoto = useServerFn(adminClearProfilePhoto);
  const setSuspended = useServerFn(adminSetSuspended);
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-stats"] });
  const resolveM = useMutation({
    mutationFn: (vars: { reportId: string; status: "resolved" | "dismissed" }) =>
      resolveReport({ data: vars }),
    onSuccess: () => { toast.success("Report updated"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const clearPhotoM = useMutation({
    mutationFn: (profileId: string) => clearPhoto({ data: { profileId } }),
    onSuccess: () => { toast.success("Photo removed"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const suspendM = useMutation({
    mutationFn: (vars: { profileId: string; suspend: boolean }) => setSuspended({ data: vars }),
    onSuccess: (_, v) => { toast.success(v.suspend ? "User suspended" : "User reinstated"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (q.isLoading) return <div className="p-6 text-[var(--court-deep)]/70">Loading…</div>;
  if (q.error || !q.data) return <div className="p-6 text-[var(--court-deep)]/70">Could not load admin data.</div>;

  const { counts, allSignups, recentFeedback, recentReports } = q.data;
  const incomplete = allSignups.filter((u) => !u.profile_completed);
  const completed = allSignups.filter((u) => u.profile_completed);
  const pendingReports = recentReports.filter((r) => r.status === "pending");
  const handledReports = recentReports.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-3xl mx-auto p-5 space-y-8">
      <header>
        <h1 className="text-display text-3xl tracking-wider">Admin</h1>
        <p className="text-sm text-[var(--court-deep)]/60">Creator-only dashboard.</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Signups" value={counts.signups} />
        <Stat label="Profiles" value={counts.users} />
        <Stat label="Incomplete" value={counts.incomplete} />
        <Stat label="Matches" value={counts.matches} />
        <Stat label="Pending reports" value={counts.reports} />
      </section>

      <section>
        <h2 className="text-display text-xl tracking-wider mb-3">Pending reports ({pendingReports.length})</h2>
        <div className="space-y-3">
          {pendingReports.length === 0 && <p className="text-sm text-[var(--court-deep)]/60">No pending reports. 🎉</p>}
          {pendingReports.map((r) => (
            <div key={r.id} className="border border-[var(--court-deep)]/15 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-3">
                {r.reported_photo_url ? (
                  <img src={r.reported_photo_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[var(--court-deep)]/5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-semibold">{r.reporter_name ?? "someone"}</span>
                    <span className="text-[var(--court-deep)]/60"> reported </span>
                    <span className="font-semibold">{r.reported_name ?? "user"}</span>
                    {r.category === "photo" && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-500/20 text-destructive">photo</span>
                    )}
                    {r.reported_suspended && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-destructive">suspended</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--court-deep)]/50">{new Date(r.created_at).toLocaleString()}</div>
                  <p className="text-sm text-[var(--court-deep)]/80 mt-1 whitespace-pre-wrap">{r.reason}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {r.reported_photo_url && (
                  <button
                    disabled={clearPhotoM.isPending}
                    onClick={() => { if (confirm(`Remove ${r.reported_name ?? "user"}'s photo?`)) clearPhotoM.mutate(r.reported_profile_id); }}
                    className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-destructive hover:bg-red-500/30"
                  >Remove photo</button>
                )}
                {!r.reported_suspended ? (
                  <button
                    disabled={suspendM.isPending}
                    onClick={() => { if (confirm(`Suspend ${r.reported_name ?? "user"}?`)) suspendM.mutate({ profileId: r.reported_profile_id, suspend: true }); }}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--clay)]/20 text-[var(--clay)] hover:bg-[var(--clay)]/30"
                  >Suspend user</button>
                ) : (
                  <button
                    disabled={suspendM.isPending}
                    onClick={() => suspendM.mutate({ profileId: r.reported_profile_id, suspend: false })}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--court)]/20 text-[var(--court)] hover:bg-[var(--court)]/30"
                  >Reinstate</button>
                )}
                <button
                  disabled={resolveM.isPending}
                  onClick={() => resolveM.mutate({ reportId: r.id, status: "resolved" })}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--court)]/20 text-[var(--court)] hover:bg-[var(--court)]/30"
                >Mark resolved</button>
                <button
                  disabled={resolveM.isPending}
                  onClick={() => resolveM.mutate({ reportId: r.id, status: "dismissed" })}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--court-deep)]/5 text-[var(--court-deep)]/70 hover:bg-[var(--court-deep)]/10"
                >Dismiss</button>
              </div>
            </div>
          ))}
        </div>
        {handledReports.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-[var(--court-deep)]/60 cursor-pointer">Handled ({handledReports.length})</summary>
            <div className="space-y-2 mt-2">
              {handledReports.map((r) => (
                <div key={r.id} className="text-xs text-[var(--court-deep)]/60 border border-[var(--court-deep)]/10 rounded px-2 py-1.5">
                  [{r.status}] {r.reporter_name} → {r.reported_name}: {r.reason}
                </div>
              ))}
            </div>
          </details>
        )}
      </section>


      {incomplete.length > 0 && (
        <section>
          <h2 className="text-display text-xl tracking-wider mb-3">Signed up but no profile ({incomplete.length})</h2>
          <p className="text-xs text-[var(--court-deep)]/50 mb-2">Registered an account but didn't finish onboarding — they won't appear in the Grid.</p>
          <div className="space-y-2">
            {incomplete.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between border border-amber-500/30 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm">{u.email ?? "(no email)"}</div>
                  <div className="text-xs text-[var(--court-deep)]/50">
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
          {completed.length === 0 && <p className="text-sm text-[var(--court-deep)]/60">No users yet.</p>}
          {completed.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between border border-[var(--court-deep)]/10 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <div className="truncate">
                  {u.first_name}{u.age ? `, ${u.age}` : ""} · <span className="text-[var(--court-deep)]/60">{u.zone ?? "—"}</span>
                  {u.suspended && <span className="ml-2 text-xs text-destructive">suspended</span>}
                </div>
                <div className="text-xs text-[var(--court-deep)]/50 truncate">
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
          {recentFeedback.length === 0 && <p className="text-sm text-[var(--court-deep)]/60">No feedback yet.</p>}
          {recentFeedback.map((f) => (
            <div key={f.id} className="border border-[var(--court-deep)]/10 rounded-lg px-3 py-2">
              <div className="text-sm">{f.rating ? `${"★".repeat(f.rating)}${"☆".repeat(Math.max(0, 5 - f.rating))}` : "no rating"}</div>
              <div className="text-sm text-[var(--court-deep)]/80 whitespace-pre-wrap">{f.message}</div>
              <div className="text-xs text-[var(--court-deep)]/50 mt-1">{new Date(f.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--court-deep)]/10 rounded-lg px-3 py-3">
      <div className="text-2xl text-display">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-[var(--court-deep)]/60">{label}</div>
    </div>
  );
}
