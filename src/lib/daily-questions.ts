// Curated padel questions used by the Grid "Question of the day" and the
// 3-question unlock on player cards. The English text is the canonical value
// stored in qa_answers so answers compare across languages.

export type Lang = "en" | "es" | "fr";
type L = { en: string; es: string; fr: string };
export type CuratedQuestion = { id: string; category: string; q: L; options: L[] };

const o = (en: string, es: string, fr: string): L => ({ en, es, fr });

export const CURATED_QUESTIONS: CuratedQuestion[] = [
  { id: "deuce", category: "padel", q: o("40-40, match point. You…", "40-40, punto de partido. Tú…", "40-40, balle de match. Toi…"),
    options: [o("Go for the winner", "Vas a por el winner", "Tu tentes le coup gagnant"), o("Play it safe, wait", "Juegas seguro y esperas", "Tu joues safe et attends"), o("Lob and pray", "Globo y a rezar", "Lob et prière")] },
  { id: "weekend", category: "lifestyle", q: o("Your ideal weekend match is…", "Tu partido ideal de finde es…", "Ton match idéal du week-end…"),
    options: [o("Intense and competitive", "Intenso y competitivo", "Intense et compétitif"), o("Good sweat, then tapas", "Buen sudor y luego tapas", "Bonne suée, puis tapas"), o("Casual social hit", "Peloteo social tranquilo", "Partie détente entre amis")] },
  { id: "lob", category: "padel", q: o("A lob goes over your partner. You…", "Un globo pasa por encima de tu compañero. Tú…", "Un lob passe au-dessus de ton partenaire. Toi…"),
    options: [o("Switch sides, no talk", "Cambias de lado sin hablar", "Tu changes de côté sans parler"), o("Shout “mine!”", "Gritas “¡mía!”", "Tu cries « à moi ! »"), o("Both chase it", "Vais los dos a por ella", "Vous courez tous les deux")] },
  { id: "loss", category: "personality", q: o("After a tough loss you…", "Después de perder un partido duro…", "Après une défaite serrée, tu…"),
    options: [o("Replay every point", "Repasas cada punto", "Rejoues chaque point"), o("Laugh it off over a drink", "Te ríes con una caña", "En ris autour d'un verre"), o("Book the rematch now", "Reservas la revancha ya", "Réserves la revanche direct")] },
  { id: "time", category: "lifestyle", q: o("Best time to play?", "¿Mejor hora para jugar?", "Meilleur moment pour jouer ?"),
    options: [o("Before work, sunrise", "Antes del trabajo, al amanecer", "Avant le boulot, à l'aube"), o("Lunch break", "A la hora de comer", "Pause déj"), o("After work, under lights", "Después del trabajo, con focos", "Après le boulot, sous les projecteurs")] },
  { id: "talk", category: "personality", q: o("On court, you're the one who…", "En pista, tú eres quien…", "Sur le court, tu es celui/celle qui…"),
    options: [o("Talks tactics nonstop", "Habla de táctica sin parar", "Parle tactique sans arrêt"), o("Hypes the partner", "Anima al compañero", "Motive son partenaire"), o("Stays quiet, focused", "Calla y se concentra", "Reste calme et concentré")] },
  { id: "shot", category: "padel", q: o("Your signature move?", "¿Tu golpe estrella?", "Ton coup signature ?"),
    options: [o("The smash", "El remate", "Le smash"), o("The bandeja", "La bandeja", "La bandeja"), o("Patient wall play", "Paciencia y pared", "Jeu patient avec les vitres")] },
  { id: "late", category: "personality", q: o("Your partner arrives 10 minutes late. You…", "Tu compañero llega 10 minutos tarde. Tú…", "Ton partenaire arrive avec 10 min de retard. Toi…"),
    options: [o("Warm up, no stress", "Calientas sin estrés", "Tu t'échauffes, zéro stress"), o("Text “where are you?”", "Escribes “¿dónde estás?”", "Tu envoies « t'es où ? »"), o("Already annoyed", "Ya estás molesto", "Déjà agacé")] },
  { id: "after", category: "lifestyle", q: o("After the match…", "Después del partido…", "Après le match…"),
    options: [o("Straight home", "Directo a casa", "Direct à la maison"), o("Coffee or a beer", "Café o una caña", "Café ou bière"), o("Long lunch with the group", "Comida larga con el grupo", "Long déjeuner en groupe")] },
  { id: "rules", category: "padel", q: o("Close ball on the line. You call…", "Bola dudosa en la línea. Tú dices…", "Balle litigieuse sur la ligne. Tu dis…"),
    options: [o("Theirs, always", "Para ellos, siempre", "Pour eux, toujours"), o("Replay the point", "Repetir el punto", "On rejoue le point"), o("Ours, obviously", "Nuestra, claro", "Pour nous, évidemment")] },
  { id: "goal", category: "padel", q: o("This season you want to…", "Esta temporada quieres…", "Cette saison tu veux…"),
    options: [o("Win a tournament", "Ganar un torneo", "Gagner un tournoi"), o("Level up properly", "Subir de nivel de verdad", "Vraiment progresser"), o("Just play more often", "Simplemente jugar más", "Juste jouer plus souvent")] },
  { id: "rain", category: "personality", q: o("Rain cancels your outdoor court. You…", "La lluvia cancela tu pista exterior. Tú…", "La pluie annule ton court extérieur. Toi…"),
    options: [o("Find an indoor court", "Buscas pista cubierta", "Tu trouves un court couvert"), o("Gym instead", "Al gimnasio", "Salle de sport à la place"), o("Sofa, guilt-free", "Sofá sin culpa", "Canapé sans culpabilité")] },
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

/** Today's question, skipping ones already answered; null if all answered. */
export function dailyQuestionFor(answered: Set<string>, d = new Date()): CuratedQuestion | null {
  const start = CURATED_QUESTIONS.indexOf(questionForDay(d));
  for (let i = 0; i < CURATED_QUESTIONS.length; i++) {
    const q = CURATED_QUESTIONS[(start + i) % CURATED_QUESTIONS.length];
    if (!answered.has(q.q.en)) return q;
  }
  return null;
}

/** Up to `n` unanswered questions for the player-card unlock. */
export function unlockQuestions(answered: Set<string>, n: number): CuratedQuestion[] {
  const order = [...UNLOCK_IDS, ...CURATED_QUESTIONS.map((q) => q.id).filter((id) => !UNLOCK_IDS.includes(id))];
  return order.map((id) => CURATED_QUESTIONS.find((q) => q.id === id)!).filter((q) => !answered.has(q.q.en)).slice(0, n);
}

export const UNLOCK_MIN_ANSWERS = 3;
