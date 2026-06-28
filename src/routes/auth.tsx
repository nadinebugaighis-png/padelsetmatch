import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Padel Match Madrid" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
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
          toast.success("Welcome! You're in.");
          navigate({ to: "/app" });
        } else {
          toast.success("Account created — check your email to confirm.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
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
        <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← Back</Link>
        <h1 className="text-display text-5xl mt-3">{mode === "signup" ? "Join Madrid" : "Welcome back"}</h1>
        <p className="text-sm text-[var(--cream)]/70 mt-2">
          {mode === "signup" ? "We only ask what helps the match. Your photo is for matches, not the world." : "Sign back in to your padel feed."}
        </p>

        <Button onClick={google} disabled={loading} variant="secondary" className="w-full mt-6">
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-[var(--cream)]/40 uppercase tracking-widest">
          <div className="flex-1 h-px bg-[var(--cream)]/15" /> or <div className="flex-1 h-px bg-[var(--cream)]/15" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required minLength={6} placeholder="password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" disabled={loading} className="w-full">{mode === "signup" ? "Create account" : "Sign in"}</Button>
        </form>

        <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="mt-4 text-sm text-[var(--cream)]/60 hover:text-[var(--cream)]">
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </main>
  );
}
// trigger
