/**
 * The AI "club story" line on the player card must always end on a whole
 * sentence. Older reads were hard-cut at 140 characters mid-word, so this also
 * repairs those saved lines by stepping back to the last full sentence or clause.
 * Long dashes are never shown in the app, so they become commas.
 */
const OLD_CUT = 140;
const MIN_KEEP = 40;

export function tidyHeadline(raw: string, max = 220): string {
  const text = raw.replace(/\s*\u2014\s*/g, ", ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const endsClean = /[.!?…]["')\]]?$/.test(text);
  const looksCut = text.length > max || (!endsClean && text.length >= OLD_CUT - 5);
  if (!looksCut) return endsClean ? text : `${text}.`;

  const head = text.slice(0, max);
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (sentenceEnd >= MIN_KEEP) return head.slice(0, sentenceEnd + 1);
  if (/[.!?]$/.test(head)) return head;

  const clause = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf(":"));
  if (clause >= MIN_KEEP) return `${head.slice(0, clause).trimEnd()}.`;

  const space = head.lastIndexOf(" ");
  return `${(space >= MIN_KEEP ? head.slice(0, space) : head).replace(/[,;:\s]+$/, "")}.`;
}
