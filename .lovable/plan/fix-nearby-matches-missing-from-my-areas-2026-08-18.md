# Fix nearby matches missing from “My areas”

Update the area matching so related locations within the same configured city group are recognized, instead of relying only on literal words stored on the match.

## Confirmed issue

- Nadine Maria has **Spain → Madrid → La Moraleja** saved.
- The missing full match is stored as **Alcobendas**, at **Paseo de Los Parques 6**.
- The current filter searches the match’s city, address, and club name for “Madrid” or “La Moraleja.” None contain those words, so the match is excluded even though Alcobendas belongs to the configured Madrid area group.
- Full matches are already included; fullness is not the cause.

## Change

- Add shared location-group matching that understands the existing country → city → area hierarchy.
- When “My areas” is active, expand a saved Madrid area such as La Moraleja to recognize sibling municipalities in the same configured Madrid group, including Alcobendas.
- Keep “All matches” unchanged.
- Preserve the existing behavior that always shows matches the user hosts, joins, or is invited to.

## Validation

- Verify Nadine’s “My areas” feed includes the full Alcobendas match.
- Verify an unrelated city, such as Barcelona, remains hidden until “All matches” is selected.
- Verify open and full matches follow the same area logic.

## Technical details

- Move location-expansion logic into a client-safe imported helper so `match-events.functions.ts` remains a thin server-function module.
- Reuse `LOCATION_DATA` as the source of truth rather than adding one-off Madrid aliases.
- No database or policy changes are needed.
