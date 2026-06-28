import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMyAccount, getMyProfile } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { decodeLocation, formatLocation } from "@/lib/types";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const deleteAcct = useServerFn(deleteMyAccount);
  const q = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });

  const onDelete = async () => {
    if (!confirm("Delete your account permanently? This removes your profile, likes, matches and chats. This cannot be undone.")) return;
    try {
      await deleteAcct();
      await supabase.auth.signOut();
      qc.clear();
      toast.success("Account deleted");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account");
    }
  };

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
  const locations = (p.locations ?? []).map(decodeLocation).map(formatLocation);
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
          <Info label="Level" v={p.level} />
          <Info label="Nationality" v={p.nationality} />
        </div>

        {locations.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">Plays in</div>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          </div>
        )}

        {p.languages?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">Languages</div>
            <div className="flex flex-wrap gap-2">
              {p.languages.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          </div>
        )}

        {p.bio && <p className="mt-4 text-sm text-[var(--cream)]/80">{p.bio}</p>}
      </div>

      <div className="mt-4 surface-card p-4 flex items-start gap-3 text-sm text-[var(--cream)]/70">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Your <b>preferences</b> (who you're looking for, age range, values you care about) are kept private — they're only used by the AI to find your matches, never shown on your profile. Retake the questionnaire any time to update them.
        </p>
      </div>

      <Link to="/app/onboarding"><Button variant="outline" className="w-full mt-4">Retake questionnaire</Button></Link>

      <button onClick={onDelete} className="block mx-auto mt-8 text-xs uppercase tracking-widest text-red-400/70 hover:text-red-400">
        Delete my account
      </button>
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
