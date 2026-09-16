# Email update: move sending to Lovable's managed service

Your app currently sends its sign-up, password reset, magic link and email-change messages through an in-app queue that stores each message in your database and sends it on a schedule. The update sends them directly through Lovable's managed email service instead, which handles delivery, retries, rate limits, bounces and unsubscribes for you.

Nothing about your iPhone/iPad app changes, so no new App Store build is needed.

## What changes

- The sign-up / reset / magic link / email-change / invite / verification-code emails send immediately instead of waiting in a queue.
- The old queueing and scheduling machinery is removed from the project.
- Your brand name ("PadelSetMatch") and your existing email wording stay as they are.
- Your existing email history tables stay untouched — no data is deleted.

Your app keeps working exactly as today until you publish. Publishing completes the update, and it cannot be undone afterwards.

## Technical details

1. Auth email hook re-rendered for managed sending (`src/routes/lovable/email/auth/webhook.ts`, `preview.ts`, and the six templates in `src/lib/email-templates/`). Already regenerated this turn; `SITE_NAME` must be restored from the scaffold default `Matchapp` back to `PadelSetMatch` in both routes, and any brand styling re-applied to the templates.
2. Delete the legacy queue route `src/routes/lovable/email/queue/process.ts`.
3. Delete `supabase/migrations/20260715182247_email_infra.sql` (repo only — database tables `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, `email_send_state` are kept).
4. No app-email (transactional) senders exist in this project, and there is no suppression or unsubscribe route, so no send-helper conversion and no email events receiver are required.
5. Verify the build passes. Do not publish.
