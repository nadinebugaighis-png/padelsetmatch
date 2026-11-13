// Fixed court-view drawings for players without a photo. Each player always
// gets the same drawing (hash of their id), and the files ship with the app,
// so nothing is generated or downloaded per visit beyond a cached image.
import a from "@/assets/court-views/a.webp";
import b from "@/assets/court-views/b.webp";
import c from "@/assets/court-views/c.webp";
import d from "@/assets/court-views/d.webp";
import e from "@/assets/court-views/e.webp";
import f from "@/assets/court-views/f.webp";
import g from "@/assets/court-views/g.webp";
import i from "@/assets/court-views/i.webp";
import j from "@/assets/court-views/j.webp";
import k from "@/assets/court-views/k.webp";
import l from "@/assets/court-views/l.webp";
import m from "@/assets/court-views/m.webp";
import n from "@/assets/court-views/n.webp";
import p from "@/assets/court-views/p.webp";
import r from "@/assets/court-views/r.webp";
import s from "@/assets/court-views/s.webp";
import t from "@/assets/court-views/t.webp";
import v from "@/assets/court-views/v.webp";

export const COURT_VIEWS: readonly string[] = [a, m, s, j, l, r, c, p, e, n, d, t, b, g, v, f, i, k];

/** Stable index into COURT_VIEWS for a player id (FNV-1a). */
export function courtViewIndex(seed: string, count = COURT_VIEWS.length): number {
  let h = 0x811c9dc5;
  for (let x = 0; x < seed.length; x++) {
    h ^= seed.charCodeAt(x);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % count;
}

export function courtViewFor(seed: string | null | undefined): string {
  return COURT_VIEWS[courtViewIndex(seed || "?")];
}
