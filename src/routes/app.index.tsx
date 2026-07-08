import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LayoutGrid, MessageCircle, User } from "lucide-react";
import { getMyProfile, getMyMatches } from "@/lib/app.functions";
import { PlayMenuIcon } from "@/components/PlayMenuIcon";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Home · PadelMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Home,
});

// Abstract, on-brand SVG artwork for each card. No photos.
function GridArt() {
  // Player grid — abstract portrait tiles
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="200" height="150" fill="var(--court-deep)" />
      <g opacity="0.9">
        {[0, 1, 2, 3].map((c) =>
          [0, 1, 2].map((r) => {
            const x = 14 + c * 44;
            const y = 12 + r * 44;
            const isBall = (c + r) % 4 === 2;
            return (
              <g key={`${c}-${r}`}>
                <rect x={x} y={y} width="36" height="36" rx="8" fill={isBall ? "var(--ball)" : "var(--cream)"} opacity={isBall ? 1 : 0.14 + ((c * r) % 3) * 0.08} />
                {isBall && <circle cx={x + 18} cy={y + 18} r="6" fill="var(--court-deep)" opacity="0.35" />}
              </g>
            );
          })
        )}
      </g>
    </svg>
  );
}

function PlayArt() {
  // Court + ball arc
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="200" height="150" fill="var(--court-deep)" />
      <g stroke="var(--cream)" strokeOpacity="0.35" strokeWidth="1.2" fill="none">
        <rect x="24" y="22" width="152" height="106" rx="4" />
        <line x1="100" y1="22" x2="100" y2="128" />
        <line x1="24" y1="75" x2="176" y2="75" strokeDasharray="2 3" />
        <rect x="24" y="52" width="152" height="46" fill="var(--cream)" fillOpacity="0.04" />
      </g>
      {/* trail */}
      <path d="M40 118 Q 100 20 160 90" stroke="var(--ball)" strokeWidth="1.5" strokeDasharray="1 4" fill="none" opacity="0.7" />
      <circle cx="160" cy="90" r="8" fill="var(--ball)" />
      <circle cx="160" cy="90" r="8" fill="none" stroke="var(--court-deep)" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

function ChatArt() {
  // Overlapping chat bubbles
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="200" height="150" fill="var(--court-deep)" />
      <g>
        <rect x="22" y="34" width="96" height="34" rx="17" fill="var(--cream)" opacity="0.14" />
        <rect x="60" y="72" width="118" height="38" rx="19" fill="var(--ball)" />
        <circle cx="76" cy="91" r="2.4" fill="var(--court-deep)" />
        <circle cx="88" cy="91" r="2.4" fill="var(--court-deep)" />
        <circle cx="100" cy="91" r="2.4" fill="var(--court-deep)" />
        <rect x="34" y="112" width="60" height="22" rx="11" fill="var(--cream)" opacity="0.22" />
      </g>
    </svg>
  );
}

function ProfileArt() {
  // Abstract silhouette + rings
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="200" height="150" fill="var(--court-deep)" />
      <g opacity="0.35" stroke="var(--cream)" fill="none">
        <circle cx="100" cy="82" r="52" />
        <circle cx="100" cy="82" r="38" />
        <circle cx="100" cy="82" r="24" />
      </g>
      <g>
        <circle cx="100" cy="62" r="18" fill="var(--cream)" />
        <path d="M60 138 Q 100 90 140 138 Z" fill="var(--cream)" />
        <circle cx="140" cy="42" r="6" fill="var(--ball)" />
      </g>
    </svg>
  );
}

type CardDef = {
  to: string;
  title: string;
  desc: string;
  art: React.ReactNode;
  icon: React.ReactNode;
  badge?: number;
};

function Home() {
  const navigate = useNavigate();
  const tr = useTr();
  const getProfile = useServerFn(getMyProfile);
  const getMatches = useServerFn(getMyMatches);
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile(), retry: false });
  const matchesQ = useQuery({
    queryKey: ["my-matches"],
    queryFn: () => getMatches(),
    enabled: !!profileQ.data,
    retry: false,
  });

  useEffect(() => {
    if (profileQ.isSuccess && !profileQ.data) navigate({ to: "/app/onboarding" });
  }, [profileQ.isSuccess, profileQ.data, navigate]);

  const name = profileQ.data?.first_name ?? "";
  const unread = matchesQ.data?.reduce((n, m) => n + (m.unread ?? 0), 0) ?? 0;

  const cards: CardDef[] = [
    {
      to: "/app/grid",
      title: tr("Your Grid", "Tu Grid", "Ta Grille"),
      desc: tr("Discover players near you", "Descubre jugadores cerca", "Découvre des joueurs près de toi"),
      art: <GridArt />,
      icon: <LayoutGrid className="w-5 h-5" />,
    },
    {
      to: "/app/events",
      title: tr("Play", "Jugar", "Jouer"),
      desc: tr("Organize or join a match", "Organiza o únete a un partido", "Organise ou rejoins un match"),
      art: <PlayArt />,
      icon: <PlayMenuIcon className="w-6 h-6" />,
    },
    {
      to: "/app/matches",
      title: tr("Matchat", "Matchat", "Matchat"),
      desc: tr("Chat with your matches", "Chatea con tus matches", "Discute avec tes matchs"),
      art: <ChatArt />,
      icon: <MessageCircle className="w-5 h-5" />,
      badge: unread,
    },
    {
      to: "/app/profile",
      title: tr("Profile", "Perfil", "Profil"),
      desc: tr("Manage your profile & preferences", "Gestiona tu perfil y preferencias", "Gère ton profil et préférences"),
      art: <ProfileArt />,
      icon: <User className="w-5 h-5" />,
    },
  ];

  return (
    <main className="px-5 py-6 max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="text-display text-5xl sm:text-6xl leading-[0.95]">
        {tr("Vamos", "Vamos", "Allez")}
        {name ? `, ${name}` : ""}!
      </h1>
      <p className="mt-2 text-sm text-[var(--cream)]/70">
        {tr(
          "Patience wins rallies — pick your next move.",
          "La paciencia gana peloteos — elige tu siguiente jugada.",
          "La patience gagne les échanges — choisis ton prochain coup.",
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative rounded-2xl overflow-hidden border border-[var(--cream)]/12 bg-[var(--cream)]/[0.04] hover:bg-[var(--cream)]/[0.07] hover:border-[var(--cream)]/25 transition flex flex-col"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[var(--cream)]/10">
              {c.art}
            </div>
            <div className="relative px-4 pt-6 pb-4 flex-1">
              <span
                className="absolute -top-5 left-3 w-10 h-10 rounded-xl bg-[var(--ball)] text-[var(--court-deep)] flex items-center justify-center shadow-md ring-4 ring-[var(--court-deep)]"
                aria-hidden
              >
                {c.icon}
                {!!c.badge && c.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--cream)] text-[var(--court-deep)] text-[10px] font-bold flex items-center justify-center">
                    {c.badge > 9 ? "9+" : c.badge}
                  </span>
                )}
              </span>
              <h2 className="text-display text-xl leading-tight text-[var(--cream)]">{c.title}</h2>
              <p className="mt-1 text-xs text-[var(--cream)]/65 leading-snug">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
