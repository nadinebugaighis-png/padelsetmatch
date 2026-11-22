import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { BrandMark } from "@/components/BrandMark";
import { AuthTimeoutError, normalizeEmail, withAuthTimeout } from "@/lib/auth-input";
import { readResetLink } from "@/lib/reset-link";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
      { title: "Reset password — PadelSetMatch" },
      { name: "description", content: "Set a new password for your PadelSetMatch account." },
      { property: "og:title", content: "Reset your password \u00b7 PadelSetMatch" },
      { property: "og:description", content: "Set a new password for your PadelSetMatch account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }] }),
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "expired" | "none";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const t = useT();
  const tr = useTr();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    const settle = (s: Status) => {
      if (settled.current && s !== "ready") return;
      settled.current = true;
      setStatus(s);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) settle("ready");
    });

    const link = readResetLink(window.location.search, window.location.hash);
    let fallback: ReturnType<typeof setTimeout> | undefined;
    if (link.kind === "error") {
      settle("expired");
    } else if (link.kind === "code") {
      supabase.auth.exchangeCodeForSession(link.code).then(({ error }) => settle(error ? "expired" : "ready"));
    } else if (link.kind === "token_hash") {
      supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: "recovery" }).then(({ error }) => settle(error ? "expired" : "ready"));
    } else {
      supabase.auth.getSession().then(({ data }) => { if (data.session) settle("ready"); });
      // Give the link's sign-in a moment to finish before saying it is missing.
      fallback = setTimeout(() => settle("none"), 2500);
    }
    return () => { sub.subscription.unsubscribe(); if (fallback) clearTimeout(fallback); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await withAuthTimeout(supabase.auth.updateUser({ password }));
      if (error) throw error;
      toast.success(t("rp.updated"));
      navigate({ to: "/app" });
    } catch (err) {
      if (err instanceof AuthTimeoutError) {
        toast.error(tr("This is taking too long. Check your connection and try again.", "Está tardando demasiado. Revisa tu conexión e inténtalo de nuevo.", "Cela prend trop de temps. Vérifiez votre connexion et réessayez."));
      } else {
        toast.error(err instanceof Error ? err.message : t("rp.updateFail"));
      }
    } finally {
      setLoading(false);
    }
  };

  const sendNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeEmail(email);
    if (!clean || sending) return;
    setEmail(clean);
    setSending(true);
    try {
      const { error } = await withAuthTimeout(supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: `${window.location.origin}/reset-password`,
      }));
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err instanceof AuthTimeoutError
        ? tr("This is taking too long. Try again in a moment.", "Está tardando demasiado. Inténtalo en un momento.", "Cela prend trop de temps. Réessayez dans un instant.")
        : err instanceof Error ? err.message : t("rp.updateFail"));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="programme-page min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md programme-card p-8 sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <BrandMark size="sm" />
          <LangSwitch />
        </div>
        <h1 className="text-serif mt-6 text-3xl uppercase text-[var(--ink)] leading-[0.95]">{t("rp.title")}</h1>

        {status === "checking" && (
          <p className="mt-4 text-sm text-[var(--ink)]/82">{tr("One moment…", "Un momento…", "Un instant…")}</p>
        )}

        {status === "ready" && (
          <form onSubmit={submit} className="space-y-3 mt-6">
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t("rp.newPw")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? tr("Hide password", "Ocultar contraseña", "Masquer le mot de passe") : tr("Show password", "Mostrar contraseña", "Afficher le mot de passe")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/76 hover:text-[var(--ink)]"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[12px] text-[var(--ink)]/78">{tr("At least 8 characters.", "Mínimo 8 caracteres.", "Au moins 8 caractères.")}</p>
            <Button type="submit" disabled={loading} className="w-full">{t("rp.update")}</Button>
          </form>
        )}

        {(status === "expired" || status === "none") && (
          <div className="mt-4">
            <p className="text-sm text-[var(--ink)]/80 leading-relaxed">
              {status === "expired"
                ? tr(
                    "This link has already been used or has expired. If you asked for more than one email, only the newest link works. Send yourself a fresh one below.",
                    "Este enlace ya se ha usado o ha caducado. Si pediste más de un correo, solo funciona el más reciente. Envíate uno nuevo aquí abajo.",
                    "Ce lien a déjà été utilisé ou a expiré. Si vous avez demandé plusieurs e-mails, seul le plus récent fonctionne. Envoyez-vous-en un nouveau ci-dessous.",
                  )
                : tr(
                    "Open this page from the link in your reset email, or send yourself a new link below.",
                    "Abre esta página desde el enlace del correo, o envíate un enlace nuevo aquí abajo.",
                    "Ouvrez cette page depuis le lien de l'e-mail, ou envoyez-vous un nouveau lien ci-dessous.",
                  )}
            </p>
            {sent ? (
              <p className="mt-5 text-sm text-[var(--ink)] leading-relaxed">
                {tr(
                  "A new link is on its way. Open the newest email and tap the button once.",
                  "Te hemos enviado un enlace nuevo. Abre el correo más reciente y pulsa el botón una vez.",
                  "Un nouveau lien est en route. Ouvrez l'e-mail le plus récent et appuyez une seule fois sur le bouton.",
                )}
              </p>
            ) : (
              <form onSubmit={sendNewLink} className="mt-5 space-y-3">
                <Input
                  type="email"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  placeholder={tr("Your email", "Tu email", "Votre e-mail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmail((v) => normalizeEmail(v))}
                />
                <Button type="submit" disabled={sending} className="w-full">
                  {tr("Send a new link", "Enviar un enlace nuevo", "Envoyer un nouveau lien")}
                </Button>
              </form>
            )}
            <p className="mt-5 text-center text-sm">
              <Link to="/auth" className="text-[var(--ink)]/82 underline underline-offset-2 hover:text-[var(--ink)]">
                {tr("Back to sign in", "Volver a iniciar sesión", "Retour à la connexion")}
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
