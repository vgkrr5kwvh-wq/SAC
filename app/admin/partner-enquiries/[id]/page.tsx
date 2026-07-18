import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatPartnerEnquiryDate,
  formatPartnerField,
  formatPartnerNotificationStatus,
  formatPartnerType,
  isValidPartnerEnquiryId,
} from "@/lib/admin-partner-enquiry-detail";
import { prisma } from "@/lib/prisma";
import CopyButton from "./copy-button";

export const metadata: Metadata = {
  title: "Partner enquiry details",
  robots: { index: false, follow: false },
};

type PartnerEnquiryDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PartnerEnquiryDetailPage({
  params,
}: PartnerEnquiryDetailPageProps) {
  const { id } = await params;
  if (!isValidPartnerEnquiryId(id)) notFound();

  let enquiry;
  try {
    enquiry = await prisma.partnerEnquiry.findUnique({
      where: { id },
      select: {
        id: true,
        partnerType: true,
        contactName: true,
        workEmail: true,
        organisation: true,
        locations: true,
        partnershipProposal: true,
        details: true,
        additionalDetails: true,
        notificationStatus: true,
        createdAt: true,
      },
    });
  } catch {
    return (
      <section className="admin-error" role="alert">
        <h1>Unable to load partner enquiry.</h1>
      </section>
    );
  }

  if (!enquiry) notFound();

  const email = enquiry.workEmail.trim() || undefined;

  return (
    <article className="admin-enquiry-detail">
      <header className="admin-detail-heading">
        <div>
          <span className="login-eyebrow">Partner enquiry</span>
          <h1>Partner Enquiry Details</h1>
          <p>Read-only partnership information from the public enquiry form.</p>
        </div>
        <Link className="admin-back-link" href="/admin/partner-enquiries">
          ← Back to Partner Enquiries
        </Link>
      </header>

      <section className="admin-detail-card" aria-labelledby="partner-information-heading">
        <h2 id="partner-information-heading">Partner Information</h2>
        <dl className="admin-detail-grid">
          <div>
            <dt>Contact Name</dt>
            <dd>{formatPartnerField(enquiry.contactName)}</dd>
          </div>
          <div>
            <dt>Organisation</dt>
            <dd>{formatPartnerField(enquiry.organisation)}</dd>
          </div>
          <div>
            <dt>Work Email</dt>
            <dd>{formatPartnerField(enquiry.workEmail)}</dd>
          </div>
          <div>
            <dt>Country / Locations</dt>
            <dd>{formatPartnerField(enquiry.locations)}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-detail-card" aria-labelledby="contact-details-heading">
        <h2 id="contact-details-heading">Contact Details</h2>
        <dl className="admin-detail-grid">
          <div>
            <dt>Partner Type</dt>
            <dd>{formatPartnerType(enquiry.partnerType)}</dd>
          </div>
          <div>
            <dt>Partnership Proposal</dt>
            <dd>{formatPartnerField(enquiry.partnershipProposal)}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-detail-card" aria-labelledby="partner-message-heading">
        <h2 id="partner-message-heading">Partner Message</h2>
        <p className="admin-detail-message">{formatPartnerField(enquiry.details)}</p>
        <h3 className="admin-detail-subheading">Additional Details</h3>
        <p className="admin-detail-message">
          {formatPartnerField(enquiry.additionalDetails)}
        </p>
      </section>

      <section className="admin-detail-card" aria-labelledby="submission-information-heading">
        <h2 id="submission-information-heading">Submission Information</h2>
        <dl className="admin-detail-grid">
          <div>
            <dt>Submitted Date (Nepal Time)</dt>
            <dd className="admin-detail-date">
              {formatPartnerEnquiryDate(enquiry.createdAt)}
            </dd>
          </div>
          <div>
            <dt>Notification Status</dt>
            <dd>{formatPartnerNotificationStatus(enquiry.notificationStatus)}</dd>
          </div>
          <div className="admin-detail-wide">
            <dt>Submission ID (internal reference)</dt>
            <dd className="admin-submission-id">{enquiry.id}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-detail-card" aria-labelledby="partner-actions-heading">
        <h2 id="partner-actions-heading">Actions</h2>
        <div className="admin-detail-actions">
          <Link className="button secondary" href="/admin/partner-enquiries">
            ← Back to Partner Enquiries
          </Link>
          <CopyButton label="Copy Email" value={email} />
        </div>
      </section>
    </article>
  );
}
