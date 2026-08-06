import { createFileRoute, Link } from "@tanstack/react-router";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · PadelSetMatch" },
      { name: "description", content: "How PadelSetMatch collects, stores and protects your data. Available in English, Español and Français." },
      { property: "og:title", content: "Privacy Policy · PadelSetMatch" },
      { property: "og:description", content: "How PadelSetMatch collects, stores and protects your data. Available in English, Español and Français." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://padelsetmatch.com/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://padelsetmatch.com/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  const tr = useTr();
  return (
    <main className="bg-[var(--paper)] min-h-screen max-w-2xl mx-auto px-6 py-10 text-[var(--ink)]/90 space-y-4">
      <Link to="/" className="text-xs uppercase tracking-widest text-[var(--ink)]/60">← {tr("Home", "Inicio", "Accueil")}</Link>
      <h1 className="text-display text-4xl">{tr("Privacy Policy", "Política de Privacidad", "Politique de confidentialité")}</h1>
      <p className="text-sm text-[var(--ink)]/60">
        {tr("Last updated:", "Última actualización:", "Dernière mise à jour :")} {new Date().toLocaleDateString()}
      </p>

      <p>
        {tr(
          "PadelSetMatch is a padel player directory operated by Moorish Arches S.L. (Madrid, Spain). This page explains what data we collect, how we use it, and the rights you have under the EU General Data Protection Regulation (GDPR) and Spanish data protection law (LOPDGDD).",
          "PadelSetMatch es un directorio de jugadores de pádel operado por Moorish Arches S.L. (Madrid, España). Esta página explica qué datos recogemos, cómo los usamos y qué derechos tienes según el Reglamento General de Protección de Datos (RGPD) y la ley española de protección de datos (LOPDGDD).",
          "PadelSetMatch est un annuaire de joueurs de padel exploité par Moorish Arches S.L. (Madrid, Espagne). Cette page explique quelles données nous collectons, comment nous les utilisons et les droits dont vous disposez au titre du RGPD et de la loi espagnole sur la protection des données (LOPDGDD).",
        )}
      </p>

      <h2 className="text-display text-2xl mt-6">1. {tr("Data controller", "Responsable del tratamiento", "Responsable du traitement")}</h2>
      <p>
        {tr(
          'Moorish Arches S.L. is the data controller. For any privacy request you can contact us via the "Make this app better" box on your Profile screen with the word "Privacy" in your message.',
          'Moorish Arches S.L. es el responsable del tratamiento. Para cualquier solicitud de privacidad puedes escribirnos desde el apartado "Mejora esta app" de tu perfil incluyendo la palabra "Privacidad" en el mensaje.',
          'Moorish Arches S.L. est le responsable du traitement. Pour toute demande relative à la confidentialité, contactez-nous via l\'encadré « Améliorer cette app » de votre profil en indiquant le mot « Confidentialité ».',
        )}
      </p>

      <h2 className="text-display text-2xl mt-6">2. {tr("What we collect", "Qué recogemos", "Ce que nous collectons")}</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{tr("Account: email, hashed password (or Google/Apple sign-in identifier).", "Cuenta: correo electrónico, contraseña cifrada (o identificador de acceso con Google/Apple).", "Compte : e-mail, mot de passe haché (ou identifiant de connexion Google/Apple).")}</li>
        <li>{tr("Profile you enter: first name, age bracket, gender, cities/clubs you play at, languages, padel level, photo, short bio, ranked traits and availability windows.", "Perfil que introduces: nombre, franja de edad, género, ciudades/clubes donde juegas, idiomas, nivel de pádel, foto, biografía breve, rasgos ordenados y franjas de disponibilidad.", "Profil que vous renseignez : prénom, tranche d'âge, genre, villes/clubs où vous jouez, langues, niveau de padel, photo, courte bio, traits classés et créneaux de disponibilité.")}</li>
        <li>{tr("Activity needed to run the service: matches you host or join, invites, ratings, reports and blocks.", "Actividad necesaria para el servicio: partidos que organizas o a los que te apuntas, invitaciones, valoraciones, reportes y bloqueos.", "Activité nécessaire au service : matchs que vous organisez ou rejoignez, invitations, évaluations, signalements et blocages.")}</li>
        <li>{tr("Messages you send to other players inside the app (stored so the chat works — see §5).", "Mensajes que envías a otros jugadores dentro de la app (se almacenan para que el chat funcione — ver §5).", "Messages envoyés aux autres joueurs dans l'app (stockés pour que le chat fonctionne — voir §5).")}</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">3. {tr("What we do NOT collect", "Qué NO recogemos", "Ce que nous ne collectons PAS")}</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{tr("Your last name (unless you choose to type it).", "Tus apellidos (salvo que decidas escribirlos).", "Votre nom de famille (sauf si vous le saisissez).")}</li>
        <li>{tr("Payment data — the app is currently free.", "Datos de pago: la app es gratuita por ahora.", "Données de paiement — l'app est gratuite actuellement.")}</li>
        <li>{tr("Precise GPS location. You type your cities/clubs yourself.", "Ubicación GPS precisa. Tú mismo escribes tus ciudades/clubes.", "Localisation GPS précise. Vous saisissez vous-même vos villes/clubs.")}</li>
        <li>{tr("Advertising identifiers or third-party analytics tracking.", "Identificadores publicitarios ni rastreo analítico de terceros.", "Identifiants publicitaires ou traceurs analytiques tiers.")}</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">4. {tr("Who can see what", "Quién ve qué", "Qui voit quoi")}</h2>
      <p>
        {tr(
          "Your first name, photo, age bracket, gender, level, cities/clubs, languages, bio, ranked traits and availability are visible to other signed-in padel players — this is what makes the directory work. Your email, exact age, blocks, reports, personality Q&A answers and feedback are private and never shown to other users.",
          "Tu nombre, foto, franja de edad, género, nivel, ciudades/clubes, idiomas, biografía, rasgos y disponibilidad son visibles para otros jugadores registrados: así funciona el directorio. Tu correo, edad exacta, bloqueos, reportes, respuestas del cuestionario de personalidad y comentarios son privados y nunca se muestran a otros usuarios.",
          "Votre prénom, photo, tranche d'âge, genre, niveau, villes/clubs, langues, bio, traits et disponibilités sont visibles par les autres joueurs connectés — c'est ce qui fait fonctionner l'annuaire. Votre e-mail, âge exact, blocages, signalements, réponses au questionnaire de personnalité et retours sont privés et jamais montrés aux autres.",
        )}
      </p>

      <h2 className="text-display text-2xl mt-6">5. {tr("Your messages and personality answers", "Tus mensajes y respuestas de personalidad", "Vos messages et réponses de personnalité")}</h2>
      <p>
        <b>{tr(
          "We do not read your private messages or your personality Q&A answers.",
          "No leemos tus mensajes privados ni tus respuestas del cuestionario de personalidad.",
          "Nous ne lisons pas vos messages privés ni vos réponses au questionnaire de personnalité.",
        )}</b>{" "}
        {tr(
          "We are not interested in the content of your conversations — it's yours.",
          "No nos interesa el contenido de tus conversaciones: es tuyo.",
          "Le contenu de vos conversations ne nous intéresse pas — il vous appartient.",
        )}
      </p>
      <p>
        {tr(
          "Messages are stored on our servers, encrypted at rest, for one reason: so the chat feature works across devices and so we can respond if you report abuse. The only situations in which a human at Moorish Arches S.L. would ever open a specific conversation are:",
          "Los mensajes se guardan en nuestros servidores, cifrados en reposo, por un único motivo: para que el chat funcione entre dispositivos y para poder responder si tú reportas un abuso. Las únicas situaciones en las que una persona de Moorish Arches S.L. abriría una conversación concreta son:",
          "Les messages sont stockés sur nos serveurs, chiffrés au repos, pour une seule raison : que le chat fonctionne sur tous les appareils et que nous puissions réagir si vous signalez un abus. Les seuls cas où une personne de Moorish Arches S.L. ouvrirait une conversation précise sont :",
        )}
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>{tr("You (or the other party) file a report about that specific chat.", "Tú (o la otra persona) reportáis ese chat concreto.", "Vous (ou l'autre partie) signalez ce chat précis.")}</li>
        <li>{tr("We receive a lawful order from a Spanish or EU authority.", "Recibimos una orden legal de una autoridad española o de la UE.", "Nous recevons une injonction légale d'une autorité espagnole ou européenne.")}</li>
      </ul>
      <p>
        {tr(
          "We never use your messages or Q&A answers to train AI models, to build advertising profiles, or to share with third parties.",
          "Nunca usamos tus mensajes ni tus respuestas para entrenar modelos de IA, crear perfiles publicitarios o compartirlos con terceros.",
          "Nous n'utilisons jamais vos messages ou réponses pour entraîner des modèles d'IA, créer des profils publicitaires ou les partager avec des tiers.",
        )}
      </p>

      <h2 className="text-display text-2xl mt-6">6. {tr("Legal bases (GDPR Art. 6)", "Bases jurídicas (RGPD Art. 6)", "Bases légales (RGPD art. 6)")}</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{tr("Contract (Art. 6.1.b): creating your account, storing your profile, running matches and chat.", "Contrato (Art. 6.1.b): crear tu cuenta, guardar tu perfil, gestionar partidos y chat.", "Contrat (art. 6.1.b) : création du compte, conservation du profil, gestion des matchs et du chat.")}</li>
        <li>{tr("Legitimate interest (Art. 6.1.f): preventing abuse, no-shows, spam and fraud.", "Interés legítimo (Art. 6.1.f): prevenir abusos, ausencias, spam y fraude.", "Intérêt légitime (art. 6.1.f) : prévention des abus, absences, spam et fraude.")}</li>
        <li>{tr("Consent (Art. 6.1.a): optional push notifications; you can revoke any time.", "Consentimiento (Art. 6.1.a): notificaciones push opcionales; puedes revocarlo cuando quieras.", "Consentement (art. 6.1.a) : notifications push facultatives, révocables à tout moment.")}</li>
        <li>{tr("Legal obligation (Art. 6.1.c): responding to lawful requests from authorities.", "Obligación legal (Art. 6.1.c): responder a requerimientos legales de las autoridades.", "Obligation légale (art. 6.1.c) : réponse aux demandes légales des autorités.")}</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">7. {tr("How long we keep data", "Cuánto tiempo conservamos los datos", "Durée de conservation")}</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{tr("Profile & messages: as long as your account exists. When you delete your account they are permanently erased within 30 days (the delay covers backup rotation).", "Perfil y mensajes: mientras exista tu cuenta. Al eliminarla se borran definitivamente en un plazo de 30 días (el margen cubre la rotación de copias de seguridad).", "Profil et messages : tant que votre compte existe. À sa suppression, ils sont effacés définitivement sous 30 jours (délai lié à la rotation des sauvegardes).")}</li>
        <li>{tr("Reports & safety records: up to 12 months after account deletion, so a banned user can't simply re-register.", "Reportes y registros de seguridad: hasta 12 meses tras eliminar la cuenta, para evitar que un usuario expulsado se registre de nuevo.", "Signalements et registres de sécurité : jusqu'à 12 mois après la suppression du compte, pour éviter qu'un utilisateur banni ne se réinscrive.")}</li>
        <li>{tr("Server logs: up to 30 days for security and debugging.", "Registros del servidor: hasta 30 días por seguridad y depuración.", "Journaux serveur : jusqu'à 30 jours pour la sécurité et le débogage.")}</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">8. {tr("Where data is stored — subprocessors", "Dónde se almacenan los datos — subencargados", "Où sont stockées les données — sous-traitants")}</h2>
      <p>{tr("Data is stored inside the European Union with the following subprocessors:", "Los datos se almacenan en la Unión Europea con los siguientes subencargados:", "Les données sont stockées dans l'Union européenne chez les sous-traitants suivants :")}</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>{tr("Lovable Cloud (built on Supabase) — hosting, database, authentication, storage (EU region).", "Lovable Cloud (sobre Supabase): alojamiento, base de datos, autenticación y almacenamiento (región UE).", "Lovable Cloud (basé sur Supabase) — hébergement, base de données, authentification, stockage (région UE).")}</li>
        <li>{tr('Google / Apple — only if you choose "Sign in with Google" or "Sign in with Apple" (verifies your identity).', 'Google / Apple: solo si eliges "Iniciar sesión con Google" o "Iniciar sesión con Apple" (verifica tu identidad).', 'Google / Apple — uniquement si vous choisissez « Se connecter avec Google » ou « Se connecter avec Apple » (vérification d\'identité).')}</li>
      </ul>
      <p>
        {tr(
          "Access inside the database is protected by row-level security: only you can read or modify your private data; other players only see the public fields listed in §4.",
          "El acceso a la base de datos está protegido con seguridad a nivel de fila: solo tú puedes leer o modificar tus datos privados; los demás jugadores solo ven los campos públicos del §4.",
          "L'accès à la base de données est protégé par la sécurité au niveau des lignes : vous seul pouvez lire ou modifier vos données privées ; les autres joueurs ne voient que les champs publics du §4.",
        )}
      </p>

      <h2 className="text-display text-2xl mt-6">9. {tr("Cookies", "Cookies", "Cookies")}</h2>
      <p>
        {tr(
          "We use a small number of essential cookies and localStorage entries to keep you signed in and to remember your language preference. We do not use advertising cookies, cross-site trackers or third-party analytics.",
          "Usamos unas pocas cookies esenciales y entradas de localStorage para mantener tu sesión y recordar tu idioma. No usamos cookies publicitarias, rastreadores entre sitios ni analítica de terceros.",
          "Nous utilisons quelques cookies essentiels et entrées localStorage pour maintenir votre session et mémoriser votre langue. Aucun cookie publicitaire, traceur inter-sites ou analytique tiers.",
        )}
      </p>

      <h2 className="text-display text-2xl mt-6">10. {tr("Your rights (GDPR)", "Tus derechos (RGPD)", "Vos droits (RGPD)")}</h2>
      <p>
        {tr(
          "You have the right to access, rectify, export, restrict, object to and delete your data, and to withdraw consent at any time. Account deletion is one tap on the Profile screen and is permanent. You also have the right to lodge a complaint with the Spanish Data Protection Agency (AEPD).",
          "Tienes derecho a acceder, rectificar, exportar, limitar, oponerte y suprimir tus datos, y a retirar tu consentimiento en cualquier momento. Eliminar la cuenta es un toque en tu perfil y es permanente. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD).",
          "Vous avez le droit d'accéder, rectifier, exporter, limiter, vous opposer et supprimer vos données, et de retirer votre consentement à tout moment. La suppression du compte se fait en une touche depuis le profil et est définitive. Vous pouvez aussi déposer une réclamation auprès de l'Agence espagnole de protection des données (AEPD).",
        )}{" "}
        <a className="underline" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>
      </p>

      <h2 className="text-display text-2xl mt-6">11. {tr("Age", "Edad", "Âge")}</h2>
      <p>
        {tr(
          "PadelSetMatch is for players aged 18 or older. We do not knowingly collect data from minors. If you believe a minor has created an account, please report the profile inside the app and we will remove it.",
          "PadelSetMatch es para jugadores de 18 años o más. No recogemos datos de menores a sabiendas. Si crees que un menor ha creado una cuenta, repórtala en la app y la eliminaremos.",
          "PadelSetMatch s'adresse aux joueurs de 18 ans ou plus. Nous ne collectons pas sciemment de données de mineurs. Si vous pensez qu'un mineur a créé un compte, signalez le profil dans l'app et nous le supprimerons.",
        )}
      </p>

      <h2 className="text-display text-2xl mt-6">12. {tr("Changes to this policy", "Cambios en esta política", "Modifications de cette politique")}</h2>
      <p>
        {tr(
          "If we make material changes we will notify you inside the app before the changes take effect.",
          "Si hacemos cambios importantes te avisaremos dentro de la app antes de que entren en vigor.",
          "En cas de modifications importantes, nous vous en informerons dans l'app avant leur entrée en vigueur.",
        )}
      </p>

      <div className="pt-6 text-sm">
        <Link to="/terms" className="underline">← {tr("Terms of Service", "Términos del servicio", "Conditions d'utilisation")}</Link>
      </div>
    </main>
  );
}
