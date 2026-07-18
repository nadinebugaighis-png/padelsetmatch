import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Lang = "en" | "es" | "fr" | "ar";

export function isRTL(lang: Lang): boolean {
  return lang === "ar";
}

type Dict = Record<string, string>;

const en: Dict = {
  // Landing
  "land.signin": "Sign in",
  "land.h1.a": "find your",
  "land.h1.a2": "best",
  "land.h1.b": "Match.",
  "land.lede": "A directory of padel players around you. See who is up for a game, who has free court access, and meet players ahead of time — in your city or wherever you travel.",
  "land.cta": "Create account",
  "land.cta.sub": "Join matches, meet players, and start playing.",
  "land.howItWorks": "How it works",

  "land.what": "What's Playtomic?",
  "land.statUsers": "players joined",
  "land.tap": "Tap. Tap-back. Play.",
  "land.foot": "Play anywhere. Worst case: a new padel friend.",
  "land.preview.chip": "Sneak peek",
  "land.preview.title": "Browse the Home",
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
  "auth.apple": "Continue with Apple",

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
  "shell.tab.questions": "Matching code",
  "shell.tab.questions.short": "Code",
  "shell.tab.matches": "Matchat",
  "shell.tab.connect": "Connect",
  "shell.tab.me": "Me",
  "shell.tab.grid": "Home",
  "shell.tab.play": "Play",
  "shell.back.home": "Back to home",
  "shell.back.grid": "Back to Home",
  "shell.grid": "Home",
  "shell.admin": "Admin",
  "shell.core": "★ core",
  "shell.err.title": "Something went wrong",
  "shell.err.body": "We hit a snag loading your account. Please try again or sign in.",
  "shell.err.retry": "Try again",
  "shell.err.signin": "Sign in",
  "shell.notFound": "Not found",
  "root.notFound.title": "Page not found",
  "root.notFound.home": "Go home",
  "root.err.title": "Something went wrong",
  "root.err.body": "Please try again.",
  "root.err.retry": "Retry",


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
  "disc.sub": "Mutual taps open a chat.",
  "disc.scoreA": "The",
  "disc.scoreB": "badge shows how well you click —",
  "disc.scoreBold": "match score",
  "disc.scoreC": "age, level, zone, values. Higher = stronger fit.",
  "disc.filter.all": "Everyone",
  "disc.filter.partner": "Partner",
  "disc.filter.friend": "Friend",
  "disc.filter.padel": "Padel partner",
  "disc.filter.relationship": "Relationship",
  "disc.world.on": "World On",
  "disc.world.off": "World Off",
  "disc.world.note": "Showing everyone worldwide (except people you've hidden). Turn off to return to your area.",
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
  "disc.scoreTooltip": "Match score (0–100): how well you click",
  "disc.reportPrompt": "Report {name}?\n\nDescribe what happened (harassment, fake photo, abuse, threats…). The account is suspended immediately and reviewed by our team.",
  "disc.reportConfirm": "Send report? {name}'s account will be suspended pending staff review.",
  "disc.blockConfirm": "Block {name}? You won't see each other anywhere in the app.",
  "disc.qaBannerTitle": "Unlock your Matching code",
  "disc.qaBannerSub": "Answer a few questions so the AI can find your best court matches — personality, values and what you click on.",
  "disc.qaBannerCta": "Start matching →",

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
  "prof.privacy": "Your preferences (age range, values you care about) are kept private — they're only used by the AI to find your best padel matches, never shown on your profile. Retake the questionnaire any time to update them.",
  "prof.retake": "Edit profile",
  "prof.delete": "Delete my account",
  "prof.deleteConfirm": "Delete your account permanently? This removes your profile, likes, matches and chats. This cannot be undone.",
  "prof.deleted": "Account deleted",
  "prof.deleteFail": "Could not delete account",

  // Feedback
  "fb.title": "Make this app better",
  "fb.sub": "Suggestions, bugs, things you'd love — it all comes straight to the team.",
  "fb.anon": "Your feedback is completely anonymous.",
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
  "ob.start": "Start",
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
  "ob.h1": "Which age group do you prefer to play with?",
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
  "ob.errMaxTraits": "Max 10 traits",
  // step 4
  "ob.h4": "Your padel photo",
  "ob.h4sub": "A photo of you with a racket on court — that's the whole vibe. Shown in the home grid.",
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
  "welcome.bonjourSub": "Continuer en Français",

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
  "land.h1.a": "encuentra tu",
  "land.h1.a2": "mejor",
  "land.h1.b": "Match.",
  "land.lede": "Un directorio de jugadores de pádel cerca de ti. Descubre quién quiere jugar, quién tiene pista disponible y conoce a otros jugadores antes de salir — en tu ciudad o donde viajes.",
  "land.cta": "Crear cuenta",
  "land.cta.sub": "Únete a partidos, conoce jugadores y empieza a jugar.",
  "land.howItWorks": "Cómo funciona",

  "land.what": "¿Qué es Playtomic?",
  "land.statUsers": "jugadores unidos",
  "land.tap": "Tócale. Que te toque. A jugar.",
  "land.foot": "Juega donde quieras. En el peor de los casos: un nuevo amigo de pádel.",
  "land.preview.chip": "Adelanto",
  "land.preview.title": "Echa un vistazo al Inicio",
  "land.preview.sub": "Encuentra a tu alma gemela de pista. Inicia sesión para ver fotos, puntuaciones y chat.",
  "land.preview.cta": "Únete gratis",
  "land.preview.unlock": "Inicia sesión para desbloquear",
  "land.preview.foot": "Solo es una vista previa. Los perfiles reales aparecen al completar el cuestionario.",


  // Auth
  "auth.back": "← Atrás",
  "auth.title.signup": "Únete a PadelMatch",
  "auth.title.signin": "Bienvenido de nuevo",
  "auth.sub.signup": "Solo te preguntamos lo que ayuda al match. Tu foto es para tus matches, no para todo el mundo.",
  "auth.sub.signin": "Vuelve a entrar en tu feed de pádel.",
  "auth.google": "Continuar con Google",
  "auth.apple": "Continuar con Apple",

  "auth.or": "o",
  "auth.email": "correo electrónico",
  "auth.password": "contraseña (mín. 8)",
  "auth.create": "Crear cuenta",
  "auth.signin": "Entrar",
  "auth.toggleToSignin": "¿Ya tienes cuenta? Inicia sesión",
  "auth.toggleToSignup": "¿Nuevo por aquí? Crea una cuenta",
  "auth.forgot": "¿Has olvidado tu contraseña?",
  "auth.welcome": "¡Bienvenido! Ya estás dentro.",
  "auth.confirmEmail": "Cuenta creada — revisa tu correo para confirmarla.",
  "auth.fail": "Error al iniciar sesión",
  "auth.enterEmailFirst": "Escribe primero tu correo",
  "auth.resetSent": "Revisa tu correo para el enlace de recuperación",

  // App shell
  "shell.home": "Inicio",
  "shell.discover": "Descubrir",
  "shell.signout": "Salir",
  "shell.tab.discover": "Descubrir",
  "shell.tab.questions": "Código de afinidad",
  "shell.tab.questions.short": "Código",
  "shell.tab.matches": "Matchat",
  "shell.tab.connect": "Connect",
  "shell.tab.me": "Yo",
  "shell.tab.grid": "Home",
  "shell.tab.play": "Jugar",
  "shell.back.home": "Volver al inicio",
  "shell.back.grid": "Volver al Home",
  "shell.grid": "Home",
  "shell.admin": "Admin",
  "shell.core": "★ core",
  "shell.err.title": "Algo ha salido mal",
  "shell.err.body": "Hubo un problema al cargar tu cuenta. Inténtalo de nuevo o inicia sesión.",
  "shell.err.retry": "Reintentar",
  "shell.err.signin": "Iniciar sesión",
  "shell.notFound": "No encontrado",
  "root.notFound.title": "Página no encontrada",
  "root.notFound.home": "Ir al inicio",
  "root.err.title": "Algo ha salido mal",
  "root.err.body": "Inténtalo de nuevo.",
  "root.err.retry": "Reintentar",


  // Q&A page
  "qa.title": "Preguntas de compatibilidad",
  "qa.sub": "Responde las que quieras. Cada respuesta compartida afina tus matches. Puedes parar cuando quieras — se guarda tu progreso.",
  "qa.generate": "Generar preguntas",
  "qa.generateMore": "Generar más",
  "qa.generating": "Pensando preguntas…",
  "qa.skip": "Saltar",
  "qa.save": "Guardar",
  "qa.saved": "Guardado",
  "qa.empty": "Aún no hay preguntas — pulsa Generar para empezar.",
  "qa.answeredCount": "{n} respondidas",
  "qa.yourAnswers": "Tus respuestas",
  "qa.seeMatches": "Ver quién encaja →",
  "qa.delete": "Quitar",
  "qa.placeholder": "Escribe una respuesta breve…",
  "qa.howItWorks": "La IA genera preguntas nuevas según tu perfil. Tus respuestas nunca son públicas — solo las respuestas que coinciden con otras personas suben tu puntuación de compatibilidad.",

  // Discover
  "disc.h1": "Pulsa sobre quien te gustaría jugar.",
  "disc.sub": "Si os pulsáis mutuamente, se abre el chat.",
  "disc.scoreA": "La",
  "disc.scoreB": "mide cuánto encajan —",
  "disc.scoreBold": "puntuación de compatibilidad",
  "disc.scoreC": "edad, nivel, zona, valores. A mayor puntuación, mejor encaje.",
  "disc.filter.all": "Todos",
  "disc.filter.partner": "Pareja",
  "disc.filter.friend": "Amistad",
  "disc.filter.padel": "Compi de pádel",
  "disc.filter.relationship": "Relación",
  "disc.world.on": "Mundo activado",
  "disc.world.off": "Mundo desactivado",
  "disc.world.note": "Mostrando a todo el mundo (excepto a quienes has ocultado). Desactívalo para volver a tu zona.",
  "disc.empty": "Aún no hay matches con estos filtros.",
  "disc.liked": "Te gusta",
  "disc.undo": "Pulsa para deshacer",
  "disc.seeChats": "Ver tus chats →",
  "disc.likeSent": "Enviado — si te corresponde, se abre el chat",
  "disc.likeFail": "No se pudo enviar",
  "disc.likeRemoved": "Retirado",
  "disc.undoFail": "No se pudo deshacer",
  "disc.blocked": "Bloqueado. No os volveréis a ver.",
  "disc.blockFail": "No se pudo bloquear",
  "disc.privacyNote": "Solo sabrá que le has dado a conectar si te corresponde. Sin presión.",
  "disc.reportSent": "Reporte enviado. La cuenta queda suspendida a la espera de revisión.",
  "disc.reportFail": "No se pudo reportar",
  "disc.loading": "Cargando las pistas…",
  "disc.blockTitle": "Bloquear — os ocultáis mutuamente",
  "disc.reportTitle": "Reportar — se envía al equipo para su revisión",
  "disc.scoreTooltip": "Puntuación de compatibilidad (0–100): cuánto encajan",
  "disc.reportPrompt": "¿Reportar a {name}?\n\nCuéntanos qué ha pasado (acoso, foto falsa, abuso, amenazas…). La cuenta se suspende al instante y nuestro equipo la revisa.",
  "disc.reportConfirm": "¿Enviar el reporte? La cuenta de {name} quedará suspendida a la espera de revisión.",
  "disc.blockConfirm": "¿Bloquear a {name}? No os veréis en ninguna parte de la app.",
  "disc.qaBannerTitle": "Desbloquea tu Código de afinidad",
  "disc.qaBannerSub": "Responde unas preguntas para que la IA encuentre tus mejores matches de pista — personalidad, valores y con quién conectas de verdad.",
  "disc.qaBannerCta": "Empezar afinidad →",

  // Matches list
  "ml.h1": "Tus matches",
  "ml.sub": "Aquí están las personas que te han correspondido.",
  "ml.loading": "Cargando…",
  "ml.empty": "Aún no tienes matches.",
  "ml.discoverLink": "Descubrir jugadores →",

  // Chat
  "chat.opening": "Abriendo el chat…",
  "chat.safetyTitle": "La seguridad primero:",
  "chat.safety": "reservad el partido en Playtomic — pista pública, reserva verificada y sin compartir direcciones.",
  "chat.open": "Abrir",
  "chat.empty": "Os habéis dado a conectar mutuamente. ¡Saluda 👋!",
  "chat.placeholder": "¡Hola! 👋",
  "chat.block": "Bloquear",
  "chat.report": "Reportar",
  "chat.blockedDone": "Bloqueado.",
  "chat.reportDone": "Reporte enviado. Cuenta suspendida a la espera de revisión.",
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
  "prof.privacy": "Tus preferencias (rango de edad, valores que te importan) son privadas — solo las usa la IA para encontrar tus mejores matches de pádel y nunca se muestran en tu perfil. Puedes rehacer el cuestionario cuando quieras.",
  "prof.retake": "Editar perfil",
  "prof.delete": "Eliminar mi cuenta",
  "prof.deleteConfirm": "¿Eliminar tu cuenta para siempre? Se borrarán tu perfil, likes, matches y chats. Esta acción no se puede deshacer.",
  "prof.deleted": "Cuenta eliminada",
  "prof.deleteFail": "No se pudo eliminar la cuenta",

  // Feedback
  "fb.title": "Ayúdanos a mejorar esta app",
  "fb.sub": "Sugerencias, errores o lo que te encantaría — llega directo al equipo.",
  "fb.anon": "Tu feedback es totalmente anónimo.",
  "fb.placeholder": "¿Qué haría que PadelMatch fuera mejor para ti?",
  "fb.send": "Enviar",
  "fb.sending": "Enviando…",
  "fb.thanks": "Gracias — hemos recibido tu feedback.",
  "fb.fail": "No se pudo enviar. Inténtalo de nuevo.",
  "fb.tooShort": "Escribe un poco más, por favor.",


  // Onboarding
  "ob.step": "Paso",
  "ob.of": "/",
  "ob.s0": "Tú",
  "ob.s1": "A quién quieres conocer",
  "ob.s2": "Pádel, sitios e idiomas",
  "ob.s3": "Lo que te importa",
  "ob.s4": "Foto",
  "ob.back": "Atrás",
  "ob.next": "Siguiente",
  "ob.start": "Empezar",
  "ob.saving": "Guardando…",
  "ob.saved": "Perfil guardado",
  "ob.saveFail": "No se pudo guardar",
  "ob.h0": "¿Quién eres?",
  "ob.firstName": "Nombre (es lo único que se muestra)",
  "ob.firstNamePh": "Lucía",
  "ob.age": "Edad",
  "ob.iAm": "Soy",
  "ob.lookingFor": "Busco",
  "ob.privateNote": "Tus respuestas aquí son privadas — nunca se muestran en tu perfil ni se comparten. Puedes rehacer el cuestionario cuando quieras.",
  "ob.h1": "¿Con qué grupo de edad prefieres jugar?",
  "ob.audIntro1": "Elige por separado para amistad y para una relación — pulsa tantos como encajen. Pulsa",
  "ob.audIntro2": "si te abres a todo el mundo.",
  "ob.audPrivate": "Solo se usa para el matching — nunca se muestra en tu perfil.",
  "ob.audEveryone": "Todo el mundo",
  "ob.audFriend": "Para amistad",
  "ob.audPartner": "Para una relación",
  "ob.ageRange": "Rango de edad",
  "ob.to": "a",
  "ob.h2": "Pádel, sitios e idiomas",
  "ob.nat": "Nacionalidad / origen",
  "ob.places": "Sitios donde juegas",
  "ob.placesHelp": "Añade dónde vives, dónde trabajas, tu casa de verano o una ciudad de visita. Hasta 8.",
  "ob.country": "País",
  "ob.city": "Ciudad",
  "ob.cityPh": "p. ej. Madrid",
  "ob.area": "Zona / barrio (opcional)",
  "ob.areaPh": "p. ej. La Moraleja, Chamberí",
  "ob.addLocation": "Añadir esta ubicación",
  "ob.langs": "Idiomas que hablas",
  "ob.padelLevel": "Nivel de pádel",
  "ob.bio": "Bio breve (opcional)",
  "ob.bioPh": "Pegada tranquila. Sábado por la mañana, fijo.",
  "ob.errCountryCity": "País y ciudad son obligatorios",
  "ob.errMaxLoc": "Máx. 8 ubicaciones",
  "ob.errDup": "Ya lo has añadido",
  "ob.h3": "¿Qué te importa?",
  "ob.h3sub": "Pulsa para añadir. Luego ordénalos — lo más importante arriba. Hasta 3 propios.",
  "ob.h3priv": "Privado — solo se usa para el matching.",
  "ob.suggested": "Rasgos sugeridos",
  "ob.addOwn": "Añade los tuyos (hasta 3)",
  "ob.addOwnPh": "p. ej. amante de los animales, foodie, madrugador",
  "ob.ranking": "Tu orden (arriba = más importante)",
  "ob.pickThree": "Elige al menos 3.",
  "ob.errMax3": "Hasta 3 rasgos propios",
  "ob.errMaxTraits": "Máx. 10 rasgos",
  "ob.h4": "Tu foto de pádel",
  "ob.h4sub": "Una foto tuya con pala en la pista — eso es todo. Aparecerá en el Inicio.",
  "ob.uploading": "Subiendo…",
  "ob.tapUpload": "Pulsa para subir",
  "ob.uploaded": "Foto subida",
  "ob.uploadFail": "Error al subir",
  "ob.notSignedIn": "No has iniciado sesión",

  // Reset password
  "rp.title": "Cambia tu contraseña",
  "rp.openFromEmail": "Abre esta página desde el enlace del correo de recuperación. Si has llegado por error, vuelve a",
  "rp.signin": "iniciar sesión",
  "rp.newPw": "nueva contraseña (mín. 8)",
  "rp.update": "Actualizar contraseña",
  "rp.updated": "Contraseña actualizada — ya estás dentro.",
  "rp.updateFail": "No se pudo actualizar la contraseña",

  // Errors / 404
  "err.404": "Página no encontrada",
  "err.goHome": "Volver al inicio",
  "err.title": "No se pudo cargar esta página",
  "err.sub": "Algo ha ido mal por nuestra parte.",
  "err.retry": "Reintentar",

  // Welcome
  "welcome.hello": "Hola",
  "welcome.helloSub": "Continue in English",
  "welcome.holaSub": "Continúa en español",
  "welcome.bonjourSub": "Continuer en français",

  // Events
  "events.myAreas": "Solo mis zonas",
  "events.noAreasTitle": "No has seleccionado ninguna zona",
  "events.noAreasBody": "Añade en tu perfil las ciudades donde juegas para ver partidos cerca de ti.",
  "events.noAreasCta": "Ir al perfil →",
  "events.noMatchesMyAreas": "No hay partidos próximos en tus zonas.",
};

