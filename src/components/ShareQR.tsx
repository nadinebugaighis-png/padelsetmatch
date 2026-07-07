import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Share2, X, Copy, Check } from "lucide-react";
import { useTr } from "@/lib/i18n";

export function ShareQR({ url, label }: { url: string; label?: string }) {
  const tr = useTr();

  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#0d2929", light: "#f5f0e8" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [open, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "PadelMatch", text: label || tr("Join me on PadelMatch", "Únete a mí en PadelMatch", "Rejoins-moi sur PadelMatch"), url });
      } catch {
        // ignore cancellation
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/20 px-4 py-2 text-sm text-[var(--cream)] hover:bg-[var(--cream)]/10"
      >
        <Share2 className="w-4 h-4" />
        {tr("Share", "Compartir", "Partager")}
      </button>


      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative surface-card p-6 max-w-xs w-full text-center">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-[var(--cream)]/50 hover:text-[var(--cream)]"
              aria-label={tr("Close", "Cerrar", "Fermer")}
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-display text-lg tracking-wider">{tr("Share PadelMatch", "Compartir PadelMatch", "Partager PadelMatch")}</p>
            <p className="text-xs text-[var(--cream)]/60 mt-1">{tr("Scan to open", "Escanea para abrir", "Scanne pour ouvrir")}</p>


            {dataUrl ? (
              <img src={dataUrl} alt={tr("QR code", "Código QR", "Code QR")} className="mx-auto mt-4 rounded-lg" width={280} height={280} />
            ) : (
              <div className="mx-auto mt-4 w-[280px] h-[280px] rounded-lg bg-[var(--cream)]/10 animate-pulse" />
            )}

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-4 py-2 text-xs hover:opacity-90"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? tr("Copied", "Copiado", "Copié") : tr("Copy link", "Copiar enlace", "Copier le lien")}
              </button>
              {typeof navigator.share === "function" && (
                <button
                  onClick={nativeShare}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cream)]/20 px-4 py-2 text-xs text-[var(--cream)] hover:bg-[var(--cream)]/10"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {tr("Share", "Compartir", "Partager")}

                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
