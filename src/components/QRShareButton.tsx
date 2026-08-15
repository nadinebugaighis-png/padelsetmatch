import { useState } from "react";
import { QrCode, X, Copy, Check } from "lucide-react";

const SHARE_URL = "https://padelsetmatch.com/";
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(SHARE_URL)}`;

export function QRShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show QR code to share app"
        className="fixed bottom-20 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[color:var(--ink,#0d2929)] shadow-lg transition hover:scale-105 hover:shadow-xl md:bottom-4 md:right-4 md:h-12 md:w-12"
      >
        <QrCode className="h-4 w-4 md:h-6 md:w-6" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-neutral-700">
              Share PadelSetMatch
            </h2>
            <div className="mt-4 flex justify-center">
              <img
                src={QR_SRC}
                alt="QR code for PadelSetMatch"
                width={220}
                height={220}
                className="h-56 w-56 rounded-lg border border-neutral-200"
              />
            </div>
            <p className="mt-4 break-all text-center text-xs text-neutral-600">{SHARE_URL}</p>
            <button
              type="button"
              onClick={copyLink}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--ink)]/20 bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--ink)]/5"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
