import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

export function isRTL(_lang: Lang): boolean {
  return false;
}

type Dict = Record<string, string>;

const en: Dict = {
  // Landing
  "land.signin": "Sign in",
  "land.chip": "Worldwide · pick your city",
  "land.h1.a": "find your",
  "land.h1.a2": "best",
  "land.h1.b": "Match.",
  "land.lede": "Discover players who match your level, personality and lifestyle. Whether you're looking for great games, new friends or meaningful connections, we'll help you find people you genuinely click with.",
  "land.cta": "START MATCH",
  "land.cta.sub": "Then book on Playtomic — or Play for free if your match has Court Access 🎾",

  "land.what": "What's Playtomic?",
  "land.statUsers": "players joined",
  "land.tap": "Tap. Tap-back. Play.",
  "land.foot": "Play anywhere. Worst case: a new padel friend.",
  "land.preview.chip": "Sneak peek",
  "land.preview.title": "Browse the Grid",
  "land.preview.sub": "Find your court soulmate. Sign in to unlock photos, scores and chat.",
  "land.preview.cta": "Join free",
  "land.preview.unlock": "Sign in to unlock",
  "land.preview.foot": "Preview only. Real profiles appear after you complete the questionnaire.",


  // Auth
  "auth.back": "← Back",
  "auth.title.signup": "Join PadelMatch",
  "auth.title.signin": "Welcome back",
  "auth.sub.signup": "We only ask what helps the match. Your photo is for matches, not the world.",
  "auth.sub.signin": "Sign back in to your padel feed.",
  "auth.google": "Continue with Google",
  "auth.or": "or",
  "auth.email": "email",
  "auth.password": "password (min 8)",
  "auth.create": "Create account",
  "auth.signin": "Sign in",
  "auth.toggleToSignin": "Already have an account? Sign in",
  "auth.toggleToSignup": "New here? Create an account",
  "auth.forgot": "Forgot password?",
  "auth.welcome": "Welcome! You're in.",
  "auth.confirmEmail": "Account created — check your email to confirm.",
  "auth.fail": "Sign-in failed",
  "auth.enterEmailFirst": "Enter your email first",
  "auth.resetSent": "Check your email for a reset link",

  // App shell
  "shell.home": "Home",
  "shell.discover": "Discover",
  "shell.signout": "Sign out",
  "shell.tab.discover": "Discover",
  "shell.tab.questions": "Matchmaking code",
  "shell.tab.matches": "Matches",
  "shell.tab.me": "Me",

  // Q&A page
  "qa.title": "Compatibility Q&A",
  "qa.sub": "Answer as many as you like. Each shared answer sharpens your matches. You can stop whenever — your progress is saved.",
  "qa.generate": "Generate questions",
  "qa.generateMore": "Generate more",
  "qa.generating": "Thinking up questions…",
  "qa.skip": "Skip",
  "qa.save": "Save",
  "qa.saved": "Saved",
  "qa.empty": "No questions yet — tap Generate to start.",
  "qa.answeredCount": "{n} answered",
  "qa.yourAnswers": "Your answers",
  "qa.seeMatches": "See who matches →",
  "qa.delete": "Remove",
  "qa.placeholder": "Type a short answer…",
  "qa.howItWorks": "AI generates fresh questions tailored to your profile. We never show your answers publicly — only shared answers boost your match score.",

  // Discover
  "disc.h1": "Tap who you'd play.",
  "disc.sub": "Mutual taps open a chat. Then book on Playtomic.",
  "disc.scoreA": "The",
  "disc.scoreB": "badge is the",
  "disc.scoreBold": "match score",
  "disc.scoreC": "— how well your answers line up (age, level, zone, culture, shared values). Higher = stronger fit.",
  "disc.filter.all": "Everyone",
  "disc.filter.partner": "Partner",
  "disc.filter.friend": "Friend",
  "disc.empty": "No matches with these filters yet.",
  "disc.liked": "Liked",
  "disc.undo": "Tap to undo",
  "disc.seeChats": "See your chats →",
  "disc.likeSent": "Like sent — if they tap back, chat opens",
  "disc.likeFail": "Couldn't send like",
  "disc.likeRemoved": "Like removed",
  "disc.undoFail": "Couldn't undo",
  "disc.blocked": "Blocked. You won't see each other again.",
  "disc.blockFail": "Couldn't block",
  "disc.privacyNote": "They won't know you liked them unless they like you back — no pressure.",
  "disc.reportSent": "Report sent. The account has been suspended for review.",
  "disc.reportFail": "Couldn't report",
  "disc.loading": "Loading the courts…",
  "disc.blockTitle": "Block — hide from each other",
  "disc.reportTitle": "Report — sent to staff for review",
  "disc.scoreTooltip": "Match score (0–100): how well your answers line up",
  "disc.reportPrompt": "Report {name}?\n\nDescribe what happened (harassment, fake photo, abuse, threats…). The account is suspended immediately and reviewed by our team.",
  "disc.reportConfirm": "Send report? {name}'s account will be suspended pending staff review.",
  "disc.blockConfirm": "Block {name}? You won't see each other anywhere in the app.",
  "disc.qaBannerTitle": "Unlock your Matchmaking code",
  "disc.qaBannerSub": "Answer a few questions so the AI can find your best court matches — personality, values and what you click on.",
  "disc.qaBannerCta": "Start matchmaking →",

  // Matches list
  "ml.h1": "Your courts",
  "ml.sub": "Everyone here tapped you back.",
  "ml.loading": "Loading…",
  "ml.empty": "No matches yet.",
  "ml.discoverLink": "Discover players →",

  // Chat
  "chat.opening": "Opening chat…",
  "chat.safetyTitle": "Safety first:",
  "chat.safety": "book the match on Playtomic — public court, verified booking, no shared addresses.",
  "chat.open": "Open",
  "chat.empty": "You both tapped. Say hi 👋",
  "chat.placeholder": "Hello! 👋",
  "chat.block": "Block",
  "chat.report": "Report",
  "chat.blockedDone": "Blocked.",
  "chat.reportDone": "Report sent. Account suspended for review.",
  "chat.sendFail": "Couldn't send",

  // Profile
  "prof.loading": "Loading…",
  "prof.noProfile": "You don't have a profile yet.",
  "prof.createLink": "Create your profile →",
  "prof.hi": "Hi, {name}",
  "prof.age": "Age",
  "prof.level": "Level",
  "prof.nationality": "Nationality",
  "prof.gender": "Gender",
  "prof.playsIn": "Plays in",
  "prof.languages": "Languages",
  "prof.privacy": "Your preferences (who you're looking for, age range, values you care about) are kept private — they're only used by the AI to find your matches, never shown on your profile. Retake the questionnaire any time to update them.",
  "prof.retake": "Retake questionnaire",
  "prof.delete": "Delete my account",
  "prof.deleteConfirm": "Delete your account permanently? This removes your profile, likes, matches and chats. This cannot be undone.",
  "prof.deleted": "Account deleted",
  "prof.deleteFail": "Could not delete account",

  // Feedback
  "fb.title": "Make this app better",
  "fb.sub": "Suggestions, bugs, things you'd love — it all comes straight to the team.",
  "fb.placeholder": "What would make PadelMatch better for you?",
  "fb.send": "Send",
  "fb.sending": "Sending…",
  "fb.thanks": "Thanks — your feedback was sent.",
  "fb.fail": "Couldn't send. Try again.",
  "fb.tooShort": "Add a few more words first.",


  // Onboarding
  "ob.step": "Step",
  "ob.of": "/",
  "ob.s0": "You",
  "ob.s1": "Who you're meeting",
  "ob.s2": "Padel, places & languages",
  "ob.s3": "What matters",
  "ob.s4": "Photo",
  "ob.back": "Back",
  "ob.next": "Next",
  "ob.start": "Start matching",
  "ob.saving": "Saving…",
  "ob.saved": "Profile saved",
  "ob.saveFail": "Save failed",
  // step 0
  "ob.h0": "Who are you?",
  "ob.firstName": "First name (only this is shown)",
  "ob.firstNamePh": "Lucía",
  "ob.age": "Age",
  "ob.iAm": "I am",
  "ob.lookingFor": "Looking for",
  "ob.privateNote": "Your answers here stay private — they're never shown on your profile and will not be shared. You can retake this questionnaire any time to change them.",
  // step 1
  "ob.h1": "Who do you want to meet?",
  "ob.audIntro1": "Pick separately for friendship and for a relationship — tap as many as fit. Choose",
  "ob.audIntro2": "if you're open to all.",
  "ob.audPrivate": "Only used for matching — never shown on your profile.",
  "ob.audEveryone": "Everyone",
  "ob.audFriend": "For friendship",
  "ob.audPartner": "For a relationship",
  "ob.ageRange": "Age range",
  "ob.to": "to",
  // step 2
  "ob.h2": "Padel, places & languages",
  "ob.nat": "Nationality / background",
  "ob.places": "Places you play",
  "ob.placesHelp": "Add where you live, work, your summer house, or a city you're visiting. Add up to 8.",
  "ob.country": "Country",
  "ob.city": "City",
  "ob.cityPh": "e.g. Madrid",
  "ob.area": "Area / barrio (optional)",
  "ob.areaPh": "e.g. La Moraleja, Chamberí",
  "ob.addLocation": "Add this location",
  "ob.langs": "Languages you speak",
  "ob.padelLevel": "Padel level",
  "ob.bio": "Short bio (optional)",
  "ob.bioPh": "Quiet hitter. Saturday morning regular.",
  "ob.errCountryCity": "Country and city required",
  "ob.errMaxLoc": "Max 8 locations",
  "ob.errDup": "Already added",
  // step 3
  "ob.h3": "What matters to you?",
  "ob.h3sub": "Tap to add. Then rank them — most important first. Up to 3 of your own.",
  "ob.h3priv": "Private — only used for matching.",
  "ob.suggested": "Suggested traits",
  "ob.addOwn": "Add your own (up to 3)",
  "ob.addOwnPh": "e.g. animal lover, foodie, early bird",
  "ob.ranking": "Your ranking (top = most important)",
  "ob.pickThree": "Pick at least 3.",
  "ob.errMax3": "Up to 3 custom traits",
  "ob.errMaxTraits": "Max 8 traits",
  // step 4
  "ob.h4": "Your padel photo",
  "ob.h4sub": "A photo of you with a racket on court — that's the whole vibe. Shown in the discover grid.",
  "ob.uploading": "Uploading…",
  "ob.tapUpload": "Tap to upload",
  "ob.uploaded": "Photo uploaded",
  "ob.uploadFail": "Upload failed",
  "ob.notSignedIn": "Not signed in",

  // Reset password
  "rp.title": "Set a new password",
  "rp.openFromEmail": "Open this page from the link in your reset email. If you got here by accident, head back to",
  "rp.signin": "sign in",
  "rp.newPw": "new password (min 8)",
  "rp.update": "Update password",
  "rp.updated": "Password updated — you're signed in.",
  "rp.updateFail": "Could not update password",

  // Errors / 404
  "err.404": "Page not found",
  "err.goHome": "Go home",
  "err.title": "This page didn't load",
  "err.sub": "Something went wrong on our end.",
  "err.retry": "Try again",

  // Welcome
  "welcome.hello": "Hello",
  "welcome.helloSub": "Continue in English",
  "welcome.holaSub": "Continúa en Español",

  // Events
  "events.myAreas": "Only my areas",
  "events.noAreasTitle": "No areas selected",
  "events.noAreasBody": "Add the cities where you play in your profile to see matches near you.",
  "events.noAreasCta": "Go to profile →",
  "events.noMatchesMyAreas": "No upcoming matches in your areas.",
};

