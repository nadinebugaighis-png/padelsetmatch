import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const getProfile = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });

  if (q.isLoading) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">Loading…</div>;
  const p = q.data;
  if (!p) {
    return (
      <main className="px-4 py-10 max-w-md mx-auto text-center">
        <p className="text-[var(--cream)]/70">You don't have a profile yet.</p>
        <Link to="/app/onboarding" className="mt-4 inline-block underline">Create your profile →</Link>
      </main>
    );
  }
  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">Hi, {p.first_name}</h1>
      <div className="mt-4 surface-card p-5">
        {p.photo_url && (
          <div className="aspect-[3/4] rounded-xl overflow-hidden mb-4">
            <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label="Age" v={String(p.age)} />
          <Info label="Looking for" v={p.looking_for} />
          <Info label="Zone" v={p.zone} />
          <Info label="Level" v={p.level} />
          <Info label="Nationality" v={p.nationality} />
          <Info label="Interested in" v={p.interested_in.join(", ")} />
          <Info label="Age range" v={`${p.age_min}–${p.age_max}`} />
        </div>
        {p.priorities.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">Top values</div>
            <div className="flex flex-wrap gap-2">
              {p.priorities.map((t, i) => <span key={t} className="chip"><b>{i + 1}.</b>&nbsp;{t}</span>)}
            </div>
          </div>
        )}
        {p.bio && <p className="mt-4 text-sm text-[var(--cream)]/80">{p.bio}</p>}
      </div>
      <Link to="/app/onboarding"><Button variant="outline" className="w-full mt-4">Edit profile</Button></Link>
    </main>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60">{label}</div>
      <div>{v}</div>
    </div>
  );
}
