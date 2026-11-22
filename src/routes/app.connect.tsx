import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, MessageCircle, MoreHorizontal, Pencil, Plus, SendHorizontal, ShieldAlert, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  addConnectComment,
  createConnectPost,
  deleteConnectComment,
  deleteConnectPost,
  listConnectComments,
  listConnectPosts,
  updateConnectComment,
  updateConnectPost,
  type ConnectCategory,
  type ConnectPost,
} from "@/lib/connect.functions";
import { getMyProfile } from "@/lib/app.functions";
import { adminDeleteContent, getIsAdmin } from "@/lib/admin.functions";
import { useI18n, useTr } from "@/lib/i18n";
import { ReportContentButton } from "@/components/ReportContentButton";
import { Button } from "@/components/ui/button";
import { WhoCanPlay } from "@/components/WhoCanPlay";
import { PLAY_SLOTS } from "@/lib/who-can-play";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const searchSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  slot: z.enum(PLAY_SLOTS).optional().catch(undefined),
  area: z.string().max(120).optional().catch(undefined),
  chat: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/app/connect")({
  head: () => ({ meta: [
      { name: "description", content: "See who can play near you this week and join them with one tap." },
      { property: "og:title", content: "Who can play? \u00b7 PadelSetMatch" },
      { property: "og:description", content: "See who can play near you this week and join them with one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },{ title: "Who can play? · PadelSetMatch" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ConnectPage,
});

const CATEGORIES: ConnectCategory[] = ["traveling", "looking_to_play", "looking_for_coach", "selling", "question", "news", "other"];

function useCategoryLabel() {
  const tr = useTr();
  return (c: ConnectCategory) => {
    switch (c) {
      case "traveling": return tr("Travelling", "De viaje", "En voyage");
      case "looking_to_play": return tr("Play", "Jugar", "Jouer");
      case "looking_for_coach": return tr("Coaching", "Entrenador", "Coaching");
      case "selling": return tr("Offers", "Ofertas", "Offres");
      case "question": return tr("Questions", "Preguntas", "Questions");
      case "news": return tr("News", "Noticias", "Actualités");
      case "other": return tr("Other", "Otro", "Autre");
    }
  };
}

function timeAgo(iso: string, tr: ReturnType<typeof useTr>, locale?: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return tr("just now", "ahora", "à l'instant");
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function ConnectPage() {
  const tr = useTr();
  const { lang } = useI18n();
  const locale = lang === "es" ? "es" : lang === "fr" ? "fr" : "en-GB";
  const search = Route.useSearch();
  const catLabel = useCategoryLabel();
  const qc = useQueryClient();
  const list = useServerFn(listConnectPosts);
  const getProfile = useServerFn(getMyProfile);
  const del = useServerFn(deleteConnectPost);
  const addC = useServerFn(addConnectComment);
  const updC = useServerFn(updateConnectComment);
  const delCFeed = useServerFn(deleteConnectComment);
  const adminDel = useServerFn(adminDeleteContent);
  const isAdminFn = useServerFn(getIsAdmin);

  const [city, setCity] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [cat, setCat] = useState<ConnectCategory | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ConnectPost | null>(null);
  const [openPost, setOpenPost] = useState<ConnectPost | null>(null);
  const [replyPostId, setReplyPostId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingComment, setEditingComment] = useState<{ id: string; body: string } | null>(null);

  const meQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => isAdminFn() });
  const isAdmin = adminQ.data === true;
  const myProfileId = (meQ.data as any)?.id as string | undefined;
  // Age gate: Connect is a social feed, so it requires a completed adult
  // profile (age is NOT NULL and DB-constrained to 18+). Incomplete profiles
  // are sent back to onboarding to finish.
  const needsOnboarding = meQ.isSuccess && (!meQ.data || (meQ.data as any).age == null);

  const postsQ = useQuery({
    queryKey: ["connect-posts", { city, cat }],
    queryFn: () => list({ data: { city: city || null, category: cat } }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: !needsOnboarding,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["connect-posts"] }); toast.success(tr("Post deleted", "Publicación eliminada", "Publication supprimée")); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const addMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addC({ data: { postId: id, body } }),
    onSuccess: () => {
      setReplyBody("");
      setReplyPostId(null);
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      qc.invalidateQueries({ queryKey: ["connect-comments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updC({ data: { id, body } }),
    onSuccess: () => {
      setEditingComment(null);
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      qc.invalidateQueries({ queryKey: ["connect-comments"] });
      toast.success(tr("Comment updated", "Comentario actualizado", "Commentaire mis à jour"));
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const delCommentMut = useMutation({
    mutationFn: (id: string) => delCFeed({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      qc.invalidateQueries({ queryKey: ["connect-comments"] });
      toast.success(tr("Comment deleted", "Comentario eliminado", "Commentaire supprimé"));
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const adminDelMut = useMutation({
    mutationFn: ({ kind, id }: { kind: "post" | "comment"; id: string }) => adminDel({ data: { kind, contentId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      qc.invalidateQueries({ queryKey: ["connect-comments"] });
      toast.success(tr("Removed by admin", "Eliminado por admin", "Supprimé par l'admin"));
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (needsOnboarding) return <Navigate to="/app/onboarding" />;

  const smallCaps = "text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/55";

  return (
    <div className="programme-page min-h-[calc(100vh-4rem)]">
    <div className="max-w-md sm:max-w-2xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-4 sm:pt-8 pb-32">
      {/* Header */}
      <header className="mb-7 sm:mb-10">
        <div className={smallCaps}>{tr("Connect", "Conecta", "Connecter")}</div>
        <h1 className="mt-2 text-serif text-[28px] sm:text-5xl lg:text-[56px] text-[var(--ink)] leading-none">{tr("Who can play?", "¿Quién puede jugar?", "Qui peut jouer ?")}</h1>
        <p className="mt-2 text-serif italic text-[14px] sm:text-[17px] text-[var(--ink)]/55">
          {tr("Say when you're free. Members nearby can join you.", "Di cuándo puedes. Los miembros de tu zona se unen.", "Dis quand tu es libre. Les membres du coin te rejoignent.")}
        </p>
      </header>

      <WhoCanPlay focusDay={search.day} focusSlot={search.slot} focusArea={search.area} />

      {/* Community board */}
      <section className="mt-16 sm:mt-20 pt-10 border-t border-[var(--ink)]/10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className={smallCaps}>{tr("The noticeboard", "El tablón", "Le tableau")}</div>
              <h2 className="mt-2 text-serif text-[26px] sm:text-[32px] text-[var(--ink)] leading-none">{tr("Community", "Comunidad", "Communauté")}</h2>
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={() => setCityOpen((v) => !v)}
                className={`h-9 w-9 grid place-items-center rounded-full transition ${cityOpen || city ? "text-[var(--ink)]" : "text-[var(--ink)]/50 hover:text-[var(--ink)]"}`}
                aria-label={tr("Filter by city", "Filtrar por ciudad", "Filtrer par ville")}
              >
                <MapPin className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => { setEditingPost(null); setComposerOpen(true); }}
                className="h-9 pl-3 pr-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] font-semibold uppercase tracking-[0.16em] active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                {tr("Post", "Publicar", "Publier")}
              </button>
            </div>
          </div>
          <p className="mt-3 text-serif italic text-[15px] text-[var(--ink)]/55">
            {tr("Travel plans, coaches, kit and questions from members.", "Viajes, entrenadores, material y preguntas de los miembros.", "Voyages, coachs, matériel et questions des membres.")}
          </p>

          <button
            type="button"
            onClick={() => { setEditingPost(null); setComposerOpen(true); }}
            className="hidden lg:inline-flex mt-6 h-10 px-5 items-center gap-2 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11.5px] font-semibold uppercase tracking-[0.18em] hover:bg-[var(--ink)]/90 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            {tr("Write a post", "Escribir", "Écrire")}
          </button>

          {(cityOpen || city) && (
            <form onSubmit={(e) => { e.preventDefault(); setCity(cityInput.trim()); }} className="relative mt-5 lg:hidden">
              <Input
                autoFocus={!city}
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onBlur={() => setCity(cityInput.trim())}
                placeholder={tr("City", "Ciudad", "Ville")}
                className="h-10 pr-9 bg-white border-[var(--ink)]/12 rounded-full px-4"
              />
              {(cityInput || city) && (
                <button type="button" onClick={() => { setCity(""); setCityInput(""); setCityOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/45 hover:text-[var(--ink)]" aria-label={tr("Clear", "Borrar", "Effacer")}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          )}

          {/* Desktop: city search always visible, categories as a quiet list */}
          <form onSubmit={(e) => { e.preventDefault(); setCity(cityInput.trim()); }} className="relative mt-8 hidden lg:block">
            <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ink)]/45" strokeWidth={1.75} />
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onBlur={() => setCity(cityInput.trim())}
              placeholder={tr("Any city", "Cualquier ciudad", "Toute ville")}
              aria-label={tr("Filter by city", "Filtrar por ciudad", "Filtrer par ville")}
              className="w-full h-10 bg-transparent border-b border-[var(--ink)]/15 pl-6 pr-7 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none focus:border-[var(--ink)]/45"
            />
            {(cityInput || city) && (
              <button type="button" onClick={() => { setCity(""); setCityInput(""); }}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--ink)]/45 hover:text-[var(--ink)]" aria-label={tr("Clear", "Borrar", "Effacer")}>
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <ul className="mt-6 hidden lg:block">
            {([null, ...CATEGORIES] as (ConnectCategory | null)[]).map((c) => {
              const active = cat === c;
              return (
                <li key={c ?? "all"}>
                  <button type="button" onClick={() => setCat(c)}
                    className={`group flex w-full items-center gap-3 py-2 text-left transition ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/50 hover:text-[var(--ink)]/80"}`}>
                    <span aria-hidden className={`h-px transition-all ${active ? "w-6 bg-[var(--gold)]" : "w-3 bg-[var(--ink)]/15 group-hover:w-5"}`} />
                    <span className="text-serif text-[18px] leading-none">{c ? catLabel(c) : tr("Everything", "Todo", "Tout")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 lg:mt-0">
        {/* Phone: category tabs in one quiet scrolling row */}
        <div className="-mx-4 sm:mx-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
          <div className="flex gap-5 px-4 sm:px-0 border-b border-[var(--ink)]/8 min-w-max">
            {([null, ...CATEGORIES] as (ConnectCategory | null)[]).map((c) => {
              const active = cat === c;
              return (
                <button key={c ?? "all"} type="button" onClick={() => setCat(c)}
                  className={`relative pb-2.5 text-[13px] whitespace-nowrap transition ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/50 hover:text-[var(--ink)]/80"}`}>
                  {c ? catLabel(c) : tr("All", "Todo", "Tout")}
                  {active && <span className="absolute left-0 right-0 -bottom-px h-px bg-[var(--ink)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feed */}
        {postsQ.isLoading && !postsQ.data ? (
          <ul className="divide-y divide-[var(--ink)]/8">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="py-5 space-y-2.5">
                <div className="h-3.5 w-1/3 rounded bg-[var(--ink)]/8 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-[var(--ink)]/8 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-[var(--ink)]/6 animate-pulse" />
              </li>
            ))}
          </ul>
        ) : (postsQ.data ?? []).length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-serif italic text-[18px] sm:text-[22px] text-[var(--ink)]/80">{tr("Nothing here yet", "Aún no hay nada", "Rien pour l'instant")}</p>
            <button
              type="button"
              onClick={() => { setEditingPost(null); setComposerOpen(true); }}
              className="mt-2 text-xs font-semibold text-[var(--ink)]/60 underline underline-offset-4 hover:text-[var(--ink)]"
            >
              {tr("Write the first post", "Escribe la primera", "Écrire la première")}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--ink)]/8">
            {(postsQ.data ?? []).map((p) => {
              const mine = myProfileId === p.author_profile_id;
              return (
                <li key={p.id} className="lazy-row py-7 first:lg:pt-1">
                  {/* Author */}
                  <div className="flex items-center gap-2.5">
                    {p.author?.photo_url ? (
                      <img src={p.author.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-[var(--ink)]/10" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[var(--ink)]/8 shrink-0 grid place-items-center text-serif text-[var(--ink)]/55 text-sm">
                        {(p.author?.first_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[13.5px] font-medium text-[var(--ink)] truncate">{p.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]/45 truncate mt-1">
                        {catLabel(p.category)}{p.city ? ` · ${p.city}` : ""} · {timeAgo(p.created_at, tr, locale)}
                      </div>
                    </div>
                    {mine ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="-mr-1.5 h-8 w-8 grid place-items-center rounded-full text-[var(--ink)]/45 hover:text-[var(--ink)]" aria-label={tr("Options", "Opciones", "Options")}>
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          <DropdownMenuItem onSelect={() => { setEditingPost(p); setComposerOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />{tr("Edit", "Editar", "Modifier")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => { if (confirm(tr("Delete this post?", "¿Eliminar esta publicación?", "Supprimer cette publication ?"))) delMut.mutate(p.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />{tr("Delete", "Eliminar", "Supprimer")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="flex items-center -mr-1">
                        <ReportContentButton kind="post" contentId={p.id} authorProfileId={p.author_profile_id} size="xs" />
                        {isAdmin && (
                          <button
                            onClick={() => { if (confirm(tr("Remove this post as admin?", "¿Eliminar esta publicación como admin?", "Supprimer cette publication en tant qu'admin ?"))) adminDelMut.mutate({ kind: "post", id: p.id }); }}
                            className="p-1.5 text-[var(--ink)]/35 hover:text-destructive"
                            aria-label={tr("Remove (admin)", "Eliminar (admin)", "Supprimer (admin)")}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Post */}
                  <h3 className="text-serif text-[20px] sm:text-[24px] text-[var(--ink)] mt-4 leading-tight">{p.title}</h3>
                  <p className="text-[15px] text-[var(--ink)]/70 mt-2 whitespace-pre-wrap break-words leading-relaxed">{p.body}</p>

                  {/* Latest comments */}
                  {p.latest_comments.length > 0 && (
                    <div className="mt-4 pl-4 border-l border-[var(--gold)]/50 space-y-2.5">
                      {p.latest_comments.map((c) => {
                        const cMine = myProfileId === c.author_profile_id;
                        const isEditing = editingComment?.id === c.id;
                        return (
                          <div key={c.id} className="text-[13px] leading-snug">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <Input
                                  autoFocus
                                  value={editingComment?.body ?? ""}
                                  onChange={(e) => setEditingComment((prev) => prev ? { ...prev, body: e.target.value } : null)}
                                  className="bg-white text-sm h-9"
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && (editingComment?.body ?? "").trim()) { e.preventDefault(); updateMut.mutate({ id: c.id, body: editingComment!.body }); } }}
                                />
                                <div className="flex items-center justify-end gap-3 text-[11px] font-semibold">
                                  <button onClick={() => setEditingComment(null)} className="text-[var(--ink)]/50 hover:text-[var(--ink)]">{tr("Cancel", "Cancelar", "Annuler")}</button>
                                  <button
                                    disabled={!(editingComment?.body ?? "").trim() || updateMut.isPending}
                                    onClick={() => updateMut.mutate({ id: c.id, body: editingComment!.body })}
                                    className="text-[var(--ink)] disabled:opacity-40"
                                  >
                                    {tr("Save", "Guardar", "Enregistrer")}
                                  </button>
                                </div>
                              </div>
                            ) : cMine ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button type="button" className="text-left w-full">
                                    <span className="font-semibold text-[var(--ink)]">{c.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</span>{" "}
                                    <span className="text-[var(--ink)]/75 whitespace-pre-wrap break-words">{c.body}</span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[140px]">
                                  <DropdownMenuItem onSelect={() => setEditingComment({ id: c.id, body: c.body })}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" />{tr("Edit", "Editar", "Modifier")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => { if (confirm(tr("Delete this comment?", "¿Eliminar este comentario?", "Supprimer ce commentaire ?"))) delCommentMut.mutate(c.id); }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />{tr("Delete", "Eliminar", "Supprimer")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="flex items-start gap-1">
                                <p className="flex-1 min-w-0">
                                  <span className="font-semibold text-[var(--ink)]">{c.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</span>{" "}
                                  <span className="text-[var(--ink)]/75 whitespace-pre-wrap break-words">{c.body}</span>
                                </p>
                                <ReportContentButton kind="comment" contentId={c.id} authorProfileId={c.author_profile_id} size="xs" />
                                {isAdmin && (
                                  <button
                                    onClick={() => { if (confirm(tr("Remove this comment as admin?", "¿Eliminar este comentario como admin?", "Supprimer ce commentaire en tant qu'admin ?"))) adminDelMut.mutate({ kind: "comment", id: c.id }); }}
                                    className="p-1 text-[var(--ink)]/35 hover:text-destructive"
                                    aria-label={tr("Remove (admin)", "Eliminar (admin)", "Supprimer (admin)")}
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {p.comment_count > p.latest_comments.length && (
                        <button onClick={() => setOpenPost(p)} className="text-[12px] text-[var(--ink)]/50 hover:text-[var(--ink)]">
                          {tr("View all", "Ver los", "Voir les")} {p.comment_count} {tr("comments", "comentarios", "commentaires")}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reply */}
                  {replyPostId === p.id ? (
                    <div className="mt-4 flex items-center gap-2">
                      <Input
                        autoFocus
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={tr("Write a comment", "Escribe un comentario", "Écrire un commentaire")}
                        className="bg-white rounded-full h-10 px-4 border-[var(--ink)]/12"
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && replyBody.trim()) { e.preventDefault(); addMut.mutate({ id: p.id, body: replyBody }); } }}
                      />
                      <button
                        type="button"
                        disabled={!replyBody.trim() || addMut.isPending}
                        onClick={() => addMut.mutate({ id: p.id, body: replyBody })}
                        className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-[var(--ink)] text-[var(--paper)] disabled:opacity-35 transition"
                        aria-label={tr("Send", "Enviar", "Envoyer")}
                      >
                        <SendHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setReplyPostId(p.id); setReplyBody(""); }}
                      className="mt-4 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.2em] text-[var(--ink)]/50 hover:text-[var(--ink)] transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {tr("Reply", "Responder", "Répondre")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </section>

      {composerOpen && <Composer post={editingPost} onClose={() => { setComposerOpen(false); setEditingPost(null); }} />}
      {openPost && <PostThread post={openPost} myProfileId={myProfileId} isAdmin={isAdmin} onClose={() => setOpenPost(null)} />}
    </div>
    </div>
  );
}

function Composer({ post, onClose }: { post: ConnectPost | null; onClose: () => void }) {
  const tr = useTr();
  const catLabel = useCategoryLabel();
  const qc = useQueryClient();
  const create = useServerFn(createConnectPost);
  const update = useServerFn(updateConnectPost);
  const isEdit = !!post;
  const [category, setCategory] = useState<ConnectCategory>(post?.category ?? "looking_to_play");
  const [city, setCity] = useState(post?.city ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");

  const mut = useMutation({
    mutationFn: async () => {
      if (isEdit) return await update({ data: { id: post!.id, category, city: city || null, title, body } });
      return await create({ data: { category, city: city || null, title, body } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      toast.success(isEdit ? tr("Updated", "Actualizado", "Mis à jour") : tr("Posted", "Publicado", "Publié"));
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-[var(--ink)]/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg bg-[var(--paper)] rounded-t-3xl sm:rounded-3xl border border-[var(--ink)]/10 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sm:hidden mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-[var(--ink)]/15" />
        <div className="sticky top-0 bg-[var(--paper)]/95 backdrop-blur border-b border-[var(--ink)]/10 px-5 py-3 flex items-center justify-between">
          <h2 className="text-serif text-xl text-[var(--ink)]">
            {isEdit ? tr("Edit post", "Editar publicación", "Modifier la publication") : tr("New post", "Nueva publicación", "Nouvelle publication")}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ink)]/5"><X className="w-5 h-5 text-[var(--ink)]/60" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55">{tr("Category", "Categoría", "Catégorie")}</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-3.5 h-9 rounded-full text-[13px] border transition ${active ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white border-[var(--ink)]/15 text-[var(--ink)]/75 hover:border-[var(--ink)]/40"}`}
                  >
                    {catLabel(c)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55">{tr("City (optional)", "Ciudad (opcional)", "Ville (facultatif)")}</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Barcelona" className="mt-2 bg-white" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55">{tr("Title", "Título", "Titre")}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-2 bg-white" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55">{tr("Message", "Mensaje", "Message")}</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} className="mt-2 bg-white" />
            <p className="text-[10px] text-[var(--ink)]/50 mt-1">{tr("Posts auto-expire after 30 days.", "Las publicaciones caducan a los 30 días.", "Les publications expirent après 30 jours.")}</p>
          </div>
          <Button
            disabled={mut.isPending || title.trim().length < 3 || body.trim().length < 3}
            onClick={() => mut.mutate()}
            className="w-full bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-[var(--paper)] rounded-full h-11 text-[12px] font-semibold uppercase tracking-[0.18em]"
          >
            {mut.isPending
              ? (isEdit ? tr("Saving…", "Guardando…", "Enregistrement…") : tr("Posting…", "Publicando…", "Publication…"))
              : (isEdit ? tr("Save changes", "Guardar cambios", "Enregistrer") : tr("Publish", "Publicar", "Publier"))}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostThread({ post, myProfileId, isAdmin, onClose }: { post: ConnectPost; myProfileId: string | undefined; isAdmin: boolean; onClose: () => void }) {
  const tr = useTr();
  const qc = useQueryClient();
  const listC = useServerFn(listConnectComments);
  const addC = useServerFn(addConnectComment);
  const delC = useServerFn(deleteConnectComment);
  const updC = useServerFn(updateConnectComment);
  const adminDel = useServerFn(adminDeleteContent);
  const [body, setBody] = useState("");
  const [editingComment, setEditingComment] = useState<{ id: string; body: string } | null>(null);

  const q = useQuery({ queryKey: ["connect-comments", post.id], queryFn: () => listC({ data: { postId: post.id } }) });

  const addMut = useMutation({
    mutationFn: () => addC({ data: { postId: post.id, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["connect-comments", post.id] });
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delC({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connect-comments", post.id] });
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
    },
  });

  const adminDelMut = useMutation({
    mutationFn: (id: string) => adminDel({ data: { kind: "comment" as const, contentId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connect-comments", post.id] });
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      toast.success(tr("Removed by admin", "Eliminado por admin", "Supprimé par l'admin"));
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updC({ data: { id, body } }),
    onSuccess: () => {
      setEditingComment(null);
      qc.invalidateQueries({ queryKey: ["connect-comments", post.id] });
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      toast.success(tr("Comment updated", "Comentario actualizado", "Commentaire mis à jour"));
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-[var(--ink)]/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg bg-[var(--paper)] rounded-t-3xl sm:rounded-3xl border border-[var(--ink)]/10 max-h-[92vh] flex flex-col shadow-2xl">
        <div className="sm:hidden mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-[var(--ink)]/15" />
        <div className="sticky top-0 bg-[var(--paper)]/95 backdrop-blur border-b border-[var(--ink)]/10 px-5 py-3 flex items-center justify-between">
          <h2 className="text-serif text-lg text-[var(--ink)] truncate">{post.title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ink)]/5"><X className="w-5 h-5 text-[var(--ink)]/60" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-[var(--ink)]/85 whitespace-pre-wrap leading-relaxed">{post.body}</p>
          <div className="pt-3 border-t border-[var(--ink)]/10 space-y-3">
            {(q.data ?? []).length === 0 && !q.isLoading && (
              <p className="text-xs text-[var(--ink)]/50 italic">{tr("No comments yet.", "Aún no hay comentarios.", "Aucun commentaire.")}</p>
            )}
            {(q.data ?? []).map((c) => {
              const mine = myProfileId === c.author_profile_id;
              const isEditing = editingComment?.id === c.id;
              return (
                <div key={c.id} className="flex items-start gap-2.5">
                  {c.author?.photo_url ? (
                    <img src={c.author.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--ink)]/10 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 bg-white rounded-2xl px-3 py-2 border border-[var(--ink)]/8">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--ink)]/60">
                      <span className="font-semibold text-[var(--ink)]">{c.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</span>
                      <span>·</span>
                      <span>{timeAgo(c.created_at, tr, undefined)}</span>
                      {!mine && (
                        <span className="ml-auto flex items-center gap-1">
                          <ReportContentButton kind="comment" contentId={c.id} authorProfileId={c.author_profile_id} size="xs" />
                          {isAdmin && (
                            <button
                              onClick={() => { if (confirm(tr("Remove this comment as admin?", "¿Eliminar este comentario como admin?", "Supprimer ce commentaire en tant qu'admin ?"))) adminDelMut.mutate(c.id); }}
                              className="text-[var(--ink)]/35 hover:text-destructive p-1"
                              aria-label={tr("Remove (admin)", "Eliminar (admin)", "Supprimer (admin)")}
                            >
                              <ShieldAlert className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      )}
                      {mine && !isEditing && (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => setEditingComment({ id: c.id, body: c.body })}
                            className="text-[var(--ink)]/50 hover:text-[var(--plum)] transition p-1"
                            aria-label={tr("Edit comment", "Editar comentario", "Modifier le commentaire")}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => delMut.mutate(c.id)} className="text-[var(--ink)]/40 hover:text-destructive p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-1.5 space-y-2">
                        <Textarea
                          value={editingComment?.body ?? ""}
                          onChange={(e) => setEditingComment((prev) => prev ? { ...prev, body: e.target.value } : null)}
                          className="bg-white text-sm min-h-[60px]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingComment(null)}
                            className="text-xs font-medium text-[var(--ink)]/60 hover:text-[var(--ink)] px-2 py-1"
                          >
                            {tr("Cancel", "Cancelar", "Annuler")}
                          </button>
                          <Button
                            disabled={!(editingComment?.body ?? "").trim() || updateMut.isPending}
                            onClick={() => updateMut.mutate({ id: c.id, body: editingComment!.body })}
                            className="bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-[var(--paper)] rounded-full h-7 px-3 text-xs"
                          >
                            {tr("Save", "Guardar", "Enregistrer")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--ink)]/85 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-[var(--ink)]/10 p-3 flex items-center gap-2 bg-[var(--paper)]">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={tr("Write a comment…", "Escribe un comentario…", "Écrire un commentaire…")}
            className="bg-white"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && body.trim()) { e.preventDefault(); addMut.mutate(); } }}
          />
          <Button
            disabled={!body.trim() || addMut.isPending}
            onClick={() => addMut.mutate()}
            className="bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-[var(--paper)] rounded-full"
          >
            {tr("Send", "Enviar", "Envoyer")}
          </Button>
        </div>
      </div>
    </div>
  );
}
