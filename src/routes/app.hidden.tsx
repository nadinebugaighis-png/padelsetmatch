import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHiddenAndBlocked, unhideProfile, unblockProfile } from "@/lib/app.functions";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";
import { CourtViewCard } from "@/components/CourtViewCard";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { photoSrc } from "@/lib/photo-src";

export const Route = createFileRoute("/app/hidden")({
  head: () => ({ meta: [{ title: "Hidden and blocked players \u00b7 PadelSetMatch" }, { name: "description", content: "Manage hidden and blocked players on PadelSetMatch." }, { property: "og:title", content: "Hidden and blocked players \u00b7 PadelSetMatch" }, { property: "og:description", content: "Manage hidden and blocked players on PadelSetMatch." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: HiddenBlockedPage,
});

type Row = {
  profile_id: string;
  first_name?: string;
  photo_url?: string | null;
  zone?: string | null;
  category?: string;
  created_at: string;
};

function Avatar({ r }: { r: Row }) {
  return (
    <div className="w-11 h-11 shrink-0 rounded-full overflow-hidden border border-[var(--ink)]/20 bg-[var(--paper-2)]">
      {r.photo_url
        ? <PlayerPhoto src={photoSrc(r.photo_url, 240)} seed={r.profile_id} alt={r.first_name ?? ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        : <CourtViewCard seed={r.profile_id} name={r.first_name} role="img" className="w-full h-full" letterClassName="text-[15px]" />}
    </div>
  );
}

function HiddenBlockedPage() {
  const tr = useTr();
  const qc = useQueryClient();
  const load = useServerFn(getHiddenAndBlocked);
  const unhide = useServerFn(unhideProfile);
  const unblock = useServerFn(unblockProfile);
  const q = useQuery({ queryKey: ["hidden-blocked"], queryFn: () => load() });

  type HideCat = "padel" | "friend" | "relationship" | "partner" | "all";
  const unhideM = useMutation({
    mutationFn: (vars: { id: string; category?: HideCat }) =>
      unhide({ data: { hiddenProfileId: vars.id, category: vars.category } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hidden-blocked"] });
      qc.invalidateQueries({ queryKey: ["discover"] });
      toast.success(tr("Back on your Home page", "De vuelta en tu Club", "De retour sur ton Club"));
    },
    onError: () => toast.error(tr("Couldn't unhide. Try again.", "No se pudo mostrar. Reintenta.", "Impossible d’afficher. Réessaie.")),
  });
  const unblockM = useMutation({
    mutationFn: (id: string) => unblock({ data: { blockedProfileId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hidden-blocked"] });
      qc.invalidateQueries({ queryKey: ["discover"] });
      toast.success(tr("Unblocked", "Desbloqueado", "Débloqué"));
    },
    onError: () => toast.error(tr("Couldn't unblock. Try again.", "No se pudo desbloquear. Reintenta.", "Impossible de débloquer. Réessaie.")),
  });

  const hidden = (q.data?.hidden ?? []) as Row[];
  const blocked = (q.data?.blocked ?? []) as Row[];

  // Older hide scopes are kept so pre-existing rows still show up.
  const groups: Array<{ label: string; scope: HideCat; rows: Row[] }> = [
    { label: tr("Padel partners", "Compañeros de pádel", "Partenaires de padel"), scope: "padel", rows: hidden.filter((h) => h.category === "padel") },
    { label: tr("Friends", "Amigos", "Amis"), scope: "friend", rows: hidden.filter((h) => h.category === "friend") },
    { label: tr("Other", "Otros", "Autres"), scope: "relationship", rows: hidden.filter((h) => h.category === "relationship") },
    { label: tr("Partners", "Compañeros", "Partenaires"), scope: "partner", rows: hidden.filter((h) => h.category === "partner") },
    { label: tr("Everywhere", "En todas partes", "Partout"), scope: "all", rows: hidden.filter((h) => h.category === "all") },
  ];
  const noneHidden = groups.every((g) => g.rows.length === 0);

  const sectionLabel = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/78";
  const rowClass = "flex items-center gap-3 py-3 border-b border-[var(--ink)]/16";
  const actionClass = "shrink-0 rounded-full border border-[var(--ink)]/40 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink)] active:bg-[var(--ink)]/[0.05] disabled:opacity-50";

  return (
    <main className="programme-page min-h-screen px-5 pt-6 pb-32 max-w-md sm:max-w-2xl mx-auto">
      <Link to="/app/settings" className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/82">
        <ArrowLeft className="w-3.5 h-3.5" /> {tr("Settings", "Ajustes", "Réglages")}
      </Link>
      <h1 className="mt-4 text-serif text-[28px] sm:text-[34px] leading-tight text-[var(--ink)]">{tr("Hidden & blocked", "Ocultos y bloqueados", "Masqués et bloqués")}</h1>
      <p className="mt-1.5 text-[13px] leading-snug text-[var(--ink)]/80">
        {tr("Unhide anyone to bring them back to your Home page. Blocked players and you never see each other.",
          "Muestra de nuevo a quien quieras y volverá a tu Club. Con los bloqueados, ninguno de los dos ve al otro.",
          "Réaffiche qui tu veux pour le retrouver sur ton Club. Avec un joueur bloqué, aucun de vous ne voit l’autre.")}
      </p>

      {q.isLoading && <p className="mt-8 text-[13px] text-[var(--ink)]/72">{tr("Loading…", "Cargando…", "Chargement…")}</p>}

      <section className="mt-7">
        <div className={sectionLabel}>{tr("Hidden", "Ocultos", "Masqués")}</div>
        <div className="mt-2 border-t border-[var(--ink)]/16">
          {noneHidden && !q.isLoading && <p className="py-4 text-[13px] text-[var(--ink)]/72">{tr("Nobody hidden.", "No has ocultado a nadie.", "Personne de masqué.")}</p>}
          {groups.map((g) => g.rows.map((r) => (
            <div key={`${r.profile_id}-${g.scope}`} className={rowClass}>
              <Avatar r={r} />
              <div className="flex-1 min-w-0">
                <div className="truncate text-[15px] text-[var(--ink)]">{r.first_name ?? "?"}</div>
                <div className="truncate text-[11px] text-[var(--ink)]/72">{r.zone ? `${r.zone} · ` : ""}{g.label}</div>
              </div>
              <button type="button" onClick={() => unhideM.mutate({ id: r.profile_id, category: g.scope })} disabled={unhideM.isPending} className={actionClass}>
                {tr("Unhide", "Mostrar", "Afficher")}
              </button>
            </div>
          )))}
        </div>
      </section>

      <section className="mt-9">
        <div className={sectionLabel}>{tr("Blocked", "Bloqueados", "Bloqués")}</div>
        <div className="mt-2 border-t border-[var(--ink)]/16">
          {blocked.length === 0 && !q.isLoading && <p className="py-4 text-[13px] text-[var(--ink)]/72">{tr("Nobody blocked.", "No has bloqueado a nadie.", "Personne de bloqué.")}</p>}
          {blocked.map((r) => (
            <div key={r.profile_id} className={rowClass}>
              <Avatar r={r} />
              <div className="flex-1 min-w-0">
                <div className="truncate text-[15px] text-[var(--ink)]">{r.first_name ?? "?"}</div>
                {r.zone && <div className="truncate text-[11px] text-[var(--ink)]/72">{r.zone}</div>}
              </div>
              <button
                type="button"
                onClick={() => {
                  const who = r.first_name ?? tr("this player", "este jugador", "ce joueur");
                  if (window.confirm(tr(`Unblock ${who}? You'll see each other again.`, `¿Desbloquear a ${who}? Volveréis a veros.`, `Débloquer ${who} ? Vous vous verrez de nouveau.`))) {
                    unblockM.mutate(r.profile_id);
                  }
                }}
                disabled={unblockM.isPending}
                className={actionClass}
              >
                {tr("Unblock", "Desbloquear", "Débloquer")}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
