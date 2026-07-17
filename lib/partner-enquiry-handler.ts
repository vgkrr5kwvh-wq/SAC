import type { NotificationStatus } from "@prisma/client";
import {
  partnerEnquirySchema,
  type PartnerEnquiryPayload,
} from "./partner-enquiry-schema";

type StoredPartnerEnquiry = {
  id: string;
  partnerType: string;
  contactName: string;
  workEmail: string;
  organisation: string;
  locations: string;
  partnershipProposal: string;
  details: string;
  additionalDetails: string | null;
};

type Repository = {
  countRecent(clientHash: string, since: Date): Promise<number>;

  create(
    payload: Omit<PartnerEnquiryPayload, "website"> & {
      clientHash: string;
    }
  ): Promise<StoredPartnerEnquiry>;

  setNotificationStatus(
    id: string,
    status: NotificationStatus
  ): Promise<void>;
};

type Notifier = {
  send(enquiry: StoredPartnerEnquiry): Promise<void>;
};

export type PartnerEnquiryHandlerDependencies = {
  repository: Repository;
  notifier: Notifier;
  clientHash: string;
  rateLimitWindowMinutes: number;
  rateLimitMaxSubmissions: number;
  now?: () => Date;
  logNotificationFailure?: (enquiryId: string) => void;
};

const successResponse = () =>
  Response.json(
    {
      ok: true,
      message: "Thank you. Your partnership enquiry has been received.",
    },
    { status: 201 }
  );

export async function handlePartnerEnquiryRequest(
  request: Request,
  dependencies: PartnerEnquiryHandlerDependencies
) {
  const contentLength = Number(
    request.headers.get("content-length") ?? 0
  );

  if (contentLength > 20_000) {
    return Response.json(
      {
        ok: false,
        message: "The submitted partnership enquiry is too large.",
      },
      { status: 413 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        message: "Please check the form and try again.",
      },
      { status: 400 }
    );
  }

  if (
    body &&
    typeof body === "object" &&
    "website" in body &&
    String(body.website).trim()
  ) {
    return successResponse();
  }

  const result = partnerEnquirySchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        ok: false,
        message:
          "Please correct the highlighted information and try again.",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const now = dependencies.now?.() ?? new Date();

  const since = new Date(
    now.getTime() -
      dependencies.rateLimitWindowMinutes * 60_000
  );

  let recentCount: number;

  try {
    recentCount =
      await dependencies.repository.countRecent(
        dependencies.clientHash,
        since
      );
  } catch {
    return Response.json(
      {
        ok: false,
        message:
          "Partnership enquiries are temporarily unavailable. Please try again shortly.",
      },
      { status: 503 }
    );
  }

  if (
    recentCount >=
    dependencies.rateLimitMaxSubmissions
  ) {
    return Response.json(
      {
        ok: false,
        message:
          "Too many enquiries have been submitted. Please try again later.",
      },
      { status: 429 }
    );
  }

  const { website: _honeypot, ...validated } =
    result.data;

  void _honeypot;

  let enquiry: StoredPartnerEnquiry;

  try {
    enquiry = await dependencies.repository.create({
      ...validated,
      clientHash: dependencies.clientHash,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        message:
          "We could not save your partnership enquiry. Please try again shortly.",
      },
      { status: 500 }
    );
  }

  try {
    await dependencies.notifier.send(enquiry);
  } catch {
    dependencies.logNotificationFailure?.(enquiry.id);

    try {
      await dependencies.repository.setNotificationStatus(
        enquiry.id,
        "FAILED"
      );
    } catch {
      dependencies.logNotificationFailure?.(enquiry.id);
    }

    return successResponse();
  }

  try {
    await dependencies.repository.setNotificationStatus(
      enquiry.id,
      "SENT"
    );
  } catch {
    dependencies.logNotificationFailure?.(enquiry.id);
  }

  return successResponse();
}