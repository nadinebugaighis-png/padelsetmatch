import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone, Share, PlusSquare, ArrowUpFromLine } from "lucide-react";

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

export function useInstallModal() {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  return { open, openModal, closeModal };
}

export function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const ios = isIOS();
  const android = isAndroid();

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
            <h3 className="text-display text-3xl text-[var(--cream)] leading-none">Get the app</h3>
            <p className="mt-2 text-sm text-[var(--cream)]/70">Add PadelMatch to your home screen — open it like a real app, no browser bar.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--cream)]/10 text-[var(--cream)]/60" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {ios && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--ball)]/20 flex items-center justify-center shrink-0">
                <span className="text-display text-lg text-[var(--ball)]">1</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--cream)]">Tap the Share button</p>
                <p className="text-xs text-[var(--cream)]/60">in Safari's bottom toolbar</p>
              </div>
              <Share className="w-6 h-6 text-[var(--ball)] ml-auto shrink-0" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--ball)]/20 flex items-center justify-center shrink-0">
                <span className="text-display text-lg text-[var(--ball)]">2</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--cream)]">Scroll and tap</p>
                <p className="text-xs text-[var(--cream)]/60">"Add to Home Screen"</p>
              </div>
              <PlusSquare className="w-6 h-6 text-[var(--ball)] ml-auto shrink-0" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--ball)]/20 flex items-center justify-center shrink-0">
                <span className="text-display text-lg text-[var(--ball)]">3</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--cream)]">Tap Add</p>
                <p className="text-xs text-[var(--cream)]/60">The icon appears on your home screen</p>
              </div>
              <ArrowUpFromLine className="w-6 h-6 text-[var(--ball)] ml-auto shrink-0" />
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
              Add to Home Screen
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
            <p className="text-lg font-semibold text-[var(--cream)] mb-2">Add to your home screen</p>
            <p className="text-sm text-[var(--cream)]/70 mb-6">Open your browser menu and choose "Add to Home screen" or "Install app."</p>
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
    const handler = (e: Event) => {
      e.preventDefault();
      setShowMini(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
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
              <p className="text-sm font-bold text-[var(--cream)]">Add PadelMatch to your phone</p>
              <p className="text-xs text-[var(--ball)]">Tap here to install →</p>
            </div>
            <Download className="w-5 h-5 text-[var(--ball)] shrink-0" />
          </button>
        </div>
      )}
      <InstallModal open={open} onClose={closeModal} />
    </>
  );
}
