import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { BrandMark } from "@/components/BrandMark";
import { getEmailAuthProviders } from "@/lib/auth-check.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — PadelMatch" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    join: typeof s.join === "string" ? s.join : undefined,
    i: typeof s.i === "string" ? s.i : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, join, i } = Route.useSearch();
  const t = useT();
  const tr = useTr();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const afterAuthTarget = (): { to: string; search?: Record<string, string> } => {
    if (join) return { to: "/app/join-setup", search: i ? { join, i } : { join } };
    if (redirect) return { to: redirect };
    return { to: "/app" };
  };
  const signupTarget = (): { to: string; search?: Record<string, string> } => {
    if (join) return { to: "/app/join-setup", search: i ? { join, i } : { join } };
    if (redirect) return { to: redirect };
    return { to: "/app/onboarding" };
  };
  const oauthRedirectUri = () => {
    const base = window.location.origin;
    if (join) {
      const q = new URLSearchParams({ join });
      if (i) q.set("i", i);
      return `${base}/app/join-setup?${q.toString()}`;
    }
    if (redirect) return `${base}${redirect}`;
    return `${base}/app`;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(afterAuthTarget() as never);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: oauthRedirectUri() },
        });
        if (error) throw error;
        if (data.session) {
          let ordinal: number | null = null;
          try {
            const { data: n } = await supabase.rpc("get_signup_ordinal", {
              _user_id: data.session.user.id,
            });
            if (typeof n === "number" && n > 0) ordinal = n;
          } catch { /* non-blocking */ }
          toast.success(
            ordinal
              ? tr(
                  `Welcome, player #${ordinal}! 🎾`,
                  `¡Bienvenido, jugador #${ordinal}! 🎾`,
                  `Bienvenue, joueur n°${ordinal} ! 🎾`,
                )
              : tr(
                  "Welcome aboard! 🎾",
                  "¡Bienvenido a la pista! 🎾",
                  "Bienvenue sur le court ! 🎾",
                ),
            {
              description: tr(
                "Hope you love it — share with a padel friend or two, it plays better with more of us on the court.",
                "Esperamos que te encante — compártela con uno o dos amigos del pádel, funciona mejor entre más seamos en la pista.",
                "On espère que ça te plaira — partage-la avec un ou deux copains de padel, c'est mieux quand on est plus nombreux sur le court.",
              ),
              duration: 7000,
            },
          );
          navigate(signupTarget() as never);



        } else {
          toast.success(t("auth.confirmEmail"));
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(afterAuthTarget() as never);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const code = (err as { code?: string } | null)?.code ?? "";
      const status = (err as { status?: number } | null)?.status;
      const isRateLimit =
        status === 429 ||
        /rate limit|too many|for security purposes/i.test(raw);
      const isInvalidCreds = /invalid login credentials/i.test(raw);
      const isWeakPassword =
        code === "weak_password" || /weak.?password|pwned|password.*(short|weak|known)/i.test(raw);
      const isShortPassword = /at least|minimum|too short|6 characters|8 characters/i.test(raw);
      const isBadEmail = /invalid.*email|email.*invalid|email address.*invalid/i.test(raw);
      const isAlreadyRegistered =
        code === "user_already_exists" ||
        /already (registered|exists|been registered)|user.*exists/i.test(raw);

      if (isRateLimit) {
        toast.error(
          tr(
            "Too many attempts. Please wait a moment and try again.",
            "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
            "Trop de tentatives. Patiente un instant puis réessaie.",
          ),
        );
      } else if (isWeakPassword) {
        toast.error(
          tr(
            "This password is too common.",
            "Esta contraseña es demasiado común.",
            "Ce mot de passe est trop courant.",
          ),
          {
            description: tr(
              "Please choose a stronger password — mix letters, numbers and a symbol.",
              "Elige una contraseña más segura — combina letras, números y un símbolo.",
              "Choisis un mot de passe plus fort — mélange lettres, chiffres et un symbole.",
            ),
            duration: 8000,
          },
        );
      } else if (isShortPassword) {
        toast.error(
          tr(
            "Password is too short.",
            "La contraseña es demasiado corta.",
            "Le mot de passe est trop court.",
          ),
          {
            description: tr(
              "Use at least 8 characters.",
              "Usa al menos 8 caracteres.",
              "Utilise au moins 8 caractères.",
            ),
            duration: 7000,
          },
        );
      } else if (isBadEmail) {
        toast.error(
          tr(
            "That email doesn't look right.",
            "Ese correo no parece válido.",
            "Cet e-mail ne semble pas valide.",
          ),
          {
            description: tr(
              "Check for typos and try again.",
              "Revisa si hay errores e inténtalo de nuevo.",
              "Vérifie s'il y a une faute et réessaie.",
            ),
            duration: 7000,
          },
        );
      } else if (isAlreadyRegistered && mode === "signup") {
        toast.error(
          tr(
            "This email is already registered.",
            "Este correo ya está registrado.",
            "Cet e-mail est déjà utilisé.",
          ),
          {
            description: tr(
              'Tap "Already have an account? Sign in" below.',
              'Pulsa "¿Ya tienes cuenta? Inicia sesión" abajo.',
              'Appuie sur « Déjà un compte ? Se connecter » ci-dessous.',
            ),
            duration: 8000,
          },
        );
        setMode("signin");
      } else if (isInvalidCreds && mode === "signin") {
        // Distinguish "no such account" from "wrong password" / OAuth-only.
        let handled = false;
        try {
          const info = await getEmailAuthProviders({ data: { email } });
          if (!info?.exists) {
            toast.error(
              tr(
                "No account found with this email.",
                "No hay ninguna cuenta con este correo.",
                "Aucun compte trouvé avec cet e-mail.",
              ),
              {
                description: tr(
                  'Tap "New here? Create an account" below to sign up.',
                  'Pulsa "¿Nuevo aquí? Crea una cuenta" abajo para registrarte.',
                  'Appuie sur « Nouveau ici ? Créer un compte » ci-dessous pour t\'inscrire.',
                ),
                duration: 8000,
              },
            );
            handled = true;
          } else {
            const providers = info.providers ?? [];
            const hasEmail = providers.includes("email");
            const oauthProviders = providers.filter((p) => p !== "email");
            if (!hasEmail && oauthProviders.length > 0) {
              const label = oauthProviders
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                .join(" / ");
              toast.error(
                tr(
                  `This account uses ${label}.`,
                  `Esta cuenta usa ${label}.`,
                  `Ce compte utilise ${label}.`,
                ),
                {
                  description: tr(
                    `Tap "Continue with ${label}" above to sign in — no password needed.`,
                    `Pulsa "Continuar con ${label}" arriba para iniciar sesión — no necesitas contraseña.`,
                    `Appuie sur « Continuer avec ${label} » ci-dessus pour te connecter — aucun mot de passe requis.`,
                  ),
                  duration: 9000,
                },
              );
              handled = true;
            }
          }
        } catch { /* fall through */ }
        if (!handled) {
          toast.error(
            tr(
              "Wrong email or password.",
              "Correo o contraseña incorrectos.",
              "E-mail ou mot de passe incorrect.",
            ),
            {
              description: tr(
                "Double-check your password, or tap \"Forgot password?\" below.",
                "Revisa tu contraseña o pulsa \"¿Olvidaste la contraseña?\" abajo.",
                "Vérifie ton mot de passe ou appuie sur « Mot de passe oublié ? » ci-dessous.",
              ),
              duration: 8000,
            },
          );
        }
      } else {
        // Generic fallback — never silently swallow an auth error.
        toast.error(
          tr(
            "Something went wrong.",
            "Algo salió mal.",
            "Une erreur est survenue.",
          ),
          {
            description: raw || t("auth.fail"),
            duration: 7000,
          },
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: oauthRedirectUri() });
    if (result.error) {
      toast.error(result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate(afterAuthTarget() as never);
  };

  return (
    <main className="programme-page min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md programme-card p-8 sm:p-10">

        <div className="flex items-center justify-between gap-3">
          <BrandMark size="sm" />
          <LangSwitch />
        </div>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/55 hover:text-[var(--ink)] transition">← {t("auth.back")}</Link>
        <div className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/55">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--grass)]" />
          {mode === "signup" ? t("auth.title.signup") : t("auth.title.signin")}
        </div>
        <h1 className="text-display text-5xl mt-2 leading-none">{mode === "signup" ? t("auth.title.signup") : t("auth.title.signin")}</h1>
        <p className="text-[15px] text-[var(--ink)]/70 mt-3 leading-relaxed">
          {mode === "signup" ? t("auth.sub.signup") : t("auth.sub.signin")}
        </p>

        <Button onClick={google} disabled={loading} variant="secondary" className="w-full mt-6">
           {t("auth.google")}
        </Button>
        <Button
          onClick={async () => {
            setLoading(true);
            const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: oauthRedirectUri() });
            if (result.error) { toast.error(result.error.message); setLoading(false); return; }
            if (result.redirected) return;
            navigate(afterAuthTarget() as never);
          }}
          disabled={loading}
          variant="secondary"
          className="w-full mt-2 bg-black text-white hover:bg-black/90"
        >
           {t("auth.apple")}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-[var(--ink)]/40 uppercase tracking-widest">
          <div className="flex-1 h-px bg-[var(--ink)]/15" /> {t("auth.or")} <div className="flex-1 h-px bg-[var(--ink)]/15" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} required minLength={8} placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--ink)]/50 hover:text-[var(--ink)]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 bg-[var(--ink)] text-[var(--paper)] hover:brightness-110 font-semibold uppercase tracking-[0.15em] shadow-[0_10px_30px_-12px_rgba(15,62,46,0.45)]">{mode === "signup" ? t("auth.create") : t("auth.signin")}</Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-[var(--ink)]/60 hover:text-[var(--ink)]">
            {mode === "signup" ? t("auth.toggleToSignin") : t("auth.toggleToSignup")}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={async () => {
                if (!email) { toast.error(t("auth.enterEmailFirst")); return; }
                // Check what providers this email uses, so OAuth-only users get a
                // helpful message instead of a reset email that will never work.
                try {
                  const info = await getEmailAuthProviders({ data: { email } });
                  const providers = info?.providers ?? [];
                  const hasEmail = providers.includes("email");
                  const oauthProviders = providers.filter((p) => p !== "email");
                  if (info?.exists && !hasEmail && oauthProviders.length > 0) {
                    const label = oauthProviders
                      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                      .join(" / ");
                    toast.error(
                      tr(
                        `This account uses ${label}.`,
                        `Esta cuenta usa ${label}.`,
                        `Ce compte utilise ${label}.`,
                      ),
                      {
                        description: tr(
                          `Tap "Continue with ${label}" above to sign in — no password needed.`,
                          `Pulsa "Continuar con ${label}" arriba para iniciar sesión — no necesitas contraseña.`,
                          `Appuie sur « Continuer avec ${label} » ci-dessus pour te connecter — aucun mot de passe requis.`,
                        ),
                        duration: 9000,
                      },
                    );
                    return;
                  }
                } catch { /* fall through to reset */ }
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(error.message);
                else toast.success(t("auth.resetSent"));
              }}
              className="text-[var(--ink)]/60 hover:text-[var(--ink)]"
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
