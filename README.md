# IndiaAssist Admin Dashboard

A small web app (runs in a browser, not on your phone) for managing the
services and journeys shown in the IndiaAssist AI mobile app. It talks to
the **same Firebase project**, so anything you add/edit/delete here shows
up in the mobile app immediately.

## What it actually does

- Lists every service with a **"Needs review" flag** for anything whose
  `lastUpdated` date is more than 90 days old -- this is just a reminder
  heuristic, not a claim that the content is wrong.
- Full add / edit / delete for services and journeys, through a form
  instead of hand-editing code or Firestore's console directly.
- Saving a service automatically stamps today's date as `lastUpdated`,
  which resets its review clock.

## What it does NOT do (on purpose)

It does **not** automatically rewrite service content from live government
sources. Building that reliably would mean an AI verifying facts against
official sites with no human check -- risky, since a wrong "update" is
worse than a stale-but-correct entry. The realistic, safe workflow is:

1. Every 2-3 weeks, open the dashboard and check the "Needs review" list.
2. For anything worth double-checking, ask Claude (in a chat) to verify
   current details -- fees, portal names, rules -- with web search.
3. Paste the corrected info into the edit form here and save.

This keeps a human (you, with Claude's research) in the loop for every
factual change, rather than letting anything auto-publish unverified.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the **same Firebase project values** your mobile app
uses (find them in `indiaassist-ai/.env` -- just drop the `EXPO_PUBLIC_`
prefix and use `VITE_` instead). Also add your own email to
`VITE_ADMIN_EMAILS` -- only listed emails can sign in, even with valid
Firebase credentials.

```bash
npm run dev
```

Open the printed localhost URL, sign in with the same email/password you
use in the mobile app's Login screen.

## Adding a new department/category

There's no separate "manage categories" screen -- categories are just
whatever you type in a service's **Category** field. Add a service with a
new category name (e.g. "Consumer Rights") and it appears as a new
department on the mobile app's Services screen automatically, no code
changes needed. This is the same design used throughout the mobile app.

## Fees / FAQs / State Overrides fields

These three fields take raw JSON since their shape is more than a flat
list. Examples:

**Fees:**
```json
{ "application": "₹500", "lateFee": "₹50 per month" }
```

**FAQs:**
```json
[
  { "q": "Question here?", "a": "Answer here." },
  { "q": "Another question?", "a": "Another answer." }
]
```

**State Overrides** (optional -- only needed if a service's fee/process
genuinely differs by state, like property registration):
```json
{
  "Karnataka": {
    "fees": { "application": "₹25" },
    "officialLinks": ["https://kaverionline.karnataka.gov.in"]
  }
}
```
Any field you include here overrides the generic value *only* when a user
has selected that state in the mobile app's state filter; anything you
don't include falls back to the main fields.

If the form shows a red error when saving, it's almost always invalid
JSON in one of these three fields -- check for a missing comma or quote.

## Security note

This dashboard writes directly to the same Firestore your mobile app
reads from, using the admin email allowlist as the only gate. Firestore's
own security rules (Firebase Console → Firestore → Rules) are what
actually enforce this at the database level -- if you haven't already,
make sure they require `request.auth != null` for writes to the
`services` and `journeys` collections, so a random signed-out visitor to
this dashboard's URL can't write anything even if they found it.

## Running this long-term

You don't need to deploy this anywhere -- running `npm run dev` locally
whenever you want to do a review pass is enough. If you'd rather have a
permanent URL you can open from any device, it can be deployed as a
static site (e.g. Vercel, Netlify, Firebase Hosting) with `npm run build`
producing a `dist/` folder -- ask if you want help setting that up later.
