import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTr } from "@/lib/i18n";

interface Props {
  file: File | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Could not read this photo. Try a JPG or PNG."));
    img.src = src;
  });
  return img;
}

async function getCroppedFile(src: string, area: Area, name: string): Promise<File> {
  const img = await loadImage(src);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(area.width, area.height));
  const outW = Math.max(1, Math.round(area.width * scale));
  const outH = Math.max(1, Math.round(area.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser blocked the image editor. Try again.");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not save the cropped photo"))), "image/jpeg", 0.9),
  );
  return new File([blob], name, { type: "image/jpeg" });
}

export function PhotoCropDialog({ file, onCancel, onConfirm }: Props) {
  const tr = useTr();
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setUrl(null); setNaturalSize(null); setLoadError(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setLoadError(null);
    setNaturalSize(null);
    // Probe the image so we can pre-compute a default crop area — that way
    // the "Use photo" button works immediately without requiring the user to
    // pan/zoom first, and we can surface unreadable files (e.g. iOS HEIC) with
    // a clear message instead of a silent failure.
    loadImage(u).then((img) => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setNaturalSize({ w, h });
      const targetAspect = 3 / 4;
      let cw: number, ch: number;
      if (w / h > targetAspect) {
        ch = h;
        cw = Math.round(h * targetAspect);
      } else {
        cw = w;
        ch = Math.round(w / targetAspect);
      }
      const x = Math.round((w - cw) / 2);
      const y = Math.round((h - ch) / 2);
      setArea({ x, y, width: cw, height: ch });
    }).catch((e) => {
      setLoadError(e instanceof Error ? e.message : "Could not read this photo");
    });
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleConfirm = async () => {
    if (!url || !area) return;
    setBusy(true);
    try {
      const cropped = await getCroppedFile(url, area, "padel-photo.jpg");
      onConfirm(cropped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not crop the photo", "No se pudo recortar la foto", "Impossible de recadrer la photo"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[var(--court-deep)] text-[var(--cream)] border-[var(--cream)]/15">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{tr("Crop your photo", "Recorta tu foto", "Recadre ta photo")}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-[3/4] bg-black">
          {url && !loadError && (
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              aspect={3 / 4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--cream)]/80">
              {tr(
                "We couldn't open this photo. Please pick a JPG or PNG (iPhone HEIC photos aren't supported yet).",
                "No pudimos abrir esta foto. Elige un JPG o PNG (las fotos HEIC del iPhone aún no funcionan).",
              )}
            </div>
          )}
        </div>
        <div className="px-5 py-4 space-y-4">
          {!loadError && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">{tr("Zoom", "Zoom", "Zoom")}</div>
              <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={(v) => setZoom(v[0])} />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={busy}>{tr("Cancel", "Cancelar", "Annuler")}</Button>
            <Button onClick={handleConfirm} disabled={busy || !area || !!loadError || !naturalSize}>
              {busy ? tr("Saving…", "Guardando…", "Enregistrement…") : tr("Use photo", "Usar foto", "Utiliser la photo")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
