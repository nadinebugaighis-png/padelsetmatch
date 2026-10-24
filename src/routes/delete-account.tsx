import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account or data · Padel Set Match" },
      { name: "description", content: "Delete your Padel Set Match account or remove individual posts and messages while keeping your account. Deletion steps and data retention information." },
      { property: "og:title", content: "Delete your account or data · Padel Set Match" },
      { property: "og:description", content: "Account and data deletion options for Padel Set Match, operated by Moorish Arches S.L." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://padelsetmatch.com/delete-account" }],
  }),
  component: DeletionPage,
});

function DeletionPage() {
  const tr = useTr();
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link to="/" className="text-sm text-muted-foreground underline">← {tr("Home", "Inicio", "Accueil")}</Link>
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground">Padel Set Match · Moorish Arches S.L.</p>
          <h1 className="text-display text-4xl">{tr("Delete your account or data", "Eliminar tu cuenta o tus datos", "Supprimer votre compte ou vos données")}</h1>
        </header>
        <section className="space-y-4" id="account">
          <h2 className="text-display text-2xl">{tr("Delete your account", "Eliminar tu cuenta", "Supprimer votre compte")}</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>{tr("Open your profile using the button below. Sign in with your existing account if asked.", "Abre tu perfil con el botón de abajo. Inicia sesión con tu cuenta si se solicita.", "Ouvrez votre profil avec le bouton ci-dessous. Connectez-vous à votre compte si nécessaire.")}</li>
            <li>{tr('Scroll down and select “Delete my account”.', 'Baja y selecciona «Eliminar mi cuenta».', 'Descendez et sélectionnez «Supprimer mon compte».')}</li>
            <li>{tr("Confirm the deletion. This is permanent and cannot be undone.", "Confirma la eliminación. Es permanente y no se puede deshacer.", "Confirmez la suppression. Elle est définitive et irréversible.")}</li>
          </ol>
          <Button asChild variant="destructive"><Link to="/auth" search={{ mode: "signin", redirect: "/app/profile" }}><Trash2 />{tr("Open my profile", "Abrir mi perfil", "Ouvrir mon profil")}</Link></Button>
          <p className="text-sm text-muted-foreground">{tr("You can complete these steps on this website without installing the app. If you cannot sign in, use “Forgot password?” on the sign-in page.", "Puedes completar estos pasos en esta web sin instalar la app. Si no puedes acceder, usa «¿Has olvidado tu contraseña?» en la página de acceso.", "Vous pouvez suivre ces étapes sur ce site sans installer l’app. Si vous ne pouvez pas vous connecter, utilisez « Mot de passe oublié ? ».")}</p>
        </section>
        <section className="space-y-4 border-t border-border pt-6" id="data">
          <h2 className="text-display text-2xl">{tr("Delete data without deleting your account", "Eliminar datos sin eliminar tu cuenta", "Supprimer des données sans supprimer votre compte")}</h2>
          <p>{tr("You can remove your own posts, comments and messages while keeping your account.", "Puedes eliminar tus publicaciones, comentarios y mensajes y conservar tu cuenta.", "Vous pouvez supprimer vos publications, commentaires et messages tout en conservant votre compte.")}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{tr("Posts and comments: open Connect, find your own content and select its delete option.", "Publicaciones y comentarios: abre Connect, busca tu contenido y selecciona la opción de eliminar.", "Publications et commentaires : ouvrez Connect, trouvez votre contenu et sélectionnez l’option de suppression.")}</li>
            <li>{tr("Messages: open the conversation, find a message you sent and select its delete option.", "Mensajes: abre la conversación, busca un mensaje que hayas enviado y selecciona la opción de eliminar.", "Messages : ouvrez la conversation, trouvez un message envoyé et sélectionnez l’option de suppression.")}</li>
            <li>{tr('For another data-deletion request, open your profile and send a message through “Make this app better”, starting with “Privacy: delete data” and specifying what you want removed. Do not include your password.', 'Para otra solicitud de eliminación, abre tu perfil y escribe en «Mejora esta app», empezando por «Privacidad: eliminar datos» e indicando qué quieres eliminar. No incluyas tu contraseña.', 'Pour une autre demande, ouvrez votre profil et écrivez via « Améliorer cette app », en commençant par « Confidentialité : supprimer des données » et en précisant les données concernées. N’incluez pas votre mot de passe.')}</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link to="/auth" search={{ mode: "signin", redirect: "/app/connect" }}>{tr("Open Connect", "Abrir Connect", "Ouvrir Connect")}<ArrowRight /></Link></Button>
            <Button asChild variant="outline"><Link to="/auth" search={{ mode: "signin", redirect: "/app/matches" }}>{tr("Open conversations", "Abrir conversaciones", "Ouvrir les conversations")}<ArrowRight /></Link></Button>
          </div>
        </section>
        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-display text-2xl">{tr("What is deleted or retained", "Qué se elimina o conserva", "Données supprimées ou conservées")}</h2>
          <p>{tr("Account deletion removes your profile, matches, messages and Q&A answers. As stated in our privacy policy, permanent erasure is completed within 30 days, including backup rotation.", "La eliminación de la cuenta borra tu perfil, matches, mensajes y respuestas. Según nuestra política de privacidad, el borrado definitivo se completa en 30 días, incluida la rotación de copias de seguridad.", "La suppression du compte efface votre profil, matchs, messages et réponses. Conformément à notre politique de confidentialité, l’effacement définitif est effectué sous 30 jours, y compris la rotation des sauvegardes.")}</p>
          <p>{tr("Reports and safety records may be retained for up to 12 months to prevent banned users from immediately re-registering. Deleting individual content does not delete your account or the other information you choose to keep.", "Los reportes y registros de seguridad pueden conservarse hasta 12 meses para evitar que usuarios expulsados se registren de nuevo inmediatamente. Eliminar contenido individual no elimina tu cuenta ni los demás datos que decidas conservar.", "Les signalements et dossiers de sécurité peuvent être conservés jusqu’à 12 mois pour empêcher une réinscription immédiate après une exclusion. Supprimer un contenu ne supprime pas votre compte ni les autres données conservées.")}</p>
        </section>
        <footer className="flex flex-wrap gap-5 border-t border-border pt-6 text-sm">
          <Link to="/privacy" className="underline">{tr("Privacy policy", "Política de privacidad", "Politique de confidentialité")}</Link>
          <Link to="/support" className="underline">{tr("Support", "Soporte", "Assistance")}</Link>
        </footer>
      </div>
    </main>
  );
}