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
import { isNative, nativeAppleSignIn } from "@/lib/native";

export const Route = createFileRoute("/auth")({
  // Rendered on the client only: the /app guard redirects here after hydration,
  // so server-rendering this page produces a hydration mismatch.
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — PadelSetMatch" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string; join?: string; i?: string; mode?: "signin" | "signup" } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    join: typeof s.join === "string" ? s.join : undefined,
    i: typeof s.i === "string" ? s.i : undefined,
    mode: s.mode === "signup" || s.mode === "signin" ? s.mode : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, join, i, mode: modeParam } = Route.useSearch();
  const t = useT();
  const tr = useTr();
  const [mode, setMode] = useState<"signin" | "signup">(modeParam ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // App Store guideline 1.2: users must explicitly accept the EULA / terms
  // (zero tolerance for objectionable content or abusive users) before they can
  // register or sign in.
  const requireAgreement = () => {
    if (agreed) return true;
    toast.warning(
      tr(
        "Please accept the Terms to continue.",
        "Acepta los Términos para continuar.",
        "Veuillez accepter les Conditions pour continuer.",
      ),
      {
        description: tr(
          "There is zero tolerance for objectionable content or abusive users.",
          "Hay tolerancia cero con el contenido objetable y los usuarios abusivos.",
          "Aucune tolérance pour les contenus répréhensibles ou les utilisateurs abusifs.",
        ),
      },
    );
    return false;
  };



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
    if (!requireAgreement()) return;
    if (mode === "signup" && password !== confirmPassword) {
      toast.warning(
        tr(
          "Passwords don't match.",
          "Las contraseñas no coinciden.",
          "Les mots de passe ne correspondent pas.",
        ),
        {
          description: tr(
            "Please retype the same password in both fields.",
            "Vuelve a escribir la misma contraseña en ambos campos.",
            "Retape le même mot de passe dans les deux champs.",
          ),
          duration: 6000,
        },
      );
      return;
    }
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
          // Safety net: if client routing stalls (slow network, hydration race),
          // force a real navigation so the user never sits on a frozen screen.
          const target = signupTarget();
          window.setTimeout(() => {
            if (window.location.pathname.startsWith("/auth")) {
              window.location.assign(target.to);
            }
          }, 2500);




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
        toast.info(
          tr(
            "Too many attempts. Please wait a moment and try again.",
            "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
            "Trop de tentatives. Patiente un instant puis réessaie.",
          ),
        );
      } else if (isWeakPassword) {
        toast.warning(
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
        toast.warning(
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
        toast.warning(
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
        // The account already exists (often because a previous attempt actually
        // succeeded). Try to sign the user straight in with what they typed.
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInErr) {
          toast.success(
            tr(
              "You already had an account — you're signed in.",
              "Ya tenías cuenta — has iniciado sesión.",
              "Tu avais déjà un compte — tu es connecté·e.",
            ),
          );
          navigate(afterAuthTarget() as never);
          return;
        }
        toast.info(
          tr(
            "This email is already registered.",
            "Este correo ya está registrado.",
            "Cet e-mail est déjà utilisé.",
          ),
          {
            description: tr(
              'Sign in with your password below, or tap "Forgot password?".',
              'Inicia sesión con tu contraseña abajo, o pulsa "¿Olvidaste la contraseña?".',
              'Connecte-toi avec ton mot de passe ci-dessous, ou appuie sur « Mot de passe oublié ? ».',
            ),
            duration: 8000,
          },
        );
        setMode("signin");

      } else if (isInvalidCreds && mode === "signin") {
        // Generic message on purpose — never reveal whether an account exists
        // or which provider it uses (account enumeration).
        toast.warning(
          tr(
            "Wrong email or password.",
            "Correo o contraseña incorrectos.",
            "E-mail ou mot de passe incorrect.",
          ),
          {
            description: tr(
              'Double-check your password, tap "Forgot password?" below, or use "Continue with Google / Apple" if you signed up that way.',
              'Revisa tu contraseña, pulsa "¿Olvidaste la contraseña?" abajo, o usa "Continuar con Google / Apple" si te registraste así.',
              'Vérifie ton mot de passe, appuie sur « Mot de passe oublié ? » ci-dessous, ou utilise « Continuer avec Google / Apple ».',
            ),
            duration: 8000,
          },
        );
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
    if (!requireAgreement()) return;
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

  // Native iOS/iPadOS: Sign in with Apple via the system sheet — never leaves
  // the app. If the native plugin is unavailable for any reason we fall back to
  // the standard OAuth flow so the button always does something.
  const appleNative = async () => {
    if (!requireAgreement()) return;
    setLoading(true);
    try {
      const res = await nativeAppleSignIn();
      if (res.status === "cancelled") { setLoading(false); return; }
      if (res.status === "unavailable") {
        const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: oauthRedirectUri() });
        if (result.error) { toast.error(result.error.message); setLoading(false); return; }
        if (result.redirected) return;
        navigate(afterAuthTarget() as never);
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: res.identityToken,
        nonce: res.nonce,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      navigate(afterAuthTarget() as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("auth.fail"));
      setLoading(false);
    }
  };







  return (
    <main className="programme-page min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md programme-card p-8 sm:p-10">

        <div className="flex items-center justify-between gap-3">
          <BrandMark size="sm" />
          <LangSwitch />
        </div>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/55 hover:text-[var(--ink)] transition">← {t("auth.back")}</Link>
        <h1 className="text-serif mt-4 text-3xl uppercase text-[var(--ink)] leading-[0.95]">
          {tr("Join PadelSetMatch", "Únete a PadelSetMatch", "Rejoignez PadelSetMatch")}
        </h1>

        <div
          role="tablist"
          aria-label={tr("Authentication mode", "Modo de autenticación", "Mode d'authentification")}
          className="mt-6 grid grid-cols-2 gap-1 p-1 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => { setMode("signup"); setConfirmPassword(""); }}
            className={`h-10 rounded-full text-[12px] font-semibold uppercase tracking-[0.15em] transition ${mode === "signup" ? "bg-[var(--ink)] text-[var(--paper)] shadow-[0_8px_20px_-12px_rgba(15,62,46,0.55)]" : "text-[var(--ink)]/60 hover:text-[var(--ink)]"}`}
          >
            {tr("Create account", "Crear cuenta", "Créer un compte")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => { setMode("signin"); setConfirmPassword(""); }}
            className={`h-10 rounded-full text-[12px] font-semibold uppercase tracking-[0.15em] transition ${mode === "signin" ? "bg-[var(--ink)] text-[var(--paper)] shadow-[0_8px_20px_-12px_rgba(15,62,46,0.55)]" : "text-[var(--ink)]/60 hover:text-[var(--ink)]"}`}
          >
            {tr("Sign in", "Iniciar sesión", "Se connecter")}
          </button>
        </div>

        {/* EULA / terms acceptance — required before registering or signing in
            (App Store guideline 1.2, user-generated content). */}
        <label className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--ink)]/15 bg-[var(--ink)]/[0.03] p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ink)]"
            aria-label={tr("Accept the Terms", "Aceptar los Términos", "Accepter les Conditions")}
          />
          <span className="text-[12px] leading-snug text-[var(--ink)]/75">
            {tr("I agree to the ", "Acepto los ", "J'accepte les ")}
            <Link to="/terms" className="underline font-semibold">
              {tr("Terms of Use (EULA)", "Términos de uso (EULA)", "Conditions d'utilisation (CLUF)")}
            </Link>
            {tr(" and ", " y la ", " et la ")}
            <Link to="/privacy" className="underline font-semibold">
              {tr("Privacy Policy", "Política de privacidad", "Politique de confidentialité")}
            </Link>
            {tr(
              ", and I understand there is zero tolerance for objectionable content or abusive users.",
              ", y entiendo que hay tolerancia cero con el contenido objetable y los usuarios abusivos.",
              ", et je comprends qu'aucune tolérance n'est accordée aux contenus répréhensibles ou aux utilisateurs abusifs.",
            )}
          </span>
        </label>


        {/* Native iOS: Sign in with Apple uses the system sheet and never
            leaves the app (App Store guideline 4 compliant). */}
        {isNative() && (
          <>
            <Button
              onClick={appleNative}
              disabled={loading}
              variant="secondary"
              className="w-full mt-6 bg-black text-white hover:bg-black/90"
            >
               {t("auth.apple")}
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-[var(--ink)]/40 uppercase tracking-widest">
              <div className="flex-1 h-px bg-[var(--ink)]/15" /> {t("auth.or")} <div className="flex-1 h-px bg-[var(--ink)]/15" />
            </div>
          </>
        )}

        {/* On web, social sign-in goes through the OAuth redirect flow. */}
        {!isNative() && (
          <>
            <Button onClick={google} disabled={loading} variant="secondary" className="w-full mt-4">
               {t("auth.google")}
            </Button>
            <Button
              onClick={async () => {
                if (!requireAgreement()) return;
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
          </>
        )}

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
          {mode === "signup" && (
            <Input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder={tr("Confirm password", "Confirma la contraseña", "Confirme le mot de passe")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
            />
          )}
          <Button type="submit" disabled={loading} className="w-full h-11 bg-[var(--ink)] text-[var(--paper)] hover:brightness-110 font-semibold uppercase tracking-[0.15em] shadow-[0_10px_30px_-12px_rgba(15,62,46,0.45)]">{mode === "signup" ? t("auth.create") : t("auth.signin")}</Button>
        </form>

        {mode === "signup" && (
          <p className="mt-3 text-center text-[13px] text-[var(--ink)]/60">
            <Link to="/demo" className="text-[var(--plum)] font-semibold underline underline-offset-2 hover:brightness-110">
              {tr("Take a quick tour →", "Haz un tour rápido →", "Fais un tour rapide →")}
            </Link>
          </p>
        )}

        <div className="mt-4 flex items-center justify-end text-sm">
          {mode === "signin" && (
            <button
              type="button"
              onClick={async () => {
                if (!email) { toast.info(t("auth.enterEmailFirst")); return; }
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
