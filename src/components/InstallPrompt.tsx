import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone, Share, PlusSquare, ArrowUpFromLine, CheckCircle2, Copy, Send } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1);
};

const isAndroid = () => {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
};

const isSafari = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
};

export function useInstallModal() {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  return { open, openModal, closeModal };
}

export function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const ios = isIOS();
  const android = isAndroid();
  const safari = isSafari();
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://padelspark.lovable.app";

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(appUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({ title: "PadelMatch", text: "Join me on PadelMatch", url: appUrl });
      return;
    }
    await copyLink();
  };

  if (!open) return null;
  if (isInstalled) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
        <div className="surface-card max-w-sm w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <Smartphone className="w-12 h-12 text-[var(--ball)] mx-auto mb-4" />
          <h3 className="text-display text-2xl text-[var(--cream)]">Already installed!</h3>
          <p className="mt-2 text-[var(--cream)]/70">Open PadelMatch from your home screen for the full app experience.</p>
          <button onClick={onClose} className="mt-6 inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-6 py-3 hover:opacity-90">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="surface-card w-full max-w-md p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h3 className="text-display text-3xl text-[var(--cream)] leading-none">Put it on your phone</h3>
            <p className="mt-2 text-sm text-[var(--cream)]/70">The fastest home-screen setup for PadelMatch.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--cream)]/10 text-[var(--cream)]/60" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {ios && (
          <div className="space-y-5">
            {!safari && (
              <div className="rounded-2xl border border-[var(--ball)]/40 bg-[var(--ball)]/10 p-4">
                <p className="text-sm font-bold text-[var(--cream)]">First open this page in Safari</p>
                <p className="mt-1 text-xs text-[var(--cream)]/65">iPhone only shows “Add to Home Screen” inside Safari.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={copyLink} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ball)] px-4 py-2 text-sm font-bold text-[var(--court-deep)]">
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <button onClick={shareLink} className="inline-flex items-center justify-center rounded-full border border-[var(--cream)]/25 px-4 py-2 text-[var(--cream)]">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-[var(--cream)]/8 p-4">
                <Share className="mx-auto h-8 w-8 text-[var(--ball)]" />
                <p className="mt-3 text-xs font-bold text-[var(--cream)]">Tap Share</p>
              </div>
              <div className="rounded-2xl bg-[var(--cream)]/8 p-4">
                <PlusSquare className="mx-auto h-8 w-8 text-[var(--ball)]" />
                <p className="mt-3 text-xs font-bold text-[var(--cream)]">Add Home</p>
              </div>
              <div className="rounded-2xl bg-[var(--cream)]/8 p-4">
                <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--ball)]" />
                <p className="mt-3 text-xs font-bold text-[var(--cream)]">Tap Add</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--cream)]/10 p-4">
              <div className="flex items-center gap-3">
                <ArrowUpFromLine className="h-9 w-9 rounded-full bg-[var(--ball)] p-2 text-[var(--court-deep)]" />
                <div>
                  <p className="font-semibold text-[var(--cream)]">Look for this icon at the bottom of Safari</p>
                  <p className="text-xs text-[var(--cream)]/60">Then choose “Add to Home Screen”.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {android && deferredPrompt && (
          <div className="text-center py-4">
            <Smartphone className="w-16 h-16 text-[var(--ball)] mx-auto mb-4" />
            <p className="text-lg font-semibold text-[var(--cream)] mb-6">One tap and you're set</p>
            <button
              onClick={handleNativeInstall}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-bold px-8 py-4 text-lg hover:opacity-90 shadow-lg"
            >
              <Download className="w-5 h-5" />
              Add app now
            </button>
          </div>
        )}

        {android && !deferredPrompt && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--ball)]/20 flex items-center justify-center shrink-0">
                <span className="text-display text-lg text-[var(--ball)]">1</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--cream)]">Tap the menu (⋮)</p>
                <p className="text-xs text-[var(--cream)]/60">in Chrome's top-right corner</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--ball)]/20 flex items-center justify-center shrink-0">
                <span className="text-display text-lg text-[var(--ball)]">2</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--cream)]">Tap "Add to Home screen"</p>
                <p className="text-xs text-[var(--cream)]/60">Then confirm</p>
              </div>
            </div>
          </div>
        )}

        {!ios && !android && (
          <div className="text-center py-4">
            <Smartphone className="w-16 h-16 text-[var(--ball)] mx-auto mb-4" />
            <p className="text-lg font-semibold text-[var(--cream)] mb-2">Open it from your phone</p>
            <p className="text-sm text-[var(--cream)]/70 mb-6">Scan or share the link, then add it to the home screen from the phone browser.</p>
            <div className="mb-5 flex justify-center gap-2">
              <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/25 px-4 py-2 text-sm text-[var(--cream)] hover:bg-[var(--cream)]/10">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button onClick={shareLink} className="inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/25 px-4 py-2 text-sm text-[var(--cream)] hover:bg-[var(--cream)]/10">
                <Send className="h-4 w-4" />
                Share
              </button>
            </div>
            <button onClick={onClose} className="inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-6 py-3 hover:opacity-90">Got it</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function InstallPrompt() {
  const { open, openModal, closeModal } = useInstallModal();
  const [showMini, setShowMini] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const miniTimer = window.setTimeout(() => {
      if (isIOS() || isAndroid()) setShowMini(true);
    }, 1400);
    const handler = (e: Event) => {
      e.preventDefault();
      setShowMini(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.clearTimeout(miniTimer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  return (
    <>
      {showMini && (
        <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto">
          <button
            onClick={() => { setShowMini(false); openModal(); }}
            className="w-full surface-card p-4 flex items-center gap-3 shadow-lg text-left hover:brightness-110 transition"
          >
            <Smartphone className="w-6 h-6 text-[var(--ball)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--cream)]">Put PadelMatch on your phone</p>
              <p className="text-xs text-[var(--ball)]">Quick guided setup →</p>
            </div>
            <Download className="w-5 h-5 text-[var(--ball)] shrink-0" />
          </button>
        </div>
      )}
      <InstallModal open={open} onClose={closeModal} />
    </>
  );
}
