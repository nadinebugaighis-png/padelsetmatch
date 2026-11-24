# Routes

- Show other players' saved photos through photoSrc() (src/lib/photo-src.ts) at the smallest fitting width, never the raw photo_url; some originals are 15 MB+ and load slowly. Own-photo and admin moderation views may stay raw.
- /api/public/photo keeps each resized size in the private photo-thumbs bucket (keys from src/lib/photo-thumbs.ts, owner folder first) and runs the eligibility check on every request before returning it; photo cleanup and account deletion must remove those copies too. Resizing large originals on every visit took 1-2 s per photo.
