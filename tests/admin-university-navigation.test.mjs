import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const navigation = readFileSync(new URL("../app/admin/admin-navigation.tsx", import.meta.url), "utf8");

test("shows available University Intelligence destinations", () => {
  assert.match(navigation, />University Intelligence</);
  assert.match(navigation, /href: "\/admin\/university-data", label: "Dashboard", exact: true/);
  assert.match(navigation, /href: "\/admin\/university-data\/review", label: "Review Queue"/);
  assert.match(navigation, /href: "\/admin\/university-data\/imports", label: "Import Jobs"/);
  assert.match(navigation, /hasAdminPermission\(role, "manage_university_data"\)/);
});

test("marks unavailable University Intelligence destinations as coming soon", () => {
  for (const label of ["Universities", "Programs", "Scholarships", "Admission Requirements", "Tuition", "Intakes"]) {
    assert.match(navigation, new RegExp(`\\{ label: "${label}" \\}`));
  }
  assert.match(navigation, /aria-disabled="true"/);
  assert.match(navigation, /<small>Coming soon<\/small>/);
});
