import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/auth")({
  // Client-only: this page is reached via the /app guard's client redirect,
  // so server-rendering it buys nothing and only risks a hydration mismatch.
  ssr: false,
  head: () => ({ meta: [
    { title: "Sign in · PadelSetMatch" },
    { name: "description", content: "Sign in or create your PadelSetMatch account to meet players and join padel matches." },
    { property: "og:title", content: "Sign in · PadelSetMatch" },
    { property: "og:description", content: "Join your local padel community with PadelSetMatch." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string; join?: string; i?: string; mode?: "signin" | "signup" } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    join: typeof s.join === "string" ? s.join : undefined,
    i: typeof s.i === "string" ? s.i : undefined,
    mode: s.mode === "signup" || s.mode === "signin" ? s.mode : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  return <AuthScreen {...search} />;
}
