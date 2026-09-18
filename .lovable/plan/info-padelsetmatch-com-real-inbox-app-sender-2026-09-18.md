# info@padelsetmatch.com — real inbox + app sender

## Goal
Create a working mailbox **info@padelsetmatch.com** that you can read and reply from, and make the app's emails (sign-ups, password resets, match notifications) appear to come from it.

## Recommended provider: Zoho Mail (free plan)
- **Cost: free** forever for one custom domain (up to 5 mailboxes).
- Web access + Zoho Mail app on iPhone/iPad — fine for an info@ support inbox.
- If you'd rather have it inside the Apple Mail app, iCloud+ (€0.99/month) is the alternative — say so and I'll switch the plan.
- This does **not** conflict with your app's email sending: your app sends from the `notify.padelsetmatch.com` subdomain (managed by Lovable), while the mailbox uses MX records on the root domain `padelsetmatch.com`. Different subdomains coexist fine.

## Steps — your part (email hosting, ~20 min)
1. Sign up at **zoho.com/mail** → choose the **Forever Free** plan → "Add your existing domain" → enter `padelsetmatch.com`.
2. Create the mailbox **info@padelsetmatch.com** (you can add aliases like support@ or hello@ later for free).
3. Zoho shows a few DNS records (TXT for verification, MX, SPF, DKIM). Add them where you bought the domain (your registrar's DNS settings). I'll walk you through each record when you get there — paste what Zoho shows you and I'll confirm them.
4. Verify the domain in Zoho and send yourself a test email to confirm the inbox works.

## Steps — my part (app sender address)
1. Once info@ exists, update the app's email templates so the "From" shows **info@padelsetmatch.com** with the PadelSetMatch name (currently it sends from the notify subdomain).
2. Send a test email and confirm it delivers correctly.
3. If sending from the root-domain address is rejected by receiving servers (SPF), the fallback is to keep the current sender and set **Reply-To: info@padelsetmatch.com** — replies still land in your new inbox.

## What this does NOT affect
- **No new iOS build needed** — this is all backend/website side.
- Apple review submission is unaffected; you can keep testing Build 15 and recording videos meanwhile.
- Publishing the earlier email-system update stays a separate, irreversible step you control — this plan doesn't publish anything by itself.