const es: Dict = {
  // Landing
  "land.signin": "Iniciar sesión",
  "land.chip": "En todo el mundo · elige tu ciudad",
  "land.h1.a": "encuentra tu",
  "land.h1.a2": "mejor",
  "land.h1.b": "Match.",
  "land.lede": "Descubre jugadores que encajan con tu nivel, personalidad y estilo de vida. Ya sea para grandes partidos, nuevos amigos o conexiones reales, te ayudamos a encontrar gente con la que de verdad conectas.",
  "land.cta": "INICIAR MATCH",
  "land.cta.sub": "Luego reservas en Playtomic — o juegas gratis si tu match tiene pista propia 🎾",

  "land.what": "¿Qué es Playtomic?",
  "land.statUsers": "jugadores unidos",
  "land.tap": "Tap. Tap de vuelta. A jugar.",
  "land.foot": "Juega donde quieras. En el peor caso: un nuevo amigo de pádel.",
  "land.preview.chip": "Adelanto",
  "land.preview.title": "Echa un vistazo al Grid",
  "land.preview.sub": "Encuentra tu alma gemela de pista. Inicia sesión para ver fotos, puntuaciones y chat.",
  "land.preview.cta": "Únete gratis",
  "land.preview.unlock": "Inicia sesión para ver",
  "land.preview.foot": "Solo vista previa. Los perfiles reales aparecen al completar el cuestionario.",


  // Auth
  "auth.back": "← Atrás",
  "auth.title.signup": "Únete a PadelMatch",
  "auth.title.signin": "Bienvenido de vuelta",
  "auth.sub.signup": "Solo preguntamos lo que ayuda al match. Tu foto es para tus matches, no para el mundo.",
  "auth.sub.signin": "Vuelve a entrar en tu feed de pádel.",
  "auth.google": "Continuar con Google",
  "auth.or": "o",
  "auth.email": "email",
  "auth.password": "contraseña (mín. 8)",
  "auth.create": "Crear cuenta",
  "auth.signin": "Entrar",
  "auth.toggleToSignin": "¿Ya tienes cuenta? Entra",
  "auth.toggleToSignup": "¿Nuevo por aquí? Crea una cuenta",
  "auth.forgot": "¿Olvidaste tu contraseña?",
  "auth.welcome": "¡Bienvenido! Ya estás dentro.",
  "auth.confirmEmail": "Cuenta creada — revisa tu correo para confirmar.",
  "auth.fail": "Error al iniciar sesión",
  "auth.enterEmailFirst": "Escribe tu email primero",
  "auth.resetSent": "Mira tu correo para el enlace de recuperación",

  // App shell
  "shell.home": "Inicio",
  "shell.discover": "Descubrir",
  "shell.signout": "Salir",
  "shell.tab.discover": "Descubrir",
  "shell.tab.questions": "Código de afinidad",
  "shell.tab.matches": "Matches",
  "shell.tab.me": "Yo",

  // Q&A page
  "qa.title": "Preguntas de compatibilidad",
  "qa.sub": "Responde las que quieras. Cada respuesta compartida afina tus matches. Puedes parar cuando quieras — se guarda tu progreso.",
  "qa.generate": "Generar preguntas",
  "qa.generateMore": "Generar más",
  "qa.generating": "Pensando preguntas…",
  "qa.skip": "Saltar",
  "qa.save": "Guardar",
  "qa.saved": "Guardado",
  "qa.empty": "Aún no hay preguntas — toca Generar para empezar.",
  "qa.answeredCount": "{n} respondidas",
  "qa.yourAnswers": "Tus respuestas",
  "qa.seeMatches": "Ver quién encaja →",
  "qa.delete": "Quitar",
  "qa.placeholder": "Escribe una respuesta corta…",
  "qa.howItWorks": "La IA genera preguntas nuevas según tu perfil. Tus respuestas nunca son públicas — solo las respuestas compartidas suben tu puntuación de match.",

  // Discover
  "disc.h1": "Toca con quién jugarías.",
  "disc.sub": "Si os tocáis mutuamente, se abre el chat. Luego reservad en Playtomic.",
  "disc.scoreA": "El",
  "disc.scoreB": "es la",
  "disc.scoreBold": "puntuación de match",
  "disc.scoreC": "— cuánto encajan vuestras respuestas (edad, nivel, zona, cultura, valores). Mayor = mejor encaje.",
  "disc.filter.all": "Todos",
  "disc.filter.partner": "Pareja",
  "disc.filter.friend": "Amistad",
  "disc.empty": "Aún no hay matches con estos filtros.",
  "disc.liked": "Te gusta",
  "disc.undo": "Toca para deshacer",
  "disc.seeChats": "Ver tus chats →",
  "disc.likeSent": "Like enviado — si te lo devuelve, se abre el chat",
  "disc.likeFail": "No se pudo enviar el like",
  "disc.likeRemoved": "Like quitado",
  "disc.undoFail": "No se pudo deshacer",
  "disc.blocked": "Bloqueado. No os volveréis a ver.",
  "disc.blockFail": "No se pudo bloquear",
  "disc.reportSent": "Reporte enviado. La cuenta queda suspendida para revisión.",
  "disc.reportFail": "No se pudo reportar",
  "disc.loading": "Cargando las pistas…",
  "disc.blockTitle": "Bloquear — os ocultáis mutuamente",
  "disc.reportTitle": "Reportar — se envía al equipo para revisión",
  "disc.scoreTooltip": "Puntuación de match (0–100): cuánto encajan vuestras respuestas",
  "disc.reportPrompt": "¿Reportar a {name}?\n\nCuenta qué ha pasado (acoso, foto falsa, abuso, amenazas…). La cuenta se suspende al instante y la revisa nuestro equipo.",
  "disc.reportConfirm": "¿Enviar el reporte? La cuenta de {name} quedará suspendida pendiente de revisión.",
  "disc.blockConfirm": "¿Bloquear a {name}? No os veréis en ninguna parte de la app.",
  "disc.qaBannerTitle": "Desbloquea tu Código de afinidad",
  "disc.qaBannerSub": "Responde unas preguntas para que la IA encuentre tus mejores matches de pista — personalidad, valores y con quien conectas.",
  "disc.qaBannerCta": "Empezar afinidad →",

  // Matches list
  "ml.h1": "Tus pistas",
  "ml.sub": "Todos aquí te tocaron de vuelta.",
  "ml.loading": "Cargando…",
  "ml.empty": "Aún no hay matches.",
  "ml.discoverLink": "Descubrir jugadores →",

  // Chat
  "chat.opening": "Abriendo el chat…",
  "chat.safetyTitle": "Seguridad primero:",
  "chat.safety": "reservad el partido en Playtomic — pista pública, reserva verificada, sin compartir direcciones.",
  "chat.open": "Abrir",
  "chat.empty": "Os habéis tocado mutuamente. ¡Saluda 👋!",
  "chat.placeholder": "¡Hola! 👋",
  "chat.block": "Bloquear",
  "chat.report": "Reportar",
  "chat.blockedDone": "Bloqueado.",
  "chat.reportDone": "Reporte enviado. Cuenta suspendida para revisión.",
  "chat.sendFail": "No se pudo enviar",

  // Profile
  "prof.loading": "Cargando…",
  "prof.noProfile": "Aún no tienes perfil.",
  "prof.createLink": "Crea tu perfil →",
  "prof.hi": "Hola, {name}",
  "prof.age": "Edad",
  "prof.level": "Nivel",
  "prof.nationality": "Nacionalidad",
  "prof.gender": "Género",
  "prof.playsIn": "Juega en",
  "prof.languages": "Idiomas",
  "prof.privacy": "Tus preferencias (a quién buscas, rango de edad, valores que te importan) son privadas — solo las usa la IA para encontrar tus matches, nunca se muestran en tu perfil. Puedes rehacer el cuestionario cuando quieras.",
  "prof.retake": "Rehacer el cuestionario",
  "prof.delete": "Borrar mi cuenta",
  "prof.deleteConfirm": "¿Borrar tu cuenta para siempre? Esto elimina tu perfil, likes, matches y chats. No se puede deshacer.",
  "prof.deleted": "Cuenta borrada",
  "prof.deleteFail": "No se pudo borrar la cuenta",

  // Feedback
  "fb.title": "Haz esta app mejor",
  "fb.sub": "Sugerencias, errores, lo que te encantaría — llega directo al equipo.",
  "fb.placeholder": "¿Qué haría PadelMatch mejor para ti?",
  "fb.send": "Enviar",
  "fb.sending": "Enviando…",
  "fb.thanks": "Gracias — tu feedback se envió.",
  "fb.fail": "No se pudo enviar. Inténtalo de nuevo.",
  "fb.tooShort": "Escribe un poco más primero.",


  // Onboarding
  "ob.step": "Paso",
  "ob.of": "/",
  "ob.s0": "Tú",
  "ob.s1": "A quién quieres conocer",
  "ob.s2": "Pádel, sitios e idiomas",
  "ob.s3": "Lo que importa",
  "ob.s4": "Foto",
  "ob.back": "Atrás",
  "ob.next": "Siguiente",
  "ob.start": "Empezar a hacer match",
  "ob.saving": "Guardando…",
  "ob.saved": "Perfil guardado",
  "ob.saveFail": "No se pudo guardar",
  "ob.h0": "¿Quién eres?",
  "ob.firstName": "Nombre (solo esto se muestra)",
  "ob.firstNamePh": "Lucía",
  "ob.age": "Edad",
  "ob.iAm": "Soy",
  "ob.lookingFor": "Busco",
  "ob.privateNote": "Tus respuestas aquí son privadas — nunca se muestran en tu perfil ni se compartirán. Puedes rehacer el cuestionario cuando quieras.",
  "ob.h1": "¿A quién quieres conocer?",
  "ob.audIntro1": "Elige por separado para amistad y para una relación — toca tantos como encajen. Pulsa",
  "ob.audIntro2": "si te abres a todo el mundo.",
  "ob.audPrivate": "Solo se usa para el matching — nunca se muestra en tu perfil.",
  "ob.audEveryone": "Todos",
  "ob.audFriend": "Para amistad",
  "ob.audPartner": "Para una relación",
  "ob.ageRange": "Rango de edad",
  "ob.to": "a",
  "ob.h2": "Pádel, sitios e idiomas",
  "ob.nat": "Nacionalidad / origen",
  "ob.places": "Sitios donde juegas",
  "ob.placesHelp": "Añade dónde vives, trabajas, tu casa de verano o una ciudad de visita. Hasta 8.",
  "ob.country": "País",
  "ob.city": "Ciudad",
  "ob.cityPh": "p. ej. Madrid",
  "ob.area": "Zona / barrio (opcional)",
  "ob.areaPh": "p. ej. La Moraleja, Chamberí",
  "ob.addLocation": "Añadir esta ubicación",
  "ob.langs": "Idiomas que hablas",
  "ob.padelLevel": "Nivel de pádel",
  "ob.bio": "Bio corta (opcional)",
  "ob.bioPh": "Pegada tranquila. Sábado por la mañana fijo.",
  "ob.errCountryCity": "País y ciudad obligatorios",
  "ob.errMaxLoc": "Máx. 8 ubicaciones",
  "ob.errDup": "Ya añadido",
  "ob.h3": "¿Qué te importa?",
  "ob.h3sub": "Toca para añadir. Luego ordénalos — el más importante arriba. Hasta 3 propios.",
  "ob.h3priv": "Privado — solo se usa para el matching.",
  "ob.suggested": "Rasgos sugeridos",
  "ob.addOwn": "Añade los tuyos (hasta 3)",
  "ob.addOwnPh": "p. ej. amante de los animales, foodie, madrugador",
  "ob.ranking": "Tu orden (arriba = más importante)",
  "ob.pickThree": "Elige al menos 3.",
  "ob.errMax3": "Hasta 3 rasgos propios",
  "ob.errMaxTraits": "Máx. 8 rasgos",
  "ob.h4": "Tu foto de pádel",
  "ob.h4sub": "Una foto tuya con pala en la pista — eso es todo. Aparece en la cuadrícula de descubrir.",
  "ob.uploading": "Subiendo…",
  "ob.tapUpload": "Toca para subir",
  "ob.uploaded": "Foto subida",
  "ob.uploadFail": "Error al subir",
  "ob.notSignedIn": "No has iniciado sesión",

  // Reset password
  "rp.title": "Cambia tu contraseña",
  "rp.openFromEmail": "Abre esta página desde el enlace del correo de recuperación. Si llegaste por error, vuelve a",
  "rp.signin": "iniciar sesión",
  "rp.newPw": "nueva contraseña (mín. 8)",
  "rp.update": "Actualizar contraseña",
  "rp.updated": "Contraseña actualizada — ya estás dentro.",
  "rp.updateFail": "No se pudo actualizar la contraseña",

  // Errors / 404
  "err.404": "Página no encontrada",
  "err.goHome": "Volver al inicio",
  "err.title": "Esta página no cargó",
  "err.sub": "Algo ha ido mal por nuestra parte.",
  "err.retry": "Reintentar",

  // Welcome
  "welcome.hello": "Hola",
  "welcome.helloSub": "Continue in English",
  "welcome.holaSub": "Continúa en Español",

  // Events
  "events.myAreas": "Solo mis zonas",
  "events.noAreasTitle": "Ninguna zona seleccionada",
  "events.noAreasBody": "Añade las ciudades donde juegas en tu perfil para ver partidos cerca de ti.",
  "events.noAreasCta": "Ir al perfil →",
  "events.noMatchesMyAreas": "No hay partidos próximos en tus zonas.",
};


