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

type CardDef = {
  to: string;
  title: string;
  desc: string;
  img: string;
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
      img: "/landing/grid1.jpg",
      icon: <LayoutGrid className="w-5 h-5" />,
    },
    {
      to: "/app/events",
      title: tr("Play", "Jugar", "Jouer"),
      desc: tr("Organize or join a match", "Organiza o únete a un partido", "Organise ou rejoins un match"),
      img: "/landing/grid2.jpg",
      icon: <PlayMenuIcon className="w-6 h-6" />,
    },
    {
      to: "/app/matches",
      title: tr("Matchat", "Matchat", "Matchat"),
      desc: tr("Chat with your matches", "Chatea con tus matches", "Discute avec tes matchs"),
      img: "/landing/grid3.jpg",
      icon: <MessageCircle className="w-5 h-5" />,
      badge: unread,
    },
    {
      to: "/app/profile",
      title: tr("Profile", "Perfil", "Profil"),
      desc: tr("Manage your profile & preferences", "Gestiona tu perfil y preferencias", "Gère ton profil et préférences"),
      img: "/landing/grid4.jpg",
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
            className="group relative rounded-2xl overflow-hidden bg-[var(--cream)] text-[var(--court-deep)] shadow-lg hover:shadow-xl transition-shadow flex flex-col"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <img
                src={c.img}
                alt=""
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="relative px-4 pt-6 pb-4 flex-1">
              <span
                className="absolute -top-5 left-3 w-10 h-10 rounded-xl bg-[var(--court-deep)] text-[var(--cream)] flex items-center justify-center shadow-md"
                aria-hidden
              >
                {c.icon}
                {!!c.badge && c.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[10px] font-bold flex items-center justify-center">
                    {c.badge > 9 ? "9+" : c.badge}
                  </span>
                )}
              </span>
              <h2 className="text-display text-xl leading-tight">{c.title}</h2>
              <p className="mt-1 text-xs text-[var(--court-deep)]/70 leading-snug">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
