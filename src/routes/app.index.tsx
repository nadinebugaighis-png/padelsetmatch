import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyProfile } from "@/lib/app.functions";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "PadelMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppIndexRedirect,
});

function AppIndexRedirect() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile(), retry: false });

  useEffect(() => {
    if (!profileQ.isSuccess) return;
    if (!profileQ.data) navigate({ to: "/app/onboarding", replace: true });
    else navigate({ to: "/app/grid", replace: true });
  }, [profileQ.isSuccess, profileQ.data, navigate]);

  return <div className="programme-page min-h-[50vh]" />;
}
