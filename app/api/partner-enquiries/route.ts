import { createHash } from "node:crypto";
import { Resend } from "resend";
import { handlePartnerEnquiryRequest } from "../../../lib/partner-enquiry-handler";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export async function POST(request: Request) {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt) {
    return Response.json({ ok: false, message: "Partnership enquiries are temporarily unavailable." }, { status: 503 });
  }

  const clientHash = createHash("sha256").update(`${salt}:${clientAddress(request)}`).digest("hex");
  const resend = new Resend(process.env.RESEND_API_KEY);

  return handlePartnerEnquiryRequest(request, {
    clientHash,
    rateLimitWindowMinutes: positiveInteger(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    rateLimitMaxSubmissions: positiveInteger(process.env.RATE_LIMIT_MAX_SUBMISSIONS, 5),
    repository: {
      countRecent: (hash, since) => prisma.partnerEnquiry.count({ where: { clientHash: hash, createdAt: { gte: since } } }),
      create: (payload) => prisma.partnerEnquiry.create({
        data: payload,
        select: {
          id: true, partnerType: true, contactName: true, workEmail: true,
          organisation: true, locations: true, partnershipProposal: true,
          details: true, additionalDetails: true,
        },
      }),
      setNotificationStatus: async (id, notificationStatus) => {
        await prisma.partnerEnquiry.update({
          where: { id },
          data: { notificationStatus, notificationFailedAt: notificationStatus === "FAILED" ? new Date() : null },
        });
      },
    },
    notifier: {
      send: async (enquiry) => {
        const from = process.env.ENQUIRY_FROM_EMAIL;
        if (!process.env.RESEND_API_KEY || !from) throw new Error("Notification configuration unavailable");

        const result = await resend.emails.send({
          from,
          to: "kiran@selfapplycenter.com",
          replyTo: enquiry.workEmail,
          subject: `Partnership enquiry from ${enquiry.organisation}`,
          text: [
            `Partner type: ${enquiry.partnerType}`,
            `Contact name: ${enquiry.contactName}`,
            `Work email: ${enquiry.workEmail}`,
            `Organisation: ${enquiry.organisation}`,
            `Locations: ${enquiry.locations}`,
            `Partnership proposal: ${enquiry.partnershipProposal}`,
            "", "Details:", enquiry.details,
            "", "Additional details:", enquiry.additionalDetails || "Not provided",
          ].join("\n"),
        });
        if (result.error) throw new Error("Notification provider rejected the message");
      },
    },
    logNotificationFailure: (enquiryId) => {
      console.error(`Partner enquiry notification failed for stored enquiry ${enquiryId}.`);
    },
  });
}
