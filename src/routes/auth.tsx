import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT, LangSwitch } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — PadelMatch" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        if (data.session) {
          toast.success(t("auth.welcome"));
          navigate({ to: "/app" });
        } else {
          toast.success(t("auth.confirmEmail"));
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.fail"));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (result.error) {
      toast.error(result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md surface-card p-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("auth.back")}</Link>
          <LangSwitch />
        </div>
        <h1 className="text-display text-5xl mt-3">{mode === "signup" ? t("auth.title.signup") : t("auth.title.signin")}</h1>
        <p className="text-sm text-[var(--cream)]/70 mt-2">
          {mode === "signup" ? t("auth.sub.signup") : t("auth.sub.signin")}
        </p>

        <Button onClick={google} disabled={loading} variant="secondary" className="w-full mt-6">
          {t("auth.google")}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-[var(--cream)]/40 uppercase tracking-widest">
          <div className="flex-1 h-px bg-[var(--cream)]/15" /> {t("auth.or")} <div className="flex-1 h-px bg-[var(--cream)]/15" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required minLength={8} placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" disabled={loading} className="w-full">{mode === "signup" ? t("auth.create") : t("auth.signin")}</Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-[var(--cream)]/60 hover:text-[var(--cream)]">
            {mode === "signup" ? t("auth.toggleToSignin") : t("auth.toggleToSignup")}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={async () => {
                if (!email) { toast.error(t("auth.enterEmailFirst")); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(error.message);
                else toast.success(t("auth.resetSent"));
              }}
              className="text-[var(--cream)]/60 hover:text-[var(--ball)]"
            >
              {t("auth.forgot")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
// trigger
