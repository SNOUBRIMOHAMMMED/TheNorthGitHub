# Life OS

A local-first personal operating system using HTML, CSS and JavaScript, with Focus, Time Tracking, Pomodoro and Arabic RTL / English LTR support.

## Install dependencies

Recommended: Node.js 24.x (tested with 24.15.0), with bundled npm. The package supports Node.js 20 or newer. Open a terminal in this folder and run:

```sh
npm ci
```

There are no external dependencies. The lock file records this package structure.

## Environment configuration

No API keys, secrets or required environment variables are needed. PORT is optional and defaults to 4173. Copy .env.example to .env if desired, set PORT, and use:

```sh
node --env-file=.env scripts/serve.cjs
```

npm start reads shell variables but does not automatically load .env. Real environment files must not be committed.

## Start locally

```sh
npm start
```

Open http://127.0.0.1:4173. Create a local account or use an account already stored at this exact browser origin. Stop with Ctrl+C.

## Production build

```sh
npm run build
```

This validates the source and copies all production assets to dist/. Deploy the contents of dist/ to a static HTTPS host for PWA support. No backend deployment is required. The included server is intended for local development. Generated build output is intentionally excluded from this export.

## Verification

```sh
npm run lint
npm test
npm run build
```

Checks cover JavaScript syntax, HTML IDs, required assets, manifest validity and Node built-in tests. No TypeScript compilation is used.

## Database setup and data

No database installation or SQL migrations are needed. Browser localStorage stores accounts and application data under lifeos_v11_accounts and lifeos_v11_session. core.js applies additive schemaVersion 4 upgrades while retaining legacy fields.

Local accounts are not server-backed authentication. Data is not encrypted or synchronized across devices. Existing browser data is not included in this source export. Use the application's export/import feature to transfer it. Changing protocol, hostname, port or browser changes the storage origin. Do not upload personal data backups.

## Structure

- app.js, index.html, styles.css: original application and retained features.
- core.js: data model, storage, migrations, timer states and reports.
- workspace.js: workspace pages, forms, search and autosave.
- executive.css: design tokens, themes, responsive styles and RTL.
- sw.js, manifest.webmanifest, icon-*.png: offline/PWA assets.
- scripts/: local server, validation and production build.
- tests/: timer, data and legacy compatibility tests with fictional fixtures.
- README.ar.md: original Arabic documentation and architecture limitations.
- QA.md: application QA notes.

Timer durations use timestamps and survive refresh. System clock changes can affect timing. Notifications cannot wake a sleeping computer. Attachments are subject to browser storage limits. There is no cloud sync, external calendar integration or collaboration backend.
