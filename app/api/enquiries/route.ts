import { createHash } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "../../../lib/prisma";
import { handleEnquiryRequest } from "../../../lib/enquiry-handler";

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
    return Response.json({ ok: false, message: "Enquiries are temporarily unavailable." }, { status: 503 });
  }

  const clientHash = createHash("sha256").update(`${salt}:${clientAddress(request)}`).digest("hex");
  const resend = new Resend(process.env.RESEND_API_KEY);

  return handleEnquiryRequest(request, {
    clientHash,
    rateLimitWindowMinutes: positiveInteger(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    rateLimitMaxSubmissions: positiveInteger(process.env.RATE_LIMIT_MAX_SUBMISSIONS, 5),
    repository: {
      countRecent: (hash, since) => prisma.enquiry.count({ where: { clientHash: hash, createdAt: { gte: since } } }),
      create: (payload) => prisma.enquiry.create({
        data: payload,
        select: { id: true, name: true, email: true, interest: true, message: true },
      }),
      setNotificationStatus: async (id, notificationStatus) => {
        await prisma.enquiry.update({
          where: { id },
          data: {
            notificationStatus,
            notificationFailedAt: notificationStatus === "FAILED" ? new Date() : null,
          },
        });
      },
    },
    notifier: {
      send: async (enquiry) => {
        const from = process.env.ENQUIRY_FROM_EMAIL;
        const to = process.env.ENQUIRY_NOTIFICATION_TO;
        if (!process.env.RESEND_API_KEY || !from || !to) throw new Error("Notification configuration unavailable");

        const result = await resend.emails.send({
          from,
          to,
          replyTo: enquiry.email,
          subject: `Website enquiry from ${enquiry.name}`,
          text: [
            `Name: ${enquiry.name}`,
            `Email: ${enquiry.email}`,
            `Destination or course: ${enquiry.interest ?? "Not provided"}`,
            "",
            "Message:",
            enquiry.message,
          ].join("\n"),
        });
        if (result.error) throw new Error("Notification provider rejected the message");
      },
    },
    logNotificationFailure: (enquiryId) => {
      console.error(`Enquiry notification failed for stored enquiry ${enquiryId}.`);
    },
  });
}
