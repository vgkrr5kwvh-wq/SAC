# SAC Consultancy Website

The Self Apply Center website is a standard Next.js App Router application using React, TypeScript, Tailwind CSS, and the Node.js runtime.

Shared navigation and footer components live in `components/`. Route content is defined in `app/site-data.ts`, while blog articles are maintained in `app/blog-posts.ts`.

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

No application environment variables are currently required. `.env*` files are ignored by Git, while `.env.example` is intentionally committed as the safe variable-name template.

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
11. Do not add environment variables for the current release; none are required.
12. Deploy and verify the temporary preview before directing production traffic to it.
13. Attach `selfapplycenter.com` and enable its SSL certificate in hPanel. Confirm both the apex domain and `www` resolve to the deployed Node.js website.

If `selfapplycenter.com` is already attached to a different Hostinger website entry, back up that website and remove the existing website entry before adding it as a Node.js Web App. Hostinger generates the routing configuration for the Node.js application automatically.

Future pushes to the connected GitHub branch can trigger automatic deployments. Build settings and environment variables can be reviewed through **Deployments → Settings and redeploy**.

Official references:

- [Hostinger: Deploy a Node.js Web App](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Hostinger: Redeploy a Node.js application](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/)
- [Next.js: Node.js server deployment](https://nextjs.org/docs/app/getting-started/deploying)
