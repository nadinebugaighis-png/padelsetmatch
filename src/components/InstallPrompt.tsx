import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone, Share, PlusSquare, ArrowUpFromLine, CheckCircle2, Copy, Send } from "lucide-react";
import { useTr } from "@/lib/i18n";

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
  const tr = useTr();
  const ios = isIOS();
  const android = isAndroid();
  const safari = isSafari();
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://padelmatchapp.lovable.app";

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
      await navigator.share({ title: "PadelMatch", text: tr("Join me on PadelMatch", "Únete conmigo a PadelMatch", "Rejoins-moi sur PadelMatch"), url: appUrl });
      return;
    }
    await copyLink();
  };

  if (!open) return null;
  if (isInstalled) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
        <div className="surface-card max-w-sm w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <Smartphone className="w-12 h-12 text-[var(--cream)] mx-auto mb-4" />
          <h3 className="text-display text-2xl text-[var(--cream)]">{tr("Already installed!", "¡Ya está instalada!", "Déjà installée !")}</h3>
          <p className="mt-2 text-[var(--cream)]/70">{tr("Open PadelMatch from your home screen for the full app experience.", "Abre PadelMatch desde tu pantalla de inicio para la experiencia completa.", "Ouvre PadelMatch depuis ton écran d'accueil pour l'expérience complète.")}</p>
          <button onClick={onClose} className="mt-6 inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-6 py-3 hover:opacity-90">{tr("Close", "Cerrar", "Fermer")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="surface-card w-full max-w-md p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h3 className="text-display text-3xl text-[var(--cream)] leading-none">{tr("Put it on your phone", "Instálala en tu móvil", "Installe-la sur ton téléphone")}</h3>
            <p className="mt-2 text-sm text-[var(--cream)]/70">{tr("The fastest home-screen setup for PadelMatch.", "La forma más rápida de añadir PadelMatch a tu pantalla de inicio.", "La façon la plus rapide d'ajouter PadelMatch à ton écran d'accueil.")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--cream)]/10 text-[var(--cream)]/60" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {ios && (
          <div className="space-y-5">
            {!safari && (
              <div className="rounded-2xl border border-[var(--cream)]/40 bg-[var(--cream)]/10 p-4">
                <p className="text-sm font-bold text-[var(--cream)]">{tr("First open this page in Safari", "Primero abre esta página en Safari", "Ouvre d'abord cette page dans Safari")}</p>
                <p className="mt-1 text-xs text-[var(--cream)]/65">{tr("iPhone only shows “Add to Home Screen” inside Safari.", "En iPhone, “Añadir a la pantalla de inicio” solo aparece dentro de Safari.", "Sur iPhone, « Sur l'écran d'accueil » n'apparaît que dans Safari.")}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={copyLink} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ball)] px-4 py-2 text-sm font-bold text-[var(--court-deep)]">
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? tr("Copied", "Copiado", "Copié") : tr("Copy link", "Copiar enlace", "Copier le lien")}
                  </button>
                  <button onClick={shareLink} className="inline-flex items-center justify-center rounded-full border border-[var(--cream)]/25 px-4 py-2 text-[var(--cream)]">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-[var(--cream)]/8 p-4">
                <Share className="mx-auto h-8 w-8 text-[var(--cream)]" />
                <p className="mt-3 text-xs font-bold text-[var(--cream)]">{tr("Tap Share", "Toca Compartir", "Appuie sur Partager")}</p>
              </div>
              <div className="rounded-2xl bg-[var(--cream)]/8 p-4">
                <PlusSquare className="mx-auto h-8 w-8 text-[var(--cream)]" />
                <p className="mt-3 text-xs font-bold text-[var(--cream)]">{tr("Add Home", "Añadir a Inicio", "Écran d'accueil")}</p>
              </div>
              <div className="rounded-2xl bg-[var(--cream)]/8 p-4">
                <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--cream)]" />
                <p className="mt-3 text-xs font-bold text-[var(--cream)]">{tr("Tap Add", "Toca Añadir", "Appuie sur Ajouter")}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--cream)]/10 p-4">
              <div className="flex items-center gap-3">
                <ArrowUpFromLine className="h-9 w-9 rounded-full bg-[var(--cream)] p-2 text-[var(--court-deep)]" />
                <div>
                  <p className="font-semibold text-[var(--cream)]">{tr("Look for this icon at the bottom of Safari", "Busca este icono en la parte inferior de Safari", "Cherche cette icône en bas de Safari")}</p>
                  <p className="text-xs text-[var(--cream)]/60">{tr("Then choose “Add to Home Screen”.", "Después elige “Añadir a la pantalla de inicio”.", "Puis choisis « Sur l'écran d'accueil ».")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {android && deferredPrompt && (
          <div className="text-center py-4">
            <Smartphone className="w-16 h-16 text-[var(--cream)] mx-auto mb-4" />
            <p className="text-lg font-semibold text-[var(--cream)] mb-6">{tr("One tap and you're set", "Un toque y listo", "Un appui et c'est fait")}</p>
            <button
              onClick={handleNativeInstall}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-bold px-8 py-4 text-lg hover:opacity-90 shadow-lg"
            >
              <Download className="w-5 h-5" />
              {tr("Add app now", "Añadir app ahora", "Ajouter l'app maintenant")}
            </button>
          </div>
        )}

        {android && !deferredPrompt && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--cream)]/20 flex items-center justify-center shrink-0">
                <span className="text-display text-lg text-[var(--cream)]">1</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--cream)]">{tr("Tap the menu (⋮)", "Toca el menú (⋮)", "Appuie sur le menu (⋮)")}</p>
                <p className="text-xs text-[var(--cream)]/60">{tr("in Chrome's top-right corner", "en la esquina superior derecha de Chrome", "en haut à droite de Chrome")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--cream)]/20 flex items-center justify-center shrink-0">
                <span className="text-display text-lg text-[var(--cream)]">2</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--cream)]">{tr('Tap "Add to Home screen"', 'Toca "Añadir a la pantalla de inicio"')}</p>
                <p className="text-xs text-[var(--cream)]/60">{tr("Then confirm", "Después confirma", "Puis confirme")}</p>
              </div>
            </div>
          </div>
        )}

        {!ios && !android && (
          <div className="text-center py-4">
            <Smartphone className="w-16 h-16 text-[var(--cream)] mx-auto mb-4" />
            <p className="text-lg font-semibold text-[var(--cream)] mb-2">{tr("Open it from your phone", "Ábrela desde tu móvil", "Ouvre-la depuis ton téléphone")}</p>
            <p className="text-sm text-[var(--cream)]/70 mb-6">{tr("Scan or share the link, then add it to the home screen from the phone browser.", "Escanea o comparte el enlace y añádela a la pantalla de inicio desde el navegador del móvil.", "Scanne ou partage le lien, puis ajoute-le à l'écran d'accueil depuis le navigateur du téléphone.")}</p>
            <div className="mb-5 flex justify-center gap-2">
              <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/25 px-4 py-2 text-sm text-[var(--cream)] hover:bg-[var(--ball)] hover:text-[var(--court-deep)] hover:border-[var(--ball)]">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? tr("Copied", "Copiado", "Copié") : tr("Copy link", "Copiar enlace", "Copier le lien")}
              </button>
              <button onClick={shareLink} className="inline-flex items-center gap-2 rounded-full border border-[var(--cream)]/25 px-4 py-2 text-sm text-[var(--cream)] hover:bg-[var(--cream)]/10">
                <Send className="h-4 w-4" />
                {tr("Share", "Compartir", "Partager")}
              </button>
            </div>
            <button onClick={onClose} className="inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-6 py-3 hover:opacity-90">{tr("Got it", "Entendido", "Compris")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function InstallPrompt() {
  const { open, openModal, closeModal } = useInstallModal();
  const tr = useTr();
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
            <Smartphone className="w-6 h-6 text-[var(--cream)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--cream)]">{tr("Put PadelMatch on your phone", "Instala PadelMatch en tu móvil", "Installe PadelMatch sur ton téléphone")}</p>
              <p className="text-xs text-[var(--cream)]">{tr("Quick guided setup →", "Instalación guiada rápida →", "Installation guidée rapide →")}</p>
            </div>
            <Download className="w-5 h-5 text-[var(--cream)] shrink-0" />
          </button>
        </div>
      )}
      <InstallModal open={open} onClose={closeModal} />
    </>
  );
}