const fr: Dict = {
  // Landing
  "land.signin": "Se connecter",
  "land.h1.a": "trouve ton",
  "land.h1.a2": "meilleur",
  "land.h1.b": "Match.",
  "land.lede": "Un annuaire de joueurs de padel autour de toi. Vois qui est partant pour un match, qui a un court disponible, et rencontre des joueurs à l'avance — dans ta ville ou où que tu voyages.",
  "land.cta": "Créer un compte",
  "land.cta.sub": "Rejoins des matchs, rencontre des joueurs et commence à jouer.",
  "land.howItWorks": "Comment ça marche",

  "land.what": "C'est quoi Playtomic ?",
  "land.statUsers": "joueurs inscrits",
  "land.tap": "Tap. Tap en retour. On joue.",
  "land.foot": "Joue partout. Pire des cas : un nouvel ami de padel.",
  "land.preview.chip": "Aperçu",
  "land.preview.title": "Explore le Home",
  "land.preview.sub": "Découvre les profils qui te correspondent. Connecte-toi pour voir les photos, les niveaux et discuter.",
  "land.preview.cta": "Inscription gratuite",
  "land.preview.unlock": "Connecte-toi pour débloquer",
  "land.preview.foot": "Aperçu uniquement. Les vrais profils apparaissent après le questionnaire.",


  // Auth
  "auth.back": "← Retour",
  "auth.title.signup": "Rejoins PadelMatch",
  "auth.title.signin": "Bon retour",
  "auth.sub.signup": "On ne demande que ce qui aide au match. Ta photo est pour tes matches, pas pour tout le monde.",
  "auth.sub.signin": "Reconnecte-toi à ton fil padel.",
  "auth.google": "Continuer avec Google",
  "auth.apple": "Continuer avec Apple",

  "auth.or": "ou",
  "auth.email": "email",
  "auth.password": "mot de passe (min. 8)",
  "auth.create": "Créer un compte",
  "auth.signin": "Se connecter",
  "auth.toggleToSignin": "Déjà un compte ? Se connecter",
  "auth.toggleToSignup": "Nouveau ici ? Créer un compte",
  "auth.forgot": "Mot de passe oublié ?",
  "auth.welcome": "Bienvenue ! Tu es connecté.",
  "auth.confirmEmail": "Compte créé — vérifie ton email pour confirmer.",
  "auth.fail": "Échec de la connexion",
  "auth.enterEmailFirst": "Saisis d'abord ton email",
  "auth.resetSent": "Regarde tes emails pour le lien de réinitialisation",

  // App shell
  "shell.home": "Accueil",
  "shell.discover": "Découvrir",
  "shell.signout": "Se déconnecter",
  "shell.tab.discover": "Découvrir",
  "shell.tab.questions": "Code d'affinité",
  "shell.tab.questions.short": "Code",
  "shell.tab.matches": "Matchat",
  "shell.tab.connect": "Connect",
  "shell.tab.me": "Moi",
  "shell.tab.grid": "Home",
  "shell.tab.play": "Jouer",
  "shell.back.home": "Retour à l'accueil",
  "shell.back.grid": "Retour au Home",
  "shell.grid": "Home",
  "shell.admin": "Admin",
  "shell.core": "★ core",
  "shell.err.title": "Un problème est survenu",
  "shell.err.body": "Souci pour charger ton compte. Réessaie ou reconnecte-toi.",
  "shell.err.retry": "Réessayer",
  "shell.err.signin": "Se connecter",
  "shell.notFound": "Introuvable",
  "root.notFound.title": "Page introuvable",
  "root.notFound.home": "Accueil",
  "root.err.title": "Un problème est survenu",
  "root.err.body": "Réessaie s'il te plaît.",
  "root.err.retry": "Réessayer",


  // Q&A page
  "qa.title": "Questions de compatibilité",
  "qa.sub": "Réponds à autant de questions que tu le souhaites. Chaque réponse permet d'affiner tes matchs. Tu peux t'arrêter à tout moment : ta progression est automatiquement sauvegardée.",
  "qa.generate": "Générer des questions",
  "qa.generateMore": "Générer plus",
  "qa.generating": "Je réfléchis à des questions…",
  "qa.skip": "Passer",
  "qa.save": "Enregistrer",
  "qa.saved": "Enregistré",
  "qa.empty": "Pas encore de questions — appuie sur Générer pour commencer.",
  "qa.answeredCount": "{n} répondues",
  "qa.yourAnswers": "Tes réponses",
  "qa.seeMatches": "Voir qui matche →",
  "qa.delete": "Supprimer",
  "qa.placeholder": "Écris une courte réponse…",
  "qa.howItWorks": "L'IA génère de nouvelles questions selon ton profil. Tes réponses ne sont jamais publiques — seules les réponses partagées améliorent ton score de match.",

  // Discover
  "disc.h1": "Découvre Home.",
  "disc.sub": "Les taps mutuels ouvrent un chat.",
  "disc.scoreA": "Le",
  "disc.scoreB": "mesure à quel point vos réponses s'alignent —",
  "disc.scoreBold": "score de match",
  "disc.scoreC": "âge, niveau, zone, valeurs. Plus haut = meilleure affinité.",
  "disc.filter.all": "Tout le monde",
  "disc.filter.partner": "Partenaire",
  "disc.filter.friend": "Ami·e",
  "disc.filter.padel": "Partenaire de padel",
  "disc.filter.relationship": "Relation",
  "disc.world.on": "Monde On",
  "disc.world.off": "Monde Off",
  "disc.world.note": "Affichage mondial (sauf ceux que tu as masqués). Désactive pour revenir à ta zone.",
  "disc.empty": "Aucun match avec ces filtres pour l'instant.",
  "disc.liked": "Aimé",
  "disc.undo": "Tape pour annuler",
  "disc.seeChats": "Voir tes chats →",
  "disc.likeSent": "Like envoyé — s'il·elle te retape, le chat s'ouvre",
  "disc.likeFail": "Impossible d'envoyer le like",
  "disc.likeRemoved": "Like retiré",
  "disc.undoFail": "Impossible d'annuler",
  "disc.blocked": "Bloqué. Vous ne vous verrez plus.",
  "disc.blockFail": "Impossible de bloquer",
  "disc.privacyNote": "Il·elle ne saura pas que tu as liké tant qu'il·elle ne te like pas en retour — sans pression.",
  "disc.reportSent": "Signalement envoyé. Le compte est suspendu pour vérification.",
  "disc.reportFail": "Impossible de signaler",
  "disc.loading": "Chargement des pistes…",
  "disc.blockTitle": "Bloquer — se cacher mutuellement",
  "disc.reportTitle": "Signaler — envoyé à l'équipe pour vérification",
  "disc.scoreTooltip": "Score de match (0–100) : à quel point vos réponses s'alignent",
  "disc.reportPrompt": "Signaler {name} ?\n\nDécris ce qui s'est passé (harcèlement, fausse photo, abus, menaces…). Le compte est suspendu immédiatement et vérifié par notre équipe.",
  "disc.reportConfirm": "Envoyer le signalement ? Le compte de {name} sera suspendu en attendant vérification.",
  "disc.blockConfirm": "Bloquer {name} ? Vous ne vous verrez nulle part dans l'app.",
  "disc.qaBannerTitle": "Débloque ton Code d'affinité",
  "disc.qaBannerSub": "Réponds à quelques questions pour que l'IA trouve tes meilleurs matches de terrain — personnalité, valeurs et affinités.",
  "disc.qaBannerCta": "Commencer l'affinité →",

  // Matches list
  "ml.h1": "Tes terrains",
  "ml.sub": "Tout le monde ici t'a retapé.",
  "ml.loading": "Chargement…",
  "ml.empty": "Pas encore de matches.",
  "ml.discoverLink": "Découvrir des joueurs →",

  // Chat
  "chat.opening": "Ouverture du chat…",
  "chat.safetyTitle": "Sécurité d'abord :",
  "chat.safety": "réservez le match sur Playtomic — terrain public, réservation vérifiée, sans partager d'adresses.",
  "chat.open": "Ouvrir",
  "chat.empty": "Vous vous êtes tapés tous les deux. Dis bonjour 👋",
  "chat.placeholder": "Salut ! 👋",
  "chat.block": "Bloquer",
  "chat.report": "Signaler",
  "chat.blockedDone": "Bloqué.",
  "chat.reportDone": "Signalement envoyé. Compte suspendu pour vérification.",
  "chat.sendFail": "Envoi impossible",

  // Profile
  "prof.loading": "Chargement…",
  "prof.noProfile": "Tu n'as pas encore de profil.",
  "prof.createLink": "Crée ton profil →",
  "prof.hi": "Salut, {name}",
  "prof.age": "Âge",
  "prof.level": "Niveau",
  "prof.nationality": "Nationalité",
  "prof.gender": "Genre",
  "prof.playsIn": "Joue à",
  "prof.languages": "Langues",
  "prof.privacy": "Tes préférences (tranche d'âge, valeurs) restent privées — elles ne servent qu'à l'IA pour trouver tes meilleurs matches de padel, jamais affichées sur ton profil. Refais le questionnaire quand tu veux pour les mettre à jour.",
  "prof.retake": "Modifier le profil",
  "prof.delete": "Supprimer mon compte",
  "prof.deleteConfirm": "Supprimer ton compte pour de bon ? Cela efface ton profil, tes likes, matches et chats. Irréversible.",
  "prof.deleted": "Compte supprimé",
  "prof.deleteFail": "Impossible de supprimer le compte",

  // Feedback
  "fb.title": "Améliore cette app",
  "fb.sub": "Suggestions, bugs, ce que tu adorerais — ça arrive directement à l'équipe.",
  "fb.anon": "Ton feedback est totalement anonyme.",
  "fb.placeholder": "Qu'est-ce qui rendrait PadelMatch meilleur pour toi ?",
  "fb.send": "Envoyer",
  "fb.sending": "Envoi…",
  "fb.thanks": "Merci — ton feedback a été envoyé.",
  "fb.fail": "Envoi impossible. Réessaie.",
  "fb.tooShort": "Ajoute quelques mots d'abord.",


  // Onboarding
  "ob.step": "Étape",
  "ob.of": "/",
  "ob.s0": "Toi",
  "ob.s1": "Qui tu rencontres",
  "ob.s2": "Padel, lieux & langues",
  "ob.s3": "Ce qui compte",
  "ob.s4": "Photo",
  "ob.back": "Retour",
  "ob.next": "Suivant",
  "ob.start": "Commencer",
  "ob.saving": "Enregistrement…",
  "ob.saved": "Profil enregistré",
  "ob.saveFail": "Échec de l'enregistrement",
  "ob.h0": "Qui es-tu ?",
  "ob.firstName": "Prénom (seul cela est affiché)",
  "ob.firstNamePh": "Lucía",
  "ob.age": "Âge",
  "ob.iAm": "Je suis",
  "ob.lookingFor": "Je cherche",
  "ob.privateNote": "Tes réponses ici restent privées — jamais affichées sur ton profil, jamais partagées. Tu peux refaire ce questionnaire quand tu veux.",
  "ob.h1": "Avec quelle tranche d'âge préfères-tu jouer ?",
  "ob.audIntro1": "Choisis séparément pour l'amitié et pour une relation — tape autant que tu veux. Appuie sur",
  "ob.audIntro2": "si tu es ouvert·e à tout le monde.",
  "ob.audPrivate": "Utilisé seulement pour le matching — jamais affiché sur ton profil.",
  "ob.audEveryone": "Tout le monde",
  "ob.audFriend": "Pour l'amitié",
  "ob.audPartner": "Pour une relation",
  "ob.ageRange": "Tranche d'âge",
  "ob.to": "à",
  "ob.h2": "Padel, lieux & langues",
  "ob.nat": "Nationalité / origine",
  "ob.places": "Lieux où tu joues",
  "ob.placesHelp": "Ajoute où tu vis, travailles, ta maison d'été ou une ville que tu visites. Jusqu'à 8.",
  "ob.country": "Pays",
  "ob.city": "Ville",
  "ob.cityPh": "p. ex. Madrid",
  "ob.area": "Quartier (optionnel)",
  "ob.areaPh": "p. ex. La Moraleja, Chamberí",
  "ob.addLocation": "Ajouter ce lieu",
  "ob.langs": "Langues parlées",
  "ob.padelLevel": "Niveau de padel",
  "ob.bio": "Bio courte (optionnel)",
  "ob.bioPh": "Frappe posée. Samedi matin, présent·e.",
  "ob.errCountryCity": "Pays et ville obligatoires",
  "ob.errMaxLoc": "Max. 8 lieux",
  "ob.errDup": "Déjà ajouté",
  "ob.h3": "Qu'est-ce qui compte pour toi ?",
  "ob.h3sub": "Tape pour ajouter. Puis classe-les — le plus important en haut. Jusqu'à 3 à toi.",
  "ob.h3priv": "Privé — utilisé seulement pour le matching.",
  "ob.suggested": "Traits suggérés",
  "ob.addOwn": "Ajoute les tiens (jusqu'à 3)",
  "ob.addOwnPh": "p. ex. amoureux·se des animaux, foodie, lève-tôt",
  "ob.ranking": "Ton classement (haut = plus important)",
  "ob.pickThree": "Choisis au moins 3.",
  "ob.errMax3": "Jusqu'à 3 traits personnalisés",
  "ob.errMaxTraits": "Max. 10 traits",
  "ob.h4": "Ta photo de padel",
  "ob.h4sub": "Une photo de toi avec une raquette sur le terrain — c'est toute l'ambiance. Affichée dans le home grid.",
  "ob.uploading": "Téléversement…",
  "ob.tapUpload": "Tape pour téléverser",
  "ob.uploaded": "Photo téléversée",
  "ob.uploadFail": "Échec du téléversement",
  "ob.notSignedIn": "Non connecté",

  // Reset password
  "rp.title": "Définis un nouveau mot de passe",
  "rp.openFromEmail": "Ouvre cette page depuis le lien dans ton email de réinitialisation. Si tu es arrivé·e ici par erreur, retourne à",
  "rp.signin": "connexion",
  "rp.newPw": "nouveau mot de passe (min. 8)",
  "rp.update": "Mettre à jour le mot de passe",
  "rp.updated": "Mot de passe mis à jour — tu es connecté·e.",
  "rp.updateFail": "Impossible de mettre à jour le mot de passe",

  // Errors / 404
  "err.404": "Page introuvable",
  "err.goHome": "Accueil",
  "err.title": "Cette page n'a pas chargé",
  "err.sub": "Un problème de notre côté.",
  "err.retry": "Réessayer",

  // Welcome
  "welcome.hello": "Bonjour",
  "welcome.helloSub": "Continue in English",
  "welcome.holaSub": "Continúa en Español",
  "welcome.bonjourSub": "Continuer en Français",

  // Events
  "events.myAreas": "Seulement mes zones",
  "events.noAreasTitle": "Aucune zone sélectionnée",
  "events.noAreasBody": "Ajoute les villes où tu joues dans ton profil pour voir les matches près de chez toi.",
  "events.noAreasCta": "Aller au profil →",
  "events.noMatchesMyAreas": "Aucun match à venir dans tes zones.",
};