const DICTS: Record<Lang, Dict> = { en, es };

// Display labels for fixed enums stored in English in the DB.
const LABELS: Record<Lang, Record<string, string>> = {
  en: {
    woman: "woman", man: "man", "non-binary": "non-binary", "self-describe": "Prefer to self-describe",
    "just starting": "just starting", casual: "casual", beginner: "beginner", intermediate: "intermediate", advanced: "advanced", competitive: "competitive",
    friend: "friend", partner: "partner", both: "both",
    everyone: "everyone", women: "women", men: "men", "lesbian women": "lesbian women", "gay men": "gay men", bisexual: "bisexual", queer: "queer",
  },
  es: {
    woman: "mujer", man: "hombre", "non-binary": "no binario", "self-describe": "Prefiero describirme",
    "just starting": "empezando", casual: "casual", beginner: "principiante", intermediate: "intermedio", advanced: "avanzado", competitive: "competitivo",
    friend: "amistad", partner: "pareja", both: "ambos",
    everyone: "todos", women: "mujeres", men: "hombres", "lesbian women": "mujeres lesbianas", "gay men": "hombres gays", bisexual: "bisexuales", queer: "queer",
    "Travel": "Viajes",
    "Art": "Arte",
    "Music": "Música",
    "Sports": "Deportes",
    "Fitness": "Fitness",
    "Nature": "Naturaleza",
    "Adventure": "Aventura",
    "Food": "Comida",
    "Learning": "Aprendizaje",
    "Ideas (conversation)": "Ideas (conversación)",
    "Humor": "Humor",
    "Chill (relaxing)": "Relax (descansar)",
    "Partying": "Fiestas",
    "Family": "Familia",
    "Friendship": "Amistad",
    "Purpose (meaning)": "Propósito (sentido)",
    "Debate (discussion)": "Debate (discusión)",
    "Politics": "Política",
    "Religion / faith": "Religión / fe",
    "Romance": "Romance",
    "Creativity (making)": "Creatividad (crear)",
    "Ambition (career)": "Ambición (carrera)",
    "Social causes (activism)": "Causas sociales (activismo)",
    "Comfort (home life)": "Confort (vida en casa)",
    "Spontaneity (surprises)": "Espontaneidad (sorpresas)",
  },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
  label: (key: string) => string;
};

