import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";
import { ExternalLink, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type GearItem = {
  id: string;
  profile_id: string;
  kind: string;
  title: string;
  brand: string | null;
  note: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
};

export const GEAR_KINDS = ["racket", "shoes", "bag", "balls", "apparel", "other"] as const;
export const GEAR_EMOJI: Record<string, string> = {
  racket: "🎾",
  shoes: "👟",
  bag: "🎒",
  balls: "🟡",
  apparel: "👕",
  other: "✨",
};

const MAX_ITEMS = 12;

function useGear(profileId: string | undefined) {
  return useQuery({
    queryKey: ["profile-gear", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_gear")
        .select("id, profile_id, kind, title, brand, note, image_url, link_url, sort_order")
        .eq("profile_id", profileId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GearItem[];
    },
  });
}

function kindLabel(kind: string, tr: ReturnType<typeof useTr>) {
  switch (kind) {
    case "racket": return tr("Racket", "Pala", "Raquette");
    case "shoes": return tr("Shoes", "Zapatillas", "Chaussures");
    case "bag": return tr("Bag", "Paletero", "Sac");
    case "balls": return tr("Balls", "Bolas", "Balles");
    case "apparel": return tr("Apparel", "Ropa", "Tenue");
    default: return tr("Other", "Otro", "Autre");
  }
}

/** Read-only kit shelf shown on a player's card. */
export function GearShelf({ profileId, title }: { profileId: string; title?: string }) {
  const tr = useTr();
  const q = useGear(profileId);
  const items = q.data ?? [];
  if (!items.length) return null;

  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink)]/55 mb-2">
        {title ?? tr("My kit", "Mi equipo", "Mon matériel")}
      </div>
      <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
        {items.map((it) => {
          const inner = (
            <>
              <div className="w-full aspect-square overflow-hidden rounded-[6px] bg-[var(--paper-2)] flex items-center justify-center">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-2xl">{GEAR_EMOJI[it.kind] ?? "✨"}</span>
                )}
              </div>
              <div className="mt-1.5 text-[11px] font-semibold leading-tight text-[var(--ink)] line-clamp-2">
                {it.title}
              </div>
              {it.brand && (
                <div className="text-[10px] text-[var(--ink)]/55 truncate">{it.brand}</div>
              )}
              {it.link_url && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[var(--plum)] font-semibold">
                  <ExternalLink className="w-3 h-3" />
                  {tr("View", "Ver", "Voir")}
                </span>
              )}
            </>
          );
          const cls =
            "snap-start shrink-0 w-[104px] bg-white p-1.5 pb-2 rounded-[8px] shadow-[0_6px_18px_-10px_rgba(15,62,46,0.4)] border border-[var(--ink)]/10 text-left";
          return it.link_url ? (
            <a key={it.id} href={it.link_url} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
              {inner}
            </a>
          ) : (
            <div key={it.id} className={cls}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

/** Editable kit shelf for the signed-in player's own profile. */
export function GearEditor({ profileId }: { profileId: string }) {
  const tr = useTr();
  const qc = useQueryClient();
  const q = useGear(profileId);
  const items = q.data ?? [];
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<string>("racket");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileId = useId();
  const [order, setOrder] = useState<GearItem[]>(items);
  useEffect(() => { setOrder(items); }, [items]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const reset = () => {
    setKind("racket"); setTitle(""); setBrand(""); setLink(""); setImage(null);
    setEditingId(null); setOpen(false);
  };

  const startEdit = (it: GearItem) => {
    setEditingId(it.id);
    setKind(it.kind);
    setTitle(it.title);
    setBrand(it.brand ?? "");
    setLink(it.link_url ?? "");
    setImage(it.image_url);
    setOpen(true);
  };


  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error(tr("Please sign in again", "Inicia sesión de nuevo", "Reconnecte-toi"));
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${u.user.id}/gear-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("padel-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("padel-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("Could not sign URL");
      setImage(signed.signedUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Upload failed", "Error al subir", "Échec du téléversement"));
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const name = title.trim();
      if (!name) throw new Error(tr("Add a name", "Añade un nombre", "Ajoute un nom"));
      let url = link.trim();
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      const payload = {
        kind,
        title: name.slice(0, 60),
        brand: brand.trim() ? brand.trim().slice(0, 40) : null,
        link_url: url ? url.slice(0, 500) : null,
        image_url: image,
      };
      if (editingId) {
        const { error } = await supabase.from("profile_gear").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_gear")
          .insert({ ...payload, profile_id: profileId, sort_order: items.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const wasEdit = !!editingId;
      qc.invalidateQueries({ queryKey: ["profile-gear", profileId] });
      if (wasEdit || items.length + 1 >= MAX_ITEMS) {
        reset();
      } else {
        // Keep the form open so several items can be added in a row.
        setKind("racket"); setTitle(""); setBrand(""); setLink(""); setImage(null);
        setEditingId(null);
      }
      toast.success(
        wasEdit
          ? tr("Updated", "Actualizado", "Mis à jour")
          : tr("Added to your kit", "Añadido a tu equipo", "Ajouté à ton matériel"),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Could not save", "No se pudo guardar", "Échec")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profile_gear").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      if (editingId === id) reset();
      qc.invalidateQueries({ queryKey: ["profile-gear", profileId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Could not delete", "No se pudo borrar", "Échec")),
  });

  const reorder = useMutation({
    mutationFn: async (ordered: GearItem[]) => {
      await Promise.all(
        ordered.map((it, i) =>
          supabase.from("profile_gear").update({ sort_order: i }).eq("id", it.id).then(({ error }) => {
            if (error) throw error;
          }),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-gear", profileId] }),
    onError: (e) => {
      setOrder(items);
      toast.error(e instanceof Error ? e.message : tr("Could not reorder", "No se pudo reordenar", "Échec"));
    },
  });

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = order.findIndex((i) => i.id === active.id);
    const to = order.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    reorder.mutate(next);
  };

  return (
    <div className="space-y-3">
      {order.length > 0 && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-2.5 overflow-x-auto overflow-y-visible -mx-2 px-2 pt-3 pb-2 touch-pan-x">
                {order.map((it) => (
                  <SortableGearCard
                    key={it.id}
                    item={it}
                    editing={editingId === it.id}
                    onEdit={() => startEdit(it)}
                    onRemove={() => remove.mutate(it.id)}
                    labels={{
                      edit: tr("Edit", "Editar", "Modifier"),
                      remove: tr("Remove", "Quitar", "Retirer"),
                      drag: tr("Drag to reorder", "Arrastra para reordenar", "Glisse pour réordonner"),
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {order.length > 1 && (
            <p className="text-[11px] text-[var(--ink)]/50">
              {tr(
                "Hold the handle and drag to reorder.",
                "Mantén pulsado el asa y arrastra para reordenar.",
                "Maintiens la poignée et glisse pour réordonner.",
              )}
            </p>
          )}
        </>
      )}



      {!open ? (
        items.length >= MAX_ITEMS ? (
          <p className="text-xs text-[var(--ink)]/55">
            {tr(
              `Kit is full (${MAX_ITEMS} items). Remove one to add something new.`,
              `Equipo completo (${MAX_ITEMS} objetos). Quita uno para añadir otro.`,
              `Matériel complet (${MAX_ITEMS} objets). Retire-en un pour en ajouter.`,
            )}
          </p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--ink)]/25 text-[12px] font-semibold text-[var(--ink)]"
            >
              <Plus className="w-4 h-4" />
              {tr("Add item", "Añadir objeto", "Ajouter un objet")}
            </button>
            <span className="text-[11px] text-[var(--ink)]/50">
              {items.length}/{MAX_ITEMS}
            </span>
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-[var(--ink)]/15 bg-[var(--paper-2)]/60 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]/60">
              {editingId ? tr("Edit item", "Editar objeto", "Modifier l'objet") : tr("New item", "Nuevo objeto", "Nouvel objet")}
            </div>
            <button type="button" onClick={reset} aria-label={tr("Close", "Cerrar", "Fermer")}>
              <X className="w-4 h-4 text-[var(--ink)]/60" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {GEAR_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`px-2.5 h-8 rounded-full text-[12px] border transition ${
                  kind === k
                    ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]"
                    : "bg-white border-[var(--ink)]/20 text-[var(--ink)]/75"
                }`}
              >
                {GEAR_EMOJI[k]} {kindLabel(k, tr)}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <label
              htmlFor={fileId}
              className="shrink-0 w-[76px] h-[76px] rounded-[8px] border border-dashed border-[var(--ink)]/30 bg-white flex items-center justify-center overflow-hidden cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--ink)]/60" />
              ) : image ? (
                <img src={image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-[var(--ink)]/55 text-center px-1">
                  {tr("Photo", "Foto", "Photo")}
                </span>
              )}
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <div className="flex-1 space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tr("Name (e.g. Bullpadel Vertex)", "Nombre (p. ej. Bullpadel Vertex)", "Nom (ex. Bullpadel Vertex)")}
                className="w-full h-9 px-2.5 rounded-md border border-[var(--ink)]/20 bg-white text-sm"
              />
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={tr("Brand (optional)", "Marca (opcional)", "Marque (optionnel)")}
                className="w-full h-9 px-2.5 rounded-md border border-[var(--ink)]/20 bg-white text-sm"
              />
            </div>
          </div>

          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={tr("Link (optional)", "Enlace (opcional)", "Lien (optionnel)")}
            className="w-full h-9 px-2.5 rounded-md border border-[var(--ink)]/20 bg-white text-sm"
          />

          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || uploading}
            className="w-full h-10 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
          >
            {save.isPending
              ? tr("Saving…", "Guardando…", "Enregistrement…")
              : editingId
                ? tr("Save changes", "Guardar cambios", "Enregistrer")
                : tr("Save item", "Guardar objeto", "Enregistrer")}
          </button>

        </div>
      )}
    </div>
  );
}

function SortableGearCard({
  item,
  editing,
  onEdit,
  onRemove,
  labels,
}: {
  item: GearItem;
  editing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  labels: { edit: string; remove: string; drag: string };
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 30 : undefined }}
      className={`relative shrink-0 w-[104px] bg-white p-1.5 pb-2 rounded-[8px] border shadow-[0_6px_18px_-10px_rgba(15,62,46,0.4)] ${
        editing ? "border-[var(--ink)]" : "border-[var(--ink)]/10"
      } ${isDragging ? "opacity-90 scale-[1.03]" : ""}`}
    >
      <div className="absolute -top-2.5 -right-2 flex gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={labels.edit}
          className="w-6 h-6 rounded-full bg-white border border-[var(--ink)]/25 text-[var(--ink)] flex items-center justify-center shadow"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={labels.remove}
          className="w-6 h-6 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center shadow"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <button
        type="button"
        aria-label={labels.drag}
        {...attributes}
        {...listeners}
        className="absolute -top-2.5 -left-2 w-6 h-6 rounded-full bg-white border border-[var(--ink)]/25 text-[var(--ink)]/70 flex items-center justify-center shadow touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3 h-3" />
      </button>
      <button type="button" onClick={onEdit} className="w-full text-left">
        <div className="w-full aspect-square overflow-hidden rounded-[6px] bg-[var(--paper-2)] flex items-center justify-center">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{GEAR_EMOJI[item.kind] ?? "✨"}</span>
          )}
        </div>
        <div className="mt-1.5 text-[11px] font-semibold leading-tight line-clamp-2 text-[var(--ink)]">{item.title}</div>
        {item.brand && <div className="text-[10px] text-[var(--ink)]/55 truncate">{item.brand}</div>}
      </button>
    </div>
  );
}