const ar: Dict = {
  // Landing
  "land.signin": "تسجيل الدخول",
  "land.h1.a": "ابحث عن",
  "land.h1.a2": "أفضل",
  "land.h1.b": "شريك.",
  "land.lede": "دليل للاعبي البادل من حولك. اكتشف من يرغب في اللعب، ومن لديه ملعب متاح، وتعرّف على اللاعبين قبل الوصول — في مدينتك أو أينما سافرت.",
  "land.cta": "إنشاء حساب",
  "land.cta.sub": "انضم إلى المباريات، تعرّف على لاعبين، وابدأ اللعب.",
  "land.howItWorks": "كيف يعمل",

  "land.what": "ما هو Playtomic؟",
  "land.statUsers": "لاعبًا انضموا",
  "land.tap": "اضغط. يضغط. العبوا.",
  "land.foot": "العب في أي مكان. وفي أسوأ الأحوال: صديق بادل جديد.",
  "land.preview.chip": "نظرة سريعة",
  "land.preview.title": "تصفّح الرئيسية",
  "land.preview.sub": "ابحث عن شريكك المثالي على الملعب. سجّل الدخول لرؤية الصور والنقاط والمحادثات.",
  "land.preview.cta": "انضم مجانًا",
  "land.preview.unlock": "سجّل الدخول للفتح",
  "land.preview.foot": "معاينة فقط. الملفات الحقيقية تظهر بعد إكمال الاستبيان.",

  // Auth
  "auth.back": "رجوع",
  "auth.title.signup": "انضم إلى PadelMatch",
  "auth.title.signin": "أهلًا بعودتك",
  "auth.sub.signup": "لا نطلب سوى ما يساعد على إيجاد الشريك المناسب. صورتك لأجل المباريات، ليست للعامة.",
  "auth.sub.signin": "سجّل الدخول للعودة إلى صفحتك.",
  "auth.google": "المتابعة عبر Google",
  "auth.apple": "المتابعة عبر Apple",

  "auth.or": "أو",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور (8 أحرف على الأقل)",
  "auth.create": "إنشاء حساب",
  "auth.signin": "تسجيل الدخول",
  "auth.toggleToSignin": "لديك حساب؟ سجّل الدخول",
  "auth.toggleToSignup": "جديد هنا؟ أنشئ حسابًا",
  "auth.forgot": "هل نسيت كلمة المرور؟",
  "auth.welcome": "أهلًا بك! أنت الآن داخل التطبيق.",
  "auth.confirmEmail": "تم إنشاء الحساب — راجع بريدك للتأكيد.",
  "auth.fail": "فشل تسجيل الدخول",
  "auth.enterEmailFirst": "أدخل بريدك الإلكتروني أولًا",
  "auth.resetSent": "راجع بريدك للحصول على رابط إعادة التعيين",

  // App shell
  "shell.home": "الرئيسية",
  "shell.discover": "استكشف",
  "shell.signout": "تسجيل الخروج",
  "shell.tab.discover": "استكشف",
  "shell.tab.questions": "رمز التوافق",
  "shell.tab.questions.short": "الرمز",
  "shell.tab.matches": "المحادثات",
  "shell.tab.connect": "تواصل",
  "shell.tab.me": "أنا",
  "shell.tab.grid": "الرئيسية",
  "shell.tab.play": "العب",
  "shell.back.home": "العودة إلى الرئيسية",
  "shell.back.grid": "العودة إلى الرئيسية",
  "shell.grid": "الرئيسية",
  "shell.admin": "المشرف",
  "shell.core": "★ الأساس",
  "shell.err.title": "حدث خطأ ما",
  "shell.err.body": "واجهنا مشكلة في تحميل حسابك. حاول مرة أخرى أو سجّل الدخول.",
  "shell.err.retry": "إعادة المحاولة",
  "shell.err.signin": "تسجيل الدخول",
  "shell.notFound": "غير موجود",
  "root.notFound.title": "الصفحة غير موجودة",
  "root.notFound.home": "الذهاب إلى الرئيسية",
  "root.err.title": "حدث خطأ ما",
  "root.err.body": "يرجى المحاولة مرة أخرى.",
  "root.err.retry": "إعادة",


  // Q&A page
  "qa.title": "أسئلة التوافق",
  "qa.sub": "أجب على ما تشاء. كل إجابة مشتركة تحسّن جودة نتائجك. توقف متى أردت — يتم حفظ تقدّمك.",
  "qa.generate": "توليد أسئلة",
  "qa.generateMore": "توليد المزيد",
  "qa.generating": "نُفكّر في أسئلة…",
  "qa.skip": "تخطّي",
  "qa.save": "حفظ",
  "qa.saved": "تم الحفظ",
  "qa.empty": "لا توجد أسئلة بعد — اضغط على توليد للبدء.",
  "qa.answeredCount": "تمّت الإجابة على {n}",
  "qa.yourAnswers": "إجاباتك",
  "qa.seeMatches": "شاهد من يناسبك →",
  "qa.delete": "إزالة",
  "qa.placeholder": "اكتب إجابة قصيرة…",
  "qa.howItWorks": "الذكاء الاصطناعي يولّد أسئلة جديدة تناسب ملفك. لا نعرض إجاباتك للعامة — الإجابات المشتركة فقط ترفع درجة توافقك.",

  // Discover
  "disc.h1": "اضغط على من ترغب في اللعب معه.",
  "disc.sub": "الضغطات المتبادلة تفتح محادثة.",
  "disc.scoreA": "شارة",
  "disc.scoreB": "تُظهر مدى توافقكم —",
  "disc.scoreBold": "درجة التوافق",
  "disc.scoreC": "العمر، المستوى، المنطقة، القيم. كلما ارتفعت، كان الانسجام أفضل.",
  "disc.filter.all": "الجميع",
  "disc.filter.partner": "شريك",
  "disc.filter.friend": "صديق",
  "disc.filter.padel": "شريك بادل",
  "disc.filter.relationship": "علاقة",
  "disc.world.on": "العالم مفعّل",
  "disc.world.off": "العالم متوقّف",
  "disc.world.note": "نعرض الجميع حول العالم (باستثناء من أخفيتهم). أوقفه للعودة إلى منطقتك.",
  "disc.empty": "لا توجد نتائج بهذه الفلاتر بعد.",
  "disc.liked": "أعجبك",
  "disc.undo": "اضغط للتراجع",
  "disc.seeChats": "شاهد محادثاتك →",
  "disc.likeSent": "تم الإرسال — إذا ردّ عليك، تُفتح المحادثة",
  "disc.likeFail": "تعذّر إرسال الإعجاب",
  "disc.likeRemoved": "تمّت إزالة الإعجاب",
  "disc.undoFail": "تعذّر التراجع",
  "disc.blocked": "تم الحظر. لن ترى كلٌ منكما الآخر مجددًا.",
  "disc.blockFail": "تعذّر الحظر",
  "disc.privacyNote": "لن يعلم أنك أعجبت به إلا إذا بادلك الإعجاب — بلا ضغط.",
  "disc.reportSent": "تم إرسال البلاغ. تمّ تعليق الحساب للمراجعة.",
  "disc.reportFail": "تعذّر الإبلاغ",
  "disc.loading": "جارٍ تحميل الملاعب…",
  "disc.blockTitle": "الحظر — اختفاء متبادل",
  "disc.reportTitle": "الإبلاغ — يُرسل إلى الفريق للمراجعة",
  "disc.scoreTooltip": "درجة التوافق (0–100): مدى انسجامكم",
  "disc.reportPrompt": "الإبلاغ عن {name}؟\n\nصف ما حدث (تحرّش، صورة مزيّفة، إساءة، تهديدات…). يُعلَّق الحساب فورًا ويراجعه فريقنا.",
  "disc.reportConfirm": "إرسال البلاغ؟ سيُعلَّق حساب {name} بانتظار المراجعة.",
  "disc.blockConfirm": "حظر {name}؟ لن ترى كلٌ منكما الآخر في أي مكان من التطبيق.",
  "disc.qaBannerTitle": "افتح رمز التوافق",
  "disc.qaBannerSub": "أجب عن بعض الأسئلة ليجد الذكاء الاصطناعي أفضل شركاء ملعبك — الشخصية والقيم والانسجام.",
  "disc.qaBannerCta": "ابدأ التوافق →",

  // Matches list
  "ml.h1": "ملاعبك",
  "ml.sub": "كل من هنا بادلك الاختيار.",
  "ml.loading": "جارٍ التحميل…",
  "ml.empty": "لا توجد نتائج بعد.",
  "ml.discoverLink": "اكتشف لاعبين →",

  // Chat
  "chat.opening": "جارٍ فتح المحادثة…",
  "chat.safetyTitle": "السلامة أولًا:",
  "chat.safety": "احجزوا المباراة عبر Playtomic — ملعب عام، حجز موثّق، ودون تبادل عناوين.",
  "chat.open": "فتح",
  "chat.empty": "تبادلتما الضغط. قل مرحبًا 👋",
  "chat.placeholder": "مرحبًا! 👋",
  "chat.block": "حظر",
  "chat.report": "إبلاغ",
  "chat.blockedDone": "تم الحظر.",
  "chat.reportDone": "تم إرسال البلاغ. الحساب معلّق للمراجعة.",
  "chat.sendFail": "تعذّر الإرسال",

  // Profile
  "prof.loading": "جارٍ التحميل…",
  "prof.noProfile": "لا يوجد لديك ملف بعد.",
  "prof.createLink": "أنشئ ملفك →",
  "prof.hi": "مرحبًا، {name}",
  "prof.age": "العمر",
  "prof.level": "المستوى",
  "prof.nationality": "الجنسية",
  "prof.gender": "الجنس",
  "prof.playsIn": "يلعب في",
  "prof.languages": "اللغات",
  "prof.privacy": "تفضيلاتك (الفئة العمرية، القيم التي تهمّك) تبقى خاصة — يستخدمها الذكاء الاصطناعي فقط لإيجاد أفضل شركاء بادل، ولا تظهر على ملفك أبدًا. أعِد الاستبيان متى شئت لتحديثها.",
  "prof.retake": "تعديل الملف",
  "prof.delete": "حذف حسابي",
  "prof.deleteConfirm": "حذف حسابك نهائيًا؟ يُزيل ذلك ملفك وإعجاباتك ومباراتك ومحادثاتك. لا يمكن التراجع.",
  "prof.deleted": "تم حذف الحساب",
  "prof.deleteFail": "تعذّر حذف الحساب",

  // Feedback
  "fb.title": "ساعدنا في تحسين التطبيق",
  "fb.sub": "اقتراحاتك، أعطاب، أشياء تودّ إضافتها — تصل مباشرة إلى الفريق.",
  "fb.anon": "ملاحظاتك مجهولة تمامًا.",
  "fb.placeholder": "ما الذي سيجعل PadelMatch أفضل بالنسبة لك؟",
  "fb.send": "إرسال",
  "fb.sending": "جارٍ الإرسال…",
  "fb.thanks": "شكرًا — تم استلام ملاحظتك.",
  "fb.fail": "تعذّر الإرسال. حاول مجددًا.",
  "fb.tooShort": "اكتب بضع كلمات إضافية أولًا.",


  // Onboarding
  "ob.step": "الخطوة",
  "ob.of": "/",
  "ob.s0": "أنت",
  "ob.s1": "من تودّ لقاءه",
  "ob.s2": "البادل، الأماكن واللغات",
  "ob.s3": "ما يهمّك",
  "ob.s4": "الصورة",
  "ob.back": "السابق",
  "ob.next": "التالي",
  "ob.start": "ابدأ",
  "ob.saving": "جارٍ الحفظ…",
  "ob.saved": "تم حفظ الملف",
  "ob.saveFail": "فشل الحفظ",
  "ob.h0": "من أنت؟",
  "ob.firstName": "الاسم الأول (هو وحده يظهر)",
  "ob.firstNamePh": "لوسيا",
  "ob.age": "العمر",
  "ob.iAm": "أنا",
  "ob.lookingFor": "أبحث عن",
  "ob.privateNote": "إجاباتك هنا خاصة — لا تظهر على ملفك ولن تُشارك. يمكنك إعادة الاستبيان متى شئت لتغييرها.",
  "ob.h1": "مع أي فئة عمرية تفضّل اللعب؟",
  "ob.audIntro1": "اختر بشكل منفصل للصداقة وللعلاقة — اضغط بقدر ما يناسبك. اختر",
  "ob.audIntro2": "إذا كنت منفتحًا على الجميع.",
  "ob.audPrivate": "يُستخدم للمطابقة فقط — لا يظهر على ملفك.",
  "ob.audEveryone": "الجميع",
  "ob.audFriend": "للصداقة",
  "ob.audPartner": "لعلاقة",
  "ob.ageRange": "الفئة العمرية",
  "ob.to": "إلى",
  "ob.h2": "البادل، الأماكن واللغات",
  "ob.nat": "الجنسية / الأصل",
  "ob.places": "أماكن تلعب فيها",
  "ob.placesHelp": "أضف حيث تسكن، تعمل، بيت الصيف، أو مدينة تزورها. حتى 8.",
  "ob.country": "الدولة",
  "ob.city": "المدينة",
  "ob.cityPh": "مثال: مدريد",
  "ob.area": "الحي / المنطقة (اختياري)",
  "ob.areaPh": "مثال: La Moraleja, Chamberí",
  "ob.addLocation": "إضافة هذا الموقع",
  "ob.langs": "اللغات التي تتحدثها",
  "ob.padelLevel": "مستوى البادل",
  "ob.bio": "نبذة قصيرة (اختياري)",
  "ob.bioPh": "ضربات هادئة. حاضر كل سبت صباحًا.",
  "ob.errCountryCity": "الدولة والمدينة مطلوبتان",
  "ob.errMaxLoc": "بحد أقصى 8 مواقع",
  "ob.errDup": "مُضاف مسبقًا",
  "ob.h3": "ما الذي يهمّك؟",
  "ob.h3sub": "اضغط للإضافة. ثم رتّبها — الأهم في الأعلى. حتى 3 خاصة بك.",
  "ob.h3priv": "خاص — يُستخدم للمطابقة فقط.",
  "ob.suggested": "سمات مقترحة",
  "ob.addOwn": "أضف سماتك (حتى 3)",
  "ob.addOwnPh": "مثال: محبّ الحيوانات، ذوّاق طعام، مستيقظ باكرًا",
  "ob.ranking": "ترتيبك (الأعلى = الأهم)",
  "ob.pickThree": "اختر 3 على الأقل.",
  "ob.errMax3": "حتى 3 سمات خاصة",
  "ob.errMaxTraits": "بحد أقصى 10 سمات",
  "ob.h4": "صورتك في البادل",
  "ob.h4sub": "صورة لك مع المضرب في الملعب — هذا كل شيء. تظهر في الشبكة الرئيسية.",
  "ob.uploading": "جارٍ الرفع…",
  "ob.tapUpload": "اضغط للرفع",
  "ob.uploaded": "تم رفع الصورة",
  "ob.uploadFail": "فشل الرفع",
  "ob.notSignedIn": "لست مسجّل الدخول",

  // Reset password
  "rp.title": "عيّن كلمة مرور جديدة",
  "rp.openFromEmail": "افتح هذه الصفحة من الرابط في بريد إعادة التعيين. إذا وصلت هنا بالخطأ، عد إلى",
  "rp.signin": "تسجيل الدخول",
  "rp.newPw": "كلمة مرور جديدة (8 أحرف على الأقل)",
  "rp.update": "تحديث كلمة المرور",
  "rp.updated": "تم تحديث كلمة المرور — أنت الآن مسجّل الدخول.",
  "rp.updateFail": "تعذّر تحديث كلمة المرور",

  // Errors / 404
  "err.404": "الصفحة غير موجودة",
  "err.goHome": "الذهاب إلى الرئيسية",
  "err.title": "لم تُحمّل هذه الصفحة",
  "err.sub": "حدث خطأ من طرفنا.",
  "err.retry": "إعادة المحاولة",

  // Welcome
  "welcome.hello": "مرحبًا",
  "welcome.helloSub": "Continue in English",
  "welcome.holaSub": "Continúa en Español",
  "welcome.bonjourSub": "Continuer en Français",

  // Events
  "events.myAreas": "مناطقي فقط",
  "events.noAreasTitle": "لم تختر أي منطقة",
  "events.noAreasBody": "أضف في ملفك المدن التي تلعب فيها لرؤية المباريات القريبة منك.",
  "events.noAreasCta": "الذهاب إلى الملف →",
  "events.noMatchesMyAreas": "لا توجد مباريات قادمة في مناطقك.",
};


