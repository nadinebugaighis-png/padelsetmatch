// Curated padel questions used by the Grid morning/evening question and the
// 3-question unlock on player cards. The English text is the canonical value
// stored in qa_answers so answers compare across languages.

export type Lang = "en" | "es" | "fr";
type L = { en: string; es: string; fr: string };
export type CuratedQuestion = { id: string; category: string; q: L; options: L[] };

const o = (en: string, es: string, fr: string): L => ({ en, es, fr });

// 35 questions mixing pádel (15), personality on court (11) and lifestyle (9).
// Never reword an existing English question: saved answers are matched by it.
export const CURATED_QUESTIONS: CuratedQuestion[] = [
  { id: "deuce", category: "padel", q: o("40-40, match point. You…", "40-40, punto de partido. Tú…", "40-40, balle de match. Toi…"),
    options: [o("Go for the winner", "Vas a por el winner", "Tu tentes le coup gagnant"), o("Play it safe, wait", "Juegas seguro y esperas", "Tu joues safe et attends"), o("Lob and pray", "Globo y a rezar", "Lob et prière")] },
  { id: "loss", category: "personality", q: o("After a tough loss you…", "Después de perder un partido duro…", "Après une défaite serrée, tu…"),
    options: [o("Replay every point", "Repasas cada punto", "Rejoues chaque point"), o("Laugh it off over a drink", "Te ríes con una caña", "En ris autour d'un verre"), o("Book the rematch now", "Reservas la revancha ya", "Réserves la revanche direct")] },
  { id: "side", category: "padel", q: o("Your favourite side of the court?", "¿Tu lado favorito de la pista?", "Ton côté préféré du court ?"),
    options: [o("Left – backhand", "Izquierda – revés", "Gauche – revers"), o("Right – forehand", "Derecha – drive", "Droite – coup droit"), o("Either, I adapt", "Cualquiera, me adapto", "Peu importe, je m'adapte")] },
  { id: "after", category: "lifestyle", q: o("After the match…", "Después del partido…", "Après le match…"),
    options: [o("Straight home", "Directo a casa", "Direct à la maison"), o("Coffee or a beer", "Café o una caña", "Café ou bière"), o("Long lunch with the group", "Comida larga con el grupo", "Long déjeuner en groupe")] },
  { id: "shot", category: "padel", q: o("Your signature move?", "¿Tu golpe estrella?", "Ton coup signature ?"),
    options: [o("The smash", "El remate", "Le smash"), o("The bandeja", "La bandeja", "La bandeja"), o("Patient wall play", "Paciencia y pared", "Jeu patient avec les vitres")] },
  { id: "talk", category: "personality", q: o("On court, you're the one who…", "En pista, tú eres quien…", "Sur le court, tu es celui/celle qui…"),
    options: [o("Talks tactics nonstop", "Habla de táctica sin parar", "Parle tactique sans arrêt"), o("Hypes the partner", "Anima al compañero", "Motive son partenaire"), o("Stays quiet, focused", "Calla y se concentra", "Reste calme et concentré")] },
  { id: "sitter", category: "padel", q: o("Your partner misses an easy ball. You…", "Tu compañero falla una bola fácil. Tú…", "Ton partenaire rate une balle facile. Toi…"),
    options: [o("Say “next one!”", "Le dices “¡la siguiente!”", "Tu dis « la prochaine ! »"), o("Give a quick tip", "Le das un consejo rápido", "Tu donnes un petit conseil"), o("Act like nothing happened", "Haces como si nada", "Tu fais comme si de rien n'était")] },
  { id: "time", category: "lifestyle", q: o("Best time to play?", "¿Mejor hora para jugar?", "Meilleur moment pour jouer ?"),
    options: [o("Before work, sunrise", "Antes del trabajo, al amanecer", "Avant le boulot, à l'aube"), o("Lunch break", "A la hora de comer", "Pause déj"), o("After work, under lights", "Después del trabajo, con focos", "Après le boulot, sous les projecteurs")] },
  { id: "lob", category: "padel", q: o("A lob goes over your partner. You…", "Un globo pasa por encima de tu compañero. Tú…", "Un lob passe au-dessus de ton partenaire. Toi…"),
    options: [o("Switch sides, no talk", "Cambias de lado sin hablar", "Tu changes de côté sans parler"), o("Shout “mine!”", "Gritas “¡mía!”", "Tu cries « à moi ! »"), o("Both chase it", "Vais los dos a por ella", "Vous courez tous les deux")] },
  { id: "feedback", category: "personality", q: o("Tips from your partner mid-match?", "¿Consejos de tu compañero durante el partido?", "Des conseils de ton partenaire en plein match ?"),
    options: [o("Yes, be direct", "Sí, directo", "Oui, direct"), o("Only good vibes", "Solo buen rollo", "Que des ondes positives"), o("Save it for after", "Mejor después", "Plutôt après")] },
  { id: "warmup", category: "padel", q: o("Your warm-up routine?", "¿Tu calentamiento?", "Ton échauffement ?"),
    options: [o("Full 15-minute stretch", "Estiramientos de 15 minutos", "15 minutes d'étirements"), o("A few minutes of rallies", "Unos minutos de peloteo", "Quelques minutes d'échanges"), o("Walk on and serve", "Llegar y sacar", "J'arrive et je sers")] },
  { id: "weekend", category: "lifestyle", q: o("Your ideal weekend match is…", "Tu partido ideal de finde es…", "Ton match idéal du week-end…"),
    options: [o("Intense and competitive", "Intenso y competitivo", "Intense et compétitif"), o("Good sweat, then tapas", "Buen sudor y luego tapas", "Bonne suée, puis tapas"), o("Casual social hit", "Peloteo social tranquilo", "Partie détente entre amis")] },
  { id: "rules", category: "padel", q: o("Close ball on the line. You call…", "Bola dudosa en la línea. Tú dices…", "Balle litigieuse sur la ligne. Tu dis…"),
    options: [o("Theirs, always", "Para ellos, siempre", "Pour eux, toujours"), o("Replay the point", "Repetir el punto", "On rejoue le point"), o("Ours, obviously", "Nuestra, claro", "Pour nous, évidemment")] },
  { id: "late", category: "personality", q: o("Your partner arrives 10 minutes late. You…", "Tu compañero llega 10 minutos tarde. Tú…", "Ton partenaire arrive avec 10 min de retard. Toi…"),
    options: [o("Warm up, no stress", "Calientas sin estrés", "Tu t'échauffes, zéro stress"), o("Text “where are you?”", "Escribes “¿dónde estás?”", "Tu envoies « t'es où ? »"), o("Already annoyed", "Ya estás molesto", "Déjà agacé")] },
  { id: "surface", category: "padel", q: o("Your favourite court?", "¿Tu pista favorita?", "Ton court préféré ?"),
    options: [o("Fast indoor glass", "Cubierta y rápida", "Couvert et rapide"), o("Sunny outdoor", "Exterior al sol", "Extérieur au soleil"), o("Classic wall court", "Clásica de muro", "Classique avec murs")] },
  { id: "fitness", category: "lifestyle", q: o("Exercise outside padel?", "¿Ejercicio además del pádel?", "Du sport en dehors du padel ?"),
    options: [o("Gym or running", "Gimnasio o correr", "Salle ou course"), o("Another sport", "Otro deporte", "Un autre sport"), o("Padel is my workout", "El pádel es mi ejercicio", "Le padel, c'est mon sport")] },
  { id: "weapon", category: "padel", q: o("Your biggest weapon?", "¿Tu mejor arma?", "Ta meilleure arme ?"),
    options: [o("Reflexes at the net", "Reflejos en la red", "Réflexes au filet"), o("Never missing", "No fallar nunca", "Ne jamais rater"), o("Power to finish", "Potencia para rematar", "Puissance pour finir")] },
  { id: "tiebreak", category: "personality", q: o("6–6, tie-break. You…", "6–6, tie-break. Tú…", "6–6, tie-break. Toi…"),
    options: [o("Get more focused", "Te concentras más", "Tu te concentres encore plus"), o("Feel it, keep it simple", "Lo notas, juegas sencillo", "Tu stresses, tu joues simple"), o("Crack a joke", "Haces una broma", "Tu fais une blague")] },
  { id: "comeback", category: "padel", q: o("Down 1–5 in the first set. You…", "Pierdes 1–5 el primer set. Tú…", "Mené 1–5 au premier set. Toi…"),
    options: [o("Fight for every ball", "Peleas cada bola", "Tu te bats sur chaque balle"), o("Try new shots for set two", "Pruebas golpes nuevos para el segundo", "Tu testes d'autres coups pour le 2e"), o("Laugh and start fresh", "Te ríes y empiezas de cero", "Tu ris et repars à zéro")] },
  { id: "rain", category: "lifestyle", q: o("Rain cancels your outdoor court. You…", "La lluvia cancela tu pista exterior. Tú…", "La pluie annule ton court extérieur. Toi…"),
    options: [o("Find an indoor court", "Buscas pista cubierta", "Tu trouves un court couvert"), o("Gym instead", "Al gimnasio", "Salle de sport à la place"), o("Sofa, guilt-free", "Sofá sin culpa", "Canapé sans culpabilité")] },
  { id: "calls", category: "personality", q: o("The other team makes doubtful calls. You…", "La otra pareja canta bolas dudosas. Tú…", "L'autre équipe annonce des balles douteuses. Toi…"),
    options: [o("Say something politely", "Lo comentas con educación", "Tu le dis poliment"), o("Let it go", "Lo dejas pasar", "Tu laisses passer"), o("Get extra competitive", "Te picas más", "Tu deviens plus compétitif")] },
  { id: "voice", category: "padel", q: o("During the point you and your partner…", "Durante el punto tú y tu compañero…", "Pendant le point, toi et ton partenaire…"),
    options: [o("Talk on every ball", "Habláis en cada bola", "Parlez à chaque balle"), o("Silent understanding", "Os entendéis en silencio", "Vous vous comprenez en silence"), o("Talk between points only", "Solo habláis entre puntos", "Parlez seulement entre les points")] },
  { id: "getaway", category: "lifestyle", q: o("A padel weekend trip with friends?", "¿Una escapada de pádel con amigos?", "Un week-end padel entre amis ?"),
    options: [o("Bag's already packed", "Tengo la bolsa hecha", "Sac déjà prêt"), o("If it's a short drive", "Si está cerca en coche", "Si c'est pas loin en voiture"), o("I prefer playing locally", "Prefiero jugar cerca de casa", "Je préfère jouer près de chez moi")] },
  { id: "group", category: "personality", q: o("In the padel WhatsApp group you're…", "En el grupo de WhatsApp de pádel eres…", "Dans le groupe WhatsApp padel, tu es…"),
    options: [o("The organiser", "Quien organiza", "L'organisateur"), o("First to say “I'm in!”", "El primero en decir “¡me apunto!”", "Le premier à dire « je suis là ! »"), o("The last-minute yes", "El que confirma a última hora", "Celui qui confirme au dernier moment")] },
  { id: "stronger", category: "padel", q: o("Playing against a higher level…", "Jugar contra un nivel más alto…", "Jouer contre plus fort que toi…"),
    options: [o("Love the challenge", "Me encanta el reto", "J'adore le défi"), o("A bit nervous", "Me pone un poco nervioso", "Ça me stresse un peu"), o("Prefer my own level", "Prefiero mi nivel", "Je préfère mon niveau")] },
  { id: "frequency", category: "lifestyle", q: o("How often would you play?", "¿Cuánto te gustaría jugar?", "Tu jouerais à quelle fréquence ?"),
    options: [o("Once a week", "Una vez por semana", "Une fois par semaine"), o("2–3 times a week", "2–3 veces por semana", "2–3 fois par semaine"), o("Every day if I could", "Todos los días si pudiera", "Tous les jours si je pouvais")] },
  { id: "humor", category: "personality", q: o("Jokes during a match?", "¿Bromas durante el partido?", "Des blagues pendant le match ?"),
    options: [o("Nonstop", "Sin parar", "Non-stop"), o("A little teasing", "Un poco de pique", "Un peu de chambrage"), o("Strictly serious", "Totalmente en serio", "Sérieux à 100 %")] },
  { id: "balls", category: "padel", q: o("Padel balls: you…", "Pelotas de pádel: tú…", "Balles de padel : toi…"),
    options: [o("Open a fresh can every time", "Abres un bote nuevo siempre", "Ouvres un tube neuf à chaque fois"), o("Use whatever's in the bag", "Usas lo que haya en la bolsa", "Prends ce qu'il y a dans le sac"), o("If it bounces, it's fine", "Si bota, vale", "Si ça rebondit, ça va")] },
  { id: "food", category: "lifestyle", q: o("Hungry after the match?", "¿Hambre después del partido?", "Faim après le match ?"),
    options: [o("Long table of tapas", "Mesa larga de tapas", "Grande tablée de tapas"), o("Protein shake", "Batido de proteínas", "Shake protéiné"), o("Whatever's quickest", "Lo más rápido", "Le plus rapide")] },
  { id: "error", category: "personality", q: o("After an easy mistake you…", "Después de un fallo fácil…", "Après une faute facile, tu…"),
    options: [o("Breathe and reset", "Respiras y sigues", "Respires et repars"), o("Work out what went wrong", "Analizas qué pasó", "Analyses ce qui s'est passé"), o("Tap the racket, move on", "Golpecito a la pala y sigues", "Tapes la raquette et passes à autre chose")] },
  { id: "wind", category: "padel", q: o("Windy day on an outdoor court. You…", "Día de viento en pista exterior. Tú…", "Jour de vent sur un court extérieur. Toi…"),
    options: [o("Adapt and play low", "Te adaptas y juegas bajo", "Tu t'adaptes et joues bas"), o("Get frustrated", "Te frustras", "Tu t'agaces"), o("Love it, that's real padel", "Te encanta, eso es pádel", "Tu adores, c'est ça le padel")] },
  { id: "why", category: "lifestyle", q: o("Why do you play padel?", "¿Por qué juegas al pádel?", "Pourquoi tu joues au padel ?"),
    options: [o("To compete and win", "Para competir y ganar", "Pour la compétition"), o("A great workout", "Por hacer ejercicio", "Pour le sport"), o("For the people", "Por la gente", "Pour les gens")] },
  { id: "punctual", category: "personality", q: o("You arrive at the court…", "Llegas a la pista…", "Tu arrives au court…"),
    options: [o("15 minutes early", "15 minutos antes", "15 minutes en avance"), o("Right on time", "Justo a la hora", "Pile à l'heure"), o("Running from the car park", "Corriendo desde el parking", "En courant depuis le parking")] },
  { id: "goal", category: "padel", q: o("This season you want to…", "Esta temporada quieres…", "Cette saison tu veux…"),
    options: [o("Win a tournament", "Ganar un torneo", "Gagner un tournoi"), o("Level up properly", "Subir de nivel de verdad", "Vraiment progresser"), o("Just play more often", "Simplemente jugar más", "Juste jouer plus souvent")] },
  { id: "newpartner", category: "personality", q: o("First match with a new partner. You…", "Primer partido con alguien nuevo. Tú…", "Premier match avec un nouveau partenaire. Toi…"),
    options: [o("Ask how they like to play", "Preguntas cómo le gusta jugar", "Tu demandes comment il aime jouer"), o("Adapt as you go", "Os adaptáis sobre la marcha", "Vous vous adaptez en jouant"), o("Play your natural game", "Juegas tu juego de siempre", "Tu joues ton jeu habituel")] },
];

