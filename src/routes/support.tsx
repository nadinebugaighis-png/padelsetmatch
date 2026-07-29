import { createFileRoute, Link } from "@tanstack/react-router";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support & Safety · PadelSetMatch" },
      { name: "description", content: "Get help with PadelSetMatch: report a player or a post, block someone, delete your account, or contact our moderation team." },
      { property: "og:title", content: "Support & Safety · PadelSetMatch" },
      { property: "og:description", content: "Help, safety tools and moderation contact for PadelSetMatch players." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

const CONTACT = "hello@padelmatchapp.lovable.app";

function SupportPage() {
  const tr = useTr();
  return (
    <main className="min-h-screen bg-[var(--paper,#faf7f0)] px-5 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-serif text-3xl text-[var(--ink)]">
            {tr("Support & safety", "Soporte y seguridad", "Assistance et sécurité")}
          </h1>
          <p className="text-sm text-[var(--ink)]/70">
            {tr(
              "We review every report within 24 hours.",
              "Revisamos cada reporte en 24 horas.",
              "Nous examinons chaque signalement sous 24 heures.",
            )}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-serif text-xl text-[var(--ink)]">
            {tr("Report a player or a post", "Reportar a un jugador o publicación", "Signaler un joueur ou une publication")}
          </h2>
          <ul className="text-sm text-[var(--ink)]/80 list-disc pl-5 space-y-1.5">
            <li>{tr("On a profile: tap the flag icon.", "En un perfil: toca el icono de bandera.", "Sur un profil : touchez l'icône drapeau.")}</li>
            <li>{tr("In a chat: tap the flag in the header.", "En un chat: toca la bandera en la cabecera.", "Dans un chat : touchez le drapeau en haut.")}</li>
            <li>{tr("On a post or comment: tap the flag next to it.", "En una publicación o comentario: toca la bandera al lado.", "Sur une publication ou un commentaire : touchez le drapeau à côté.")}</li>
            <li>{tr("To stop all contact: use Block on the profile.", "Para cortar todo contacto: usa Bloquear en el perfil.", "Pour couper tout contact : utilisez Bloquer sur le profil.")}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-serif text-xl text-[var(--ink)]">
            {tr("Contact us", "Contáctanos", "Nous contacter")}
          </h2>
          <p className="text-sm text-[var(--ink)]/80">
            <a className="underline decoration-[var(--grass,#2e7d32)] decoration-2" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
          <p className="text-xs text-[var(--ink)]/60">Moorish Arches S.L. · Madrid, España</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-serif text-xl text-[var(--ink)]">
            {tr("Your data", "Tus datos", "Vos données")}
          </h2>
          <p className="text-sm text-[var(--ink)]/80">
            {tr(
              "You can delete your account and all your data at any time from Settings.",
              "Puedes eliminar tu cuenta y todos tus datos cuando quieras desde Ajustes.",
              "Vous pouvez supprimer votre compte et vos données à tout moment dans Réglages.",
            )}
          </p>
          <div className="flex gap-4 text-sm">
            <Link to="/privacy" className="underline">{tr("Privacy", "Privacidad", "Confidentialité")}</Link>
            <Link to="/terms" className="underline">{tr("Terms", "Términos", "Conditions")}</Link>
            <Link to="/" className="underline">{tr("Home", "Inicio", "Accueil")}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
