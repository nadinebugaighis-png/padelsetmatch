import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { useTr } from "@/lib/i18n";
import { ReportContentButton } from "@/components/ReportContentButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/connect")({
  head: () => ({ meta: [{ title: "Connect · PadelMatch" }, { name: "robots", content: "noindex" }] }),
  component: ConnectPage,
});

const CATEGORIES: ConnectCategory[] = ["traveling", "looking_to_play", "looking_for_coach", "selling", "question", "news", "other"];

function catMeta(c: ConnectCategory): { emoji: string; tone: string } {
  switch (c) {
    case "traveling": return { emoji: "✈️", tone: "bg-sky-50 text-sky-900 border-sky-200" };
    case "looking_to_play": return { emoji: "🎾", tone: "bg-emerald-50 text-emerald-900 border-emerald-200" };
    case "looking_for_coach": return { emoji: "🎓", tone: "bg-[var(--plum)]/10 text-[var(--plum)] border-[var(--plum)]/25" };
    case "selling": return { emoji: "🎟️", tone: "bg-amber-50 text-amber-900 border-amber-200" };
    case "question": return { emoji: "❓", tone: "bg-violet-50 text-violet-900 border-violet-200" };
    case "news": return { emoji: "📣", tone: "bg-rose-50 text-rose-900 border-rose-200" };
    case "other": return { emoji: "💬", tone: "bg-neutral-100 text-neutral-800 border-neutral-200" };
  }
}

function useCategoryLabel() {
  const tr = useTr();
  return (c: ConnectCategory) => {
    switch (c) {
      case "traveling": return tr("Traveling", "De viaje", "En voyage");
      case "looking_to_play": return tr("Looking to play", "Busco jugar", "Cherche à jouer");
      case "looking_for_coach": return tr("Looking for a coach", "Busco entrenador", "Cherche un coach");
      case "selling": return tr("Selling / offering", "Vendo / ofrezco", "Je vends / propose");
      case "question": return tr("Question", "Pregunta", "Question");
      case "news": return tr("News", "Noticias", "Actualités");
      case "other": return tr("Other", "Otro", "Autre");
    }
  };
}

