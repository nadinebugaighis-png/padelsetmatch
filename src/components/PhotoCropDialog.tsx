import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTr } from "@/lib/i18n";

interface Props {
  file: File | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

async function getCroppedFile(src: string, area: Area, name: string): Promise<File> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Could not read image"));
    img.src = src;
  });
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(area.width, area.height));
  const outW = Math.max(1, Math.round(area.width * scale));
  const outH = Math.max(1, Math.round(area.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Crop failed"))), "image/jpeg", 0.9),
  );
  return new File([blob], name, { type: "image/jpeg" });
}

export function PhotoCropDialog({ file, onCancel, onConfirm }: Props) {
  const tr = useTr();
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleConfirm = async () => {
    if (!url || !area) return;
    setBusy(true);
    try {
      const cropped = await getCroppedFile(url, area, "padel-photo.jpg");
      onConfirm(cropped);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[var(--court-deep)] text-[var(--cream)] border-[var(--cream)]/15">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{tr("Crop your photo", "Recorta tu foto")}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-[3/4] bg-black">
          {url && (
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
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/60 mb-2">{tr("Zoom", "Zoom")}</div>
            <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={busy}>{tr("Cancel", "Cancelar")}</Button>
            <Button onClick={handleConfirm} disabled={busy || !area}>
              {busy ? tr("Saving…", "Guardando…") : tr("Use photo", "Usar foto")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
