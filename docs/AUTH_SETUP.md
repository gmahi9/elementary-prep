# Sign-in setup

Sunny Steps saves scores for a signed-in student. Anyone can practice without an account. Guest scores, streaks, the mistake queue, badges, and mock-test results stay in memory for that visit. They are not written to localStorage or IndexedDB, and older guest progress keys are cleared when the page loads. Sound, reduced motion, and read-aloud preferences may stay in localStorage. If a guest signs in during a visit, that visit is saved to the account. Sign-in uses OAuth 2.0 authorization code with PKCE. Cloudflare Pages Functions under `/api/auth/*` set an HttpOnly, Secure, SameSite=Lax session cookie signed with `SESSION_SECRET`. Scores are stored in a D1 database bound as `DB`.

The production callbacks are:

- `https://elementary.aiteksolutions.net/api/auth/google/callback`
- `https://elementary.aiteksolutions.net/api/auth/microsoft/callback`
- `https://elementary.aiteksolutions.net/api/auth/github/callback`

A provider with a blank client id or secret is hidden. If `SESSION_SECRET` is missing or shorter than 16 characters, every provider is hidden.

Only the provider user id, the display name, and the scores are stored. The score record holds per-section and per-skill counts, mock-test history, streaks, and badges.

## 1. Create the Pages project

1. In the Cloudflare dashboard, create a Pages project named `elementary-prep`.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Add the custom domain `elementary.aiteksolutions.net`.

`wrangler.toml` already sets the compatibility date and the D1 binding. Replace the placeholder `database_id` after the database exists.

## 2. Create the D1 database

From this repository:

```bash
npx wrangler login
npx wrangler d1 create elementary-prep
```

Copy the printed `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "elementary-prep"
database_id = "paste-the-id-here"
migrations_dir = "migrations"
```

Apply the schema:

```bash
npx wrangler d1 migrations apply elementary-prep --remote
```

That creates `users`, `progress`, `rate_limits`, and, from `migrations/0002_questions.sql`, the `questions` table. Load questions with `npm run seed:sql` and `npx wrangler d1 execute elementary-prep --remote --file=seeds/out/questions.sql`. See the README for the full workflow.

## 3. Google

1. Open [Google Cloud credentials](https://console.cloud.google.com/apis/credentials).
2. Configure the OAuth consent screen as an external app. Add the scopes `openid` and `profile` (no extra scopes).
3. Create an OAuth client ID of type **Web application**.
4. Authorized redirect URI: `https://elementary.aiteksolutions.net/api/auth/google/callback`.
5. Copy the client ID and client secret. You will paste them when Pages asks for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 4. Microsoft

1. Open [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Choose **New registration**.
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
4. Redirect URI platform **Web**: `https://elementary.aiteksolutions.net/api/auth/microsoft/callback`.
5. After the app exists, open **API permissions** and add the delegated Microsoft Graph permissions `openid` and `profile` if they are not already listed. Grant admin consent only if your tenant requires it.
6. Open **Certificates & secrets**, create a client secret, and copy the value immediately.
7. Copy the Application (client) ID. Those become `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`.

## 5. GitHub

1. Open [GitHub Developer Settings](https://github.com/settings/developers) and choose **OAuth Apps**, then **New OAuth App**.
2. Homepage URL: `https://elementary.aiteksolutions.net/`.
3. Authorization callback URL: `https://elementary.aiteksolutions.net/api/auth/github/callback`.
4. Register the app, copy the client ID, and generate a client secret.
5. Those become `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

## 6. Pages secrets

Create a long random value for the session key. Do not commit it.

```bash
openssl rand -base64 32
```

Set each secret from a prompt so the value is not stored in your shell history. Run these in the repository and paste when asked:

```bash
npx wrangler pages secret put SESSION_SECRET --project-name elementary-prep
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name elementary-prep
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name elementary-prep
npx wrangler pages secret put MICROSOFT_CLIENT_ID --project-name elementary-prep
npx wrangler pages secret put MICROSOFT_CLIENT_SECRET --project-name elementary-prep
npx wrangler pages secret put GITHUB_CLIENT_ID --project-name elementary-prep
npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name elementary-prep
```

Leave out a provider pair to hide that button.

## 7. Try it locally

```bash
npm run build
cp .dev.vars.example .dev.vars
```

Fill `.dev.vars` with the same names. `.dev.vars` is gitignored. Then:

```bash
npx wrangler pages dev dist
```

Wrangler serves the functions and D1 locally, usually at `http://localhost:8788`. Add that origin's callback (`http://localhost:8788/api/auth/<provider>/callback`) on each OAuth app only if you need a local round trip. The production callbacks above stay required for `elementary.aiteksolutions.net`.

The session cookie is `__Host-elementary_session`. It is HttpOnly, Secure, and SameSite=Lax. Browsers accept that Secure cookie on localhost.

## What the API checks

- `/api/auth/<provider>/start` stores a signed state and PKCE verifier in a short-lived cookie, then redirects to the provider.
- The callback rejects a missing or mismatched state, then exchanges the code with the verifier.
- `PUT /api/progress` saves the signed-in student’s scores. `POST /api/progress` (`{ "action": "merge", "local": { ... } }`) folds the current visit into scores already saved for that account. Both require the session cookie, a same-origin `Origin`, and the header `X-Elementary-Request: 1`.
- Bodies are size-limited and checked against the score shape. Counts, skill ids, question ids, and mock-test rows outside the allowed ranges are rejected.
- Auth starts and score writes are rate limited per IP or account for 10 minutes.
- The content security policy in `public/_headers` keeps scripts, styles, fonts, and connections on this origin. `form-action` is `'self'`.
