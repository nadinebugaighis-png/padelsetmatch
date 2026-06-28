import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMyAccount, getMyProfile, submitFeedback } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decodeLocation, formatLocation } from "@/lib/types";
import { Lock, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
  const getProfile = useServerFn(getMyProfile);
  const deleteAcct = useServerFn(deleteMyAccount);
  const q = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });

  const onDelete = async () => {
    if (!confirm(t("prof.deleteConfirm"))) return;
    try {
      await deleteAcct();
      await supabase.auth.signOut();
      qc.clear();
      toast.success(t("prof.deleted"));
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("prof.deleteFail"));
    }
  };

  if (q.isLoading) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">{t("prof.loading")}</div>;
  const p = q.data;
  if (!p) {
    return (
      <main className="px-4 py-10 max-w-md mx-auto text-center">
        <p className="text-[var(--cream)]/70">{t("prof.noProfile")}</p>
        <Link to="/app/onboarding" className="mt-4 inline-block underline">{t("prof.createLink")}</Link>
      </main>
    );
  }
  const locations = (p.locations ?? []).map(decodeLocation).map(formatLocation);
  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">{t("prof.hi", { name: p.first_name })}</h1>
      <div className="mt-4 surface-card p-5">
        {p.photo_url && (
          <div className="aspect-[3/4] rounded-xl overflow-hidden mb-4">
            <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label={t("prof.age")} v={String(p.age)} />
          <Info label={t("prof.level")} v={label(p.level)} />
          <Info label={t("prof.nationality")} v={p.nationality} />
        </div>

        {locations.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">{t("prof.playsIn")}</div>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          </div>
        )}

        {p.languages?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-1">{t("prof.languages")}</div>
            <div className="flex flex-wrap gap-2">
              {p.languages.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          </div>
        )}

        {p.bio && <p className="mt-4 text-sm text-[var(--cream)]/80">{p.bio}</p>}
      </div>

      <div className="mt-4 surface-card p-4 flex items-start gap-3 text-sm text-[var(--cream)]/70">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        <p>{t("prof.privacy")}</p>
      </div>

      <Link to="/app/onboarding"><Button variant="outline" className="w-full mt-4">{t("prof.retake")}</Button></Link>

      <button onClick={onDelete} className="block mx-auto mt-8 text-xs uppercase tracking-widest text-red-400/70 hover:text-red-400">
        {t("prof.delete")}
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
