import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  buildEnquiriesExportUrl,
  buildEnquirySearchWhere,
  buildEnquiriesUrl,
  parsePageParameter,
  sanitizeSearchParameter,
} from "@/lib/admin-enquiry-params";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Student enquiries",
  robots: { index: false, follow: false },
};

const enquiriesPerPage = 20;
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kathmandu",
});

type EnquiriesPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
  }>;
};

export default async function EnquiriesPage({ searchParams }: EnquiriesPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/enquiries");

  const parameters = await searchParams;
  const requestedPage = parsePageParameter(parameters.page);
  const query = sanitizeSearchParameter(parameters.q);
  const where = buildEnquirySearchWhere(query);

  let enquiryData;
  try {
    enquiryData = await prisma.$transaction([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (requestedPage - 1) * enquiriesPerPage,
        take: enquiriesPerPage,
        select: {
          id: true,
          name: true,
          email: true,
          interest: true,
          createdAt: true,
        },
      }),
    ]);
  } catch {
    return (
      <section className="admin-error" role="alert">
        <span className="login-eyebrow">Enquiries unavailable</span>
        <h1>We couldn&apos;t load enquiries</h1>
        <p>Please refresh the page in a moment. Your enquiry data is safe.</p>
      </section>
    );
  }

  const [totalEnquiries, enquiries] = enquiryData;
  const totalPages = Math.max(1, Math.ceil(totalEnquiries / enquiriesPerPage));
  if (requestedPage > totalPages) {
    redirect(buildEnquiriesUrl(totalPages, query));
  }

  return (
    <div className="admin-enquiries-page">
      <section className="admin-dashboard-heading" aria-labelledby="enquiries-heading">
        <div>
          <span className="login-eyebrow">Student enquiries</span>
          <h1 id="enquiries-heading">Enquiry Management</h1>
          <p>Review student enquiries submitted through the public website.</p>
        </div>
        <div className="admin-heading-actions">
          <Link className="admin-back-link" href="/admin">Back to dashboard</Link>
          <Link
            className="button secondary admin-export-link"
            href={buildEnquiriesExportUrl(query)}
            aria-label="Export matching student enquiries as CSV"
          >
            Export CSV
          </Link>
        </div>
      </section>

      <form className="admin-search" action="/admin/enquiries" method="get" role="search">
        <label htmlFor="enquiry-search">Search enquiries</label>
        <div>
          <input
            id="enquiry-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            placeholder="Search by name, email, or destination"
          />
          <button className="button primary" type="submit">Search</button>
          {query ? <Link className="button secondary" href="/admin/enquiries">Clear</Link> : null}
        </div>
      </form>

      <section className="admin-table-card" aria-labelledby="enquiries-table-heading">
        <div className="admin-table-heading">
          <div>
            <span>Enquiry records</span>
            <h2 id="enquiries-table-heading">Student Enquiries</h2>
          </div>
          <small>{totalEnquiries.toLocaleString("en-US")} result{totalEnquiries === 1 ? "" : "s"}</small>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-enquiries-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Study Destination</th>
                <th scope="col">Created Date</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length ? (
                enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td data-label="Name">{enquiry.name}</td>
                    <td data-label="Email">{enquiry.email}</td>
                    <td data-label="Phone"><span className="admin-not-captured">Not captured</span></td>
                    <td data-label="Study Destination">{enquiry.interest || "Not specified"}</td>
                    <td data-label="Created Date">{dateFormatter.format(enquiry.createdAt)}</td>
                    <td className="admin-table-action">
                      <Link
                        href={`/admin/enquiries/${encodeURIComponent(enquiry.id)}`}
                        aria-label={`View enquiry from ${enquiry.name}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="admin-empty-row" colSpan={6}>No enquiries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="admin-pagination" aria-label="Enquiry pagination">
        {requestedPage > 1 ? (
          <Link href={buildEnquiriesUrl(requestedPage - 1, query)} aria-label="Go to previous enquiry page">
            Previous
          </Link>
        ) : (
          <span aria-disabled="true">Previous</span>
        )}
        <p aria-current="page">Page {requestedPage} of {totalPages}</p>
        {requestedPage < totalPages ? (
          <Link href={buildEnquiriesUrl(requestedPage + 1, query)} aria-label="Go to next enquiry page">
            Next
          </Link>
        ) : (
          <span aria-disabled="true">Next</span>
        )}
      </nav>
    </div>
  );
}
