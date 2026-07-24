# SAC University Intelligence Platform — Phase 1

## Scope and architecture

Phase 1 is a private, Prisma-backed ingestion and review system for university, program, admission requirement, tuition, scholarship, intake, deadline, link, and source data. It does not contain students, counselors, applications, documents, or CRM workflows.

The new code is isolated under `src/lib/university-import/`. It does not read from, write to, migrate, replace, or expose data through the existing `lib/student-hub/universities/` catalog or any public page.

Each source implements the shared `UniversitySourceAdapter` contract:

1. discover a maximum of five university profile URLs;
2. extract source values without inventing missing fields;
3. normalize deterministic domain records;
4. validate the normalized record;
5. stage or persist DRAFT records through the CLI runner.

University Study uses Playwright because its search/profile experience may require browser rendering. Studies Overseas uses `fetch` and Cheerio where static HTML is sufficient. Browser and network work starts only when the CLI explicitly runs without a fixture.

## Supported pilot sources

- `university-study`: `https://universitystudy.com/university-search/`
- `studies-overseas`: `https://www.studies-overseas.com/universities/usa`

This is a five-record pilot, not a crawler. Browsing is sequential, delay-controlled, and stops on CAPTCHA, access denial, rate limiting, or human-verification challenges. The importer never attempts to bypass authentication or source protections.

## Configuration

Copy the documented variables from `.env.example` into the local runtime environment:

```dotenv
UNIVERSITY_IMPORT_ENABLED=false
UNIVERSITY_IMPORT_HEADLESS=true
UNIVERSITY_IMPORT_STORAGE_STATE=
UNIVERSITY_IMPORT_MIN_DELAY_MS=1500
UNIVERSITY_IMPORT_MAX_DELAY_MS=3500
```

`UNIVERSITY_IMPORT_ENABLED` must equal the exact string `true` before a non-dry pilot can start. Dry-run is allowed while imports are disabled.

`UNIVERSITY_IMPORT_STORAGE_STATE` may point to a Playwright storage-state JSON file created locally from an authorized authenticated browser session. Keep it outside the repository when possible. Storage state, cookies, credentials, tokens, authorization headers, and browser session information must never be committed or logged.

The importer reads the file only when Playwright starts. It does not copy or rewrite it.

## Dependency and Hostinger deployment implications

Cheerio is a runtime dependency because the CLI uses it for static extraction. Playwright is a development dependency because browser imports are an operator-run maintenance command rather than part of the website request lifecycle.

No package script installs Chromium, and the normal `npm run build` does not launch Playwright or require a browser binary. Do not add `playwright install` to Hostinger build or deployment commands.

If a live browser-based import is intentionally executed on a Hostinger host:

1. install development dependencies for the maintenance environment;
2. explicitly install a compatible Playwright Chromium binary and required OS libraries during a separate operator-controlled setup step;
3. confirm Hostinger permits long-running browser processes and provides enough memory;
4. configure the storage-state path as a protected local secret;
5. run the CLI manually, never from a public endpoint.

If those conditions are unavailable, run imports from an approved operator workstation that can reach the same database. Static fixture dry-runs need no browser binary.

## Commands

Fixture-only dry-runs, with absolutely no Prisma reads or writes:

```bash
npm run universities:pilot -- --source university-study --limit 1 --dry-run --fixture tests/fixtures/university-import/university-study-profile.html
npm run universities:pilot -- --source studies-overseas --limit 1 --dry-run --fixture tests/fixtures/university-import/studies-overseas-profile.html
```

Live dry-runs perform source requests but no Prisma writes:

```bash
npm run universities:pilot -- --source university-study --limit 5 --dry-run
npm run universities:pilot -- --source studies-overseas --limit 5 --dry-run
```

Live pilots require explicit enablement:

```bash
UNIVERSITY_IMPORT_ENABLED=true npm run universities:pilot -- --source university-study --limit 5
UNIVERSITY_IMPORT_ENABLED=true npm run universities:pilot -- --source studies-overseas --limit 5
```

Phase 1 defaults to five and rejects zero, negative, non-integer, invalid, or greater-than-five limits.

