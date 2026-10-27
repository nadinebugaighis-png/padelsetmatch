<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep `resources/icon.png` and the iOS AppIcon asset identical opaque, full-bleed 1024px squares; iOS applies the corner mask, and generator padding must not reintroduce an outer frame.
- Native iOS push and web push share push_outbox; service-role-only claim_pending_push_delivery leases rows and the server delivery helper acknowledges completed sends. Server-function completion schedules request-deduplicated draining through the hosting runtime's request.waitUntil, never awaiting delivery before responding, so recipients need not keep the app open and app actions are not delayed.
- iOS restores and mirrors only the production-origin auth storage key through Keychain in PersistentBridgeViewController before page scripts start; generated auth clients remain untouched and explicit sign-out clears the native copy.
- Native launches at the public home resume saved sessions through /app after hydration; hide the welcome page before native first paint and keep sign-in controls hidden until session resolution, while retaining the web landing and existing access gate.
- Keep the public deletion page accessible without signing in; link to existing authenticated deletion controls and privacy-request channels rather than duplicating destructive logic, so store visitors can find deletion steps safely.
