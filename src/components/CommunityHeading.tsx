import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { communityLogo, communityOf } from "@/lib/communities";
import { CommunitySeal } from "@/components/CommunityDirectory";
import { setCommunityView } from "@/lib/community-view";
import { useTr } from "@/lib/i18n";
import { homeAreaOrder } from "@/lib/home-area-order";

function myCommunities(locations: string[]) {
  const seen = new Set<string>();
  const out: { key: string; label: string }[] = [];
  for (const l of locations) {
    const c = communityOf(l);
    if (c && !seen.has(c.key)) { seen.add(c.key); out.push({ key: c.key, label: c.label }); }
  }
  // Neighbourhoods lead, in the order the player chose them; clubs and private
  // communities (those with their own seal) follow, so a club only titles Home
  // when the player belongs to nothing else.
  return homeAreaOrder(out);
}

/** True when the chosen view is a community the player has not joined. */
export function isVisiting(view: string | null, locations: string[]): boolean {
  if (!view) return false;
  const key = communityOf(view)?.key;
  return !!key && !myCommunities(locations).some((c) => c.key === key);
}

/**
 * Home heading: the community name, tappable to open the directory (no
 * toggles). Underneath, a quiet line explains what the grid is showing.
 */
export function CommunityHeading({ view, locations, world, fallbackTitle, subtitle }: {
  view: string | null;
  locations: string[];
  world: boolean;
  fallbackTitle: string;
  subtitle?: string;
}) {
  const tr = useTr();
  const mine = myCommunities(locations);
  const viewing = view ? communityOf(view) : null;
  const visiting = !!viewing && !mine.some((c) => c.key === viewing.key);
  const label = viewing?.label ?? (world || mine.length === 0 ? fallbackTitle : mine[0]!.label);
  const others = !viewing && !world ? mine.slice(1) : [];
  const logo = viewing ? communityLogo(viewing.key) : !world && mine[0] ? communityLogo(mine[0].key) : undefined;

  return (
    <div>
      <Link
        to="/app/communities"
        aria-label={tr("Communities", "Comunidades", "Communautés")}
        className="group inline-flex items-end gap-2 text-left"
      >
        <CommunitySeal logo={logo} className="size-8 sm:size-9 self-center mr-0.5" />
        <h1 className="text-serif uppercase text-[var(--ink)] leading-[0.95] text-[26px] sm:text-[30px] lg:text-[34px]">{label}</h1>
        <ChevronDown className="mb-[3px] w-4 h-4 shrink-0 text-[var(--ink)]/60 group-hover:text-[var(--ink)] transition" strokeWidth={1.5} aria-hidden />
      </Link>
      {visiting ? (
        <p className="mt-2 text-serif italic text-[var(--ink)]/82 text-[14px] sm:text-[15px]">
          {tr("Visiting", "De visita", "En visite")}
          {" · "}
          <button type="button" onClick={() => setCommunityView(null)} className="text-[var(--ink)] hover:opacity-70 transition">
            {mine[0]
              ? tr(`Back to ${mine[0].label}`, `Volver a ${mine[0].label}`, `Retour à ${mine[0].label}`)
              : tr("Back home", "Volver", "Retour")}
          </button>
        </p>
      ) : viewing && mine.length > 1 ? (
        <p className="mt-2 text-serif italic text-[var(--ink)]/82 text-[14px] sm:text-[15px]">
          <button type="button" onClick={() => setCommunityView(null)} className="text-[var(--ink)] hover:opacity-70 transition">
            {tr("Show all my communities", "Ver todas mis comunidades", "Voir toutes mes communautés")}
          </button>
        </p>
      ) : others.length > 0 ? (
        <p className="mt-2 text-serif italic text-[var(--ink)]/82 text-[14px] sm:text-[15px]">
          {others.length === 1
            ? `& ${others[0]!.label}`
            : tr(`& ${others.length} more communities`, `y ${others.length} comunidades más`, `& ${others.length} autres communautés`)}
        </p>
      ) : subtitle ? (
        <p className="mt-2 text-serif italic text-[var(--ink)]/82 text-[14px] sm:text-[15px]">{subtitle}</p>
      ) : null}
    </div>
  );
}

/** One quiet line for Play when browsing a community you have not joined. */
export function CommunityVisitNote({ view, locations }: { view: string | null; locations: string[] }) {
  const tr = useTr();
  if (!view || !isVisiting(view, locations)) return null;
  const label = communityOf(view)?.label ?? "";
  return (
    <p className="mt-2 text-serif italic text-[var(--ink)]/82 text-[14px]">
      {tr(`Visiting ${label}`, `De visita en ${label}`, `En visite à ${label}`)}
      {" · "}
      <button type="button" onClick={() => setCommunityView(null)} className="text-[var(--ink)] hover:opacity-70 transition">
        {tr("Back to my communities", "Volver a mis comunidades", "Retour à mes communautés")}
      </button>
    </p>
  );
}
