import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { reportContent } from "@/lib/app.functions";
import { useTr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Kind = "post" | "comment" | "message";

/**
 * Small flag button + dialog to report user-generated content.
 * Required for App Store guideline 1.2 (UGC apps must offer a report mechanism).
 */
export function ReportContentButton({
  kind,
  contentId,
  authorProfileId,
  className,
  size = "sm",
}: {
  kind: Kind;
  contentId: string;
  authorProfileId: string | null;
  className?: string;
  size?: "sm" | "xs";
}) {
  if (!authorProfileId) return null;
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const submit = useServerFn(reportContent);

  const reasons = [
    tr("Harassment or abuse", "Acoso o abuso", "Harcèlement ou abus"),
    tr("Spam or scam", "Spam o estafa", "Spam ou arnaque"),
    tr("Sexual or offensive content", "Contenido sexual u ofensivo", "Contenu sexuel ou offensant"),
    tr("Hate speech", "Discurso de odio", "Discours haineux"),
    tr("Other", "Otro", "Autre"),
  ];
  const [picked, setPicked] = useState(reasons[0]);

  const m = useMutation({
    mutationFn: () =>
      submit({
        data: {
          kind,
          contentId,
          authorProfileId,
          reason: reason.trim() ? `${picked}: ${reason.trim()}` : picked,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setReason("");
      toast.success(
        tr("Reported. We review within 24h.", "Reportado. Lo revisamos en 24h.", "Signalé. Nous examinons sous 24h."),
      );
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : tr("Couldn't report", "No se pudo reportar", "Impossible de signaler")),
  });

  const label = tr("Report", "Reportar", "Signaler");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={`inline-flex items-center text-[var(--ink)]/40 hover:text-red-500 transition px-1 ${className ?? ""}`}
      >
        <Flag className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--paper,#faf7f0)] border border-[var(--ink)]/10 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-serif text-lg text-[var(--ink)]">
              {tr("Report this content", "Reportar este contenido", "Signaler ce contenu")}
            </h3>
            <select
              className="w-full bg-transparent border border-[var(--ink)]/20 rounded-md h-10 px-2 text-sm"
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={400}
              placeholder={tr("Anything else we should know?", "¿Algo más que debamos saber?", "Autre chose à savoir ?")}
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {tr("Cancel", "Cancelar", "Annuler")}
              </Button>
              <Button
                disabled={m.isPending}
                onClick={() => m.mutate()}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {tr("Submit report", "Enviar reporte", "Envoyer le signalement")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
