import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

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

  if (isInstalled || dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="surface-card p-4 flex items-center gap-3 shadow-lg">
        <Smartphone className="w-5 h-5 text-[var(--ball)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--cream)]">Add to Home Screen</p>
          <p className="text-xs text-[var(--cream)]/60">Open like an app — no browser needed.</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-3 py-1.5 text-xs hover:opacity-90"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 text-[var(--cream)]/50 hover:text-[var(--cream)]"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
