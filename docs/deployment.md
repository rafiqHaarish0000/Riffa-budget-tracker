# RIFAA — Vercel Deployment Guide

RIFAA is an Expo Router app with `web.output: "static"`. The production target is the
**web / PWA version deployed on Vercel**, intended for use on iPhone Safari via
"Add to Home Screen". This project uses **no native iOS/Android build** for this
deployment, and no push notifications.

> The live Supabase database is already configured. No migrations are run at deploy time.
> Migration `0001` (push_tokens) is intentionally left unapplied and is **not** relevant here.

---

## 1. Vercel project setup

1. Go to <https://vercel.com/new> and **Import** the existing GitHub repository
   `rafiqHaarish0000/Riffa-budget-tracker`.
2. Vercel will detect the project. The repository already contains a `vercel.json`
   that pins the correct build settings, so you do **not** need to guess in the
   framework-preset UI — accept the defaults that `vercel.json` provides.
3. Add the two environment variables from section 4 **before** the first build.

---

## 2. Build command

Set (this is already in `vercel.json`, but these are the canonical values):

```sh
npx expo export --platform web
```

The production command must **never** be `npx expo start` (that is a dev server).

---

## 3. Output directory

```text
dist
```

This is already set as `outputDirectory` in `vercel.json`.

---

## 4. Required Vercel environment variables

Because Expo inlines `EXPO_PUBLIC_*` at build time, the values must exist **in
Vercel** for the build. Add these two as **Environment Variables** in your Vercel
project (Settings → Environment Variables):

| Name | Value source | Example shape |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | your project URL from the local `.env` | `https://YOUR-PROJECT.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the publishable **anon** key from the local `.env` | the long JWT anon key |

Where exactly to add them:

- **Vercel → your project → Settings → Environment Variables**
- Add each name + value.
- Environments: tick **Production** (required) and **Preview** (recommended; see
  section 5). **Development** is optional for local `vercel dev`.

> Never use a Supabase **service_role** key in the browser. Only the publishable
> **anon** key belongs here. Do not commit these values — they live only in Vercel's
> environment settings (and possibly your local `.env`, which is git-ignored).

---

## 5. Preview vs Production

- **Production** environments: the two variables are **required**.
- **Preview** deployments (PRs / branch previews) also need them, otherwise the
  preview app runs in the "not configured" fallback and won't connect to Supabase.
  Enable **Production** and **Preview** when adding the variables.
- **Development** is only needed if you use the Vercel CLI's `vercel dev` locally.

---

## 6. Deployment steps

1. `vercel.json`, `docs/deployment.md`, and all code are committed and pushed to
   `master` on GitHub.
2. Import the repo into Vercel (step 1), set env vars (section 4).
3. Vercel builds with `npx expo export --platform web`, outputs `dist`, and serves it.
4. Every push to `master` triggers an automatic rebuild + redeploy (Git-based). No
   manual upload of `dist`.

### Re-deploying after a change

Just push to `master`. Vercel runs the build command again and serves the new
`dist`. To force a redeploy without a code change, use
**Vercel → Deployments → Redeploy**.

---

## 7. PWA installation on iPhone

1. Open the deployed RIFAA URL in **Safari** (do not use a third-party browser for
   installing).

   > The web app must be accessed over **HTTPS** (Vercel provides this) for "Add to
   > Home Screen" to work.

2. Tap **Share** → **Add to Home Screen**.
3. Confirm the name **RIFAA** and tap **Add**.
4. Launch RIFAA from the Home Screen icon. It opens **standalone** (no Safari
   chrome), **portrait**, with **safe-area spacing** and correct icons/splash.
5. Offline/launch behavior uses the manifest (`display: standalone`, portrait,
   theme color `#F5F6F4`, `viewport-fit=cover`).

---

## 8. Important security notes

- **Frontend only uses the anon key** (publishable). All data access is enforced
  server-side by **Supabase RLS**. The browser never holds a service-role or
  secret key.
- `.env` is **git-ignored**; only `.env.example` (with placeholders) is committed.
- The Supabase URL and anon key are provided via Vercel env vars and **inlined at
  build time**; they are not hardcoded in source.
- No test users, test families, or fake production data exist in application code.
- If env vars are missing, the app fails **safely** (config/not-configured state)
  rather than fabricating data — it never creates fake auth, families, or expenses.
- Do not add SSR-only database secrets or any server keys to the frontend bundle.