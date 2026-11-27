import { canonicalArea } from "./area-match";
import { BRANDED_COMMUNITIES } from "./branded-communities";

/** Shared Home/Connect ordering: keep profile order within neighbourhoods and clubs. */
export function homeAreaOrder<T extends { label: string }>(areas: T[]): T[] {
  const clubNames = new Set(BRANDED_COMMUNITIES.map((c) => canonicalArea(c.area)));
  const isClub = (area: T) => clubNames.has(canonicalArea(area.label));
  return [...areas.filter((area) => !isClub(area)), ...areas.filter(isClub)];
}