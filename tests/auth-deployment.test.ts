import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("configures Auth.js for the trusted Hostinger reverse proxy", () => {
  const authSource = readFileSync(new URL("../auth.ts", import.meta.url), "utf8");
  const exampleEnvironment = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(authSource, /trustHost:\s*true/);
  assert.match(exampleEnvironment, /^AUTH_URL=$/m);
  assert.match(exampleEnvironment, /^AUTH_TRUST_HOST=true$/m);
  assert.doesNotMatch(exampleEnvironment, /^NEXTAUTH_URL=/m);
});
