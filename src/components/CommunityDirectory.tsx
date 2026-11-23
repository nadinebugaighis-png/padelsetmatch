import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Check, ChevronRight, Mail, MessageCircle, Plus, Share } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { communityShareUrl, isCityOnly, publicDirectory, type Community, type Directory } from "@/lib/communities";
import { nativeShare, openExternal, openMailTo } from "@/lib/native";
import { useTr } from "@/lib/i18n";

export const CONCIERGE_WHATSAPP = "34620296060";
export const CONCIERGE_EMAIL = "Nadine@padelsetmatch.com";

const smallCaps = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/76";

export function useMembersLabel() {
  const tr = useTr();
  return (n: number) =>
    n === 0
      ? tr("New community", "Comunidad nueva", "Nouvelle communauté")
      : n === 1
        ? tr("1 member", "1 miembro", "1 membre")
        : tr(`${n} members`, `${n} miembros`, `${n} membres`);
}

/** Small round seal for communities that have their own logo. */
export function CommunitySeal({ logo, className = "size-9" }: { logo?: string; className?: string }) {
  if (!logo) return null;
  return <img src={logo} alt="" aria-hidden loading="lazy" decoding="async" draggable={false} className={`${className} shrink-0 rounded-full object-cover shadow-[0_1px_3px_rgba(0,0,0,0.18)]`} />;
}

type ShareTarget = (c: Community) => void;
const ShareContext = createContext<ShareTarget | null>(null);

/**
 * Press and hold a community to share it. Holding opens a small sheet whose
 * Share button is a real tap, because phones only allow the share menu and
 * clipboard straight after a tap, never from a timer during a hold.
 */
export function CommunityShareProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Community | null>(null);
  return (
    <ShareContext.Provider value={setTarget}>
      {children}
      <CommunityShareSheet community={target} onClose={() => setTarget(null)} />
    </ShareContext.Provider>
  );
}