const I18nCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "padel_lang_v1";

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const langs = (navigator.languages ?? [navigator.language ?? "en"]).map((s) => s.toLowerCase());
  if (langs.some((l) => l.startsWith("es"))) return "es";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "es") {
        setLangState(stored);
      } else {
        setLangState(detectBrowserLang());
      }
    } catch {
      setLangState(detectBrowserLang());
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  };

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (key, vars) => {
      const dict = DICTS[lang];
      let s = dict[key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
      return s;
    },
    label: (key) => LABELS[lang][key] ?? LABELS.en[key] ?? key,
  }), [lang]);

  return (
    <I18nCtx.Provider value={value}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
export const useT = () => useI18n().t;

// Quick inline translator for strings not yet keyed in the dictionary.
export function useTr() {
  const { lang } = useI18n();
  return (en: string, es: string) => (lang === "es" ? es : en);
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex items-center rounded-full border border-[var(--cream)]/20 text-[10px] uppercase tracking-widest overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 ${lang === "en" ? "bg-[var(--ball)] text-[var(--court-deep)] font-bold" : "text-[var(--cream)]/70 hover:text-[var(--cream)]"}`}
        aria-pressed={lang === "en"}
      >EN</button>
      <button
        type="button"
        onClick={() => setLang("es")}
        className={`px-2.5 py-1 ${lang === "es" ? "bg-[var(--ball)] text-[var(--court-deep)] font-bold" : "text-[var(--cream)]/70 hover:text-[var(--cream)]"}`}
        aria-pressed={lang === "es"}
      >ES</button>
    </div>
  );
}

