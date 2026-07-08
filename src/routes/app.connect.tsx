import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Plus, Trash2, X } from "lucide-react";
import {
  addConnectComment,
  createConnectPost,
  deleteConnectComment,
  deleteConnectPost,
  listConnectComments,
  listConnectPosts,
  type ConnectCategory,
  type ConnectPost,
} from "@/lib/connect.functions";
import { getMyProfile } from "@/lib/app.functions";
import { useTr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/connect")({
  head: () => ({ meta: [{ title: "Connect · PadelMatch" }, { name: "robots", content: "noindex" }] }),
  component: ConnectPage,
});

const CATEGORIES: ConnectCategory[] = ["traveling", "looking_to_play", "selling", "question", "news", "other"];

function useCategoryLabel() {
  const tr = useTr();
  return (c: ConnectCategory) => {
    switch (c) {
      case "traveling": return tr("✈️ Traveling", "✈️ De viaje", "✈️ En voyage");
      case "looking_to_play": return tr("🎾 Looking to play", "🎾 Busco jugar", "🎾 Cherche à jouer");
      case "selling": return tr("🎟️ Selling / offering", "🎟️ Vendo / ofrezco", "🎟️ Je vends / propose");
      case "question": return tr("❓ Question", "❓ Pregunta", "❓ Question");
      case "news": return tr("📣 News", "📣 Noticias", "📣 Actualités");
      case "other": return tr("💬 Other", "💬 Otro", "💬 Autre");
    }
  };
}

