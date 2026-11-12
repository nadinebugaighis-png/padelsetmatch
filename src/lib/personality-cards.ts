import { CURATED_QUESTIONS } from "./daily-questions";

// After-match plans plus fun, flattering on-court answers that are safe to show anyone.
export const PUBLIC_CARD_IDS = ["after", "deuce", "talk", "side", "shot", "weapon", "tiebreak", "comeback", "voice"] as const;

export type PersonalityCard = { id: string; option: number; shared: boolean };
type Row = { question: string; answer: string };

function index(rows: Row[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const q = CURATED_QUESTIONS.find((c) => c.q.en === r.question);
    if (!q || m.has(q.id)) continue;
    const i = q.options.findIndex((o) => o.en === r.answer);
    if (i >= 0) m.set(q.id, i);
  }
  return m;
}

// Every other answer (drinks, lunches, timing, temper…) appears only when
// the viewer picked the exact same option, so nothing private is revealed.
export function buildPersonalityCards(theirs: Row[], mine: Row[]): PersonalityCard[] {
  const t = index(theirs);
  const me = index(mine);
  const pub: PersonalityCard[] = [];
  for (const id of PUBLIC_CARD_IDS) {
    const opt = t.get(id);
    if (opt != null) pub.push({ id, option: opt, shared: me.get(id) === opt });
  }
  const shared: PersonalityCard[] = [];
  for (const [id, opt] of t) {
    if ((PUBLIC_CARD_IDS as readonly string[]).includes(id)) continue;
    if (me.get(id) === opt) shared.push({ id, option: opt, shared: true });
  }
  return [...pub.slice(0, 3), ...shared.slice(0, 2)];
}

type L = { en: string; es: string; fr: string };
export type Complement = { key: string; text: L };

// Pairings where two different answers make a stronger team. Only questions
// whose answers are already public are used, so nothing private is inferred.
const COMPLEMENTS: Array<{ id: string; a: number; b: number; key: string; text: L }> = [
  { id: "side", a: 0, b: 1, key: "side-lr", text: { en: "Left and right — a natural pairing", es: "Revés y drive — la pareja natural", fr: "Gauche et droite — la paire naturelle" } },
  { id: "side", a: 2, b: 0, key: "side-adapt", text: { en: "One holds the left, the other adapts", es: "Uno se queda el revés, el otro se adapta", fr: "L'un tient la gauche, l'autre s'adapte" } },
  { id: "side", a: 2, b: 1, key: "side-adapt", text: { en: "One holds the right, the other adapts", es: "Uno se queda el drive, el otro se adapta", fr: "L'un tient la droite, l'autre s'adapte" } },
  { id: "talk", a: 0, b: 2, key: "talk-calm", text: { en: "One calls the play, one keeps the calm", es: "Uno dirige el juego, el otro pone la calma", fr: "L'un dirige le jeu, l'autre garde son calme" } },
  { id: "talk", a: 1, b: 2, key: "talk-energy", text: { en: "Encouragement meets quiet focus", es: "Ánimo y concentración, en equilibrio", fr: "L'encouragement rencontre la concentration" } },
  { id: "shot", a: 0, b: 2, key: "shot-build", text: { en: "Patience builds the point, power finishes it", es: "La paciencia construye el punto, la potencia lo cierra", fr: "La patience construit le point, la puissance le conclut" } },
  { id: "shot", a: 1, b: 0, key: "shot-overhead", text: { en: "Control overhead, with a finisher alongside", es: "Control por arriba, con un rematador al lado", fr: "Du contrôle au-dessus, un finisseur à côté" } },
  { id: "weapon", a: 0, b: 1, key: "weapon-net", text: { en: "Quick hands at the net, a steady wall behind", es: "Manos rápidas en la red y una pared detrás", fr: "Des mains vives au filet, un mur solide derrière" } },
  { id: "weapon", a: 1, b: 2, key: "weapon-finish", text: { en: "Consistency sets it up, power puts it away", es: "La constancia prepara, la potencia remata", fr: "La régularité prépare, la puissance conclut" } },
  { id: "weapon", a: 0, b: 2, key: "weapon-attack", text: { en: "Net reflexes paired with a big finish", es: "Reflejos en la red y un remate potente", fr: "Réflexes au filet et une grosse finition" } },
  { id: "deuce", a: 0, b: 1, key: "deuce-balance", text: { en: "Daring balanced by patience on the big points", es: "Atrevimiento y paciencia en los puntos clave", fr: "L'audace équilibrée par la patience sur les points clés" } },
  { id: "tiebreak", a: 0, b: 2, key: "tiebreak-light", text: { en: "Focus and a lighter touch under pressure", es: "Concentración y humor bajo presión", fr: "Concentration et légèreté sous pression" } },
  { id: "comeback", a: 0, b: 1, key: "comeback-plan", text: { en: "Fight and fresh ideas when behind", es: "Garra e ideas nuevas cuando vais perdiendo", fr: "Combativité et idées neuves quand ça tourne mal" } },
];

/** Up to two ways the pair's different public answers strengthen each other. */
export function buildComplements(theirs: Row[], mine: Row[]): Complement[] {
  const t = index(theirs);
  const me = index(mine);
  const out: Complement[] = [];
  for (const c of COMPLEMENTS) {
    const x = t.get(c.id);
    const y = me.get(c.id);
    if (x == null || y == null || x === y) continue;
    const hit = (x === c.a && y === c.b) || (x === c.b && y === c.a);
    if (hit && !out.some((o) => o.key === c.key)) out.push({ key: c.key, text: c.text });
    if (out.length === 2) break;
  }
  return out;
}
