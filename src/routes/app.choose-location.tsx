import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyProfile } from "@/lib/app.functions";
import { LOCATION_PRESETS, type LocationPreset } from "@/lib/location-presets";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/choose-location")({
  head: () => ({
    meta: [
      { title: "Choose your location · PadelSetMatch" },
      { name: "description", content: "Pick your padel community: La Moraleja, Madrid, London, Miami or Dubai." },
      { property: "og:title", content: "Choose your location · PadelSetMatch" },
      { property: "og:description", content: "Pick your padel community: La Moraleja, Madrid, London, Miami or Dubai." },
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

  const featured = LOCATION_PRESETS.find((p) => p.featured)!;
  const others = LOCATION_PRESETS.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center px-6 py-14">
      <p className="text-[10px] tracking-[0.3em] text-[var(--gold)]">PADELSETMATCH</p>
      <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-center">
        {tr("Choose your location", "Elige tu zona", "Choisis ton lieu")}
      </h1>
      <p className="mt-2 text-sm text-[var(--ink)]/60 text-center">
        {tr("Where do you live and play?", "¿Dónde vives y juegas?", "Où vis-tu et joues-tu ?")}
      </p>

      <div className="mt-8 w-full max-w-sm space-y-3">
        <button
          type="button"
          onClick={() => pick(featured)}
          className="w-full rounded-2xl bg-[var(--ink)] px-6 py-6 text-left border border-[var(--gold)]/60 shadow-md active:scale-[0.99] transition"
        >
          <span className="block text-[10px] tracking-[0.25em] text-[var(--gold)]">MADRID</span>
          <span className="block mt-1 font-serif text-2xl text-[var(--paper)]">La Moraleja</span>
        </button>
        {others.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => pick(p)}
            className="w-full rounded-2xl bg-[var(--paper)] px-6 py-4 text-left border border-[var(--ink)]/15 font-serif text-lg active:scale-[0.99] transition"
          >
            {p.city}
          </button>
        ))}
      </div>
    </div>
  );
}
