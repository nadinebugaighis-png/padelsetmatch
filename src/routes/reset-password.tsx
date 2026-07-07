import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — PadelMatch" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const t = useT();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("rp.updated"));
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("rp.updateFail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--cream)]">
      <div className="w-full max-w-md surface-card p-8">
        <h1 className="text-display text-4xl text-[var(--court-deep)]">{t("rp.title")}</h1>
        {!ready ? (
          <p className="text-sm text-[var(--court)]/70 mt-3">
            {t("rp.openFromEmail")} <a href="/auth" className="underline text-[var(--clay)]">{t("rp.signin")}</a>.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-5">
            <Input type="password" required minLength={8} placeholder={t("rp.newPw")} value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" disabled={loading} className="w-full bg-[var(--clay)] text-white hover:bg-[var(--clay-deep)]">{t("rp.update")}</Button>
          </form>
        )}
      </div>
    </main>
  );
}
