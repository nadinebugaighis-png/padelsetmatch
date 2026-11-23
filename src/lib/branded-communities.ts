import padelodonticsSeal from "@/assets/padelodontics_seal.png.asset.json";

/**
 * Communities set up with their organiser, shown with their own round seal.
 * They always appear in the directory, even before anyone joins, and keep the
 * same city + neighbourhood shape as every other community.
 */
export type BrandedCommunity = { country: string; city: string; area: string; logo: string };

export const BRANDED_COMMUNITIES: BrandedCommunity[] = [
  { country: "United Kingdom", city: "London", area: "Padelodontics", logo: padelodonticsSeal.url },
];
