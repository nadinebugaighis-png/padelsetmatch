import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/questions")({
  head: () => ({ meta: [{ title: "Compatibility questions \u00b7 PadelSetMatch" }, { name: "description", content: "Answer private questions for better padel compatibility." }, { property: "og:title", content: "Compatibility questions \u00b7 PadelSetMatch" }, { property: "og:description", content: "Answer private questions for better padel compatibility." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/app/profile" });
  },
  component: () => null,
});
