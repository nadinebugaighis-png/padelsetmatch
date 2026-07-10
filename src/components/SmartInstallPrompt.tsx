import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bell, Zap, Home, X } from "lucide-react";
import { InstallModal } from "@/components/InstallPrompt";
import { useTr } from "@/lib/i18n";

const KEY_DISMISS_COUNT = "pm_install_prompt_dismiss_count";
const KEY_SNOOZE_UNTIL = "pm_install_prompt_snooze_until";
const KEY_INSTALLED_SEEN = "pm_install_prompt_installed_seen";
const MAX_DISMISSALS = 3;
const SNOOZE_MS = 1000 * 60 * 60 * 48; // 48h
const MIN_SESSION_MS = 25_000;
const MIN_DISTINCT_ROUTES = 2;

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function readNum(key: string): number {
  try { return Number(localStorage.getItem(key) ?? "0") || 0; } catch { return 0; }
}
function readIso(key: string): number {
  try {
    const v = localStorage.getItem(key);
    return v ? new Date(v).getTime() : 0;
  } catch { return 0; }
}

export function SmartInstallPrompt() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tr = useTr();
  const [show, setShow] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const routesRef = useRef<Set<string>>(new Set());
  const startRef = useRef<number>(Date.now());

  // Track standalone once — remember so we never show again on this device.
  useEffect(() => {
    if (isStandalone()) {
      try { localStorage.setItem(KEY_INSTALLED_SEEN, "1"); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!path.startsWith("/app")) return;
    routesRef.current.add(path);
  }, [path]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMobile()) return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(KEY_INSTALLED_SEEN) === "1") return;
      if (readNum(KEY_DISMISS_COUNT) >= MAX_DISMISSALS) return;
      const snooze = readIso(KEY_SNOOZE_UNTIL);
      if (snooze && snooze > Date.now()) return;
    } catch { /* ignore */ }

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const distinct = routesRef.current.size;
      if (elapsed >= MIN_SESSION_MS && distinct >= MIN_DISTINCT_ROUTES) {
        setShow(true);
        window.clearInterval(timer);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const snooze = () => {
    try {
      localStorage.setItem(
        KEY_SNOOZE_UNTIL,
        new Date(Date.now() + SNOOZE_MS).toISOString(),
      );
    } catch { /* ignore */ }
    setShow(false);
  };

  const dismiss = () => {
    try {
      const n = readNum(KEY_DISMISS_COUNT) + 1;
      localStorage.setItem(KEY_DISMISS_COUNT, String(n));
      localStorage.setItem(
        KEY_SNOOZE_UNTIL,
        new Date(Date.now() + SNOOZE_MS).toISOString(),
      );
    } catch { /* ignore */ }
    setShow(false);
  };

  const openInstall = () => {
    setShow(false);
    setOpenModal(true);
  };

  return (
    <>
      {show && (
        <div className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] sm:pb-[calc(env(safe-area-inset-bottom,0px)+104px)] animate-in slide-in-from-bottom-5 duration-300">
          <div className="mx-auto max-w-md rounded-3xl bg-[var(--ink)] text-[var(--paper)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-[var(--paper)]/10 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--plum)]/25 text-[var(--paper)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                    {tr("30-second setup", "Instala en 30 seg", "30 secondes")}
                  </div>
                  <h3 className="text-serif mt-2.5 text-2xl leading-tight text-[var(--paper)]">
                    {tr(
                      "Never miss a match",
                      "No te pierdas ningún partido",
                      "Ne rate aucun match",
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--paper)]/70 leading-snug">
                    {tr(
                      "Add PadelMatch to your home screen for the full app feel.",
                      "Añade PadelMatch a tu pantalla de inicio para la experiencia completa.",
                      "Ajoute PadelMatch à ton écran d'accueil pour l'expérience complète.",
                    )}
                  </p>
                </div>
                <button
                  onClick={dismiss}
                  aria-label="Close"
                  className="shrink-0 p-1.5 -mr-1.5 -mt-1.5 rounded-full text-[var(--paper)]/50 hover:text-[var(--paper)] hover:bg-[var(--paper)]/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-3 text-sm text-[var(--paper)]/85">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--paper)]/10 shrink-0">
                    <Bell className="w-4 h-4" />
                  </span>
                  {tr(
                    "Instant alerts when a match opens near you",
                    "Alertas al instante cuando se abre un partido cerca",
                    "Alertes instantanées quand un match s'ouvre",
                  )}
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--paper)]/85">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--paper)]/10 shrink-0">
                    <Zap className="w-4 h-4" />
                  </span>
                  {tr(
                    "Opens in one tap, no browser bars",
                    "Se abre en un toque, sin barras del navegador",
                    "S'ouvre en un clic, sans barres",
                  )}
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--paper)]/85">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--paper)]/10 shrink-0">
                    <Home className="w-4 h-4" />
                  </span>
                  {tr(
                    "Your padel life, one tap away",
                    "Tu pádel, a un solo toque",
                    "Ton padel, à un seul clic",
                  )}
                </li>
              </ul>

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={openInstall}
                  className="flex-1 rounded-full bg-[var(--paper)] text-[var(--ink)] font-bold uppercase tracking-[0.14em] text-[12px] py-3 hover:brightness-95 transition"
                >
                  {tr("Show me how", "Muéstrame cómo", "Montre-moi")}
                </button>
                <button
                  onClick={snooze}
                  className="rounded-full border border-[var(--paper)]/25 text-[var(--paper)]/80 text-[12px] font-semibold uppercase tracking-[0.14em] px-4 py-3 hover:bg-[var(--paper)]/10"
                >
                  {tr("Later", "Después", "Plus tard")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <InstallModal open={openModal} onClose={() => setOpenModal(false)} />
    </>
  );
}
