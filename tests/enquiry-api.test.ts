import assert from "node:assert/strict";
import test from "node:test";
import { handleEnquiryRequest, type EnquiryHandlerDependencies } from "../lib/enquiry-handler";

const validPayload = {
  name: "Sam Student",
  email: "sam@example.com",
  interest: "Business Analytics in Canada",
  message: "I would like help planning my next application steps.",
  website: "",
};

function request(payload: unknown) {
  return new Request("http://localhost/api/enquiries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function dependencies(overrides: Partial<EnquiryHandlerDependencies> = {}) {
  const created: unknown[] = [];
  const statuses: string[] = [];
  let notifications = 0;
  const value: EnquiryHandlerDependencies = {
    clientHash: "a".repeat(64),
    rateLimitWindowMinutes: 15,
    rateLimitMaxSubmissions: 5,
    now: () => new Date("2026-07-17T12:00:00.000Z"),
    repository: {
      countRecent: async () => 0,
      create: async (payload) => {
        created.push(payload);
        return { id: "enquiry-1", ...payload };
      },
      setNotificationStatus: async (_id, status) => { statuses.push(status); },
    },
    notifier: { send: async () => { notifications += 1; } },
    ...overrides,
  };
  return { value, created, statuses, notificationCount: () => notifications };
}

test("stores a valid enquiry and marks its notification as sent", async () => {
  const deps = dependencies();
  const response = await handleEnquiryRequest(request(validPayload), deps.value);

  assert.equal(response.status, 201);
  assert.equal(deps.created.length, 1);
  assert.equal(deps.notificationCount(), 1);
  assert.deepEqual(deps.statuses, ["SENT"]);
});

test("rejects an invalid enquiry without storing or notifying", async () => {
  const deps = dependencies();
  const response = await handleEnquiryRequest(request({ ...validPayload, email: "not-an-email" }), deps.value);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.fieldErrors.email[0], /valid email/i);
  assert.equal(deps.created.length, 0);
  assert.equal(deps.notificationCount(), 0);
});

test("silently accepts honeypot submissions", async () => {
  const deps = dependencies();
  const response = await handleEnquiryRequest(request({ ...validPayload, website: "https://spam.example" }), deps.value);

  assert.equal(response.status, 201);
  assert.equal(deps.created.length, 0);
  assert.equal(deps.notificationCount(), 0);
});

test("rate limits repeated valid submissions", async () => {
  const deps = dependencies({
    repository: {
      countRecent: async () => 5,
      create: async () => { throw new Error("should not create"); },
      setNotificationStatus: async () => {},
    },
  });
  const response = await handleEnquiryRequest(request(validPayload), deps.value);

  assert.equal(response.status, 429);
  assert.equal(deps.notificationCount(), 0);
});

test("keeps a stored enquiry successful when notification delivery fails", async () => {
  const deps = dependencies({ notifier: { send: async () => { throw new Error("provider unavailable"); } } });
  const response = await handleEnquiryRequest(request(validPayload), deps.value);

  assert.equal(response.status, 201);
  assert.equal(deps.created.length, 1);
  assert.deepEqual(deps.statuses, ["FAILED"]);
});
