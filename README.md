# SAC Consultancy Website

The Self Apply Center website is a standard Next.js App Router application using React, TypeScript, Tailwind CSS, and the Node.js runtime.

Shared navigation and footer components live in `components/`. Route content is defined in `app/site-data.ts`, while blog articles are maintained through the database-backed admin CMS.

Administrative maintenance commands live in `scripts/`. They are intended for explicit, one-time operational use and are not part of the application runtime.

## Local development

Use Node.js 22.13 or newer within the supported 22.x or 24.x release lines. The project uses npm and the committed `package-lock.json`.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` creates a complete production build, starts the production Next.js server, and checks the public routes and generated HTML.

## Production commands

```bash
npm ci
npm run build
npm run start
```

- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm run start`
- Build output: `.next`
- Default application port: `3000`

The application requires a MySQL or MariaDB database. Copy `.env.example` to `.env` for local development and provide values without committing that file. Prisma CLI commands load `.env`; Next.js also loads it. Keep machine-specific overrides in `.env.local` only when Prisma does not need those values.

## Media Library and Cloudinary

The authenticated Media Library uploads images through signed, server-side Cloudinary API requests. Create a Cloudinary account and product environment, then open **Cloudinary Console → Settings → API Keys** to obtain credentials. Cloudinary documents the credential location in its [developer onboarding guide](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials).

Required server environment variables:

- `CLOUDINARY_CLOUD_NAME` — the Cloudinary product-environment identifier.
- `CLOUDINARY_API_KEY` — the API access key.
- `CLOUDINARY_API_SECRET` — the signing secret; never expose it in browser code or use a `NEXT_PUBLIC_` name.

For local development:

1. Copy `.env.example` to `.env`.
2. Fill in `DATABASE_URL`, `AUTH_SECRET`, and the three Cloudinary values. For local development, `AUTH_URL` can remain empty so Auth.js uses `http://localhost:3000` from the request.
3. Restart `npm run dev` after changing environment variables. Next.js reads them when the server starts.

For Hostinger production, add the same variable names and production values in the Node.js Web App environment-variable settings. Do not upload or commit a populated environment file. After changing a value, use **Deployments → Settings and redeploy**, or restart the Node.js application in hPanel, so the running process receives the new environment.

To verify the upload flow after deployment:

1. Sign in to `/admin` and open **Media**.
2. Upload a small supported image (JPEG, PNG, WebP, GIF, or AVIF).
3. Confirm the image appears in the newest-first grid and its detail page shows `CLOUDINARY` as the provider.
4. Confirm **Copy URL** returns an HTTPS Cloudinary URL.
5. Open the blog editor, choose the uploaded image from the Media Library, and confirm it inserts into Markdown or the cover-image URL field.
6. Upload the same file again and confirm the duplicate is rejected.
7. For a disposable, unreferenced test image, confirm deletion removes it from Cloudinary and then from the Media Library. Do not use a production content image for this check.

Missing Cloudinary configuration produces an administrator-facing configuration error at upload time. Secret values are never included in that message or sent to client components.

## Enquiry backend

The homepage enquiry form stores validated submissions in MySQL through Prisma before attempting notification delivery. Email failures are recorded on the saved enquiry and do not make the visitor resubmit their information.

Required environment variables:

- `DATABASE_URL` — Prisma MySQL connection string.
- `RESEND_API_KEY` — server-only Resend API key.
- `ENQUIRY_FROM_EMAIL` — verified sender, such as `Self Apply Center <enquiries@updates.selfapplycenter.com>`.
- `ENQUIRY_NOTIFICATION_TO` — notification recipient; production should use `info@selfapplycenter.com`.
- `RATE_LIMIT_SALT` — long random server-only value used when hashing client identifiers.

Optional rate-limit settings are `RATE_LIMIT_WINDOW_MINUTES` and `RATE_LIMIT_MAX_SUBMISSIONS`. They default to 15 minutes and 5 submissions.

