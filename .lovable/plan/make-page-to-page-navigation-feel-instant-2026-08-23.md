# Make page-to-page navigation feel instant

Today each tab in the app (Play, Grid, Matches, Connect, Profile) fetches its data only after you land on the page, and most pages show a full-screen spinner while that happens. The page code itself is also loaded on demand. That combination is what makes switching pages feel slow and "jumpy".

## What will change

1. **Prefetch on touch/hover of the bottom nav**
   Tapping a tab already triggers the route code download; we'll additionally warm the page's data (via the query cache) the moment a finger touches or a cursor hovers a nav item, so the page usually has its data before it renders.

2. **Keep previously loaded pages warm**
   Raise the cache freshness window for tab-level data (grid feed, matches, events, connect) so returning to a tab renders instantly from cache and refreshes quietly in the background instead of blanking out.

3. **No more full-screen spinners between tabs**
   Replace whole-page loading spinners with either the cached content plus a subtle top progress bar, or lightweight skeletons that match the final layout — so the shell (header + bottom nav) never disappears during a switch.

4. **Stable shell + no layout shift**
   Keep the header and bottom nav mounted across tab changes and reserve space for content so the page doesn't jump when data lands. Reset scroll to top on tab change consistently.

5. **Cheaper transitions**
   Remove/soften transition effects that force expensive repaints during navigation on mobile, and keep animations to opacity/transform only.

## Technical notes

- `src/routes/app.tsx`: add `onPointerDown` / `onMouseEnter` handlers on the nav `<Link>`s that call `queryClient.prefetchQuery` for that tab's primary key (`discover`, `my-matches`, `match-events`, `connect-posts`), plus `router.preloadRoute`.
- `src/router.tsx`: keep `defaultPreload: "intent"` but set `defaultPreloadStaleTime` to ~30s so preloads aren't discarded, and raise the global `staleTime`.
- Per-route `useQuery` calls in `app.grid.tsx`, `app.matches.tsx`, `app.events.index.tsx`, `app.connect.tsx`: add `placeholderData: keepPreviousData` and consistent `staleTime` (60s) so cached data paints immediately.
- Swap the blocking `isLoading` spinner blocks in those routes for skeleton blocks / an inline top progress indicator driven by `useRouterState({ select: s => s.isLoading })`.
- Audit the global `transition` rule in `src/styles.css` that applies to every `a`/`button` — scope it so it doesn't fire on mount of large lists.

No backend, data-model, or business-logic changes.
