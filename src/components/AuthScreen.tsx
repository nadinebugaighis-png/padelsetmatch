import { Link, useNavigate } from "@tanstack/react-router";
import { safeInternalPath } from "@/lib/safe-redirect";
import { useEffect, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { BrandMark } from "@/components/BrandMark";
import { AppStoreBadge } from "@/components/AppStoreBadge";
import { GooglePlayBadge } from "@/components/GooglePlayBadge";
import { isNative, nativeAppleSignIn } from "@/lib/native";
import { exchangeNativeAppleToken } from "@/lib/apple-native.functions";
import { useHydrated } from "@/hooks/use-hydrated";
import { SessionLoading } from "@/components/SessionLoading";
import { AuthTimeoutError, normalizeEmail, withAuthTimeout } from "@/lib/auth-input";

export type AuthScreenProps = {
  redirect?: string | undefined;
  join?: string | undefined;
  i?: string | undefined;
  mode?: "signin" | "signup" | undefined;
};

/** The sign-in / create-account screen, shown at the home page and at /auth. */
export function AuthScreen({ redirect, join, i, mode: modeParam }: AuthScreenProps) {
  const navigate = useNavigate();
  const safeRedirect = safeInternalPath(redirect);
  const t = useT();
  const tr = useTr();
  const [resetSending, setResetSending] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(modeParam ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const hydrated = useHydrated();

  // App Store guideline 1.2: users must explicitly accept the EULA / terms
  // (zero tolerance for objectionable content or abusive users) when they
  // create an account. Returning users accepted it at signup already.
  const requireAgreement = () => {
    if (mode === "signin" || agreed) return true;

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
    if (safeRedirect) return { to: safeRedirect };
    return { to: "/app" };
  };
  const signupTarget = (): { to: string; search?: Record<string, string> } => {
    if (join) return { to: "/app/join-setup", search: i ? { join, i } : { join } };
    if (safeRedirect) return { to: safeRedirect };
    return { to: "/app/choose-location" };
  };
  const oauthRedirectUri = () => {
    const base = window.location.origin;
    const q = new URLSearchParams({ mode: "signin" });
    if (join) q.set("join", join);
    if (i) q.set("i", i);
    if (safeRedirect) q.set("redirect", safeRedirect);
    return `${base}/auth?${q.toString()}`;
  };

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (cancelled) return;
      if (!error && data.session) { await navigate(afterAuthTarget() as never); return; }
      setCheckingSession(false);
      // Coming back from Apple/Google with a refusal: say so instead of
      // silently showing the form again, and keep the reason for support.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const reason = hash.get("error_description") ?? query.get("error_description")
        ?? hash.get("error") ?? query.get("error") ?? error?.message ?? null;
      if (reason) {
        console.warn("[auth] sign-in returned an error:", reason);
        toast.error(
          tr("Sign-in didn't finish", "No se pudo completar el acceso", "La connexion n'a pas abouti"),
          { description: reason.replace(/\+/g, " "), duration: 15000 },
        );
        if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }).catch(() => { if (!cancelled) setCheckingSession(false); });
    return () => { cancelled = true; };
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
    const cleanEmail = normalizeEmail(email);
    if (cleanEmail !== email) setEmail(cleanEmail);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await withAuthTimeout(supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: oauthRedirectUri() },
        }));
        if (error) throw error;
        if (data.session) {
          // Record the EULA acceptance against the new account (guideline 1.2).
          try {
            await supabase
              .from("profiles")
              .update({ terms_accepted_at: new Date().toISOString() })
              .eq("user_id", data.session.user.id);
          } catch { /* non-blocking */ }
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
                "Hope you love it. Share with a padel friend or two, it plays better with more of us on the court.",
                "Esperamos que te encante. Compártela con uno o dos amigos del pádel, funciona mejor entre más seamos en la pista.",
                "On espère que ça te plaira. Partage-la avec un ou deux copains de padel, c'est mieux quand on est plus nombreux sur le court.",
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
              const q = new URLSearchParams(target.search);
              window.location.assign(`${target.to}${q.size ? `?${q}` : ""}`);
            }
          }, 2500);




        } else {
          toast.success(t("auth.confirmEmail"));
          setMode("signin");
        }
      } else {
        const { error } = await withAuthTimeout(supabase.auth.signInWithPassword({ email: cleanEmail, password }));
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

      if (err instanceof AuthTimeoutError) {
        toast.warning(
          tr(
            "This is taking too long.",
            "Esto está tardando demasiado.",
            "Cela prend trop de temps.",
          ),
          {
            description: tr(
              "Check your connection and tap the button again.",
              "Revisa tu conexión y vuelve a pulsar el botón.",
              "Vérifie ta connexion et appuie de nouveau sur le bouton.",
            ),
            duration: 7000,
          },
        );
      } else if (isRateLimit) {
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
              "Please choose a stronger password: mix letters, numbers and a symbol.",
              "Elige una contraseña más segura: combina letras, números y un símbolo.",
              "Choisis un mot de passe plus fort : mélange lettres, chiffres et un symbole.",
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
        const { error: signInErr } = await withAuthTimeout(supabase.auth.signInWithPassword({ email: cleanEmail, password }));
        if (!signInErr) {
          toast.success(
            tr(
              "You already had an account. You're signed in.",
              "Ya tenías cuenta. Has iniciado sesión.",
              "Tu avais déjà un compte. Tu es connecté·e.",
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
        // Generic message on purpose, never reveal whether an account exists
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
        // Generic fallback, never silently swallow an auth error.
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
    try {
      const result = await withAuthTimeout(lovable.auth.signInWithOAuth("google", { redirect_uri: oauthRedirectUri() }));
      if (result.error) throw new Error(result.error.message);
      if (result.redirected) return;
      await navigate(afterAuthTarget() as never);
    } catch {
      toast.error(tr("Google sign-in could not finish. Please try again.", "No se pudo completar el acceso con Google. Reintenta.", "La connexion Google n’a pas abouti. Réessaie."));
    } finally {
      setLoading(false);
    }
  };

  // Native iOS/iPadOS: Sign in with Apple via the system sheet, never leaves
  // the app. If the native plugin is unavailable for any reason we fall back to
  // the standard OAuth flow so the button always does something.
  const appleNative = async () => {
    if (!requireAgreement()) return;
    setLoading(true);
    try {
      const res = await nativeAppleSignIn();
      if (res.status === "cancelled") { setLoading(false); return; }
      if (res.status === "unavailable") {
        const result = await withAuthTimeout(lovable.auth.signInWithOAuth("apple", { redirect_uri: oauthRedirectUri() }));
        if (result.error) { toast.error(result.error.message); setLoading(false); return; }
        if (result.redirected) return;
        navigate(afterAuthTarget() as never);
        return;
      }
      let error: unknown = null;
      try {
        const { tokenHash } = await withAuthTimeout(exchangeNativeAppleToken({ data: { identityToken: res.identityToken, nonce: res.nonce } }));
        ({ error } = await withAuthTimeout(supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" })));
      } catch (e) {
        if (e instanceof AuthTimeoutError) throw e;
        error = e;
      }
      if (error) {
        // The Apple sheet finished but the sign-in service refused the result.
        // Never leave the player stuck on a raw technical message: point them
        // to email sign-in and the reset link, which works for Apple accounts too.
        toast.error(
          tr("Apple sign-in didn't go through", "No se pudo entrar con Apple", "La connexion Apple n'a pas abouti"),
          {
            description: tr(
              'Sign in with your email below. If you never set a password, tap "Forgot password?" and we\'ll email you a link.',
              'Entra con tu correo aquí abajo. Si nunca creaste una contraseña, pulsa "¿Has olvidado tu contraseña?" y te enviaremos un enlace.',
              'Connecte-toi avec ton e-mail ci-dessous. Si tu n\'as jamais créé de mot de passe, appuie sur « Mot de passe oublié ? » et nous t\'enverrons un lien.',
            ),
            duration: 10000,
          },
        );
        setLoading(false);
        return;
      }
      navigate(afterAuthTarget() as never);
    } catch (e) {
      if (e instanceof AuthTimeoutError) {
        toast.warning(tr("Apple sign-in is taking too long. Please try again.", "El acceso con Apple está tardando demasiado. Inténtalo de nuevo.", "La connexion Apple prend trop de temps. Réessaie."));
      } else {
        toast.error(e instanceof Error ? e.message : t("auth.fail"));
      }
      setLoading(false);
    }
  };

  // Safety net: the buttons must never stay greyed out. If a sign-in step
  // stalls (Apple/Google sheet closed oddly, weak signal), unlock them.
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setLoading(false), 25_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Coming back from the Apple/Google sheet or another app: give a real
      // sign-in a moment to navigate away, then unlock the page.
      window.setTimeout(() => setLoading(false), 2_000);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loading]);







  if (checkingSession) return <SessionLoading />;

  return (
    <main className="programme-page min-h-[100dvh] flex flex-col items-center px-6 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:justify-center sm:px-4 sm:py-12">
      <div className="w-full max-w-[400px] sm:programme-card sm:max-w-md sm:p-10">

        <div className="relative flex items-center justify-center pt-3">
          <BrandMark size="md" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <LangSwitch />
          </div>
        </div>

        <h1 className="text-serif mt-12 text-center text-[28px] font-normal leading-[1.05] text-[var(--ink)]">
          {mode === "signup"
            ? tr("Join the club", "Únete al club", "Rejoins le club")
            : tr("Welcome back", "Bienvenido de nuevo", "Bon retour")}
        </h1>

        <div
          role="tablist"
          aria-label={tr("Authentication mode", "Modo de autenticación", "Mode d'authentification")}
          className="mt-8 flex justify-center gap-8 border-b border-[var(--ink)]/14"
        >
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setConfirmPassword(""); setAgreed(false); }}
              className={`-mb-px pb-3 text-[15px] transition border-b-[1.5px] ${mode === m ? "border-[var(--ink)] text-[var(--ink)] font-medium" : "border-transparent text-[var(--ink)]/55 hover:text-[var(--ink)]"}`}
            >
              {m === "signup"
                ? tr("Create account", "Crear cuenta", "Créer un compte")
                : tr("Sign in", "Iniciar sesión", "Se connecter")}
            </button>
          ))}
        </div>

        {/* EULA / terms acceptance, required to create an account
            (App Store guideline 1.2, user-generated content). */}
        {mode === "signup" ? (
          <label className="mt-7 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="peer sr-only"
              aria-label={tr("Accept the Terms", "Aceptar los Términos", "Accepter les Conditions")}
            />
            <span
              aria-hidden
              className={`mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ink)]/30 ${agreed ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--ink)]/40 bg-card"}`}
            >
              {agreed && <Check className="h-3 w-3 text-[var(--paper)]" strokeWidth={3} />}
            </span>
            <span className="text-[12.5px] leading-[1.5] text-[var(--ink)]/72">
              {tr("I agree to the ", "Acepto los ", "J'accepte les ")}
              <Link to="/terms" className="text-[var(--ink)] underline decoration-[var(--ink)]/30 underline-offset-[3px]">
                {tr("Terms of Use", "Términos de uso", "Conditions d'utilisation")}
              </Link>
              {tr(" and ", " y la ", " et la ")}
              <Link to="/privacy" className="text-[var(--ink)] underline decoration-[var(--ink)]/30 underline-offset-[3px]">
                {tr("Privacy Policy", "Política de privacidad", "Politique de confidentialité")}
              </Link>
              {tr(
                ". Zero tolerance for abusive content or users.",
                ". Tolerancia cero con contenido o usuarios abusivos.",
                ". Tolérance zéro pour les contenus ou utilisateurs abusifs.",
              )}
            </span>
          </label>
        ) : (
          <p className="mt-7 text-[12.5px] leading-[1.5] text-[var(--ink)]/72">
            {tr("By signing in you agree to the ", "Al iniciar sesión aceptas los ", "En vous connectant, vous acceptez les ")}
            <Link to="/terms" className="text-[var(--ink)] underline decoration-[var(--ink)]/30 underline-offset-[3px]">
              {tr("Terms of Use", "Términos de uso", "Conditions d'utilisation")}
            </Link>
            {tr(" and ", " y la ", " et la ")}
            <Link to="/privacy" className="text-[var(--ink)] underline decoration-[var(--ink)]/30 underline-offset-[3px]">
              {tr("Privacy Policy", "Política de privacidad", "Politique de confidentialité")}
            </Link>
            .
          </p>
        )}

        {/* Native iOS: Sign in with Apple uses the system sheet and never
            leaves the app (App Store guideline 4 compliant). */}
        {hydrated && isNative() && (
          <>
            <Button
              onClick={appleNative}
              disabled={loading}
              className={`${APPLE_BTN} mt-6`}
            >
              <AppleLogo />
              {t("auth.apple")}
            </Button>
            <OrDivider label={t("auth.or")} />
          </>
        )}

        {/* On web, social sign-in goes through the OAuth redirect flow. */}
        {hydrated && !isNative() && (
          <>
            <Button
              onClick={async () => {
                if (!requireAgreement()) return;
                setLoading(true);
                let result: Awaited<ReturnType<typeof lovable.auth.signInWithOAuth>>;
                try {
                  result = await withAuthTimeout(lovable.auth.signInWithOAuth("apple", { redirect_uri: oauthRedirectUri() }));
                } catch {
                  toast.error(tr("Apple sign-in could not finish. Please try again.", "No se pudo completar el acceso con Apple. Reintenta.", "La connexion Apple n’a pas abouti. Réessaie."));
                  setLoading(false);
                  return;
                }
                if (result.error) { toast.error(result.error.message); setLoading(false); return; }
                if (result.redirected) return;
                navigate(afterAuthTarget() as never);
              }}
              disabled={loading}
              className={`${APPLE_BTN} mt-6`}
            >
              <AppleLogo />
              {t("auth.apple")}
            </Button>
            <Button onClick={google} disabled={loading} variant="outline" className={`${SOCIAL_BTN} mt-3 bg-card border-[var(--ink)]/18 text-[var(--ink)] hover:bg-card hover:border-[var(--ink)]/35`}>
              <GoogleLogo />
              {t("auth.google")}
            </Button>
            <OrDivider label={t("auth.or")} />
          </>
        )}

        <form onSubmit={submit} className="space-y-1">
          <Input type="email" required autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmail((v) => normalizeEmail(v))} className={LINE_INPUT} />
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} className={`${LINE_INPUT} pr-10`} />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center pl-3 text-[var(--ink)]/55 hover:text-[var(--ink)]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} />}
            </button>
          </div>
          {mode === "signup" && (
            <Input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={tr("Confirm password", "Confirma la contraseña", "Confirme le mot de passe")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
              className={LINE_INPUT}
            />
          )}
          {mode === "signup" && (
            <p className="pt-2 text-[11.5px] text-[var(--ink)]/60">
              {tr("At least 8 characters", "Mínimo 8 caracteres", "Au moins 8 caractères")}
            </p>
          )}
          <div className="pt-6">
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)] hover:brightness-110 text-[14.5px] font-medium tracking-[0.02em] shadow-none">{mode === "signup" ? t("auth.create") : t("auth.signin")}</Button>
          </div>
        </form>


        {mode === "signin" && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={async () => {
                const cleanEmail = normalizeEmail(email);
                if (!cleanEmail) { toast.info(t("auth.enterEmailFirst")); return; }
                setEmail(cleanEmail);
                // One email per tap: a second email makes the first link stop working.
                if (resetSending) return;
                setResetSending(true);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) toast.error(error.message);
                  else toast.success(t("auth.resetSent"));
                } finally {
                  setTimeout(() => setResetSending(false), 30_000);
                }
              }}
              disabled={resetSending}
              className="text-[13px] text-[var(--ink)]/72 underline decoration-[var(--ink)]/25 underline-offset-4 hover:text-[var(--ink)]"
            >
              {t("auth.forgot")}
            </button>
          </div>
        )}
      </div>
      <AuthFooter />
    </main>
  );
}

