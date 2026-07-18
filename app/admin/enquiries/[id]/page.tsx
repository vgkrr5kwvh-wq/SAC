import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  formatEnquiryDate,
  formatNotificationStatus,
  formatPhone,
  formatStudyDestination,
  isValidEnquiryId,
} from "@/lib/admin-enquiry-detail";
import { prisma } from "@/lib/prisma";
import CopyButton from "./copy-button";

export const metadata: Metadata = {
  title: "Student enquiry details",
  robots: { index: false, follow: false },
};

type EnquiryDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EnquiryDetailPage({
  params,
}: EnquiryDetailPageProps) {
  const { id } = await params;
  if (!isValidEnquiryId(id)) notFound();

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/enquiries/${id}`)}`);
  }

  let enquiry;
  try {
    enquiry = await prisma.enquiry.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        interest: true,
        message: true,
        createdAt: true,
        notificationStatus: true,
      },
    });
  } catch {
    return (
      <section className="admin-error" role="alert">
        <span className="login-eyebrow">Enquiry unavailable</span>
        <h1>We couldn&apos;t load this enquiry</h1>
        <p>Please refresh the page in a moment. Your enquiry data is safe.</p>
      </section>
    );
  }

  if (!enquiry) notFound();

  const phone = formatPhone(undefined);

  return (
    <article className="admin-enquiry-detail">
      <header className="admin-detail-heading">
        <div>
          <span className="login-eyebrow">Student enquiry</span>
          <h1>Enquiry Details</h1>
          <p>Read-only submission information from the public enquiry form.</p>
        </div>
        <Link className="admin-back-link" href="/admin/enquiries">
          ← Back to Enquiries
        </Link>
      </header>

      <section className="admin-detail-card" aria-labelledby="student-information-heading">
        <h2 id="student-information-heading">Student Information</h2>
        <dl className="admin-detail-grid">
          <div>
            <dt>Full Name</dt>
            <dd>{enquiry.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{enquiry.email}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd className="admin-not-captured">{phone}</dd>
          </div>
          <div>
            <dt>Study Destination</dt>
            <dd>{formatStudyDestination(enquiry.interest)}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-detail-card" aria-labelledby="message-heading">
        <h2 id="message-heading">Message</h2>
        <p className="admin-detail-message">{enquiry.message}</p>
      </section>

      <section className="admin-detail-card" aria-labelledby="submission-information-heading">
        <h2 id="submission-information-heading">Submission Information</h2>
        <dl className="admin-detail-grid">
          <div>
            <dt>Created Date (Nepal Time)</dt>
            <dd>{formatEnquiryDate(enquiry.createdAt)}</dd>
          </div>
          <div>
            <dt>Notification Status</dt>
            <dd>{formatNotificationStatus(enquiry.notificationStatus)}</dd>
          </div>
          <div className="admin-detail-wide">
            <dt>Submission ID (internal reference)</dt>
            <dd className="admin-submission-id">{enquiry.id}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-detail-card" aria-labelledby="actions-heading">
        <h2 id="actions-heading">Actions</h2>
        <div className="admin-detail-actions">
          <Link className="button secondary" href="/admin/enquiries">
            ← Back to Enquiries
          </Link>
          <CopyButton label="Copy Email" value={enquiry.email} />
          <CopyButton label="Copy Phone" />
        </div>
      </section>
    </article>
  );
}
