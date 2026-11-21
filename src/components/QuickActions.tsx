import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, GraduationCap, Plus, QrCode } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { RacketIcon } from "@/components/RacketIcon";
import { CreateMatchChooser } from "@/components/CreateMatchChooser";
import { ShareAppDialog } from "@/components/QRShareButton";

/** Round + button above the floating bar: book a court, create a match, book a coach, share the app. */
export function QuickActions() {
  const tr = useTr();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [chooser, setChooser] = useState(false);
  const [share, setShare] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const actions = [
    { key: "court", label: tr("Book a court", "Reservar pista", "Réserver un court"), icon: <CalendarDays className="size-[22px]" strokeWidth={1.6} />, run: () => navigate({ to: "/app/book-court" }) },
    { key: "match", label: tr("Create a match", "Crear partido", "Créer un match"), icon: <RacketIcon className="size-[22px]" />, run: () => setChooser(true) },
    { key: "coach", label: tr("Book a coach", "Reservar entrenador", "Réserver un coach"), icon: <GraduationCap className="size-[22px]" strokeWidth={1.6} />, run: () => navigate({ to: "/app/coaches" }) },
    { key: "share", label: tr("Share the app", "Compartir la app", "Partager l’app"), icon: <QrCode className="size-[20px]" strokeWidth={1.6} />, run: () => setShare(true) },
  ];

  return (
    <>
      {open && <div aria-hidden className="fixed inset-0 z-[46] bg-[var(--ink)]/70 backdrop-blur-[3px] animate-in fade-in duration-150" onClick={() => setOpen(false)} />}
      <div data-bottom-ui className="quick-actions fixed right-4 z-[47] flex flex-col items-end gap-3.5 lg:right-8">
        {open && actions.map((a, i) => (
          <button key={a.key} type="button" onClick={() => { setOpen(false); a.run(); }}
            className="flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200 fill-mode-both"
            style={{ animationDelay: `${(actions.length - 1 - i) * 35}ms` }}>
            <span className="text-[15px] font-medium text-[var(--cream)] drop-shadow-sm">{a.label}</span>
            <span className="grid size-[52px] place-items-center rounded-full bg-[var(--paper)] text-[var(--ink)] shadow-lg">{a.icon}</span>
          </button>
        ))}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          aria-label={open ? tr("Close", "Cerrar", "Fermer") : tr("Quick actions", "Acciones rápidas", "Actions rapides")}
          className="quick-actions-fab grid size-14 place-items-center rounded-full text-[var(--cream)] active:scale-95 transition-transform">
          <Plus className={`size-7 transition-transform duration-200 ${open ? "rotate-45" : ""}`} strokeWidth={1.75} />
        </button>
      </div>
      <CreateMatchChooser open={chooser} onClose={() => setChooser(false)} />
      <ShareAppDialog open={share} onClose={() => setShare(false)} />
    </>
  );
}
