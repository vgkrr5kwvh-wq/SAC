import type { NotificationStatus } from "@prisma/client";
import { enquirySchema, type EnquiryPayload } from "./enquiry-schema";

type StoredEnquiry = {
  id: string;
  name: string;
  email: string;
  interest: string | null;
  message: string;
};

type Repository = {
  countRecent(clientHash: string, since: Date): Promise<number>;
  create(payload: Omit<EnquiryPayload, "website"> & { clientHash: string }): Promise<StoredEnquiry>;
  setNotificationStatus(id: string, status: NotificationStatus): Promise<void>;
};

type Notifier = {
  send(enquiry: StoredEnquiry): Promise<void>;
};

export type EnquiryHandlerDependencies = {
  repository: Repository;
  notifier: Notifier;
  clientHash: string;
  rateLimitWindowMinutes: number;
  rateLimitMaxSubmissions: number;
  now?: () => Date;
  logNotificationFailure?: (enquiryId: string) => void;
};

const successResponse = () => Response.json(
  { ok: true, message: "Thank you. Your enquiry has been received." },
  { status: 201 }
);

export async function handleEnquiryRequest(request: Request, dependencies: EnquiryHandlerDependencies) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return Response.json({ ok: false, message: "The submitted enquiry is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Please check the form and try again." }, { status: 400 });
  }

  if (body && typeof body === "object" && "website" in body && String(body.website).trim()) {
    return successResponse();
  }

  const result = enquirySchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      {
        ok: false,
        message: "Please correct the highlighted information and try again.",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const now = dependencies.now?.() ?? new Date();
  const since = new Date(now.getTime() - dependencies.rateLimitWindowMinutes * 60_000);
  let recentCount: number;
  try {
    recentCount = await dependencies.repository.countRecent(dependencies.clientHash, since);
  } catch {
    return Response.json(
      { ok: false, message: "Enquiries are temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
  if (recentCount >= dependencies.rateLimitMaxSubmissions) {
    return Response.json(
      { ok: false, message: "Too many enquiries have been submitted. Please try again later." },
      { status: 429 }
    );
  }

  const { website: _honeypot, ...validated } = result.data;
  void _honeypot;

  let enquiry: StoredEnquiry;
  try {
    enquiry = await dependencies.repository.create({ ...validated, clientHash: dependencies.clientHash });
  } catch {
    return Response.json(
      { ok: false, message: "We could not save your enquiry. Please try again shortly." },
      { status: 500 }
    );
  }

  try {
    await dependencies.notifier.send(enquiry);
  } catch {
    dependencies.logNotificationFailure?.(enquiry.id);
    try {
      await dependencies.repository.setNotificationStatus(enquiry.id, "FAILED");
    } catch {
      dependencies.logNotificationFailure?.(enquiry.id);
    }
    return successResponse();
  }

  try {
    await dependencies.repository.setNotificationStatus(enquiry.id, "SENT");
  } catch {
    dependencies.logNotificationFailure?.(enquiry.id);
  }

  return successResponse();
}
