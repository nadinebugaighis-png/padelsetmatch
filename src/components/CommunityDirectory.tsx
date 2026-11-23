import { useMemo, useState } from "react";
import { Check, ChevronRight, Mail, MessageCircle, Plus, Search } from "lucide-react";
import type { Community, Directory } from "@/lib/communities";
import { openExternal, openMailTo } from "@/lib/native";
import { useTr } from "@/lib/i18n";

export const CONCIERGE_WHATSAPP = "34620296060";
export const CONCIERGE_EMAIL = "Nadine@padelsetmatch.com";

const smallCaps = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/76";
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function useMembersLabel() {
  const tr = useTr();
  return (n: number) =>
    n === 0
      ? tr("New community", "Comunidad nueva", "Nouvelle communauté")
      : n === 1
        ? tr("1 member", "1 miembro", "1 membre")
        : tr(`${n} members`, `${n} miembros`, `${n} membres`);
}

export function CommunityRow({ c, onOpen, onJoin, joining, current }: {
  c: Community;
  onOpen: (c: Community) => void;
  onJoin?: (c: Community) => void;
  joining?: boolean;
  current?: boolean;
}) {
  const tr = useTr();
  const members = useMembersLabel();
  return (
    <li className="flex items-center">
      <button type="button" onClick={() => onOpen(c)}
        className="group min-w-0 flex-1 flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left transition active:bg-[var(--ink)]/[0.04] hover:bg-[var(--ink)]/[0.02]">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-serif text-[17px] sm:text-[19px] leading-tight text-[var(--ink)]">{c.label}</span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/72">
            {members(c.members)}
            {current && <> · {tr("Viewing", "Viendo", "Affichée")}</>}
          </span>
        </span>
        {!onJoin && <ChevronRight className="size-4 shrink-0 text-[var(--ink)]/45 group-active:translate-x-0.5 transition" strokeWidth={1.5} aria-hidden />}
      </button>
      {onJoin && (
        c.mine ? (
          <span className="mr-4 sm:mr-5 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/80">
            <Check className="size-3.5" strokeWidth={1.6} aria-hidden />{tr("Joined", "Unido", "Membre")}
          </span>
        ) : (
          <button type="button" disabled={joining} onClick={() => onJoin(c)}
            className="mr-4 sm:mr-5 h-8 rounded-full border border-[var(--ink)]/30 px-4 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] transition active:scale-[0.97] active:bg-[var(--ink)]/[0.04] disabled:opacity-50">
            {tr("Join", "Unirme", "Rejoindre")}
          </button>
        )
      )}
    </li>
  );
}

