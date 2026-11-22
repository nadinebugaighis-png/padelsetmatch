import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { safeInternalPath } from "@/lib/safe-redirect";
import { useT, useTr } from "@/lib/i18n";
import { isNative, nativeAppleSignIn } from "@/lib/native";
import { exchangeNativeAppleToken } from "@/lib/apple-native.functions";
import { useHydrated } from "@/hooks/use-hydrated";
import { AuthTimeoutError, normalizeEmail, withAuthTimeout } from "@/lib/auth-input";
import appleLogo from "@/assets/apple-logo-white.svg";

type Props = {
  redirect?: string;
  join?: string;
  i?: string;
  initialMode?: "signin" | "signup";
  /** Show "Enter the club" instead of the form when a session already exists. */
  showEnterWhenSignedIn?: boolean;
};

const GOOGLE_G = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

const fieldClass =
  "h-12 rounded-xl border-[var(--ink)]/22 bg-[var(--paper)] px-4 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink)]/50 focus-visible:ring-1 focus-visible:ring-[var(--ink)]/40 md:text-[15px]";

/**
 * The one entrance: Apple and Google first, then email and password,
 * all on the same screen. Used by the home page and by /auth.
 */
export function AuthPanel({ redirect, join, i, initialMode = "signup", showEnterWhenSignedIn = false }: Props) {
  const navigate = useNavigate();
  const safeRedirect = safeInternalPath(redirect);
  const t = useT();
  const tr = useTr();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!showEnterWhenSignedIn) return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setSignedIn(true);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [showEnterWhenSignedIn]);

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
    const q = new URLSearchParams({ mode: "signin" });
    if (join) q.set("join", join);
    if (i) q.set("i", i);
    if (safeRedirect) q.set("redirect", safeRedirect);
    return `${window.location.origin}/auth?${q.toString()}`;
  };

  // Safety net: the buttons must never stay greyed out. If a sign-in step
  // stalls (Apple/Google sheet closed oddly, weak signal), unlock them.
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setLoading(false), 25_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      window.setTimeout(() => setLoading(false), 2_000);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loading]);

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setConfirmPassword("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      toast.warning(tr("Passwords don't match.", "Las contraseñas no coinciden.", "Les mots de passe ne correspondent pas."), {
        description: tr(
          "Please retype the same password in both fields.",
          "Vuelve a escribir la misma contraseña en ambos campos.",
          "Retape le même mot de passe dans les deux champs.",
        ),
        duration: 6000,
      });
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
            await supabase.from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("user_id", data.session.user.id);
          } catch { /* non-blocking */ }
          let ordinal: number | null = null;
          try {
            const { data: n } = await supabase.rpc("get_signup_ordinal", { _user_id: data.session.user.id });
            if (typeof n === "number" && n > 0) ordinal = n;
          } catch { /* non-blocking */ }
          toast.success(
            ordinal
              ? tr(`Welcome, player #${ordinal}! 🎾`, `¡Bienvenido, jugador #${ordinal}! 🎾`, `Bienvenue, joueur n°${ordinal} ! 🎾`)
              : tr("Welcome aboard! 🎾", "¡Bienvenido a la pista! 🎾", "Bienvenue sur le court ! 🎾"),
            {
              description: tr(
                "Hope you love it. Share it with a padel friend or two, it plays better with more of us on the court.",
                "Esperamos que te encante. Compártela con uno o dos amigos del pádel, funciona mejor cuantos más seamos en la pista.",
                "On espère que ça te plaira. Partage-la avec un ou deux copains de padel, c'est mieux quand on est plus nombreux sur le court.",
              ),
              duration: 7000,
            },
          );
          const target = signupTarget();
          navigate(target as never);
          // Safety net: if client routing stalls, force a real navigation.
          const startPath = window.location.pathname;
          window.setTimeout(() => {
            if (window.location.pathname === startPath) {
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
      const isRateLimit = status === 429 || /rate limit|too many|for security purposes/i.test(raw);
      const isInvalidCreds = /invalid login credentials/i.test(raw);
      const isWeakPassword = code === "weak_password" || /weak.?password|pwned|password.*(short|weak|known)/i.test(raw);
      const isShortPassword = /at least|minimum|too short|6 characters|8 characters/i.test(raw);
      const isBadEmail = /invalid.*email|email.*invalid|email address.*invalid/i.test(raw);
      const isAlreadyRegistered = code === "user_already_exists" || /already (registered|exists|been registered)|user.*exists/i.test(raw);

      if (err instanceof AuthTimeoutError) {
        toast.warning(tr("This is taking too long.", "Esto está tardando demasiado.", "Cela prend trop de temps."), {
          description: tr(
            "Check your connection and tap the button again.",
            "Revisa tu conexión y vuelve a pulsar el botón.",
            "Vérifie ta connexion et appuie de nouveau sur le bouton.",
          ),
          duration: 7000,
        });
      } else if (isRateLimit) {
        toast.info(tr(
          "Too many attempts. Please wait a moment and try again.",
          "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
          "Trop de tentatives. Patiente un instant puis réessaie.",
        ));
      } else if (isWeakPassword) {
        toast.warning(tr("This password is too common.", "Esta contraseña es demasiado común.", "Ce mot de passe est trop courant."), {
          description: tr(
            "Please choose a stronger password: mix letters, numbers and a symbol.",
            "Elige una contraseña más segura: combina letras, números y un símbolo.",
            "Choisis un mot de passe plus fort : mélange lettres, chiffres et un symbole.",
          ),
          duration: 8000,
        });
      } else if (isShortPassword) {
        toast.warning(tr("Password is too short.", "La contraseña es demasiado corta.", "Le mot de passe est trop court."), {
          description: tr("Use at least 8 characters.", "Usa al menos 8 caracteres.", "Utilise au moins 8 caractères."),
          duration: 7000,
        });
      } else if (isBadEmail) {
        toast.warning(tr("That email doesn't look right.", "Ese correo no parece válido.", "Cet e-mail ne semble pas valide."), {
          description: tr("Check for typos and try again.", "Revisa si hay errores e inténtalo de nuevo.", "Vérifie s'il y a une faute et réessaie."),
          duration: 7000,
        });
      } else if (isAlreadyRegistered && mode === "signup") {
        // Often a previous attempt actually succeeded: sign straight in.
        const { error: signInErr } = await withAuthTimeout(supabase.auth.signInWithPassword({ email: cleanEmail, password }));
        if (!signInErr) {
          toast.success(tr(
            "You already had an account. You're signed in.",
            "Ya tenías cuenta. Has iniciado sesión.",
            "Tu avais déjà un compte. Tu es connecté·e.",
          ));
          navigate(afterAuthTarget() as never);
          return;
        }
        toast.info(tr("This email is already registered.", "Este correo ya está registrado.", "Cet e-mail est déjà utilisé."), {
          description: tr(
            'Sign in with your password, or tap "Forgot password?".',
            'Inicia sesión con tu contraseña, o pulsa "¿Olvidaste la contraseña?".',
            "Connecte-toi avec ton mot de passe, ou appuie sur « Mot de passe oublié ? ».",
          ),
          duration: 8000,
        });
        setMode("signin");
      } else if (isInvalidCreds && mode === "signin") {
        // Generic on purpose: never reveal whether an account exists.
        toast.warning(tr("Wrong email or password.", "Correo o contraseña incorrectos.", "E-mail ou mot de passe incorrect."), {
          description: tr(
            'Double-check your password, tap "Forgot password?", or use Apple or Google if you signed up that way.',
            'Revisa tu contraseña, pulsa "¿Olvidaste la contraseña?", o usa Apple o Google si te registraste así.',
            "Vérifie ton mot de passe, appuie sur « Mot de passe oublié ? », ou utilise Apple ou Google.",
          ),
          duration: 8000,
        });
      } else {
        toast.error(tr("Something went wrong.", "Algo salió mal.", "Une erreur est survenue."), {
          description: raw || t("auth.fail"),
          duration: 7000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
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

  const appleWeb = async () => {
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
  };

  // Native iOS: Sign in with Apple via the system sheet, never leaving the app.
  // Falls back to the web flow if the native plugin is unavailable.
  const appleNative = async () => {
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
        toast.error(tr("Apple sign-in didn't go through", "No se pudo entrar con Apple", "La connexion Apple n'a pas abouti"), {
          description: tr(
            'Sign in with your email below. If you never set a password, tap "Forgot password?" and we\'ll email you a link.',
            'Entra con tu correo aquí abajo. Si nunca creaste una contraseña, pulsa "¿Olvidaste la contraseña?" y te enviaremos un enlace.',
            "Connecte-toi avec ton e-mail ci-dessous. Si tu n'as jamais créé de mot de passe, appuie sur « Mot de passe oublié ? » et nous t'enverrons un lien.",
          ),
          duration: 10000,
        });
        setMode("signin");
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

  const forgot = async () => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) { toast.info(t("auth.enterEmailFirst")); return; }
    setEmail(cleanEmail);
    // One email per tap: a second email makes the first link stop working.
    if (resetSending) return;
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) toast.error(error.message);
      else toast.success(t("auth.resetSent"));
    } finally {
      setTimeout(() => setResetSending(false), 30_000);
    }
  };

  if (signedIn) {
    return (
      <div id="join" className="entrance-panel">
        <p className="text-serif text-[22px] leading-tight text-[var(--ink)]">{tr("Welcome back", "Bienvenido de nuevo", "Bon retour")}</p>
        <p className="mt-1 text-[14px] text-[var(--ink)]/70">{tr("You're signed in.", "Ya has iniciado sesión.", "Tu es connecté·e.")}</p>
        <Link to="/app" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--paper)] transition hover:brightness-110">
          {tr("Enter the club", "Entrar al club", "Entrer au club")}
          <ArrowRight className="size-4" strokeWidth={1.8} />
        </Link>
      </div>
    );
  }

  const native = hydrated && isNative();
  const isSignup = mode === "signup";

  return (
    <div id="join" className="entrance-panel">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.26em] text-[var(--ink)]/65">
        {isSignup ? tr("Join the club", "Únete al club", "Rejoins le club") : tr("Welcome back", "Bienvenido de nuevo", "Bon retour")}
      </p>

      {/* Provider buttons: same size, same verb. */}
      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={native ? appleNative : appleWeb}
          disabled={loading}
          className="relative flex h-11 w-full items-center justify-center overflow-hidden rounded-full bg-[var(--apple-black)] text-[var(--apple-white)] transition hover:opacity-90 active:opacity-80 disabled:opacity-60"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" }}
        >
          <span className="flex items-center pr-[8%]">
            <img src={appleLogo} alt="" aria-hidden="true" className="h-11 w-auto" draggable={false} />
            <span className="text-[17px] font-medium tracking-[-0.01em]">{t("auth.apple")}</span>
          </span>
        </button>

        {!native && (
          <button
            type="button"
            onClick={google}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-[10px] rounded-full border border-[var(--google-border)] bg-[var(--google-surface)] px-3 text-[var(--google-text)] transition hover:opacity-90 active:opacity-80 disabled:opacity-60"
            style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}
          >
            {GOOGLE_G}
            <span className="text-[14px] font-medium leading-5">{t("auth.google")}</span>
          </button>
        )}
      </div>

      <div className="my-5 flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[var(--ink)]/55">
        <span className="h-px flex-1 bg-[var(--ink)]/16" aria-hidden />
        {tr("or with email", "o con tu correo", "ou par e-mail")}
        <span className="h-px flex-1 bg-[var(--ink)]/16" aria-hidden />
      </div>

      <form onSubmit={submit} className="space-y-2.5">
        <input
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          aria-label={tr("Email", "Correo", "E-mail")}
          placeholder={tr("Email", "Correo electrónico", "E-mail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmail((v) => normalizeEmail(v))}
          className={`flex w-full border outline-none ${fieldClass}`}
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            aria-label={tr("Password", "Contraseña", "Mot de passe")}
            placeholder={isSignup ? tr("Password (8+ characters)", "Contraseña (mín. 8)", "Mot de passe (8 min.)") : tr("Password", "Contraseña", "Mot de passe")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`flex w-full border pr-12 outline-none ${fieldClass}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? tr("Hide password", "Ocultar contraseña", "Masquer") : tr("Show password", "Mostrar contraseña", "Afficher")}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-[var(--ink)]/60 hover:text-[var(--ink)]"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isSignup ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <input
              type={showPassword ? "text" : "password"}
              required={isSignup}
              minLength={8}
              tabIndex={isSignup ? 0 : -1}
              autoComplete="new-password"
              aria-hidden={!isSignup}
              aria-label={tr("Confirm password", "Confirma la contraseña", "Confirme le mot de passe")}
              placeholder={tr("Confirm password", "Confirma la contraseña", "Confirme le mot de passe")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
              className={`flex w-full border outline-none ${fieldClass}`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="!mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] text-[12.5px] font-semibold uppercase tracking-[0.2em] text-[var(--paper)] shadow-[0_18px_40px_-22px_color-mix(in_oklab,var(--ink)_70%,transparent)] transition hover:brightness-110 disabled:opacity-60"
        >
          {isSignup ? t("auth.create") : t("auth.signin")}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 text-[13.5px]">
        <button
          type="button"
          onClick={() => switchMode(isSignup ? "signin" : "signup")}
          className="text-left text-[var(--ink)]/72 transition hover:text-[var(--ink)]"
        >
          {isSignup ? tr("Already a member? ", "¿Ya eres miembro? ", "Déjà membre ? ") : tr("New here? ", "¿Nuevo aquí? ", "Nouveau ? ")}
          <span className="font-semibold text-[var(--ink)] underline decoration-[var(--ink)]/30 underline-offset-4">
            {isSignup ? tr("Sign in", "Inicia sesión", "Se connecter") : tr("Create an account", "Crea tu cuenta", "Créer un compte")}
          </span>
        </button>
        {!isSignup && (
          <button type="button" onClick={forgot} disabled={resetSending} className="shrink-0 text-[var(--ink)]/65 transition hover:text-[var(--ink)]">
            {t("auth.forgot")}
          </button>
        )}
      </div>

      {/* Terms acceptance (App Store guideline 1.2): continuing means agreeing. */}
      <p className="mt-5 border-t border-[var(--ink)]/12 pt-4 text-[11.5px] leading-[1.5] text-[var(--ink)]/62">
        {tr("By continuing you agree to our ", "Al continuar aceptas nuestros ", "En continuant, tu acceptes nos ")}
        <Link to="/terms" className="font-semibold text-[var(--ink)]/80 underline underline-offset-2">
          {tr("Terms of Use (EULA)", "Términos de uso (EULA)", "Conditions d'utilisation (CLUF)")}
        </Link>
        {tr(" and ", " y la ", " et la ")}
        <Link to="/privacy" className="font-semibold text-[var(--ink)]/80 underline underline-offset-2">
          {tr("Privacy Policy", "Política de privacidad", "Politique de confidentialité")}
        </Link>
        {tr(
          ". Zero tolerance for objectionable content or abusive users.",
          ". Tolerancia cero con el contenido objetable y los usuarios abusivos.",
          ". Aucune tolérance pour les contenus répréhensibles ou les utilisateurs abusifs.",
        )}
      </p>
    </div>
  );
}
