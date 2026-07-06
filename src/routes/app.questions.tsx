import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/questions")({
  beforeLoad: () => {
    throw redirect({ to: "/app/profile" });
  },
  component: () => null,
});
