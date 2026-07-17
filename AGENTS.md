# Repository Guidelines

## Project Structure & Module Organization

SAC is a standard Node.js Next.js consultancy website using the App Router. Keep routes and page-level UI in `app/`, static images and icons in `public/`, shared UI in `components/`, and automated checks in `tests/`. Production deployment uses the scripts in `package.json` and the configuration in `next.config.ts`. Group new application code by feature and colocate route-specific components with their route.

Document any new top-level directory in `README.md`. Do not commit generated output, dependency directories, editor metadata, or secrets.

## Build, Test, and Development Commands

Use the pinned npm dependencies and commit `package-lock.json` whenever they change. The main commands are:

- `npm run dev` — start the local development server.
- `npm run build` — produce a deployable build.
- `npm test` — build, then run the rendered-HTML tests.
- `npm run lint` — check formatting and static-analysis rules.

Run the relevant checks locally before opening a pull request. Avoid relying on globally installed tools; pin dependencies in the project manifest and lockfile.

## Coding Style & Naming Conventions

Use TypeScript, React function components, two-space indentation, UTF-8, and a final newline. ESLint uses the Next.js Core Web Vitals and TypeScript presets. Name components and types in `PascalCase`, functions and variables in `camelCase`, and route directories in `kebab-case`. Keep server-only logic out of client components and avoid hard-coded URLs, credentials, or environment-specific values.

## Testing Guidelines

Tests use Node's built-in test runner. Add tests with every behavior change and bug fix, using descriptive `*.test.mjs` names under `tests/`. Cover successful flows, validation failures, and boundary cases. Run `npm test` before requesting review; no numeric coverage threshold is currently enforced.

## Commit & Pull Request Guidelines

The history currently contains only `Initial commit`, so no established convention exists. Use short, imperative subjects such as `Add application status page`; keep unrelated changes in separate commits. Pull requests should explain the purpose and approach, list verification performed, and link relevant issues. Include before-and-after screenshots for visible UI changes and call out configuration or migration steps explicitly.
