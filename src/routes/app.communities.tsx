import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { CommunityDirectoryList, CommunityRow, CommunitySeal, CommunityShareProvider, ConciergeNote, holdable, useCommunityShare, useMembersLabel } from "@/components/CommunityDirectory";
import { getCommunityDirectory, joinCommunity, leaveCommunity } from "@/lib/communities.functions";
import { communityOf, type Community } from "@/lib/communities";
import { setCommunityView, useCommunityView } from "@/lib/community-view";
import { COUNTRY_NAMES, areasFor, citiesFor } from "@/lib/locations";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/communities")({
  head: () => ({
    meta: [
      { title: "Communities · PadelSetMatch" },
      { name: "description", content: "Your padel communities and every PadelSetMatch community by country and city, with member counts. Join one or start your own." },
      { property: "og:title", content: "Communities · PadelSetMatch" },
      { property: "og:description", content: "Every PadelSetMatch community by country and city, with member counts. Join one or start your own." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { c?: string } => (typeof s.c === "string" && s.c.length <= 200 ? { c: s.c } : {}),
  component: CommunitiesPage,
});

const smallCaps = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/76";

function CommunitiesPage() {
  const tr = useTr();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const members = useMembersLabel();
  const view = useCommunityView();
  const { c: sharedLocation } = Route.useSearch();
  const hold = useCommunityShare();
  const getDirectory = useServerFn(getCommunityDirectory);
  const join = useServerFn(joinCommunity);
  const leave = useServerFn(leaveCommunity);
  const dirQ = useQuery({ queryKey: ["community-directory"], queryFn: () => getDirectory(), staleTime: 60_000 });
  const [startOpen, setStartOpen] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["community-directory"] });
    qc.invalidateQueries({ queryKey: ["discover"] });
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    qc.invalidateQueries({ queryKey: ["open-events"] });
  };

  const joinM = useMutation({
    mutationFn: (c: Community) => join({ data: { location: c.location } }),
    onSuccess: (_r, c) => { toast.success(tr(`Welcome to ${c.label}`, `Bienvenido a ${c.label}`, `Bienvenue à ${c.label}`)); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const leaveM = useMutation({
    mutationFn: (c: Community) => leave({ data: { location: c.location } }),
    onSuccess: (_r, c) => {
      if (view && communityOf(view)?.key === c.key) setCommunityView(null);
      toast.success(tr(`You left ${c.label}`, `Has salido de ${c.label}`, `Tu as quitté ${c.label}`));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = (location: string | null) => {
    setCommunityView(location);
    navigate({ to: "/app/grid" });
  };
  const viewKey = view ? communityOf(view)?.key : null;
  const mine = dirQ.data?.mine ?? [];
  // A community someone shared: shown first, ready to join.
  const sharedKey = sharedLocation ? communityOf(sharedLocation)?.key ?? null : null;
  const shared = sharedKey
    ? dirQ.data?.countries.flatMap((co) => co.cities.flatMap((ci) => ci.communities)).find((c) => c.key === sharedKey) ?? null
    : null;

  return (
    <CommunityShareProvider>
    <div className="programme-page min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl mx-auto px-5 sm:px-6 pt-2 sm:pt-4 pb-32">
        <button type="button" onClick={() => navigate({ to: "/app/grid" })} aria-label={tr("Back", "Atrás", "Retour")} className="-ml-2 grid size-10 place-items-center rounded-full text-[var(--ink)] active:opacity-60"><ArrowLeft className="size-5" strokeWidth={1.6} /></button>

        <header className="mt-1">
          <h1 className="text-serif text-[28px] sm:text-5xl leading-none text-[var(--ink)]">{tr("Communities", "Comunidades", "Communautés")}</h1>
        </header>

        {dirQ.isPending ? (
          <div className="mt-8 space-y-3" aria-busy>
            {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-[var(--ink)]/[0.05] animate-pulse" />)}
          </div>
        ) : dirQ.isError ? (
          <div className="mt-10 text-center">
            <p className="text-serif italic text-[15px] text-[var(--ink)]/80">{tr("Couldn't load communities.", "No se pudieron cargar las comunidades.", "Impossible de charger les communautés.")}</p>
            <button type="button" onClick={() => dirQ.refetch()} className="mt-3 h-10 rounded-full border border-[var(--ink)]/30 px-5 text-[10.5px] uppercase tracking-[0.2em] text-[var(--ink)]">{tr("Try again", "Reintentar", "Réessayer")}</button>
          </div>
        ) : (
          <>
            {shared && (
              <section className="mt-7">
                <h2 className={smallCaps}>{tr("Shared with you", "Te la han compartido", "Partagée avec toi")}</h2>
                <ul className="mt-3 overflow-hidden rounded-2xl card-pop">
                  <CommunityRow c={shared} onOpen={(c) => open(c.location)} onJoin={(c) => joinM.mutate(c)} joining={joinM.isPending && joinM.variables?.key === shared.key} />
                </ul>
              </section>
            )}

            <section className="mt-7">
              <h2 className={smallCaps}>{tr("Clubs", "Clubes", "Clubs")}</h2>
              <ul className="mt-3 overflow-hidden rounded-2xl card-pop">
                <li>
                  <a href="/club/la-moraleja" className="flex items-center gap-3 px-4 sm:px-5 py-3.5 transition active:bg-[var(--ink)]/[0.04]">
                    <CommunitySeal logo="/clubs/la-moraleja-seal.svg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-serif text-[17px] sm:text-[19px] leading-tight text-[var(--ink)]">Club de Pádel La Moraleja</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/72">Madrid · {tr("Club page", "Página del club", "Page du club")}</span>
                    </span>
                  </a>
                </li>
              </ul>
            </section>

            {mine.length > 0 && (
              <section className="mt-7">
                <h2 className={smallCaps}>{tr("Your communities", "Tus comunidades", "Tes communautés")}</h2>
                <ul className="mt-3 overflow-hidden rounded-2xl card-pop divide-y divide-[var(--ink)]/[0.07]">
                  {mine.map((c) => (
                    <li key={c.key} className="flex items-center">
                      <button type="button" onClick={() => open(c.location)} {...hold(c)} className={`group min-w-0 flex-1 flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left transition active:bg-[var(--ink)]/[0.04] ${holdable}`}>
                        <CommunitySeal logo={c.logo} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-serif text-[17px] sm:text-[19px] leading-tight text-[var(--ink)]">{c.label}</span>
                          <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/72">
                            {c.label !== c.city ? `${c.city} · ` : ""}{members(c.members)}
                            {(viewKey === c.key || (!view && mine.length === 1)) && <> · {tr("Viewing", "Viendo", "Affichée")}</>}
                          </span>
                        </span>
                      </button>
                      {mine.length > 1 && (
                        <button type="button" disabled={leaveM.isPending}
                          onClick={() => { if (window.confirm(tr(`Leave ${c.label}?`, `¿Salir de ${c.label}?`, `Quitter ${c.label} ?`))) leaveM.mutate(c); }}
                          className="mr-4 sm:mr-5 text-serif italic text-[13px] text-[var(--ink)]/70 underline-offset-4 hover:underline disabled:opacity-50">
                          {tr("Leave", "Salir", "Quitter")}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-10">
              <div>
                <CommunityDirectoryList
                  directory={dirQ.data}
                  onOpen={(c) => open(c.location)}
                  onJoin={(c) => joinM.mutate(c)}
                  joiningKey={joinM.isPending ? joinM.variables?.key ?? null : null}
                  onStart={() => setStartOpen(true)}
                  startLabel={tr("Start a community", "Crea una comunidad", "Lance une communauté")}
                />
              </div>
            </section>
          </>
        )}
      </div>

      <StartCommunitySheet open={startOpen} onOpenChange={setStartOpen} onStarted={(location) => { refresh(); open(location); }} />
    </div>
    </CommunityShareProvider>
  );
}

function StartCommunitySheet({ open, onOpenChange, onStarted }: { open: boolean; onOpenChange: (v: boolean) => void; onStarted: (location: string) => void }) {
  const tr = useTr();
  const join = useServerFn(joinCommunity);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [started, setStarted] = useState<{ location: string; label: string; existed: boolean } | null>(null);
  const cities = citiesFor(country.trim()).map((c) => c.name);
  const areas = areasFor(country.trim(), city.trim());

  const startM = useMutation({
    mutationFn: () => join({ data: { country, city, area } }),
    onSuccess: (r) => setStarted({ location: r.location, label: communityOf(r.location)?.label ?? city, existed: r.alreadyMember }),
    onError: (e: Error) => toast.error(e.message),
  });

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) { setStarted(null); setCountry(""); setCity(""); setArea(""); }
  };
  const field = "mt-1.5 w-full h-11 border-b border-[var(--ink)]/25 bg-transparent text-[16px] text-[var(--ink)] placeholder:text-[var(--ink)]/50 placeholder:italic outline-none focus:border-[var(--ink)]/55 transition";
  const label = "block text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/76";

  return (
    <Drawer open={open} onOpenChange={close}>
      <DrawerContent className="bg-[var(--paper)] border-[var(--ink)]/16">
        <div className="mx-auto w-full max-w-md px-6 pt-4 pb-8">
          {started ? (
            <>
              <DrawerTitle asChild>
                <div className="text-serif text-[24px] leading-tight text-[var(--ink)] font-normal text-center">
                  {started.existed
                    ? tr(`You're in ${started.label}`, `Ya estás en ${started.label}`, `Tu fais partie de ${started.label}`)
                    : tr(`${started.label} is live`, `${started.label} ya está en marcha`, `${started.label} est lancée`)}
                </div>
              </DrawerTitle>
              <DrawerDescription className="sr-only">{started.label}</DrawerDescription>
              <button type="button" onClick={() => { const l = started.location; close(false); onStarted(l); }}
                className="mt-6 mx-auto w-full max-w-[260px] h-10 px-6 rounded-full bg-[var(--ink)] text-[var(--paper)] font-medium uppercase tracking-[0.16em] text-[11px] flex items-center justify-center transition active:scale-[0.98]">
                {tr("Open my community", "Abrir mi comunidad", "Ouvrir ma communauté")}
              </button>
              <ConciergeNote community={started.label} />
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); startM.mutate(); }}>
              <DrawerTitle asChild>
                <div className="text-serif text-[24px] leading-tight text-[var(--ink)] font-normal text-center">{tr("Start a community", "Crea una comunidad", "Lance une communauté")}</div>
              </DrawerTitle>
              <DrawerDescription className="sr-only">{tr("Start a community", "Crea una comunidad", "Lance une communauté")}</DrawerDescription>
              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className={label}>{tr("Country", "País", "Pays")}</span>
                  <input className={field} list="psm-countries" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} required autoComplete="off" placeholder={tr("Italy", "Italia", "Italie")} />
                  <datalist id="psm-countries">{COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
                </label>
                <label className="block">
                  <span className={label}>{tr("City", "Ciudad", "Ville")}</span>
                  <input className={field} list="psm-cities" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} required autoComplete="off" placeholder={tr("Milan", "Milán", "Milan")} />
                  <datalist id="psm-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
                </label>
                <label className="block">
                  <span className={label}>{tr("Neighbourhood or club (optional)", "Barrio o club (opcional)", "Quartier ou club (facultatif)")}</span>
                  <input className={field} list="psm-areas" value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} autoComplete="off" placeholder={tr("Brera", "Brera", "Brera")} />
                  <datalist id="psm-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
                </label>
              </div>
              <button type="submit" disabled={startM.isPending || !country.trim() || !city.trim()}
                className="mt-7 mx-auto w-full max-w-[260px] h-10 px-6 rounded-full bg-[var(--ink)] text-[var(--paper)] font-medium uppercase tracking-[0.16em] text-[11px] flex items-center justify-center transition active:scale-[0.98] disabled:opacity-45">
                {startM.isPending ? tr("Starting…", "Creando…", "Lancement…") : tr("Start community", "Crear comunidad", "Lancer")}
              </button>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
