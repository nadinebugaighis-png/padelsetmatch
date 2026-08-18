import { createFileRoute } from "@tanstack/react-router";
import { listPublicUpcomingMatches } from "@/lib/guest.functions";
import { PublicPlayFeed } from "@/components/PublicPlayFeed";

const CITY = "madrid";
const TITLE = "Partidos de pádel abiertos en Madrid — PadelSetMatch";
const DESC =
  "Partidos de pádel abiertos hoy en Madrid: mira quién juega, la hora y el club, y únete a una plaza libre en un toque. Sin cuenta.";
const URL = "https://padelsetmatch.com/play/madrid";

export const Route = createFileRoute("/play/madrid")({
  loader: async () => {
    try {
      const all = await listPublicUpcomingMatches({ data: { limit: 60 } });
      const matches = all.filter((m) =>
        `${m.city ?? ""} ${m.club_address ?? ""} ${m.club_name ?? ""}`.toLowerCase().includes(CITY),
      );
      return { matches };
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
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PlayMadridPage,
});

function PlayMadridPage() {
  const { matches } = Route.useLoaderData();
  return (
    <PublicPlayFeed
      initialData={matches}
      city={CITY}
      heading="Partidos de pádel abiertos en Madrid"
      intro="Mira los partidos con plazas libres hoy en Madrid y únete como invitado — sin cuenta."
    />
  );
}
