import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

const kathmanduOffsetMilliseconds = 5.75 * 60 * 60 * 1000;

function getKathmanduDateBoundaries(now = new Date()) {
  const kathmanduTime = new Date(now.getTime() + kathmanduOffsetMilliseconds);
  const year = kathmanduTime.getUTCFullYear();
  const month = kathmanduTime.getUTCMonth();
  const day = kathmanduTime.getUTCDate();

  return {
    startOfToday: new Date(
      Date.UTC(year, month, day) - kathmanduOffsetMilliseconds,
    ),
    startOfTomorrow: new Date(
      Date.UTC(year, month, day + 1) - kathmanduOffsetMilliseconds,
    ),
    startOfMonth: new Date(
      Date.UTC(year, month, 1) - kathmanduOffsetMilliseconds,
    ),
    startOfNextMonth: new Date(
      Date.UTC(year, month + 1, 1) - kathmanduOffsetMilliseconds,
    ),
  };
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kathmandu",
});

async function getDashboardData() {
  const {
    startOfToday,
    startOfTomorrow,
    startOfMonth,
    startOfNextMonth,
  } = getKathmanduDateBoundaries();

  return prisma.$transaction([
    prisma.enquiry.count(),
    prisma.partnerEnquiry.count(),
    prisma.enquiry.count({
      where: { createdAt: { gte: startOfToday, lt: startOfTomorrow } },
    }),
    prisma.enquiry.count({
      where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
    }),
    prisma.enquiry.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        interest: true,
        createdAt: true,
      },
    }),
    prisma.partnerEnquiry.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        organisation: true,
        contactName: true,
        workEmail: true,
        createdAt: true,
      },
    }),
  ]);
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  let dashboardData;
  try {
    dashboardData = await getDashboardData();
  } catch {
    return (
      <section className="admin-error" role="alert">
        <span className="login-eyebrow">Dashboard unavailable</span>
        <h1>We couldn&apos;t load the dashboard</h1>
        <p>Please refresh the page in a moment. Your enquiry data is safe.</p>
      </section>
    );
  }

  const [
    totalEnquiries,
    totalPartnerEnquiries,
    todaysEnquiries,
    thisMonthsEnquiries,
    recentEnquiries,
    recentPartnerEnquiries,
  ] = dashboardData;

  const statistics = [
    { label: "Total Enquiries", value: totalEnquiries },
    { label: "Partner Enquiries", value: totalPartnerEnquiries },
    { label: "Today’s Enquiries", value: todaysEnquiries },
    { label: "This Month", value: thisMonthsEnquiries },
  ];

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard-heading" aria-labelledby="admin-heading">
        <div>
          <span className="login-eyebrow">Administrator overview</span>
          <h1 id="admin-heading">Dashboard</h1>
          <p>Monitor recent activity across Self Apply Center enquiries.</p>
        </div>
        <p className="admin-signed-in">
          Signed in as <strong>{session.user.email}</strong>
        </p>
      </section>

      <dl className="admin-stat-grid">
        {statistics.map((statistic) => (
          <div className="admin-stat-card" key={statistic.label}>
            <dt>{statistic.label}</dt>
            <dd>{statistic.value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>

      <section className="admin-table-card" aria-labelledby="recent-enquiries-heading">
        <div className="admin-table-heading">
          <div>
            <span>Student enquiries</span>
            <h2 id="recent-enquiries-heading">Recent Enquiries</h2>
          </div>
          <small>Latest 5 submissions</small>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Study Destination</th>
                <th scope="col">Created Date</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {recentEnquiries.length ? (
                recentEnquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td data-label="Name">{enquiry.name}</td>
                    <td data-label="Email">{enquiry.email}</td>
                    <td data-label="Study Destination">{enquiry.interest || "Not specified"}</td>
                    <td data-label="Created Date">{dateFormatter.format(enquiry.createdAt)}</td>
                    <td className="admin-table-action">
                      <button
                        type="button"
                        disabled
                        aria-label="View enquiry details (coming soon)"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="admin-empty-row" colSpan={5}>No enquiries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-table-card" aria-labelledby="recent-partners-heading">
        <div className="admin-table-heading">
          <div>
            <span>Partnership activity</span>
            <h2 id="recent-partners-heading">Recent Partner Enquiries</h2>
          </div>
          <small>Latest 5 submissions</small>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Institution Name</th>
                <th scope="col">Contact Person</th>
                <th scope="col">Work Email</th>
                <th scope="col">Created Date</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {recentPartnerEnquiries.length ? (
                recentPartnerEnquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td data-label="Institution Name">{enquiry.organisation}</td>
                    <td data-label="Contact Person">{enquiry.contactName}</td>
                    <td data-label="Work Email">{enquiry.workEmail}</td>
                    <td data-label="Created Date">{dateFormatter.format(enquiry.createdAt)}</td>
                    <td className="admin-table-action">
                      <button
                        type="button"
                        disabled
                        aria-label="View partner enquiry details (coming soon)"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="admin-empty-row" colSpan={5}>No partner enquiries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