export const UNLOCK_IDS = ["weekend", "deuce", "lob"];

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Same question for everyone on a given local calendar day. */
export function questionForDay(d = new Date()): CuratedQuestion {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return CURATED_QUESTIONS[days % CURATED_QUESTIONS.length];
}

/** Local hour at which the morning question gives way to the evening one. */
export const EVENING_FROM_HOUR = 15;

/** Morning or evening question slot for a local time, e.g. "2026-11-07-am". */
export function slotKey(d = new Date()): string {
  return `${todayKey(d)}-${d.getHours() < EVENING_FROM_HOUR ? "am" : "pm"}`;
}

/** Same question for everyone in a given morning/evening slot. */
export function questionForSlot(d = new Date()): CuratedQuestion {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  const idx = days * 2 + (d.getHours() < EVENING_FROM_HOUR ? 0 : 1);
  return CURATED_QUESTIONS[idx % CURATED_QUESTIONS.length];
}

/** After answering, a new player's next question waits this long (one app visit). */
export const NEW_PLAYER_PAUSE_MS = 30 * 60_000;

/**
 * Whether the Grid question card should show.
 * New players (under UNLOCK_MIN_ANSWERS answers) get one on every visit;
 * regular players get two a day — one in the morning, one in the evening.
 */
export function shouldShowQuestion(opts: {
  answeredCount: number;
  lastSlot: string | null;
  lastAnsweredAt: number | null;
  now?: Date;
}): boolean {
  const now = opts.now ?? new Date();
  if (opts.answeredCount < UNLOCK_MIN_ANSWERS) {
    return opts.lastAnsweredAt === null || now.getTime() - opts.lastAnsweredAt >= NEW_PLAYER_PAUSE_MS;
  }
  return opts.lastSlot !== slotKey(now);
}

/** Skip previous answers; revisit a slot question once the pool is complete. */
export function dailyQuestionFor(answered: Set<string>, d = new Date()): CuratedQuestion | null {
  const start = CURATED_QUESTIONS.indexOf(questionForSlot(d));
  for (let i = 0; i < CURATED_QUESTIONS.length; i++) {
    const q = CURATED_QUESTIONS[(start + i) % CURATED_QUESTIONS.length];
    if (!answered.has(q.q.en)) return q;
  }
  return questionForSlot(d);
}

/** Up to `n` unanswered questions for the player-card unlock. */
export function unlockQuestions(answered: Set<string>, n: number): CuratedQuestion[] {
  const order = [...UNLOCK_IDS, ...CURATED_QUESTIONS.map((q) => q.id).filter((id) => !UNLOCK_IDS.includes(id))];
  return order.flatMap((id) => {
    const q = CURATED_QUESTIONS.find((q) => q.id === id);
    return q && !answered.has(q.q.en) ? [q] : [];
  }).slice(0, n);
}

export const UNLOCK_MIN_ANSWERS = 3;