function CommunityShareSheet({ community, onClose }: { community: Community | null; onClose: () => void }) {
  const tr = useTr();
  const members = useMembersLabel();
  const [fallback, setFallback] = useState<string | null>(null);
  const [last, setLast] = useState<Community | null>(null);
  if (community && community !== last) { setLast(community); setFallback(null); }
  const c = community ?? last;
  const url = c ? communityShareUrl(c.location) : "";

  const share = async () => {
    if (!c) return;
    const outcome = await nativeShare({
      title: c.label,
      text: tr(`Join ${c.label} on PadelSetMatch`, `Únete a ${c.label} en PadelSetMatch`, `Rejoins ${c.label} sur PadelSetMatch`),
      url,
    });
    if (outcome === "shared") onClose();
    else if (outcome === "copied") { toast.success(tr("Link copied", "Enlace copiado", "Lien copié")); onClose(); }
    else if (outcome === "unavailable") setFallback(url);
  };

  return (
    <Drawer open={!!community} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DrawerContent className="bg-[var(--paper)] border-[var(--ink)]/16">
        <div className="mx-auto w-full max-w-md px-6 pt-4 pb-8 text-center">
          {c && (
            <>
              {c.logo && <div className="flex justify-center"><CommunitySeal logo={c.logo} className="size-16" /></div>}
              <DrawerTitle asChild>
                <div className={`${c.logo ? "mt-3" : ""} text-serif text-[24px] leading-tight text-[var(--ink)] font-normal`}>{c.label}</div>
              </DrawerTitle>
              <DrawerDescription className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/72">
                {c.label !== c.city ? `${c.city} · ` : ""}{members(c.members)}
              </DrawerDescription>
              <button type="button" onClick={() => void share()}
                className="mt-6 mx-auto w-full max-w-[260px] h-10 px-6 rounded-full bg-[var(--ink)] text-[var(--paper)] font-medium uppercase tracking-[0.16em] text-[11px] flex items-center justify-center gap-2 transition active:scale-[0.98]">
                <Share className="size-3.5" strokeWidth={1.8} aria-hidden />{tr("Share community", "Compartir comunidad", "Partager")}
              </button>
              {fallback && (
                <p className="mt-4 select-all break-all text-[13px] text-[var(--ink)]/80">{fallback}</p>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Pointer handlers that open the share sheet after a press and hold. */
export function useCommunityShare() {
  const open = useContext(ShareContext);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };

  return (c: Community) => open ? {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = setTimeout(() => {
        fired.current = true;
        try { navigator.vibrate?.(12); } catch { /* not supported */ }
        open(c);
      }, 500);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClickCapture: (e: React.MouseEvent) => { if (fired.current) { e.preventDefault(); e.stopPropagation(); fired.current = false; } },
  } : {};
}

/** Classes that stop the phone's own text-selection menu on a long press. */
export const holdable = "select-none [-webkit-touch-callout:none]";

export function CommunityRow({ c, label, onOpen, onJoin, joining, current }: {
  c: Community;
  /** Display name when it should differ from the community's own name. */
  label?: string;
  onOpen: (c: Community) => void;
  onJoin?: (c: Community) => void;
  joining?: boolean;
  current?: boolean;
}) {
  const tr = useTr();
  const members = useMembersLabel();
  const hold = useCommunityShare();
  return (
    <li className="flex items-center">
      <button type="button" onClick={() => onOpen(c)} {...hold(c)}
        className={`group min-w-0 flex-1 flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left transition active:bg-[var(--ink)]/[0.04] hover:bg-[var(--ink)]/[0.02] ${holdable}`}>
        <CommunitySeal logo={c.logo} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-serif text-[17px] sm:text-[19px] leading-tight text-[var(--ink)]">{label ?? c.label}</span>
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

/** All communities grouped by country and city, biggest first. */
export function CommunityDirectoryList({ directory, onOpen, onJoin, joiningKey, onStart, startLabel }: {
  directory: Directory;
  onOpen: (c: Community) => void;
  onJoin?: (c: Community) => void;
  joiningKey?: string | null;
  onStart: () => void;
  startLabel: string;
}) {
  const tr = useTr();
  const { countries } = publicDirectory(directory);

  return (
    <div>
      <div className="space-y-8">
        {countries.map((co) => (
          <section key={co.country}>
            <h3 className={smallCaps}>{co.country}</h3>
            <div className="mt-3 space-y-5">
              {co.cities.filter((ci) => !isCityOnly(ci)).map((ci) => (
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
                      <CommunityRow key={c.key} c={c} label={c.area ? undefined : tr(`All of ${c.city}`, `Todo ${c.city}`, `Tout ${c.city}`)}
                        onOpen={onOpen} onJoin={onJoin} joining={joiningKey === c.key} />
                    ))}
                  </ul>
                </div>
              ))}
              {/* Cities whose players chose no neighbourhood: one row each, no repeated heading. */}
              {co.cities.some(isCityOnly) && (
                <ul className="overflow-hidden rounded-2xl card-pop divide-y divide-[var(--ink)]/[0.07]">
                  {co.cities.filter(isCityOnly).map((ci) => (
                    <CommunityRow key={ci.communities[0]!.key} c={ci.communities[0]!} onOpen={onOpen} onJoin={onJoin} joining={joiningKey === ci.communities[0]!.key} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      <button type="button" onClick={onStart}
        className="mt-8 w-full flex items-center gap-4 rounded-2xl border border-dashed border-[var(--ink)]/35 px-5 py-4 text-left transition active:scale-[0.99] active:bg-[var(--ink)]/[0.03] hover:border-[var(--ink)]/55">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--ink)]/30">
          <Plus className="size-4 text-[var(--ink)]" strokeWidth={1.6} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-serif text-[18px] leading-tight text-[var(--ink)]">{startLabel}</span>
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
