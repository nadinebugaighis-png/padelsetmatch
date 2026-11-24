# Routes

- Show other players' saved photos through photoSrc() (src/lib/photo-src.ts) at the smallest fitting width, never the raw photo_url; some originals are 15 MB+ and load slowly. Own-photo and admin moderation views may stay raw.