## Import, deduplication, and hashing

Raw extraction is retained in `ImportRecord.rawPayload`; normalized data and validation gaps are retained separately. Console output contains only source, URL, entity name, counts, validation state, and deterministic hashes. Sensitive keys and token-like URL query values are redacted.

Normalized SHA-256 hashes use recursively sorted keys and exclude extraction timestamps, request IDs, browser metadata, headers, cookies, storage state, and rendering timings. An unchanged source hash updates only `lastCheckedAt` and records a skip.

Automatic university matching requires either:

- one matching verified official domain; or
- one strong normalized name/alias plus city or state match, with no conflicting official domain.

Name-only, conflicting, or multiple matches become `MANUAL_REVIEW`. They are never automatically merged.

## Scholarship rules

- `AVAILABLE`: positive evidence such as a scholarship name, amount, eligibility text, or scholarship page.
- `UNAVAILABLE`: an authoritative source explicitly states that no scholarship is available.
- `UNKNOWN`: every other case, including a partner profile that omits scholarship content.

## Review and publication workflow

The protected pages are:

- `/admin/university-data`
- `/admin/university-data/imports`
- `/admin/university-data/review`

Only `SUPER_ADMIN` has `manage_university_data`. Pages and review server actions enforce the permission server-side.

Approve/reject actions validate identifiers and decisions, execute in a serializable transaction, and record reviewer identity, timestamp, and optional note. Approval changes only `ImportRecord.status` to `APPROVED`. University, program, and scholarship publication states remain `DRAFT`; Phase 1 has no publication or delete control.

There is no public import API. Imports run only through the local CLI.

## Privacy and security

- Never commit `.env`, storage state, cookies, credentials, tokens, authorization headers, scraped output, or personal session information.
- Do not include personal data in fixtures.
- Do not bypass CAPTCHA, authentication, access controls, robots protections, or anti-bot measures.
- Do not run concurrent browsing by default.
- Do not log raw payloads or browser state.
- Archive or reject records operationally; cascading foreign keys are referential cleanup only.

## Known extraction limitations

Source markup and labels can change. Extractors use defensive selectors but may produce incomplete records, which remain visible in the review queue. The pilot does not follow every program, scholarship, tuition, or official university link, does not crawl whole sites, and does not infer facts that are absent. JavaScript-only content on Studies Overseas may require a later, reviewed adapter change if static HTML becomes insufficient.

## Phase 1.1 enrichment

Phase 1.1 enriches one staged university at a time. Factual authority is:

1. manually verified and locked claims;
2. official university pages;
3. University Study discovery/partner claims;
4. Studies Overseas comparison claims;
5. manual review for unresolved conflicts.

Official university pages are the normal factual reference for university facts, admissions, English proficiency, tuition, scholarships, deadlines, intakes, programs, and program-specific requirements. University Study remains the discovery source. Studies Overseas remains a secondary comparison source.

Every claim stores its exact source URL, observed timestamp, authority level, numeric confidence from 0–100, scope, study level, entry route, academic year, preferred state, and conflict state. Program claims have a direct nullable `programId` relation in addition to their logical entity key.

Direct-entry, pathway, undergraduate, graduate, program-specific, and academic-year-specific claims resolve in separate groups. A program-specific requirement overrides a university-wide fallback only for that program. Pathway-provider claims never become direct-entry requirements. Manual verification is a lock.

The first pilot budgets are:

- one university;
- eight general official pages;
- two program-directory pages;
- fifty discovered program links;
- ten processed official program pages;
- sequential requests with conservative delays.

The enrichment runner does not use sitemaps, traverse external domains, or bypass HTTP 403, authentication, CAPTCHA, robots restrictions, or other access controls.

Fixture review command:

```bash
npm run universities:enrich -- \
  --university-id <auburn-university-id> \
  --dry-run \
  --fixture-directory tests/fixtures/university-enrichment
```

Live commands require `UNIVERSITY_IMPORT_ENABLED=true` and must be operator initiated. Browser binaries remain a separate maintenance prerequisite and are not installed during normal builds.