/** All communities grouped by country and city, biggest first, with search. */
export function CommunityDirectoryList({ directory, onOpen, onJoin, joiningKey, onStart, startLabel }: {
  directory: Directory;
  onOpen: (c: Community) => void;
  onJoin?: (c: Community) => void;
  joiningKey?: string | null;
  onStart: () => void;
  startLabel: string;
}) {
  const tr = useTr();
  const [q, setQ] = useState("");
  const countries = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return directory.countries;
    return directory.countries
      .map((co) => ({
        ...co,
        cities: co.cities
          .map((ci) => ({
            ...ci,
            communities: fold(`${co.country} ${ci.city}`).includes(needle)
              ? ci.communities
              : ci.communities.filter((c) => fold(c.label).includes(needle)),
          }))
          .filter((ci) => ci.communities.length > 0),
      }))
      .filter((co) => co.cities.length > 0);
  }, [directory, q]);

  return (
    <div>
      <label className="flex items-center gap-2.5 border-b border-[var(--ink)]/22 h-11 focus-within:border-[var(--ink)]/45 transition">
        <Search className="size-4 text-[var(--ink)]/70" strokeWidth={1.6} />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Search a country, city or area", "Busca un país, ciudad o zona", "Chercher un pays, une ville ou un quartier")}
          className="w-full bg-transparent text-[15px] text-[var(--ink)] placeholder:text-[var(--ink)]/55 placeholder:italic outline-none" />
      </label>

      <div className="mt-6 space-y-8">
        {countries.map((co) => (
          <section key={co.country}>
            <h3 className={smallCaps}>{co.country}</h3>
            <div className="mt-3 space-y-5">
              {co.cities.map((ci) => (
                <div key={ci.city}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-serif text-[20px] sm:text-[22px] leading-tight text-[var(--ink)]">{ci.city}</h4>
                    {ci.communities.length > 1 && (
                      <span className="text-serif italic text-[12.5px] text-[var(--ink)]/72">
                        {tr(`${ci.communities.length} communities`, `${ci.communities.length} comunidades`, `${ci.communities.length} communautés`)}
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 overflow-hidden rounded-2xl card-pop divide-y divide-[var(--ink)]/[0.07]">
                    {ci.communities.map((c) => (
                      <CommunityRow key={c.key} c={c} onOpen={onOpen} onJoin={onJoin} joining={joiningKey === c.key} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
        {countries.length === 0 && (
          <p className="py-6 text-center text-serif italic text-[15px] text-[var(--ink)]/76">
            {tr("No community there yet. Start the first one.", "Aún no hay comunidad ahí. Crea la primera.", "Pas encore de communauté ici. Lance la première.")}
          </p>
        )}
      </div>

      <button type="button" onClick={onStart}
        className="mt-8 w-full flex items-center gap-4 rounded-2xl border border-dashed border-[var(--ink)]/35 px-5 py-4 text-left transition active:scale-[0.99] active:bg-[var(--ink)]/[0.03] hover:border-[var(--ink)]/55">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--ink)]/30">
          <Plus className="size-4 text-[var(--ink)]" strokeWidth={1.6} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-serif text-[18px] leading-tight text-[var(--ink)]">{startLabel}</span>
          <span className="mt-1 block text-serif italic text-[13.5px] text-[var(--ink)]/78">
            {tr("Your neighbourhood, club or city. You become its founder.", "Tu barrio, club o ciudad. Serás su fundador.", "Ton quartier, club ou ville. Tu en deviens le fondateur.")}
          </span>
        </span>
      </button>

      <ConciergeNote />
    </div>
  );
}

export function ConciergeNote({ community }: { community?: string }) {
  const tr = useTr();
  const text = community
    ? tr(`Hi Nadine! I just started the ${community} community on PadelSetMatch.`, `¡Hola Nadine! Acabo de crear la comunidad ${community} en PadelSetMatch.`, `Bonjour Nadine ! Je viens de lancer la communauté ${community} sur PadelSetMatch.`)
    : tr("Hi Nadine! I'd like to start a community on PadelSetMatch.", "¡Hola Nadine! Me gustaría crear una comunidad en PadelSetMatch.", "Bonjour Nadine ! J'aimerais lancer une communauté sur PadelSetMatch.");
  const pill = "inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--ink)]/30 px-5 text-[10.5px] uppercase tracking-[0.2em] text-[var(--ink)] transition active:scale-[0.98] active:bg-[var(--ink)]/[0.04]";
  return (
    <div className="mt-10 border-t border-[var(--ink)]/16 pt-6 text-center">
      <p className={smallCaps}>{tr("Founders and organisers", "Fundadores y organizadores", "Fondateurs et organisateurs")}</p>
      <p className="mt-2 text-serif italic text-[15px] text-[var(--ink)]/82">
        {tr("Speak to Nadine directly. She will help you launch.", "Habla directamente con Nadine. Te ayudará a lanzarla.", "Parle directement à Nadine. Elle t'aidera à la lancer.")}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        <button type="button" className={pill} onClick={() => void openExternal(`https://wa.me/${CONCIERGE_WHATSAPP}?text=${encodeURIComponent(text)}`)}>
          <MessageCircle className="size-3.5" strokeWidth={1.6} aria-hidden />WhatsApp
        </button>
        <button type="button" className={pill} onClick={() => void openMailTo(CONCIERGE_EMAIL, tr("New community", "Nueva comunidad", "Nouvelle communauté"))}>
          <Mail className="size-3.5" strokeWidth={1.6} aria-hidden />{tr("Email", "Email", "E-mail")}
        </button>
      </div>
    </div>
  );
}
