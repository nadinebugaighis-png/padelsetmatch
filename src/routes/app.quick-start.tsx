import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PADEL_LEVELS } from "@/lib/types";
import { getMyProfile } from "@/lib/app.functions";
import { saveLiteProfile } from "@/lib/match-events.functions";
import { useTr } from "@/lib/i18n";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/app/quick-start")({
  head: () => ({
    meta: [
      { title: "Quick start · PadelMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickStart,
});

type Gender = "woman" | "man" | "non-binary" | "self-describe";

function QuickStart() {
  const navigate = useNavigate();
  const tr = useTr();
  const getMe = useServerFn(getMyProfile);
  const saveLite = useServerFn(saveLiteProfile);
  const meQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getMe(), retry: false });

  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [level, setLevel] = useState<(typeof PADEL_LEVELS)[number] | "">("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefilledFromGoogle, setPrefilledFromGoogle] = useState(false);
  const [welcomed, setWelcomed] = useState(false);

  // Prefill from existing profile OR Google auth metadata + welcome new users
  useEffect(() => {
    const me = meQ.data as { first_name?: string | null; gender?: string | null; level?: string | null; photo_url?: string | null } | null;
    if (me?.first_name) setFirstName(me.first_name);
    if (me?.gender) setGender(me.gender as Gender);
    if (me?.level) setLevel(me.level as (typeof PADEL_LEVELS)[number]);
    if (me?.photo_url) setPhotoUrl(me.photo_url);

    if (!me?.first_name || !me?.photo_url) {
      supabase.auth.getUser().then(({ data }) => {
        const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
        if (!meta) return;
        const fullName = (meta.full_name || meta.name) as string | undefined;
        const givenName = meta.given_name as string | undefined;
        const avatar = (meta.avatar_url || meta.picture) as string | undefined;
        let touched = false;
        if (!me?.first_name && (givenName || fullName)) {
          setFirstName((cur) => cur || (givenName || fullName!.split(" ")[0]));
          touched = true;
        }
        if (!me?.photo_url && avatar) {
          setPhotoUrl((cur) => cur || avatar);
          touched = true;
        }
        if (touched) setPrefilledFromGoogle(true);
      });
    }

    // Welcome toast for brand-new users (no profile yet). Fires once.
    if (meQ.isSuccess && !me && !welcomed) {
      setWelcomed(true);
      supabase.auth.getUser().then(async ({ data }) => {
        const uid = data.user?.id;
        let ordinal: number | null = null;
        if (uid) {
          try {
            const { data: n } = await supabase.rpc("get_signup_ordinal", { _user_id: uid });
            if (typeof n === "number" && n > 0) ordinal = n;
          } catch { /* non-blocking */ }
        }
        toast.success(
          ordinal
            ? tr(`Welcome, player #${ordinal}! 🎾`, `¡Bienvenido, jugador #${ordinal}! 🎾`, `Bienvenue, joueur n°${ordinal} ! 🎾`)
            : tr("Welcome aboard! 🎾", "¡Bienvenido a la pista! 🎾", "Bienvenue sur le court ! 🎾"),
          {
            description: tr(
              "Hope you love it — share with a padel friend or two, it plays better with more of us on the court.",
              "Esperamos que te encante — compártela con uno o dos amigos del pádel, funciona mejor entre más seamos en la pista.",
              "On espère que ça te plaira — partage-la avec un ou deux copains de padel, c'est mieux quand on est plus nombreux sur le court.",
            ),
            duration: 8000,
          },
        );
      });
    }
  }, [meQ.data, meQ.isSuccess, welcomed, tr]);

  const canSubmit = firstName.trim().length > 0 && !!gender && !!level && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error(tr("Add your name, gender and level", "Añade tu nombre, género y nivel", "Ajoute prénom, genre et niveau"));
      return;
    }
    setBusy(true);
    try {
      await saveLite({
        data: {
          first_name: firstName.trim(),
          level: level as (typeof PADEL_LEVELS)[number],
          gender: gender as Gender,
          photo_url: photoUrl,
        },
      });
      toast.success(tr("Saved!", "¡Guardado!", "Enregistré !"));
      navigate({ to: "/app/onboarding" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not save", "No se pudo guardar", "Impossible d'enregistrer"));
    } finally {
      setBusy(false);
    }
  };

  const levelLabel = (l: string) => l;

  return (
    <main className="programme-page min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md programme-card p-7 sm:p-9">
        <div className="flex items-center justify-between">
          <BrandMark size="sm" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/55">
            {tr("30 seconds", "30 segundos", "30 secondes")}
          </span>
        </div>

        <h1 className="text-display text-4xl sm:text-5xl mt-5 leading-none">
          {tr("Play first.", "Juega primero.", "Joue d'abord.")}
        </h1>
        <p className="text-[15px] text-[var(--ink)]/70 mt-3 leading-relaxed">
          {tr(
            "Three quick answers and you're in. Add the rest whenever you feel like it.",
            "Tres respuestas rápidas y ya estás. Lo demás lo añades cuando quieras.",
            "Trois réponses et c'est bon. Le reste, quand tu veux.",
          )}
        </p>

        {prefilledFromGoogle && (
          <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-[var(--grass)]">
            {tr("Prefilled from Google", "Rellenado desde Google", "Prérempli depuis Google")}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          {/* Photo — optional, from Google or fallback initial */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--ink)]/10 flex items-center justify-center text-lg font-medium text-[var(--ink)]/60">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                firstName.trim().charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div className="text-xs text-[var(--ink)]/55">
              {photoUrl
                ? tr("You can change this later", "Puedes cambiarla luego", "Modifiable plus tard")
                : tr("Add a photo later from your profile", "Añade foto luego en tu perfil", "Ajoute une photo plus tard")}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/55">
              {tr("First name", "Nombre", "Prénom")}
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              maxLength={40}
              required
              className="w-full mt-1 bg-transparent border border-[var(--ink)]/20 rounded-md h-11 px-3 text-[15px]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/55">
              {tr("Gender", "Género", "Genre")}
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["woman", "man", "non-binary", "self-describe"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`px-3 py-2 rounded-full border text-xs uppercase tracking-widest ${
                    gender === g
                      ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]"
                      : "border-[var(--ink)]/20 text-[var(--ink)]/75"
                  }`}
                >
                  {g === "woman" && tr("Woman", "Mujer", "Femme")}
                  {g === "man" && tr("Man", "Hombre", "Homme")}
                  {g === "non-binary" && tr("Non-binary", "No binario", "Non-binaire")}
                  {g === "self-describe" && tr("Other", "Otro", "Autre")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/55">
              {tr("Padel level", "Nivel de pádel", "Niveau de padel")}
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PADEL_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-2 rounded-full border text-xs uppercase tracking-widest ${
                    level === lvl
                      ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]"
                      : "border-[var(--ink)]/20 text-[var(--ink)]/75"
                  }`}
                >
                  {levelLabel(lvl)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm uppercase tracking-[0.15em] font-semibold disabled:opacity-40"
          >
            {busy
              ? tr("Saving…", "Guardando…", "Enregistrement…")
              : tr("Start matching", "Empezar", "Commencer")}
          </button>

          <Link
            to="/app/onboarding"
            className="block text-center text-[11px] uppercase tracking-[0.25em] text-[var(--ink)]/55 hover:text-[var(--ink)]"
          >
            {tr("Do the full profile instead", "Prefiero el perfil completo", "Faire le profil complet")}
          </Link>
        </form>
      </div>
    </main>
  );
}