Create migrations only against a local development database after changing `prisma/schema.prisma`:

```bash
npm run db:migrate:dev
```

Apply committed migrations in production before starting the application. The equivalent direct Prisma command is `npx prisma migrate deploy`:

```bash
npm run db:migrate:deploy
```

Production deployment must use `prisma migrate deploy`; never run `prisma migrate dev` against the Hostinger database. The Media Library migration is additive: it creates the new `MediaAsset` table, indexes, unique checksum constraint, and a nullable foreign key to `AdminUser`. It does not alter or delete existing application tables or rows.

`prisma db push` is not the normal deployment workflow because it does not apply and record the committed migration history. If Hostinger makes `migrate deploy` impossible, `npx prisma db push` is an emergency fallback only after a verified database backup and schema review. Resolve the migration-history mismatch afterward before returning to normal deployments; never add `--accept-data-loss` without a separately reviewed recovery plan.

## Administrator provisioning

The administrator provisioning command creates an active administrator or updates the password and reactivates an existing administrator with the same normalized email. It requires the configured `DATABASE_URL`, but does not print connection details, passwords, or password hashes.

Run the command in an interactive terminal. It prompts for the email and securely masks the password while it is entered:

```bash
npm run admin:create
```

To prefill the email without placing the password in the environment, set `ADMIN_EMAIL` before running the command. If `ADMIN_EMAIL` is absent, the command prompts for it. Passwords are always collected through the hidden interactive prompt and must contain at least 12 characters, including an uppercase letter, lowercase letter, number, and special character. Run this command only when intentionally creating an administrator or rotating administrator credentials.

## Deploying to Hostinger with GitHub

Hostinger Node.js Web Apps require a Business Web Hosting or supported Cloud hosting plan. Node.js 22.x is recommended for this project.

1. Commit and push the complete project, including `package.json`, `package-lock.json`, and `.env.example`, to the production GitHub branch.
2. In Hostinger hPanel, open **Websites** and select **Add Website**.
3. Choose **Deploy Web App**, then **Import Git Repository**.
4. Authorize the Hostinger GitHub integration and select the SAC repository and production branch.
5. Confirm that Hostinger detects **Next.js** as the framework.
6. Select **Node.js 22.x**.
7. Use `npm ci` as the install command if Hostinger exposes that setting.
8. Set the build command to `npm run build`.
9. Set the start command to `npm run start`.
10. If Hostinger requests an output directory, enter `.next`. Do not configure a custom entry file for a detected Next.js application.
11. Add `DATABASE_URL`, `AUTH_SECRET`, and the Cloudinary variables documented in `.env.example`, plus the enquiry variables documented above when that backend is enabled. Hostinger runs Next.js behind a reverse proxy, so also set `AUTH_URL=https://beta.selfapplycenter.com` and `AUTH_TRUST_HOST=true`. Do not include `/api/auth` in `AUTH_URL`.
12. Run `npm run db:migrate:deploy` against the production database before starting the updated application. Do not run `prisma migrate dev` in production.
13. Deploy and verify the temporary preview, including the Media Library upload flow, before directing production traffic to it.
14. Attach `selfapplycenter.com` and enable its SSL certificate in hPanel. Confirm both the apex domain and `www` resolve to the deployed Node.js website.

If `selfapplycenter.com` is already attached to a different Hostinger website entry, back up that website and remove the existing website entry before adding it as a Node.js Web App. Hostinger generates the routing configuration for the Node.js application automatically.

Future pushes to the connected GitHub branch can trigger automatic deployments. Build settings and environment variables can be reviewed through **Deployments → Settings and redeploy**.

Official references:

- [Hostinger: Deploy a Node.js Web App](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Hostinger: Redeploy a Node.js application](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/)
- [Next.js: Node.js server deployment](https://nextjs.org/docs/app/getting-started/deploying)
