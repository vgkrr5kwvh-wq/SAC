import assert from "node:assert/strict";
import test from "node:test";
import {
  genericLoginError,
  mapLoginError,
  sanitizeCallbackUrl,
} from "../lib/auth-navigation";

test("accepts internal callback paths", () => {
  assert.equal(sanitizeCallbackUrl("/admin"), "/admin");
  assert.equal(
    sanitizeCallbackUrl("/admin/reports?period=month#latest"),
    "/admin/reports?period=month#latest",
  );
});

test("rejects external and protocol-relative callback URLs", () => {
  assert.equal(sanitizeCallbackUrl("https://example.com/admin"), "/admin");
  assert.equal(sanitizeCallbackUrl("//example.com/admin"), "/admin");
  assert.equal(sanitizeCallbackUrl("/\\example.com/admin"), "/admin");
  assert.equal(sanitizeCallbackUrl("/%2F%2Fexample.com/admin"), "/admin");
  assert.equal(sanitizeCallbackUrl("/%252F%252Fexample.com/admin"), "/admin");
});

test("uses the fallback for missing or malformed callback URLs", () => {
  assert.equal(sanitizeCallbackUrl(undefined), "/admin");
  assert.equal(sanitizeCallbackUrl("admin"), "/admin");
  assert.equal(sanitizeCallbackUrl("/%"), "/admin");
});

test("maps every failed login to the same generic message", () => {
  assert.equal(mapLoginError("CredentialsSignin"), genericLoginError);
  assert.equal(mapLoginError(new Error("internal provider detail")), genericLoginError);
  assert.equal(mapLoginError(true), genericLoginError);
  assert.equal(mapLoginError(null), genericLoginError);
  assert.equal(mapLoginError(undefined), genericLoginError);
});