function timeAgo(iso: string, tr: ReturnType<typeof useTr>) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return tr("just now", "ahora", "à l'instant");
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function ConnectPage() {
  const tr = useTr();
  const catLabel = useCategoryLabel();
  const qc = useQueryClient();
  const list = useServerFn(listConnectPosts);
  const getProfile = useServerFn(getMyProfile);
  const del = useServerFn(deleteConnectPost);
  const addC = useServerFn(addConnectComment);
  const updC = useServerFn(updateConnectComment);
  const delCFeed = useServerFn(deleteConnectComment);

  const [city, setCity] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [cat, setCat] = useState<ConnectCategory | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ConnectPost | null>(null);
  const [openPost, setOpenPost] = useState<ConnectPost | null>(null);
  const [replyPostId, setReplyPostId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingComment, setEditingComment] = useState<{ id: string; body: string } | null>(null);

  const meQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const myProfileId = (meQ.data as any)?.id as string | undefined;

  const postsQ = useQuery({
    queryKey: ["connect-posts", { city, cat }],
    queryFn: () => list({ data: { city: city || null, category: cat } }),
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

  return (
    <div className="max-w-md sm:max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 programme-page">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]/55">{tr("Community board", "Tablón comunitario", "Tableau communautaire")}</div>
        <div className="flex items-end justify-between gap-3 mt-1">
          <h1 className="text-serif text-3xl sm:text-4xl text-[var(--ink)] leading-none">{tr("Connect", "Conecta", "Connecter")}</h1>
          <Button onClick={() => { setEditingPost(null); setComposerOpen(true); }} className="shrink-0 bg-[var(--plum)] hover:bg-[var(--plum)]/90 text-white rounded-full h-9 px-4">
            <Plus className="w-4 h-4 mr-1" />
            {tr("New post", "Publicar", "Publier")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <form
          onSubmit={(e) => { e.preventDefault(); setCity(cityInput.trim()); }}
          className="relative"
        >
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink)]/40" />
          <Input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder={tr("Filter by city…", "Filtrar por ciudad…", "Filtrer par ville…")}
            className="h-10 pl-9 pr-9 bg-white border-[var(--ink)]/15"
          />
          {(cityInput || city) && (
            <button type="button" onClick={() => { setCity(""); setCityInput(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/50 hover:text-[var(--ink)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCat(null)}
            className={`px-3 h-8 rounded-full text-xs font-semibold border transition ${cat === null ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white border-[var(--ink)]/20 text-[var(--ink)]/75 hover:border-[var(--ink)]/40"}`}
          >
            {tr("All", "Todas", "Toutes")}
          </button>
          {CATEGORIES.map((c) => {
            const m = catMeta(c);
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(active ? null : c)}
                className={`px-3 h-8 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1 ${active ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white border-[var(--ink)]/20 text-[var(--ink)]/75 hover:border-[var(--ink)]/40"}`}
              >
                <span>{m.emoji}</span>
                <span>{catLabel(c)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      {postsQ.isLoading ? (
        <div className="text-sm text-[var(--ink)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</div>
      ) : (postsQ.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--ink)]/25 p-10 text-center bg-white/60">
          <div className="text-3xl mb-2">💬</div>
          <p className="text-sm text-[var(--ink)]/70">
            {tr("No posts yet. Be the first to share!", "Aún no hay publicaciones. ¡Sé el primero!", "Aucune publication. Soyez le premier !")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(postsQ.data ?? []).map((p) => {
            const m = catMeta(p.category);
            const mine = myProfileId === p.author_profile_id;
            return (
              <li key={p.id} className="rounded-2xl bg-white border border-[var(--ink)]/10 p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition">
                <div className="flex items-start gap-3">
                  {p.author?.photo_url ? (
                    <img src={p.author.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--ink)]/10 shrink-0 grid place-items-center text-[var(--ink)]/40 text-sm font-semibold">
                      {(p.author?.first_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--ink)]/60">
                      <span className="font-semibold text-[var(--ink)]">{p.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</span>
                      <span className="text-[var(--ink)]/30">·</span>
                      <span>{timeAgo(p.created_at, tr)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-semibold border ${m.tone}`}>
                        <span>{m.emoji}</span><span>{catLabel(p.category)}</span>
                      </span>
                      {p.city && (
                        <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-medium bg-[var(--ink)]/5 text-[var(--ink)]/75 border border-[var(--ink)]/10">
                          <MapPin className="w-3 h-3" />{p.city}
                        </span>
                      )}
                    </div>
                    <h3 className="text-serif text-lg sm:text-xl text-[var(--ink)] mt-2 leading-snug">{p.title}</h3>
                    <p className="text-sm text-[var(--ink)]/80 mt-1 whitespace-pre-wrap break-words leading-relaxed">{p.body}</p>

                    {/* Inline comments preview */}
                    {p.latest_comments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {p.latest_comments.map((c) => {
                          const mine = myProfileId === c.author_profile_id;
                          const isEditing = editingComment?.id === c.id;
                          return (
                            <div key={c.id} className="flex items-start gap-2 bg-white/70 rounded-xl px-3 py-2 border border-[var(--ink)]/8">
                              {c.author?.photo_url ? (
                                <img src={c.author.photo_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[var(--ink)]/10 shrink-0 grid place-items-center text-[10px] font-semibold text-[var(--ink)]/50">
                                  {(c.author?.first_name ?? "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink)]/60">
                                  <span className="font-semibold text-[var(--ink)]">{c.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</span>
                                  <span>·</span>
                                  <span>{timeAgo(c.created_at, tr)}</span>
                                  {!mine && (
                                    <span className="ml-auto">
                                      <ReportContentButton kind="comment" contentId={c.id} authorProfileId={c.author_profile_id} size="xs" />
                                    </span>
                                  )}
                                  {mine && !isEditing && (
                                    <div className="ml-auto flex items-center gap-0.5">
                                      <button
                                        onClick={() => setEditingComment({ id: c.id, body: c.body })}
                                        className="inline-flex items-center text-[var(--ink)]/50 hover:text-[var(--plum)] transition px-1"
                                        aria-label={tr("Edit comment", "Editar comentario", "Modifier le commentaire")}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => { if (confirm(tr("Delete this comment?", "¿Eliminar este comentario?", "Supprimer ce commentaire ?"))) delCommentMut.mutate(c.id); }}
                                        className="inline-flex items-center text-red-500/70 hover:text-red-500 transition px-1"
                                        aria-label={tr("Delete comment", "Eliminar comentario", "Supprimer le commentaire")}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {isEditing ? (
                                  <div className="mt-1 space-y-1.5">
                                    <Input
                                      value={editingComment?.body ?? ""}
                                      onChange={(e) => setEditingComment((prev) => prev ? { ...prev, body: e.target.value } : null)}
                                      className="bg-white text-sm"
                                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && (editingComment?.body ?? "").trim()) { e.preventDefault(); updateMut.mutate({ id: c.id, body: editingComment!.body }); } }}
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setEditingComment(null)}
                                        className="text-[11px] font-medium text-[var(--ink)]/60 hover:text-[var(--ink)] px-2 py-1"
                                      >
                                        {tr("Cancel", "Cancelar", "Annuler")}
                                      </button>
                                      <button
                                        disabled={!(editingComment?.body ?? "").trim() || updateMut.isPending}
                                        onClick={() => updateMut.mutate({ id: c.id, body: editingComment!.body })}
                                        className="text-[11px] font-semibold text-[var(--plum)] hover:text-[var(--plum)]/80 disabled:opacity-50 px-2 py-1"
                                      >
                                        {tr("Save", "Guardar", "Enregistrer")}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-[var(--ink)]/85 whitespace-pre-wrap break-words leading-snug">{c.body}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {p.comment_count > p.latest_comments.length && (
                          <button
                            onClick={() => setOpenPost(p)}
                            className="text-xs font-medium text-[var(--plum)] hover:text-[var(--plum)]/80"
                          >
                            {tr("View all", "Ver todos", "Voir tout")} {p.comment_count} {tr("comments", "comentarios", "commentaires")}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-[var(--ink)]/8 flex items-center justify-between">
                      <button
                        onClick={() => setReplyPostId(replyPostId === p.id ? null : p.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink)]/70 hover:text-[var(--plum)] transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {p.comment_count === 0
                          ? tr("Comment", "Comentar", "Commenter")
                          : `${p.comment_count} ${tr("comments", "comentarios", "commentaires")}`}
                      </button>
                      {!mine && (
                        <ReportContentButton kind="post" contentId={p.id} authorProfileId={p.author_profile_id} className="ml-1" />
                      )}
                      {mine && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingPost(p); setComposerOpen(true); }}
                            className="inline-flex items-center text-[var(--ink)]/60 hover:text-[var(--ink)] transition p-1.5 rounded-full hover:bg-[var(--ink)]/5"
                            aria-label={tr("Edit", "Editar", "Modifier")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm(tr("Delete this post?", "¿Eliminar esta publicación?", "Supprimer cette publication ?"))) delMut.mutate(p.id); }}
                            className="inline-flex items-center text-red-500/80 hover:text-red-600 transition p-1.5 rounded-full hover:bg-red-500/5"
                            aria-label={tr("Delete", "Eliminar", "Supprimer")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {replyPostId === p.id && (
                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder={tr("Write a comment…", "Escribe un comentario…", "Écrire un commentaire…")}
                          className="bg-white"
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && replyBody.trim()) { e.preventDefault(); addMut.mutate({ id: p.id, body: replyBody }); } }}
                        />
                        <Button
                          disabled={!replyBody.trim() || addMut.isPending}
                          onClick={() => addMut.mutate({ id: p.id, body: replyBody })}
                          className="bg-[var(--plum)] hover:bg-[var(--plum)]/90 text-white rounded-full shrink-0"
                        >
                          {tr("Send", "Enviar", "Envoyer")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {composerOpen && <Composer post={editingPost} onClose={() => { setComposerOpen(false); setEditingPost(null); }} />}
      {openPost && <PostThread post={openPost} myProfileId={myProfileId} onClose={() => setOpenPost(null)} />}
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
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
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--ink)]/70">{tr("Category", "Categoría", "Catégorie")}</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const m = catMeta(c);
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-3 h-8 rounded-full text-xs font-semibold border inline-flex items-center gap-1 transition ${active ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white border-[var(--ink)]/20 text-[var(--ink)]/80 hover:border-[var(--ink)]/40"}`}
                  >
                    <span>{m.emoji}</span><span>{catLabel(c)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--ink)]/70">{tr("City (optional)", "Ciudad (opcional)", "Ville (facultatif)")}</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Barcelona" className="mt-2 bg-white" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--ink)]/70">{tr("Title", "Título", "Titre")}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-2 bg-white" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--ink)]/70">{tr("Message", "Mensaje", "Message")}</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} className="mt-2 bg-white" />
            <p className="text-[10px] text-[var(--ink)]/50 mt-1">{tr("Posts auto-expire after 30 days.", "Las publicaciones caducan a los 30 días.", "Les publications expirent après 30 jours.")}</p>
          </div>
          <Button
            disabled={mut.isPending || title.trim().length < 3 || body.trim().length < 3}
            onClick={() => mut.mutate()}
            className="w-full bg-[var(--plum)] hover:bg-[var(--plum)]/90 text-white rounded-full h-11"
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

function PostThread({ post, myProfileId, onClose }: { post: ConnectPost; myProfileId: string | undefined; onClose: () => void }) {
  const tr = useTr();
  const qc = useQueryClient();
  const listC = useServerFn(listConnectComments);
  const addC = useServerFn(addConnectComment);
  const delC = useServerFn(deleteConnectComment);
  const updC = useServerFn(updateConnectComment);
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
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
                      <span>{timeAgo(c.created_at, tr)}</span>
                      {!mine && (
                        <span className="ml-auto">
                          <ReportContentButton kind="comment" contentId={c.id} authorProfileId={c.author_profile_id} size="xs" />
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
                          <button onClick={() => delMut.mutate(c.id)} className="text-red-500/70 hover:text-red-500 p-1">
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
                            className="bg-[var(--plum)] hover:bg-[var(--plum)]/90 text-white rounded-full h-7 px-3 text-xs"
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
            className="bg-[var(--plum)] hover:bg-[var(--plum)]/90 text-white rounded-full"
          >
            {tr("Send", "Enviar", "Envoyer")}
          </Button>
        </div>
      </div>
    </div>
  );
}
