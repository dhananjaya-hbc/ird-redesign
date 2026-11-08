# IRD e-Services: UX redesign concept

A working redesign of Sri Lanka's IRD e-Services portal ([eservices.ird.gov.lk](https://eservices.ird.gov.lk/Authentication/LoginPersonal)), focused on the journey that took the challenge author 8 YouTube videos: paying personal income tax. See [CASE_STUDY.md](CASE_STUDY.md) for the audit and the design rationale.

**Not the official IRD website.** All figures are estimates, and the account is a demo.

## Try it

Open `index.html`. The demo login is TIN `123456789`, PIN `2026`.

| Screen | Route |
|---|---|
| Front door: login + services that need no login | `#login` (default) |
| Do I need to pay? (3 questions → personal plan) | `#check` |
| Pay tax: every bank field filled in | `#pay` |
| Get a TIN (4 steps, autosave, reads DOB from NIC) | `#register` |
| Get or reset your PIN | `#forgot` |
| Verify a certificate | `#verify` |
| Dashboard → pay → receipt (after login) | `#dashboard`, `#paid` |
| Before vs after, with real screenshots and UX principles | `#compare` |
| Help centre, estimator, due dates, glossary | `#help`, `#estimate`, `#deadlines`, `#glossary` |

## Run locally

Plain HTML, CSS and JS with no build step:

```sh
npx serve .
```

## Files

- `index.html`: every screen, plus the SVG icon set
- `styles.css`: design tokens and components
- `app.js`: routing, tax logic, the quick check, the payment flow, the Sinhala/Tamil switch
- `portal.js`: login, PIN, TIN registration, verify, dashboard, receipt (demo account in `sessionStorage`)
- `assets/`: screenshots of the current portal (captured 8 Nov 2026) and the social preview image

## Deploy

```sh
npx vercel --prod
```

Live at https://ird-redesign.vercel.app. Every push to `main` redeploys automatically. If the URL changes, update `og:image` and `og:url` in `index.html` to match.

## Check before publishing

- `TAX_TABLES` in `app.js`: personal relief and rate slabs for 2023/24–2024/25 and for 2025/26 onwards
- `finalPayDue`: final balance due date, taken as 30 Sep after the Y/A ends (6 months after year end)
- Period code format: `YYyy` + quarter (`1`–`4`), or `0` for the final payment (IRD's example: `23240`)
- Sinhala and Tamil text in `I18N` (`app.js`): have a native speaker review it
