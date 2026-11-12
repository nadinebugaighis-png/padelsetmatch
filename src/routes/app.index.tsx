import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyProfile } from "@/lib/app.functions";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { name: "description", content: "Open your local padel player community." },
      { property: "og:title", content: "Your padel community \u00b7 PadelSetMatch" },
      { property: "og:description", content: "Open your local padel player community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "PadelSetMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppIndexRedirect,
});

function AppIndexRedirect() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile(), retry: 2, retryDelay: 400 });

  useEffect(() => {
    if (!profileQ.isSuccess || profileQ.isFetching) return;
    if (!profileQ.data) navigate({ to: "/app/choose-location", replace: true });
    else navigate({ to: "/app/grid", replace: true });
  }, [profileQ.isSuccess, profileQ.isFetching, profileQ.data, navigate]);


  return (
    <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--ink)]/20 border-t-[var(--ink)] animate-spin" />
    </div>
  );
}
