# Luxury link-preview image for padelsetmatch.com

Replace the current share card (`padel-share-logo.jpg`) with a more luxurious design in the style of your uploaded artwork, keeping the "LA MORALEJA / PADEL SOCIETY" subtitle.

## Step 1 — Three design options to choose from

I'll produce three 1200x630 concepts and show them in chat so you can pick:

1. **Your artwork, recropped** — your exact image reframed to 1200x630 with the wordmark, gold rule, crossed rackets and subtitle re-centred so nothing gets cut in WhatsApp/iMessage.
2. **Golden hour terrace** — same club-terrace scene, warmer late-afternoon light, deeper greens, high-contrast cream serif wordmark with a thin gold hairline rule.
3. **Editorial close crop** — tighter framing on the glass court and players, softer background blur, wordmark set lower-left with gold rackets as a small mark above.

All three keep: serif all-caps PADELSETMATCH, wide letterspacing, gold hairline divider, LA MORALEJA / PADEL SOCIETY subtitle in gold-tinted spaced caps.

## Step 2 — Wire the chosen one in

- Upload the picked image as a CDN asset (`src/assets/padel-share-luxe.jpg.asset.json`).
- Point the homepage's `og:image`, `og:image:secure_url` and `twitter:image` in `src/routes/index.tsx` at the new asset, keeping the existing 1200x630 dimension tags and `image/jpeg` type.
- Leave the old asset in place so previously shared links don't break.

## Notes

- WhatsApp, iMessage and LinkedIn cache previews. After the change goes live the old photo may still appear for a while; forcing a refresh needs each platform's link-preview debugger.
- Only the homepage share card changes; other pages keep their current metadata.
