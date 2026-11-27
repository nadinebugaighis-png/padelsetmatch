import type { ClubResult } from "@/lib/match-events.functions";
import { communityOf } from "@/lib/communities";

/** Club communities whose games always happen at their own club: new matches start with it already chosen. */
export const CLUB_COMMUNITY_VENUES: Record<string, ClubResult> = {
  "Club de Pádel La Moraleja": {
    place_id: "ChIJnfS5U1wsQg0R8WQD4_nRg1Q",
    name: "Club de Pádel La Moraleja",
    address: "Av. de Bruselas, 29, 28108 Alcobendas, Madrid, Spain",
    lat: 40.5293321,
    lng: -3.6402073,
    city: "Alcobendas",
    country: "Spain",
  },
};

/** The club venue for the community being viewed, if it is a club community. */
export function clubVenueFor(view: string | null | undefined): ClubResult | null {
  if (!view) return null;
  const label = communityOf(view)?.label;
  return (label && CLUB_COMMUNITY_VENUES[label]) || null;
}
