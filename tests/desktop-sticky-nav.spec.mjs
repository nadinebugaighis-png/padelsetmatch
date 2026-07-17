/**
 * Desktop sticky-menu scroll test.
 *
 * Verifies that on desktop viewports (>=1024px) the app header:
 *   1. Has computed `position: sticky` with `top: 0`.
 *   2. Stays pinned at the top of the viewport after scrolling.
 *   3. Does not overlap page content (the point just below the header
 *      resolves to a non-header element).
 *
 * Regression guard: an ancestor with `overflow-y: auto` (or bare
 * `overflow-x: hidden` on <body>, which browsers upgrade to a scroll
 * container) silently breaks `position: sticky`. This test catches that.
 *
 * Run against a running dev/preview server:
 *   BASE_URL=http://localhost:8080 node tests/desktop-sticky-nav.spec.mjs
 *
 * Requires an authenticated Supabase session in env
 * (LOVABLE_BROWSER_SUPABASE_*), otherwise /app/grid redirects to /auth
 * and the test skips with a clear message.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
  if (cookiesJson) {
    const cookies = JSON.parse(cookiesJson).map((c) => ({ ...c, url: BASE }));
    await context.addCookies(cookies);
  }
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  if (storageKey && sessionJson) {
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k, v),
      [storageKey, sessionJson],
    );
  }

  await page.goto(`${BASE}/app/grid`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  if (page.url().includes("/auth")) {
    console.log("SKIP: no authenticated session available");
    await browser.close();
    return;
  }

  const header = await page.evaluate(() => {
    const el = document.querySelector(".lg\\:sticky");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { top: r.top, height: r.height, position: cs.position };
  });
  if (!header) throw new Error("sticky header element not found");
  if (header.position !== "sticky") {
    throw new Error(`expected position:sticky, got ${header.position}`);
  }

  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => {
    const el = document.querySelector(".lg\\:sticky");
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, scrollY: window.scrollY };
  });
  if (after.scrollY < 500) throw new Error("page did not scroll");
  if (after.top > 1) {
    throw new Error(`header not pinned after scroll (top=${after.top})`);
  }

  const below = await page.evaluate(() => {
    const el = document.querySelector(".lg\\:sticky");
    const r = el.getBoundingClientRect();
    const y = r.bottom + 2;
    const hit = document.elementFromPoint(200, y);
    return { y, tag: hit?.tagName ?? null, inHeader: el.contains(hit) };
  });
  if (below.inHeader) {
    throw new Error("content overlap: point just below header falls inside header");
  }
  if (!below.tag) {
    throw new Error("no content beneath header at y=" + below.y);
  }

  console.log("PASS: desktop sticky menu stays on top without overlapping content");
  await browser.close();
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
