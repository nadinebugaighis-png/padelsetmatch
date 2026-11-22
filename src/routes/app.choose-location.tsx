import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { getMyProfile } from "@/lib/app.functions";
import { LOCATION_PRESETS, type LocationPreset } from "@/lib/location-presets";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/choose-location")({
  head: () => ({
    meta: [
      { title: "Choose your community · PadelSetMatch" },
      { name: "description", content: "Pick your padel community: La Moraleja, Salamanca & Chamberí, Chelsea & Battersea, Coconut Grove & Brickell, Marbella or Dubai." },
      { property: "og:title", content: "Choose your community · PadelSetMatch" },
      { property: "og:description", content: "Pick your padel community: La Moraleja, Salamanca & Chamberí, Chelsea & Battersea, Coconut Grove & Brickell, Marbella or Dubai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChooseLocation,
});

function ChooseLocation() {
  const tr = useTr();
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile(), retry: 2 });

  // Players who already have a profile with a location never see this page.
  useEffect(() => {
    const p = profileQ.data;
    if (p && (p.locations?.length || p.zone)) navigate({ to: "/app/grid", replace: true });
  }, [profileQ.data, navigate]);

  const pick = (preset: LocationPreset) => navigate({ to: "/app/onboarding", search: { loc: preset.key } });

  return (
    <div className="programme-page min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center px-6 pt-16 pb-12">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink)]/78">PadelSetMatch</p>
      <h1 className="mt-4 font-serif text-[2rem] leading-tight text-center">
        {tr("Choose your community", "Elige tu comunidad", "Choisis ta communauté")}
      </h1>
      <p className="mt-2 font-serif italic text-[15px] text-[var(--ink)]/82 text-center">
        {tr("Where you live, play and connect", "Donde vives, juegas y conectas", "Là où tu vis, joues et te connectes")}
      </p>

      <div className="mt-10 w-full max-w-sm space-y-3">
        {LOCATION_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => pick(p)}
            className="group w-full flex items-center gap-4 rounded-2xl bg-[var(--card)] px-6 py-4 text-left border border-[var(--ink)]/18 hover:border-[var(--ink)]/30 active:scale-[0.985] active:bg-[var(--ink)]/[0.03] transition"
          >
            <span className="flex-1 min-w-0">
              {p.area ? (
                <>
                  <span className="block text-[10.5px] uppercase tracking-[0.24em] text-[var(--ink)]/78">{p.city}</span>
                  <span className="mt-1 block font-serif text-[1.3rem] leading-snug">{p.area}</span>
                </>
              ) : (
                <span className="block font-serif text-[1.3rem] leading-snug">{p.city}</span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-[var(--ink)]/35 group-active:translate-x-0.5 transition" strokeWidth={1.5} aria-hidden />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate({ to: "/app/onboarding", search: {} })}
        className="mt-8 inline-flex items-center gap-1 font-serif italic text-[15px] text-[var(--ink)]/76 hover:text-[var(--ink)] underline-offset-4 hover:underline transition"
      >
        {tr("Other", "Otro lugar", "Autre endroit")}
        <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
