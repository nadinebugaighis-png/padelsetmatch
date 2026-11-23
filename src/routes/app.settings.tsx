import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAccount } from "@/lib/app.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [
    { title: "Settings \u00b7 PadelSetMatch" },
    { name: "description", content: "Account settings for your PadelSetMatch membership." },
    { property: "og:title", content: "Settings \u00b7 PadelSetMatch" },
    { property: "og:description", content: "Account settings for your PadelSetMatch membership." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const tr = useTr();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteAcct = useServerFn(deleteMyAccount);

  const onDelete = async () => {
    if (!confirm(t("prof.deleteConfirm"))) return;
    try {
      await deleteAcct();
      await supabase.auth.signOut();
      qc.clear();
      toast.success(t("prof.deleted"));
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("prof.deleteFail"));
    }
  };

  return (
    <main className="programme-page min-h-screen px-5 pt-6 pb-32 max-w-md sm:max-w-2xl mx-auto">
      <Link to="/app/profile" className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/82">
        <ArrowLeft className="w-3.5 h-3.5" /> {tr("Me", "Yo", "Moi")}
      </Link>
      <h1 className="mt-4 text-serif text-[28px] sm:text-[34px] leading-tight text-[var(--ink)]">{tr("Settings", "Ajustes", "Réglages")}</h1>

      <div className="mt-6 border-t border-[var(--ink)]/16">
        <Link to="/app/hidden" className="flex items-center justify-between py-4 border-b border-[var(--ink)]/16 text-[15px] text-[var(--ink)]">
          {tr("Hidden & blocked", "Ocultos y bloqueados", "Masqué et bloqué")}
          <ChevronRight className="w-4 h-4 text-[var(--ink)]/60" />
        </Link>
      </div>

      <div className="mt-14 text-center">
        <button onClick={onDelete} className="text-[11px] uppercase tracking-[0.2em] text-[var(--destructive)] hover:underline underline-offset-4">
          {t("prof.delete")}
        </button>
        <p className="mt-1.5 text-[11px] text-[var(--ink)]/72">
          {tr("Permanently deletes your account and all your data.", "Elimina tu cuenta y todos tus datos de forma permanente.", "Supprime définitivement votre compte et toutes vos données.")}
        </p>
      </div>
    </main>
  );
}
