# "Choose your city" welcome screen (marketing only)

## What it is
A short, elegant screen shown when someone new enters the app:

**Choose your city**
- **Madrid · La Moraleja**, the big featured card in deep green and gold, marked "Now playing"
- **London**
- **Dubai**
- **Miami**

It's for marketing, so the app feels made for La Moraleja first. It changes nothing else: everyone keeps full access, the grid and games work the same, and Profile stays as it is.

## What a new player sees
1. They open the app or website and tap **GET STARTED**.
2. They see **Choose your city**, the four cards above, and tap one.
3. They go straight to Create account / Sign in, the same as today.

Whichever city they tap, they continue into the app normally. London, Dubai and Miami cards don't block anyone.

## Your current players
- **Nobody already signed in sees it.** No pop-up and no extra step for your 80 players.
- They go straight to their grid as today.

## "Will it remember me?"
Yes. The phone remembers the choice, so the screen appears once and never again on that phone. Players stay signed in as today.

## Bonus for you (no extra effort for players)
Each tap is counted, so you can see in Admin how many people chose La Moraleja, London, Dubai or Miami. That's useful proof for the club and for deciding the next city.

## "Do I need new App Store / Google Play builds?"
No. A normal **Publish** brings it to phones. You don't need a store review.

## Not included
- No changes to Profile questions.
- No filtering of Alcobendas or Las Tablas players on the grid. The screen is marketing only, as you asked.

---

## Technical details
- New `src/components/CityPicker.tsx`, light/brand tokens and Spanish/English/French copy. It opens from the landing GET STARTED button before navigating to `/auth`.
- The choice is stored in localStorage (`psm_city`) and read in an effect, so there's no hydration mismatch. If a choice is already set, GET STARTED goes straight to `/auth`. Signed-in users skip it entirely.
- Each tap emits analytics event `project.city_chosen` with a fixed key (`madrid_la_moraleja` | `london` | `dubai` | `miami`). Admin shows counts from that event.
- Small vitest test for the city key list and the "already chosen means skip" rule.
