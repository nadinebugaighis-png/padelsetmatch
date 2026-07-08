import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, adminResolveReport, adminClearProfilePhoto, adminSetSuspended } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

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

type Tab = "overview" | "reports" | "members" | "feedback";

function AdminPage() {
  const qc = useQueryClient();
  const fetchStats = useServerFn(getAdminStats);
  const resolveReport = useServerFn(adminResolveReport);
  const clearPhoto = useServerFn(adminClearProfilePhoto);
  const setSuspended = useServerFn(adminSetSuspended);
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });
  const [tab, setTab] = useState<Tab>("overview");

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

  if (q.isLoading) return <div className="p-6 text-[var(--ink)]/70">Loading…</div>;
  if (q.error || !q.data) return <div className="p-6 text-[var(--ink)]/70">Could not load admin data.</div>;

  const { counts, allSignups, recentFeedback, recentReports } = q.data;
  const incomplete = allSignups.filter((u) => !u.profile_completed);
  const completed = allSignups.filter((u) => u.profile_completed);
  const pendingReports = recentReports.filter((r) => r.status === "pending");
  const handledReports = recentReports.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-3xl mx-auto p-5 space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--grass)] font-semibold">Creator dashboard</div>
          <h1 className="text-display text-3xl tracking-tight mt-0.5">Admin</h1>
        </div>
        {pendingReports.length > 0 && (
          <button
            onClick={() => setTab("reports")}
            className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-400/30"
          >
            {pendingReports.length} pending
          </button>
        )}
      </header>

      {/* Key stats — hero row */}
      <section className="grid grid-cols-3 gap-2">
        <BigStat label="Members" value={counts.users} accent />
        <BigStat label="Matches" value={counts.matches} />
        <BigStat label="Reports" value={counts.reports} danger={counts.reports > 0} />
      </section>
      <section className="grid grid-cols-2 gap-2">
        <MiniStat label="Total signups" value={counts.signups} />
        <MiniStat label="Incomplete profiles" value={counts.incomplete} warn={counts.incomplete > 0} />
      </section>

      {/* Tab switcher */}
      <nav className="flex gap-1 p-1 rounded-full bg-[var(--ink)]/8 border border-[var(--ink)]/10">
        {([
          ["overview", "Overview"],
          ["reports", `Reports${pendingReports.length ? ` · ${pendingReports.length}` : ""}`],
          ["members", "Members"],
          ["feedback", "Feedback"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-full transition ${
              tab === id ? "bg-[var(--grass)] text-[var(--ink)]" : "text-[var(--ink)]/70 hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="space-y-4">
          <Card title="At a glance">
            <ul className="text-sm text-[var(--ink)]/85 space-y-1.5">
              <li>· <b>{completed.length}</b> completed profiles visible in the Home grid</li>
              <li>· <b>{incomplete.length}</b> users signed up but haven't finished onboarding</li>
              <li>· <b>{counts.matches}</b> matches created to date</li>
              <li>· <b>{pendingReports.length}</b> reports waiting on you</li>
              <li>· <b>{recentFeedback.length}</b> recent feedback messages</li>
            </ul>
          </Card>
          {pendingReports.length > 0 && (
            <Card title="Needs attention" tone="danger">
              <p className="text-sm text-[var(--ink)]/80 mb-2">You have {pendingReports.length} pending report{pendingReports.length === 1 ? "" : "s"} to review.</p>
              <button onClick={() => setTab("reports")} className="text-xs px-3 py-1.5 rounded-full bg-[var(--grass)] text-[var(--ink)] font-semibold">
                Review reports →
              </button>
            </Card>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <Card title={`Pending (${pendingReports.length})`} tone={pendingReports.length ? "danger" : "default"}>
            <div className="space-y-3">
              {pendingReports.length === 0 && <p className="text-sm text-[var(--ink)]/60">All clear. 🎉</p>}
              {pendingReports.map((r) => (
                <div key={r.id} className="rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    {r.reported_photo_url ? (
                      <img src={r.reported_photo_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-[var(--ink)]/10 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-snug">
                        <span className="font-semibold">{r.reporter_name ?? "someone"}</span>
                        <span className="text-[var(--ink)]/60"> reported </span>
                        <span className="font-semibold">{r.reported_name ?? "user"}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {r.category === "photo" && (
                          <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">photo</span>
                        )}
                        {r.reported_suspended && (
                          <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">suspended</span>
                        )}
                        <span className="text-[10px] text-[var(--ink)]/50">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[var(--ink)]/85 mt-2 whitespace-pre-wrap bg-[var(--ink)]/40 rounded-md px-2 py-1.5 border border-[var(--ink)]/5">{r.reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {r.reported_photo_url && (
                      <button
                        disabled={clearPhotoM.isPending}
                        onClick={() => { if (confirm(`Remove ${r.reported_name ?? "user"}'s photo?`)) clearPhotoM.mutate(r.reported_profile_id); }}
                        className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-200 hover:bg-red-500/30"
                      >Remove photo</button>
                    )}
                    {!r.reported_suspended ? (
                      <button
                        disabled={suspendM.isPending}
                        onClick={() => { if (confirm(`Suspend ${r.reported_name ?? "user"}?`)) suspendM.mutate({ profileId: r.reported_profile_id, suspend: true }); }}
                        className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                      >Suspend</button>
                    ) : (
                      <button
                        disabled={suspendM.isPending}
                        onClick={() => suspendM.mutate({ profileId: r.reported_profile_id, suspend: false })}
                        className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                      >Reinstate</button>
                    )}
                    <button
                      disabled={resolveM.isPending}
                      onClick={() => resolveM.mutate({ reportId: r.id, status: "resolved" })}
                      className="text-xs px-2.5 py-1 rounded-full bg-[var(--grass)] text-[var(--ink)] font-semibold hover:brightness-95"
                    >Resolve</button>
                    <button
                      disabled={resolveM.isPending}
                      onClick={() => resolveM.mutate({ reportId: r.id, status: "dismissed" })}
                      className="text-xs px-2.5 py-1 rounded-full bg-[var(--ink)]/10 text-[var(--ink)]/70 hover:bg-[var(--ink)]/20"
                    >Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {handledReports.length > 0 && (
            <Card title={`Handled (${handledReports.length})`}>
              <div className="space-y-1.5">
                {handledReports.map((r) => (
                  <div key={r.id} className="text-xs text-[var(--ink)]/65 rounded-md px-2 py-1.5 bg-[var(--ink)]/5">
                    <span className={`inline-block text-[9px] uppercase tracking-widest mr-1.5 px-1.5 py-0.5 rounded-full ${r.status === "resolved" ? "bg-emerald-500/20 text-emerald-300" : "bg-[var(--ink)]/10 text-[var(--ink)]/60"}`}>{r.status}</span>
                    {r.reporter_name} → {r.reported_name}: {r.reason}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-4">
          {incomplete.length > 0 && (
            <Card title={`Incomplete (${incomplete.length})`} tone="warn">
              <p className="text-xs text-[var(--ink)]/60 mb-2">Signed up but never finished onboarding — not visible in the Home grid.</p>
              <div className="space-y-1.5">
                {incomplete.map((u) => (
                  <div key={u.user_id} className="rounded-lg bg-amber-500/5 border border-amber-500/25 px-3 py-2">
                    <div className="truncate text-sm">{u.email ?? "(no email)"}</div>
                    <div className="text-xs text-[var(--ink)]/55">
                      {new Date(u.signed_up_at).toLocaleDateString()}
                      {!u.email_confirmed && <span className="ml-2 text-amber-400">email unconfirmed</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title={`Active members (${completed.length})`}>
            <div className="space-y-1.5">
              {completed.length === 0 && <p className="text-sm text-[var(--ink)]/60">No members yet.</p>}
              {completed.map((u) => (
                <div key={u.user_id} className="rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">
                        <span className="font-semibold">{u.first_name}</span>
                        {u.age ? <span className="text-[var(--ink)]/60">, {u.age}</span> : null}
                        <span className="text-[var(--ink)]/40"> · </span>
                        <span className="text-[var(--ink)]/70">{u.zone ?? "—"}</span>
                      </div>
                      <div className="text-xs text-[var(--ink)]/50 truncate">{u.email}</div>
                    </div>
                    {u.suspended && (
                      <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 shrink-0">suspended</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "feedback" && (
        <Card title={`Recent feedback (${recentFeedback.length})`}>
          <div className="space-y-2">
            {recentFeedback.length === 0 && <p className="text-sm text-[var(--ink)]/60">No feedback yet.</p>}
            {recentFeedback.map((f) => (
              <div key={f.id} className="rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 p-3">
                <div className="text-sm text-[var(--grass)]">
                  {f.rating ? `${"★".repeat(f.rating)}${"☆".repeat(Math.max(0, 5 - f.rating))}` : <span className="text-[var(--ink)]/40">no rating</span>}
                </div>
                <div className="text-sm text-[var(--ink)]/85 whitespace-pre-wrap mt-1">{f.message}</div>
                <div className="text-xs text-[var(--ink)]/50 mt-1.5">{new Date(f.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children, tone = "default" }: { title: string; children: React.ReactNode; tone?: "default" | "danger" | "warn" }) {
  const border =
    tone === "danger" ? "border-red-400/30" :
    tone === "warn" ? "border-amber-400/30" :
    "border-[var(--ink)]/10";
  return (
    <div className={`rounded-2xl bg-[var(--ink)]/5 border ${border} p-4`}>
      <h2 className="text-display text-base tracking-tight mb-3 text-[var(--ink)]">{title}</h2>
      {children}
    </div>
  );
}

function BigStat({ label, value, accent, danger }: { label: string; value: number; accent?: boolean; danger?: boolean }) {
  const bg = danger ? "bg-red-500/15 border-red-400/30" : accent ? "bg-[var(--grass)]/15 border-[var(--grass)]/40" : "bg-[var(--ink)]/5 border-[var(--ink)]/10";
  const valColor = danger ? "text-red-200" : accent ? "text-[var(--grass)]" : "text-[var(--ink)]";
  return (
    <div className={`rounded-2xl border ${bg} p-3 text-center`}>
      <div className={`text-display text-3xl tracking-tight ${valColor}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/60 mt-0.5">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border ${warn ? "border-amber-400/25 bg-amber-500/5" : "border-[var(--ink)]/10 bg-[var(--ink)]/5"} px-3 py-2 flex items-center justify-between`}>
      <span className="text-xs text-[var(--ink)]/70">{label}</span>
      <span className={`text-lg text-display ${warn ? "text-amber-300" : "text-[var(--ink)]"}`}>{value}</span>
    </div>
  );
}