/** Quiet footer: store badges for website visitors, then the key info pages. */
function AuthFooter() {
  const tr = useTr();
  const link = "hover:text-[var(--ink)] transition";
  return (
    <footer className="mt-auto w-full max-w-[400px] pt-14 text-center sm:mt-10 sm:pt-0">
      <div className="native-hide">
        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--ink)]/60">
          {tr("Get the app", "Descarga la app", "Télécharge l’app")}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <AppStoreBadge className="[&_img]:!h-8" />
          <GooglePlayBadge className="[&_img]:!h-8" />
        </div>
      </div>
      <nav className="mt-7 flex items-center justify-center gap-2.5 text-[12px] text-[var(--ink)]/72">
        <Link to="/how-it-works" className={link}>{tr("How it works", "Cómo funciona", "Comment ça marche")}</Link>
        <span aria-hidden>·</span>
        <Link to="/terms" className={link}>{tr("Terms", "Términos", "Conditions")}</Link>
        <span aria-hidden>·</span>
        <Link to="/privacy" className={link}>{tr("Privacy", "Privacidad", "Confidentialité")}</Link>
      </nav>
      <p className="mt-2 text-[11px] text-[var(--ink)]/55">© PadelSetMatch</p>
    </footer>
  );
}

const SOCIAL_BTN = "w-full h-12 rounded-full gap-2.5 text-[14.5px] font-medium shadow-none";
// Apple's sign-in button rules allow only black, white or white-outlined buttons.
const APPLE_BTN = `${SOCIAL_BTN} bg-black text-white hover:bg-black/90`;
const LINE_INPUT = "h-12 rounded-none border-0 border-b border-[var(--ink)]/18 bg-transparent px-0 text-[16px] text-[var(--ink)] shadow-none placeholder:text-[var(--ink)]/50 focus-visible:ring-0 focus-visible:border-[var(--ink)] md:text-[15px]";

function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-7 flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]/50">
      <div className="h-px flex-1 bg-[var(--ink)]/12" /> {label} <div className="h-px flex-1 bg-[var(--ink)]/12" />
    </div>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 17 20" aria-hidden className="h-[17px] w-[15px] -mt-0.5" fill="currentColor">
      <path d="M14.06 10.62c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.59 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM11.88 4.18c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22Z" />
    </svg>
  );
}

function GoogleLogo() {
  // Google's brand mark must keep its own four colours.
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="h-[17px] w-[17px]">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
