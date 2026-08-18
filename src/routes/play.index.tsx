import { createFileRoute } from "@tanstack/react-router";
import { listPublicUpcomingMatches } from "@/lib/guest.functions";
import { PublicPlayFeed } from "@/components/PublicPlayFeed";

const TITLE = "Open padel matches near you — PadelSetMatch";
const DESC = "Browse open padel matches in your city. Join a spot in one tap — no account required.";
const URL = "https://padelsetmatch.com/play";

export const Route = createFileRoute("/play/")({
  loader: async () => {
    try {
      return { matches: await listPublicUpcomingMatches({ data: { limit: 60 } }) };
    } catch {
      return { matches: [] };
    }
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { matches } = Route.useLoaderData();
  return <PublicPlayFeed initialData={matches} />;
}
