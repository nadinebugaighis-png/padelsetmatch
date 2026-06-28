import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyMatches } from "@/lib/app.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/matches")({
  component: Matches,
});

function Matches() {
  const getMatches = useServerFn(getMyMatches);
  const q = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches() });
  const { t, label } = useI18n();

  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <h1 className="text-display text-4xl">{t("ml.h1")}</h1>
      <p className="text-sm text-[var(--cream)]/70 mt-1">{t("ml.sub")}</p>

      {q.isLoading ? (
        <p className="mt-8 text-center text-[var(--cream)]/60">{t("ml.loading")}</p>
      ) : !q.data || q.data.length === 0 ? (
        <div className="mt-12 text-center text-[var(--cream)]/60">
          <p>{t("ml.empty")}</p>
          <Link to="/app" className="underline mt-2 inline-block">{t("ml.discoverLink")}</Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {q.data.map((m) => m.other && (
            <li key={m.match_id}>
              <Link to="/app/matches/$matchId" params={{ matchId: m.match_id }} className="flex items-center gap-3 surface-card p-3 hover:bg-[var(--cream)]/5">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--cream)]/10 shrink-0">
                  {m.other.photo_url && <img src={m.other.photo_url} alt={m.other.first_name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-display text-2xl">{m.other.first_name}, {m.other.age}</div>
                  <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60">{m.other.zone} · {label(m.other.level)}</div>
                  <div className="text-xs text-[var(--cream)]/70 mt-1 truncate">{m.other.bio}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
