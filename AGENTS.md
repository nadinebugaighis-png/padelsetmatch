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
- Native iOS push rides the existing push_outbox pipeline: `claim_push_outbox` returns each item's web `subs` plus native `devices` from `public.device_tokens`, and `drainPushOutbox` sends both (web via `src/lib/push.server.ts`, APNs via `src/lib/apns.server.ts`). One pipeline keeps notification prefs and draining identical across platforms.