const DICTS: Record<Lang, Dict> = { en, es, fr, ar };

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
    // Court sides
    right: "derecha", left: "izquierda",
    // Languages
    English: "Inglés", Spanish: "Español", Portuguese: "Portugués", French: "Francés",
    Italian: "Italiano", German: "Alemán", Dutch: "Neerlandés", Catalan: "Catalán",
    Arabic: "Árabe", Russian: "Ruso", Mandarin: "Mandarín", Japanese: "Japonés",
    Swedish: "Sueco", Greek: "Griego", Turkish: "Turco", Hindi: "Hindi",
    // Personal traits
    Honest: "Honesto", Kind: "Amable", Calm: "Tranquilo", Curious: "Curioso",
    Confident: "Seguro", Friendly: "Simpático", Loyal: "Leal", Patient: "Paciente",
    Organized: "Organizado", "Open-minded": "Mente abierta", Ambitious: "Ambicioso",
    Ambidextrous: "Ambidiestro", Brave: "Valiente", Creative: "Creativo",
    Determined: "Decidido", Diplomatic: "Diplomático", Easygoing: "Fácil de tratar",
    Empathetic: "Empático", Energetic: "Enérgico", Flexible: "Flexible",
    Generous: "Generoso", Humble: "Humilde", Independent: "Independiente",
    Introverted: "Introvertido", Outgoing: "Extrovertido", Practical: "Práctico",
    Reflective: "Reflexivo", Reliable: "Fiable", Serious: "Serio",
    "Witty/funny": "Ingenioso/gracioso",
    Direct: "Directo", Reserved: "Reservado", Quiet: "Callado",
    Sensitive: "Sensible", Emotional: "Emocional", Impatient: "Impaciente",
    Stubborn: "Terco", Perfectionist: "Perfeccionista",
    // Padel styles
    Competitive: "Competitivo", Strategic: "Estratégico", Aggressive: "Agresivo",
    Defensive: "Defensivo", "Team player": "Jugador de equipo", Coachable: "Enseñable",
    "Loves tournaments": "Le encantan los torneos", "Just for fun": "Solo por diversión",
    "Always improving": "Siempre mejorando", "Fitness-focused": "Enfocado en fitness",
    "Social player": "Jugador social",
    // Availability slots
    "Weekday mornings": "Mañanas entre semana",
    "Weekday lunchtime": "Mediodías entre semana",
    "Weekday evenings": "Tardes entre semana",
    "Weekend mornings": "Mañanas de fin de semana",
    "Weekend afternoons": "Tardes de fin de semana",
    "Weekend evenings": "Noches de fin de semana",
    // Priority traits (PRIORITY_TRAITS keys)
    "Family": "Familia",

    "Community": "Comunidad",
    "Deep conversations": "Conversaciones profundas",
    "Humor & laughter": "Humor y risas",
    "Health & wellbeing": "Salud y bienestar",
    "Fitness": "Fitness",
    "Mindfulness & meditation": "Mindfulness y meditación",
    "Comfort & home life": "Confort y vida en casa",
    "Food & cooking": "Comida y cocina",
    "Travel": "Viajes",
    "Nature & outdoors": "Naturaleza y aire libre",
    "Adventure": "Aventura",
    "Learning & curiosity": "Aprender y curiosidad",
    "Personal growth": "Crecimiento personal",
    "Purpose & meaning": "Propósito y sentido",
    "Work & career": "Trabajo y carrera",
    "Ambition & success": "Ambición y éxito",
    "Entrepreneurship": "Emprendimiento",
    "Education": "Educación",
    "Money & financial freedom": "Dinero y libertad financiera",
    "Creativity & making": "Creatividad y crear",
    "Art": "Arte",
    "Music": "Música",
    "Reading": "Lectura",
    "Gaming": "Videojuegos",
    "Technology": "Tecnología",
    "Social causes": "Causas sociales",
    "Sustainability": "Sostenibilidad",
    "Volunteering & giving back": "Voluntariado y ayudar",
    "Pets & animals": "Mascotas y animales",
    "Spontaneity & surprises": "Espontaneidad y sorpresas",
  },
  fr: {
    woman: "femme", man: "homme", "non-binary": "non-binaire", "self-describe": "Préfère se décrire",
    "just starting": "je débute", casual: "casual", beginner: "débutant", intermediate: "intermédiaire", advanced: "avancé", competitive: "compétitif",
    friend: "ami·e", partner: "partenaire", both: "les deux",
    everyone: "tout le monde", women: "femmes", men: "hommes", "lesbian women": "femmes lesbiennes", "gay men": "hommes gays", bisexual: "bisexuel·le·s", queer: "queer",
    // Court sides
    right: "droite", left: "gauche",
    // Languages
    English: "Anglais", Spanish: "Espagnol", Portuguese: "Portugais", French: "Français",
    Italian: "Italien", German: "Allemand", Dutch: "Néerlandais", Catalan: "Catalan",
    Arabic: "Arabe", Russian: "Russe", Mandarin: "Mandarin", Japanese: "Japonais",
    Swedish: "Suédois", Greek: "Grec", Turkish: "Turc", Hindi: "Hindi",
    // Personal traits
    Honest: "Honnête", Kind: "Gentil·le", Calm: "Calme", Curious: "Curieux·se",
    Confident: "Confiant·e", Friendly: "Sympathique", Loyal: "Loyal·e", Patient: "Patient·e",
    Organized: "Organisé·e", "Open-minded": "Ouvert·e d'esprit", Ambitious: "Ambitieux·se",
    Ambidextrous: "Ambidextre", Brave: "Courageux·se", Creative: "Créatif·ve",
    Determined: "Déterminé·e", Diplomatic: "Diplomate", Easygoing: "Facile à vivre",
    Empathetic: "Empathique", Energetic: "Énergique", Flexible: "Flexible",
    Generous: "Généreux·se", Humble: "Humble", Independent: "Indépendant·e",
    Introverted: "Introverti·e", Outgoing: "Extraverti·e", Practical: "Pratique",
    Reflective: "Réfléchi·e", Reliable: "Fiable", Serious: "Sérieux·se",
    "Witty/funny": "Spirituel·le / drôle",
    Direct: "Direct·e", Reserved: "Réservé·e", Quiet: "Discret·ète",
    Sensitive: "Sensible", Emotional: "Émotif·ve", Impatient: "Impatient·e",
    Stubborn: "Têtu·e", Perfectionist: "Perfectionniste",
    // Padel styles
    Competitive: "Compétitif", Strategic: "Stratégique", Aggressive: "Agressif",
    Defensive: "Défensif", "Team player": "Esprit d'équipe", Coachable: "Coachable",
    "Loves tournaments": "Adore les tournois", "Just for fun": "Juste pour le fun",
    "Always improving": "Toujours en progression", "Fitness-focused": "Axé fitness",
    "Social player": "Joueur social",
    // Availability slots
    "Weekday mornings": "Matins en semaine",
    "Weekday lunchtime": "Midis en semaine",
    "Weekday evenings": "Soirs en semaine",
    "Weekend mornings": "Matins le week-end",
    "Weekend afternoons": "Après-midis le week-end",
    "Weekend evenings": "Soirs le week-end",
    // Priority traits (PRIORITY_TRAITS keys)
    "Family": "Famille",
    "Community": "Communauté",

    "Deep conversations": "Conversations profondes",
    "Humor & laughter": "Humour et rires",
    "Health & wellbeing": "Santé et bien-être",
    "Fitness": "Fitness",
    "Mindfulness & meditation": "Pleine conscience et méditation",
    "Comfort & home life": "Confort et vie à la maison",
    "Food & cooking": "Cuisine et gastronomie",
    "Travel": "Voyages",
    "Nature & outdoors": "Nature et plein air",
    "Adventure": "Aventure",
    "Learning & curiosity": "Apprendre et curiosité",
    "Personal growth": "Développement personnel",
    "Purpose & meaning": "Sens et raison d'être",
    "Work & career": "Travail et carrière",
    "Ambition & success": "Ambition et réussite",
    "Entrepreneurship": "Entrepreneuriat",
    "Education": "Éducation",
    "Money & financial freedom": "Argent et liberté financière",
    "Creativity & making": "Créativité et création",
    "Art": "Art",
    "Music": "Musique",
    "Reading": "Lecture",
    "Gaming": "Jeux vidéo",
    "Technology": "Technologie",
    "Social causes": "Causes sociales",
    "Sustainability": "Durabilité",
    "Volunteering & giving back": "Bénévolat et entraide",
    "Pets & animals": "Animaux de compagnie",
    "Spontaneity & surprises": "Spontanéité et surprises",
  },
  ar: {
    woman: "امرأة", man: "رجل", "non-binary": "غير ثنائي", "self-describe": "أفضّل الوصف بنفسي",
    "just starting": "أبدأ الآن", casual: "عرضي", beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", competitive: "تنافسي",
    friend: "صديق", partner: "شريك", both: "كلاهما",
    everyone: "الجميع", women: "نساء", men: "رجال", "lesbian women": "مثليات", "gay men": "مثليون", bisexual: "ثنائيو الميول", queer: "كوير",
    // Court sides
    right: "يمين", left: "يسار",
    // Languages
    English: "الإنجليزية", Spanish: "الإسبانية", Portuguese: "البرتغالية", French: "الفرنسية",
    Italian: "الإيطالية", German: "الألمانية", Dutch: "الهولندية", Catalan: "الكتالانية",
    Arabic: "العربية", Russian: "الروسية", Mandarin: "الماندرين", Japanese: "اليابانية",
    Swedish: "السويدية", Greek: "اليونانية", Turkish: "التركية", Hindi: "الهندية",
    // Personal traits
    Honest: "صادق", Kind: "لطيف", Calm: "هادئ", Curious: "فضولي",
    Confident: "واثق", Friendly: "ودود", Loyal: "مخلص", Patient: "صبور",
    Organized: "منظّم", "Open-minded": "منفتح الذهن", Ambitious: "طموح",
    Ambidextrous: "يستخدم اليدين", Brave: "شجاع", Creative: "مبدع",
    Determined: "مصمّم", Diplomatic: "دبلوماسي", Easygoing: "مرن الطباع",
    Empathetic: "متعاطف", Energetic: "نشيط", Flexible: "مرن",
    Generous: "كريم", Humble: "متواضع", Independent: "مستقل",
    Introverted: "انطوائي", Outgoing: "اجتماعي", Practical: "عملي",
    Reflective: "متأمّل", Reliable: "موثوق", Serious: "جدّي",
    "Witty/funny": "ذكي/مضحك",
    Direct: "مباشر", Reserved: "متحفّظ", Quiet: "هادئ",
    Sensitive: "حساس", Emotional: "عاطفي", Impatient: "قليل الصبر",
    Stubborn: "عنيد", Perfectionist: "مثالي",
    // Padel styles
    Competitive: "تنافسي", Strategic: "استراتيجي", Aggressive: "هجومي",
    Defensive: "دفاعي", "Team player": "روح الفريق", Coachable: "قابل للتدريب",
    "Loves tournaments": "يحب البطولات", "Just for fun": "من أجل المتعة",
    "Always improving": "دائم التطوير", "Fitness-focused": "مركّز على اللياقة",
    "Social player": "لاعب اجتماعي",
    // Availability slots
    "Weekday mornings": "صباح أيام الأسبوع",
    "Weekday lunchtime": "منتصف نهار أيام الأسبوع",
    "Weekday evenings": "مساء أيام الأسبوع",
    "Weekend mornings": "صباح عطلة الأسبوع",
    "Weekend afternoons": "بعد ظهر عطلة الأسبوع",
    "Weekend evenings": "مساء عطلة الأسبوع",
    // Priority traits
    "Family": "العائلة",
    "Community": "المجتمع",
    "Deep conversations": "المحادثات العميقة",
    "Humor & laughter": "الفكاهة والضحك",
    "Health & wellbeing": "الصحة والرفاه",
    "Fitness": "اللياقة",
    "Mindfulness & meditation": "التأمّل والوعي",
    "Comfort & home life": "الراحة وحياة البيت",
    "Food & cooking": "الطعام والطهي",
    "Travel": "السفر",
    "Nature & outdoors": "الطبيعة والهواء الطلق",
    "Adventure": "المغامرة",
    "Learning & curiosity": "التعلّم والفضول",
    "Personal growth": "التطور الشخصي",
    "Purpose & meaning": "الهدف والمعنى",
    "Work & career": "العمل والمهنة",
    "Ambition & success": "الطموح والنجاح",
    "Entrepreneurship": "ريادة الأعمال",
    "Education": "التعليم",
    "Money & financial freedom": "المال والحرية المالية",
    "Creativity & making": "الإبداع والصنع",
    "Art": "الفن",
    "Music": "الموسيقى",
    "Reading": "القراءة",
    "Gaming": "الألعاب",
    "Technology": "التكنولوجيا",
    "Social causes": "القضايا الاجتماعية",
    "Sustainability": "الاستدامة",
    "Volunteering & giving back": "التطوع والعطاء",
    "Pets & animals": "الحيوانات الأليفة",
    "Spontaneity & surprises": "التلقائية والمفاجآت",
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
  if (langs.some((l) => l.startsWith("ar"))) return "ar";
  if (langs.some((l) => l.startsWith("es"))) return "es";
  if (langs.some((l) => l.startsWith("fr"))) return "fr";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "es" || stored === "fr" || stored === "ar") {
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
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
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
// French is optional; when omitted, French falls back to English.
export function useTr() {
  const { lang } = useI18n();
  return (en: string, es: string, fr?: string) => {
    if (lang === "es") return es;
    if (lang === "fr") return fr ?? en;
    return en;
  };
}

export function LangSwitch({ className = "", variant = "light" }: { className?: string; variant?: "dark" | "light" }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const isDark = variant === "dark";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options: { code: Lang; name: string; short: string }[] = [
    { code: "en", name: "English", short: "EN" },
    { code: "es", name: "Español", short: "ES" },
    { code: "fr", name: "Français", short: "FR" },
    { code: "ar", name: "العربية", short: "AR" },
  ];
  const current = options.find((o) => o.code === lang) ?? options[0];

  const trigger = isDark
    ? "border-[var(--paper)]/25 bg-[var(--paper)]/5 text-[var(--paper)] hover:bg-[var(--paper)]/10"
    : "border-[var(--ink)]/15 bg-[var(--paper)]/70 text-[var(--ink)] hover:bg-[var(--paper)] backdrop-blur";

  return (
    <div ref={ref} className={`relative inline-block ${className}`} style={{ zIndex: 60 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.name}`}
        className={`inline-flex items-center gap-1.5 rounded-full border pl-3 pr-2 py-1 text-[12px] font-semibold tracking-wide transition ${trigger}`}
      >
        <span>{current.short}</span>
        <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden className={`transition ${open ? "rotate-180" : ""}`}>
          <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1.5 min-w-[4.5rem] rounded-xl border border-[var(--ink)]/12 bg-[var(--paper)] py-1 shadow-xl overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          {options.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang === o.code}
                onClick={() => { setLang(o.code); setOpen(false); }}
                className={`w-full block px-3 py-2 text-[12px] font-semibold tracking-[0.18em] text-center transition ${lang === o.code ? "bg-[var(--ink)]/8 text-[var(--ink)]" : "text-[var(--ink)]/70 hover:bg-[var(--ink)]/5"}`}
              >
                {o.short}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

