import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { adminUserUpdateError, hasAdminPermission, isCurrentAdminSession } from "../lib/admin-authorization";
import { createAdminUserSchema, resetAdminPasswordSchema, updateAdminUserSchema } from "../lib/admin-user-management";

test("enforces the role permission matrix", () => {
  for (const permission of ["manage_enquiries", "manage_blog", "publish_blog", "manage_categories", "manage_media", "delete_media", "manage_users", "manage_settings"] as const) assert.equal(hasAdminPermission("SUPER_ADMIN", permission), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_blog"), true);
  assert.equal(hasAdminPermission("EDITOR", "publish_blog"), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_categories"), true);
  assert.equal(hasAdminPermission("EDITOR", "delete_media"), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_users"), false);
  assert.equal(hasAdminPermission("EDITOR", "manage_enquiries"), false);
  assert.equal(hasAdminPermission("STAFF", "manage_enquiries"), true);
  assert.equal(hasAdminPermission("STAFF", "manage_blog"), false);
  assert.equal(hasAdminPermission("STAFF", "publish_blog"), false);
  assert.equal(hasAdminPermission("STAFF", "manage_categories"), false);
  assert.equal(hasAdminPermission("STAFF", "delete_media"), false);
  assert.equal(hasAdminPermission("STAFF", "manage_users"), false);
});

test("prevents self escalation, self deactivation, and loss of the last active Super Admin", () => {
  const actor = { id: "admin-1", role: "SUPER_ADMIN" as const };
  const target = { id: "admin-1", role: "SUPER_ADMIN" as const, isActive: true };
  assert.equal(adminUserUpdateError(actor, target, { role: "EDITOR", isActive: true }, 2), "self");
  assert.equal(adminUserUpdateError(actor, target, { role: "SUPER_ADMIN", isActive: false }, 2), "self");
  assert.equal(adminUserUpdateError(actor, { ...target, id: "admin-2" }, { role: "EDITOR", isActive: true }, 1), "last-super-admin");
  assert.equal(adminUserUpdateError(actor, { ...target, id: "admin-2" }, { role: "EDITOR", isActive: true }, 2), null);
});

test("validates user creation, updates, and strong password resets", () => {
  const password = "StrongPassword9!";
  assert.equal(createAdminUserSchema.safeParse({ name: "Content Editor", email: " Editor@Example.com ", role: "EDITOR", password, confirmPassword: password }).success, true);
  assert.equal(createAdminUserSchema.safeParse({ name: "", email: "bad", role: "OWNER", password: "weak", confirmPassword: "different" }).success, false);
  assert.equal(updateAdminUserSchema.safeParse({ name: "Support Staff", email: "staff@example.com", role: "STAFF", isActive: false }).success, true);
  assert.equal(resetAdminPasswordSchema.safeParse({ password, confirmPassword: password }).success, true);
  assert.equal(resetAdminPasswordSchema.safeParse({ password: "weak", confirmPassword: "weak" }).success, false);
});

test("invalidates inactive and version-mismatched JWT sessions", () => {
  assert.equal(isCurrentAdminSession({ isActive: true, sessionVersion: 4 }, 4), true);
  assert.equal(isCurrentAdminSession({ isActive: false, sessionVersion: 4 }, 4), false);
  assert.equal(isCurrentAdminSession({ isActive: true, sessionVersion: 5 }, 4), false);
  assert.equal(isCurrentAdminSession(null, 4), false);
});

test("protects direct URLs and Server Actions with server-side permissions", () => {
  for (const file of ["app/admin/blog/layout.tsx", "app/admin/media/layout.tsx", "app/admin/enquiries/layout.tsx", "app/admin/partner-enquiries/layout.tsx", "app/admin/users/layout.tsx"]) {
    assert.match(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), /requireAdmin\("(manage_blog|manage_media|manage_enquiries|manage_users)"/);
  }
  for (const file of ["app/admin/blog/actions.ts", "app/admin/blog/categories/actions.ts", "app/admin/media/actions.ts", "app/admin/users/actions.ts"]) {
    assert.match(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), /hasAdminPermission|superAdminSession/);
  }
  const userActions = readFileSync(new URL("../app/admin/users/actions.ts", import.meta.url), "utf8");
  assert.match(userActions, /key !== "password" && key !== "confirmPassword"/);
  assert.match(userActions, /sessionVersion: \{ increment: 1 \}/);
});

test("records nullable blog ownership without rewriting legacy posts", () => {
  const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../prisma/migrations/20260721120000_add_admin_rbac/migration.sql", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../app/admin/blog/actions.ts", import.meta.url), "utf8");
  assert.match(schema, /createdById\s+String\?/);
  assert.match(schema, /updatedById\s+String\?/);
  assert.match(migration, /createdById` VARCHAR\(30\) NULL/);
  assert.doesNotMatch(migration, /UPDATE `BlogPost`/);
  assert.match(actions, /createdById: session\.user\.id/);
  assert.match(actions, /updatedById: session\.user\.id/);
});
