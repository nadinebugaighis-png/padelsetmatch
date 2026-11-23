import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyProfile } from "@/lib/app.functions";
import { getCommunityDirectory } from "@/lib/communities.functions";
import { CommunityDirectoryList } from "@/components/CommunityDirectory";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/choose-location")({
  head: () => ({
    meta: [
      { title: "Choose your community · PadelSetMatch" },
      { name: "description", content: "Pick your padel community by country and city, see how many members each has, or start your own." },
      { property: "og:title", content: "Choose your community · PadelSetMatch" },
      { property: "og:description", content: "Pick your padel community by country and city, see how many members each has, or start your own." },
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
  const getDirectory = useServerFn(getCommunityDirectory);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile(), retry: 2 });
  const dirQ = useQuery({ queryKey: ["community-directory"], queryFn: () => getDirectory(), staleTime: 60_000, retry: 2 });

  // Players who already have a profile with a location never see this page.
  useEffect(() => {
    const p = profileQ.data;
    if (p && (p.locations?.length || p.zone)) navigate({ to: "/app/grid", replace: true });
  }, [profileQ.data, navigate]);

  return (
    <div className="programme-page min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 pt-16 pb-12">
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-[11px] uppercase tracking-[0.28em] text-[var(--ink)]/78">PadelSetMatch</p>
        <h1 className="mt-4 font-serif text-[2rem] leading-tight text-center">
          {tr("Choose your community", "Elige tu comunidad", "Choisis ta communauté")}
        </h1>
        <p className="mt-2 font-serif italic text-[15px] text-[var(--ink)]/82 text-center">
          {tr("Where you live, play and connect", "Donde vives, juegas y conectas", "Là où tu vis, joues et te connectes")}
        </p>

        <div className="mt-10">
          {dirQ.data ? (
            <CommunityDirectoryList
              directory={dirQ.data}
              onOpen={(c) => navigate({ to: "/app/onboarding", search: { loc: c.location } })}
              onStart={() => navigate({ to: "/app/onboarding", search: {} })}
              startLabel={tr("Start your community", "Crea tu comunidad", "Lance ta communauté")}
            />
          ) : dirQ.isError ? (
            <div className="text-center">
              <button type="button" onClick={() => dirQ.refetch()} className="h-10 rounded-full border border-[var(--ink)]/30 px-5 text-[10.5px] uppercase tracking-[0.2em]">
                {tr("Try again", "Reintentar", "Réessayer")}
              </button>
            </div>
          ) : (
            <div className="space-y-3" aria-busy>
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-[var(--ink)]/[0.05] animate-pulse" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
