# App Store privacy disclosures — PadelSetMatch

Two things Apple needs, both covered here:

1. **Privacy Manifest** — `docs/ios/PrivacyInfo.xcprivacy`
2. **Privacy Nutrition Label** — answers to fill in App Store Connect (below)

Privacy policy URL: `https://padelsetmatch.com/privacy`

---

## 1. Installing the Privacy Manifest

After `npx cap add ios`:

```bash
cp docs/ios/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
```

In Xcode: right-click the **App** group → *Add Files to "App"…* → select
`PrivacyInfo.xcprivacy` → ensure **Target Membership: App** is ticked. Confirm it
appears under *Build Phases → Copy Bundle Resources*.

Keep it in sync whenever new data collection is added.

---

## 2. Nutrition label answers (App Store Connect → App Privacy)

**Do you or your third-party partners collect data from this app?** → **Yes**
**Do you use data for tracking (ATT)?** → **No** (no ad networks, no data brokers,
no cross-app/website identifiers)

For every item below: **Linked to the user = Yes**, **Used for tracking = No**.

| Category | Data type | Purposes |
|---|---|---|
| Contact Info | Email Address | App Functionality |
| Contact Info | Name | App Functionality |
| Location | Coarse Location (self-declared city / neighbourhood, not GPS) | App Functionality |
| User Content | Photos or Videos (profile photo) | App Functionality |
| User Content | Other User Content (posts, comments, chat messages) | App Functionality |
| Identifiers | User ID | App Functionality |
| Usage Data | Product Interaction (screen views, feature taps) | Analytics, App Functionality |
| Diagnostics | Crash Data (JS errors, stack traces) | App Functionality |
| Diagnostics | Performance Data (user agent, viewport, timings) | App Functionality |

**Not collected:** precise location, contacts, health, financial info, browsing
history, search history, purchases, sensitive info, advertising data, device ID
(IDFA/IDFV).

### Optional-disclosure note

Analytics and crash reporting can be switched off by the user at
**Profile → Privacy → Share usage & crash data**. When off, nothing is queued or
sent. Apple still requires these types to be declared, but you may tick
*"Users can choose whether this data is collected"* where offered.

---

## 3. What we actually collect (source of truth)

Implemented in `src/lib/telemetry.ts`, stored in `public.app_events`:

- `event` name, `session_id`, timestamp, route/screen path
- error message, error type, and stack trace for crashes and unhandled rejections
- user agent string, viewport size, app version
- `user_id` when signed in (null for guests)

No IDFA/IDFV, no third-party SDKs, no ad networks. Data lives in our own backend
and is used only to keep the app working.

### Data retention / deletion

- Account deletion removes profile, content and telemetry rows tied to the user.
- Deletion is available in-app (Profile → Account) and via `padelsetmatch.com/support`.
