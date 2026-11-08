# From 8 YouTube videos to 3 questions: redesigning IRD e-Services

**Live prototype:** <your-vercel-url> (demo login: TIN `123456789`, PIN `2026`) · **Code:** <your-github-url>

## The problem

The challenge links to **eservices.ird.gov.lk**, the portal where Sri Lankans log in, get a TIN or PIN, and look up their payment details. Someone comfortable with technology still needed 8 YouTube videos to pay personal income tax.

The portal is built around IRD's internal systems, not around what people are trying to do. Everyone who arrives has the same four questions, and the portal answers none of them:

1. **Do I even need to pay?**
2. **How much, and when?**
3. **What exactly do I type in my bank app?**
4. **What do these words mean?**

## Audit of the live portal (8 Nov 2026)

I went through every public page and its HTML, so the option lists below are the real ones. Screenshots are in the prototype's *Before vs after* page.

| Where | Problem | UX principle broken |
|---|---|---|
| Landing | You pick 1 of 5 “Logging in for/to” options before you can log in. Half the page is an empty panel | Hick's law: needless choice |
| Login | “My tax reference number” with a TIN dropdown. The same number is called “TIN” and “Reference No.” elsewhere | Consistency |
| Login | Distorted image captcha with no audio option | Accessibility |
| Login | A red “Chrome or Edge only” paragraph that reads like an error | Error-message design |
| Login | **Reset** sits next to Login, so one wrong tap clears the form | Error prevention |
| Login | “Forgot My IRD PIN?” link goes nowhere (`javascript:void`) | User control: a dead end |
| Every page | Not responsive. On a phone the form and Login button are cut off | Mobile access |
| View Payment Voucher Number | 4 required dropdowns. Tax type is 18 bare acronyms. Personal income tax is **IIT (05)**, but PIT and PAYE look just as likely. Abolished taxes (ESC, NBT) are still listed | Recognition over recall |
| TIN registration | ALL-CAPS purpose list (“TAX PURPOSE”), no progress indicator, and the PIN is a separate request | Visibility of system status |
| PIN request | The 7-working-day limit and the email-must-match rule are buried in a paragraph | Error prevention |
| Help | The step-by-step guides are PDFs on a different website (ird.gov.lk). Its due-dates page still lists 2024 | Match with the real world |
| Footer | © 2014 | Trust |

## The redesign

**1. A front door built around tasks.** Login is one TIN + PIN form, with Show PIN and a working “Forgot your PIN?”. Business, tax-agent, staff and stamp-duty logins are one link away. Next to the form, the portal's “Other eServices” become clear task cards that need no login: *Do I need to pay?*, *Pay tax*, *Get a TIN*, *Get or reset your PIN*, *Verify a certificate*.

**2. One feature per question.**

| Question | Answer in the prototype |
|---|---|
| Do I need to pay? | **Quick check**: 3 questions (income type, rough monthly amount, TIN or not) and an instant answer. Example: *“You're covered. Your employer's APIT of about Rs 18,500/month is your tax.”* |
| How much, and when? | **Personal plan**: each instalment's amount and due date. The next one is highlighted and missed ones are flagged. Export it to your calendar or WhatsApp. |
| What do I type? | **“What to type in your bank app”**: a phone-style screen with every field in order: TIN, tax type **IIT · 05**, payment type, a generated period code, and the amount. Each field copies with one tap and has a one-line explanation. You can print it for the bank counter or send it to WhatsApp. |
| What does this mean? | Plain words first. Remaining terms (APIT, Y/A, DIN…) have tap-to-explain tooltips, and there's a glossary. |

**3. After login: calm and in control.** The dashboard shows a “You're on track” progress ring for the year and the next instalment with a one-tap Pay button (every field already filled in). It also has a return-status tracker that works like parcel tracking, and plain-language messages from IRD. After paying, an animated receipt says *“Payment received. You don't need to do anything else.”* and offers a reminder for the next instalment.

**4. Getting a TIN without the pain.** 4 steps with progress and autosave. The reasons are written as everyday situations (“A bank asked for my TIN”). Your date of birth is read automatically from your NIC number, and the PIN arrives with the TIN.

**5. Built for everyone.** Sinhala, Tamil and English switch (login and menus translated in this concept). No image captcha. Works on any browser and on phones. 44px touch targets. Keyboard and screen-reader friendly. AA colour contrast. Reduced motion respected.

## UX principles applied

Task-first information architecture · Hick's law · Recognition over recall · Error prevention · Visibility of system status · Consistency and plain language · Progressive disclosure · Accessibility (toward WCAG 2.2 AA) · Emotional design (reassurance and a clear “done” moment)

## Next steps

- **Test with real people.** Time 5 non-technical taxpayers doing “pay my next instalment” on the current portal and on this concept.
- **Full Sinhala and Tamil content**, reviewed by native speakers.
- **Connect to real data.** A logged-in user's TIN, instalments and payments would come from RAMIS instead of the demo account.

*Concept only. Not affiliated with IRD. Tax rates and codes must be checked against official IRD publications.*
