# THE NORTH / الشمال — Automatic cloud workspace

## Run locally
Recommended Node.js: 24.x (also pinned in package.json and .nvmrc).

```sh
npm ci
npm start
```

Use the localhost URL printed by the server.

```sh
npm run lint
npm test
npm run build
```

Production files are generated in dist. Vercel configuration is included: npm run build, output directory dist. Upload the full project contents, including scripts, auth.js and cloud-sync.js. No GitHub push or deployment is performed by this package.

## Accounts and automatic saving
Create account and Sign in now use Supabase email/password authentication directly. Gmail addresses work as email addresses; Google OAuth is not implemented. Confirm the email if requested, then sign in. On another device, sign in to the SAME existing account rather than creating another account. No separate cloud connection or Save button is required.

Previous browser-only accounts must first register with Supabase using the same email to retain their matching local workspace. Existing Supabase users should sign in directly. Different local and cloud copies produce a recovery choice instead of silently replacing data.

Tasks, completed focus sessions, projects, goals, habits, finances, notes, events, learning, health, planning and workspace preferences are synchronized. An active timer remains on its originating device until finished. Local pending edits survive connection failures; wait for the saved indicator before closing or switching devices.

## Configuration and database
The public Supabase URL and publishable browser key are configured in auth.js. No environment variables or server secrets are required. Never place a service-role key in browser code.

The existing user_sessions JSON workspace table and owner-only RLS policies are used. You already reported successfully running supabase-setup.sql: do NOT rerun it for this update. For a new Supabase project only, follow SUPABASE-SETUP.md.

## Validation
Production build and 39 automated tests passed. Local landing and account screens opened without captured console errors. Auth and database tests use mocks; live email confirmation, two-device synchronization and deployed RLS isolation have not been verified with real accounts.
