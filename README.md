# THE NORTH / الشمال

Complete application source with the final bridge landing page. The existing vanilla HTML/CSS/JavaScript application, timers, workspace and Supabase adapters are preserved. No framework migration is required.

## Run locally

Use **Node.js 24.x** and its bundled npm. Open a terminal in this folder, beside `package.json`:

```sh
npm ci
npm start
```

Open http://127.0.0.1:4173/ . Use the HTTP server rather than opening `index.html` as a file. There are no npm runtime dependencies; the Supabase browser library is loaded from jsDelivr and account operations require internet access.

To use another port in Windows PowerShell:

```powershell
$env:PORT = '4202'
npm start
```

## Configuration

No private environment variables are needed by this static frontend. `.env.example` lists the optional local server variable, `PORT`. The server reads the process environment; it does not automatically load `.env` files.

The existing Supabase project URL and **publishable** client key are in `auth.js`. They are public browser configuration, not a service-role secret. To connect a different project, replace those public values there. Never put a database password, service-role key or private API key in frontend files.

## Database

For an already working Supabase project, keep its data and configuration. This landing-page release requires no live database migration.

For a **new empty** Supabase project only, follow `SUPABASE-SETUP.md` and run `supabase-setup.sql`. It creates the versioned `user_sessions` workspace table, own-user row-level security and revision validation. The bootstrap file is deliberately not a destructive reset and is not intended to be rerun on an existing table.

## Check and build

```sh
npm run lint
npm test
npm run build
```

The production site is generated in **`dist/`**. Upload or serve the contents of `dist/` on a static host. The build runs syntax/asset checks and copies the application and its images without transpilation. No TypeScript compilation is needed.

## Manual GitHub upload and Vercel

1. Extract the ZIP, then open the `TheNorth-Final` folder.
2. Upload **the contents of this folder** to the repository root. Keep `scripts/` and `assets/` as folders; do not flatten their contents.
3. Confirm the repository contains `scripts/build.cjs`, `scripts/check.cjs`, `scripts/serve.cjs` and the four images inside `assets/`.
4. Keep `package.json` and `vercel.json` in the same repository root as `index.html`.
5. In Vercel use Node.js **24.x**, framework preset **Other**, build command **`npm run build`**, output directory **`dist`**. Remove any old project-setting override that says `public`.

`vercel.json` already declares the correct build command and output directory. Do not upload `.git`, `node_modules`, `.env`, caches or build artifacts to GitHub. The ZIP omits them. Nothing has been pushed or deployed automatically.

## File map

- `index.html`: public landing, account screens and application shell.
- `app.js`: existing navigation, translations and account UI.
- `workspace.js`, `core.js`: workspace features, data model and timer calculations.
- `auth.js`, `cloud-sync.js`: Supabase authentication and versioned cloud synchronization.
- `north-brand.css`: final landing layout, responsive rules and shared visual refinements.
- `landing-motion.js`: scroll depth, section reveals and feature selection; respects reduced motion.
- `styles.css`, `executive.css`, `landing.css`, `north-2026.css`: existing styles, retained in their original loading order.
- `assets/`: approved bridge hero, mountain footer and two supporting editorial images.
- `scripts/`: server, checks, production build and automated tests.
- `sw.js`: application shell caching; new landing resources included.

## Validation and limits

See `design-qa.md` for desktop/mobile design and interaction verification. Automated tests exercise timer, budget, legacy, authentication and cloud-sync logic; authentication/database tests use mocks. Real email delivery, live row-level security, cross-device sync and a deployed Vercel build were not tested in this release. Active timers remain on their originating browser; completed sessions can sync. Landing examples are explicitly labelled as illustrative data.

The export excludes duplicate obsolete root build scripts, accidental runtime copies inside `scripts/`, development fixtures, unused image variants and historical draft documentation. The original working project was not modified.
