# Open Graph preview page

A private page at `/og-preview` where you can see exactly how padelsetmatch.com looks when shared — before publishing.

## What the page shows

**1. Card mockups** — the same title, description and image rendered in the three formats that matter:
- WhatsApp / iMessage (small square thumbnail, title, description, domain)
- Facebook / LinkedIn (large 1200x630 banner above the text)
- X / Twitter summary_large_image

**2. Candidate image switcher** — a row of thumbnails for every share image in the project (the current `padel-share-logo.jpg`, plus `padel-share-og`, `padel-og`, `padel-mixed-share`, `padel-whatsapp-share`, and any new luxury design). Click one and all three card mockups update instantly, so you can compare before committing.

**3. Raw tag list** — the actual `og:*` and `twitter:*` values the homepage emits, plus a warning row if the image isn't 1200x630 or the description runs past 160 characters.

## Design

Matches the app's programme aesthetic — cream paper background, forest-green ink, serif headings — with the card mockups rendered on a neutral grey panel so they read like real chat bubbles.

## Technical notes

- New route `src/routes/og-preview.tsx`, marked `noindex` so it never shows in search.
- Reads its data from the same constants the homepage uses in `src/routes/index.tsx`, so the preview can't drift from what's actually shipped.
- Image list comes from the existing `.asset.json` pointers in `src/assets` — no uploads or backend changes.
- Purely a preview surface; picking an image here does not change the live tags. Once you decide, I'll point the homepage metadata at your pick.
