import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  buildPartnerEnquiriesExportUrl,
  buildPartnerEnquiriesUrl,
  buildPartnerEnquirySearchWhere,
  parsePageParameter,
  sanitizeSearchParameter,
} from "@/lib/admin-partner-enquiry-params";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Partner enquiries",
  robots: { index: false, follow: false },
};

const enquiriesPerPage = 20;
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kathmandu",
});

type PartnerEnquiriesPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
  }>;
};

export default async function PartnerEnquiriesPage({
  searchParams,
}: PartnerEnquiriesPageProps) {
  const parameters = await searchParams;
  const requestedPage = parsePageParameter(parameters.page);
  const query = sanitizeSearchParameter(parameters.q);
  const where = buildPartnerEnquirySearchWhere(query);

  let partnerEnquiryData;
  try {
    partnerEnquiryData = await prisma.$transaction([
      prisma.partnerEnquiry.count({ where }),
      prisma.partnerEnquiry.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (requestedPage - 1) * enquiriesPerPage,
        take: enquiriesPerPage,
        select: {
          id: true,
          contactName: true,
          organisation: true,
          workEmail: true,
          locations: true,
          createdAt: true,
        },
      }),
    ]);
  } catch {
    return (
      <section className="admin-error" role="alert">
        <span className="login-eyebrow">Partner enquiries unavailable</span>
        <h1>Unable to load partner enquiries</h1>
        <p>Please try again later.</p>
      </section>
    );
  }

  const [totalEnquiries, enquiries] = partnerEnquiryData;
  const totalPages = Math.max(1, Math.ceil(totalEnquiries / enquiriesPerPage));
  if (requestedPage > totalPages) {
    redirect(buildPartnerEnquiriesUrl(totalPages, query));
  }

  return (
    <div className="admin-enquiries-page admin-partner-enquiries-page">
      <section
        className="admin-dashboard-heading"
        aria-labelledby="partner-enquiries-heading"
      >
        <div>
          <span className="login-eyebrow">Partner enquiries</span>
          <h1 id="partner-enquiries-heading">Partner Enquiry Management</h1>
          <p>Review partnership enquiries submitted through the public website.</p>
        </div>
        <div className="admin-heading-actions">
          <Link className="admin-back-link" href="/admin">
            Back to dashboard
          </Link>
          <Link
            className="button secondary admin-export-link"
            href={buildPartnerEnquiriesExportUrl(query)}
            aria-label="Export matching partner enquiries as CSV"
          >
            Export CSV
          </Link>
        </div>
      </section>

      <form
        className="admin-search"
        action="/admin/partner-enquiries"
        method="get"
        role="search"
      >
        <label htmlFor="partner-enquiry-search">Search partner enquiries</label>
        <div>
          <input
            id="partner-enquiry-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            placeholder="Search by partner, company, or email"
          />
          <button className="button primary" type="submit">
            Search
          </button>
          {query ? (
            <Link className="button secondary" href="/admin/partner-enquiries">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <section
        className="admin-table-card"
        aria-labelledby="partner-enquiries-table-heading"
      >
        <div className="admin-table-heading">
          <div>
            <span>Partner records</span>
            <h2 id="partner-enquiries-table-heading">Partner Enquiries</h2>
          </div>
          <small>
            {totalEnquiries.toLocaleString("en-US")} result
            {totalEnquiries === 1 ? "" : "s"}
          </small>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-enquiries-table">
            <thead>
              <tr>
                <th scope="col">Partner Name</th>
                <th scope="col">Company</th>
                <th scope="col">Email</th>
                <th scope="col">Country</th>
                <th scope="col">Created Date</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length ? (
                enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td data-label="Partner Name">{enquiry.contactName}</td>
                    <td data-label="Company">{enquiry.organisation}</td>
                    <td data-label="Email">{enquiry.workEmail}</td>
                    <td data-label="Country">{enquiry.locations}</td>
                    <td data-label="Created Date">
                      {dateFormatter.format(enquiry.createdAt)}
                    </td>
                    <td className="admin-table-action">
                      <Link
                        href={`/admin/partner-enquiries/${encodeURIComponent(enquiry.id)}`}
                        aria-label={`View partner enquiry from ${enquiry.contactName}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan={6}>
                    No partner enquiries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="admin-pagination" aria-label="Partner enquiry pagination">
        {requestedPage > 1 ? (
          <Link
            href={buildPartnerEnquiriesUrl(requestedPage - 1, query)}
            aria-label="Go to previous partner enquiry page"
          >
            Previous
          </Link>
        ) : (
          <span aria-disabled="true">Previous</span>
        )}
        <p aria-current="page">
          Page {requestedPage} of {totalPages}
        </p>
        {requestedPage < totalPages ? (
          <Link
            href={buildPartnerEnquiriesUrl(requestedPage + 1, query)}
            aria-label="Go to next partner enquiry page"
          >
            Next
          </Link>
        ) : (
          <span aria-disabled="true">Next</span>
        )}
      </nav>
    </div>
  );
}