function ConnectPage() {
  const tr = useTr();
  const catLabel = useCategoryLabel();
  const qc = useQueryClient();
  const list = useServerFn(listConnectPosts);
  const getProfile = useServerFn(getMyProfile);
  const del = useServerFn(deleteConnectPost);

  const [city, setCity] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [cat, setCat] = useState<ConnectCategory | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [openPost, setOpenPost] = useState<ConnectPost | null>(null);

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

  return (
    <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-6 py-6 sm:py-8 programme-page">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/55">{tr("Community board", "Tablón comunitario", "Tableau communautaire")}</div>
          <h1 className="text-serif text-3xl sm:text-4xl text-[var(--ink)]">Connect</h1>
          <p className="text-sm text-[var(--ink)]/70 mt-1">
            {tr(
              "Post travels, tickets, questions, or news for the community.",
              "Publica viajes, entradas, preguntas o noticias para la comunidad.",
              "Publiez voyages, billets, questions ou actualités.",
            )}
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="shrink-0 bg-[var(--plum)] hover:bg-[var(--plum)]/90 text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" />
          {tr("Post", "Publicar", "Publier")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <form
          onSubmit={(e) => { e.preventDefault(); setCity(cityInput.trim()); }}
          className="flex items-center gap-2"
        >
          <Input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder={tr("Filter by city…", "Filtrar por ciudad…", "Filtrer par ville…")}
            className="h-9 w-40 sm:w-56 bg-white"
          />
          {city && (
            <button type="button" onClick={() => { setCity(""); setCityInput(""); }} className="text-xs text-[var(--ink)]/60 hover:text-[var(--ink)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCat(null)}
            className={`px-3 h-8 rounded-full text-xs font-semibold border ${cat === null ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white border-[var(--ink)]/25 text-[var(--ink)]/80"}`}
          >
            {tr("All", "Todas", "Toutes")}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c === cat ? null : c)}
              className={`px-3 h-8 rounded-full text-xs font-semibold border ${cat === c ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white border-[var(--ink)]/25 text-[var(--ink)]/80"}`}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {postsQ.isLoading ? (
        <div className="text-sm text-[var(--ink)]/60">{tr("Loading…", "Cargando…", "Chargement…")}</div>
      ) : (postsQ.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--ink)]/25 p-8 text-center bg-white/60">
          <p className="text-sm text-[var(--ink)]/70">
            {tr("No posts yet. Be the first to share!", "Aún no hay publicaciones. ¡Sé el primero!", "Aucune publication. Soyez le premier !")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(postsQ.data ?? []).map((p) => (
            <li key={p.id} className="rounded-2xl bg-white border border-[var(--ink)]/12 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {p.author?.photo_url ? (
                  <img src={p.author.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--ink)]/10 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--ink)]/60">
                    <span className="font-semibold text-[var(--ink)]">{p.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</span>
                    <span>·</span>
                    <span className="uppercase tracking-wider">{catLabel(p.category)}</span>
                    {p.city && (<><span>·</span><span>📍 {p.city}</span></>)}
                    <span>·</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-serif text-lg text-[var(--ink)] mt-1">{p.title}</h3>
                  <p className="text-sm text-[var(--ink)]/85 mt-1 whitespace-pre-wrap break-words">{p.body}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setOpenPost(p)}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--ink)]/70 hover:text-[var(--plum)]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {p.comment_count} {tr("comments", "comentarios", "commentaires")}
                    </button>
                    {myProfileId === p.author_profile_id && (
                      <button
                        onClick={() => { if (confirm(tr("Delete this post?", "¿Eliminar esta publicación?", "Supprimer cette publication ?"))) delMut.mutate(p.id); }}
                        className="inline-flex items-center gap-1 text-xs text-red-500/80 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {tr("Delete", "Eliminar", "Supprimer")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {composerOpen && <Composer onClose={() => setComposerOpen(false)} />}
      {openPost && <PostThread post={openPost} myProfileId={myProfileId} onClose={() => setOpenPost(null)} />}
    </div>
  );
}

function Composer({ onClose }: { onClose: () => void }) {
  const tr = useTr();
  const catLabel = useCategoryLabel();
  const qc = useQueryClient();
  const create = useServerFn(createConnectPost);
  const [category, setCategory] = useState<ConnectCategory>("looking_to_play");
  const [city, setCity] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const mut = useMutation({
    mutationFn: () => create({ data: { category, city: city || null, title, body } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connect-posts"] });
      toast.success(tr("Posted", "Publicado", "Publié"));
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg bg-[var(--paper)] rounded-t-2xl sm:rounded-2xl border border-[var(--ink)]/10 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--paper)] border-b border-[var(--ink)]/10 px-5 py-3 flex items-center justify-between">
          <h2 className="text-serif text-xl text-[var(--ink)]">{tr("New post", "Nueva publicación", "Nouvelle publication")}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[var(--ink)]/60" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--ink)]/70">{tr("Category", "Categoría", "Catégorie")}</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 h-8 rounded-full text-xs font-semibold border ${category === c ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "bg-white border-[var(--ink)]/25 text-[var(--ink)]/80"}`}
                >
                  {catLabel(c)}
                </button>
              ))}
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
            className="w-full bg-[var(--plum)] hover:bg-[var(--plum)]/90 text-white rounded-full"
          >
            {mut.isPending ? tr("Posting…", "Publicando…", "Publication…") : tr("Publish", "Publicar", "Publier")}
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
  const [body, setBody] = useState("");

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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg bg-[var(--paper)] rounded-t-2xl sm:rounded-2xl border border-[var(--ink)]/10 max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-[var(--paper)] border-b border-[var(--ink)]/10 px-5 py-3 flex items-center justify-between">
          <h2 className="text-serif text-lg text-[var(--ink)] truncate">{post.title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[var(--ink)]/60" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-sm text-[var(--ink)]/85 whitespace-pre-wrap">{post.body}</p>
          <div className="pt-2 border-t border-[var(--ink)]/10 space-y-3">
            {(q.data ?? []).length === 0 && !q.isLoading && (
              <p className="text-xs text-[var(--ink)]/50 italic">{tr("No comments yet.", "Aún no hay comentarios.", "Aucun commentaire.")}</p>
            )}
            {(q.data ?? []).map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                {c.author?.photo_url ? (
                  <img src={c.author.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--ink)]/10 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--ink)]/60">
                    <span className="font-semibold text-[var(--ink)]">{c.author?.first_name ?? tr("Someone", "Alguien", "Quelqu'un")}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    {myProfileId === c.author_profile_id && (
                      <button onClick={() => delMut.mutate(c.id)} className="ml-auto text-red-500/70 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[var(--ink)]/85 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                </div>
              </div>
            ))}
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
