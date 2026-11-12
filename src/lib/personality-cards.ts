import { CURATED_QUESTIONS } from "./daily-questions";

// Fun, flattering on-court answers that are safe to show anyone.
export const PUBLIC_CARD_IDS = ["deuce", "talk", "side", "shot", "weapon", "tiebreak", "comeback", "voice"] as const;

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
