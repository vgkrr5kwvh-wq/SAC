import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  buildBreakdownChartData,
  buildBreakdownRows,
  buildHalfOpenDateFilter,
  buildMonthlyChartData,
  formatAnalyticsDate,
  getNepalAnalyticsBoundaries,
  getNepalMonthlyRange,
  mergeRecentActivity,
  type RecentActivity,
} from "@/lib/admin-dashboard-analytics";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "./dashboard-charts";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

async function getDashboardData() {
  const boundaries = getNepalAnalyticsBoundaries();
  const today = buildHalfOpenDateFilter(
    boundaries.startOfToday,
    boundaries.startOfTomorrow,
  );
  const thisWeek = buildHalfOpenDateFilter(
    boundaries.startOfWeek,
    boundaries.startOfNextWeek,
  );
  const thisMonth = buildHalfOpenDateFilter(
    boundaries.startOfMonth,
    boundaries.startOfNextMonth,
  );
  const monthlyRange = getNepalMonthlyRange();

  return Promise.all([
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { createdAt: today } }),
    prisma.enquiry.count({ where: { createdAt: thisWeek } }),
    prisma.enquiry.count({ where: { createdAt: thisMonth } }),
    prisma.partnerEnquiry.count(),
    prisma.partnerEnquiry.count({ where: { createdAt: today } }),
    prisma.partnerEnquiry.count({ where: { createdAt: thisWeek } }),
    prisma.partnerEnquiry.count({ where: { createdAt: thisMonth } }),
    prisma.enquiry.groupBy({
      by: ["notificationStatus"],
      _count: { _all: true },
      orderBy: { notificationStatus: "asc" },
    }),
    prisma.partnerEnquiry.groupBy({
      by: ["notificationStatus"],
      _count: { _all: true },
      orderBy: { notificationStatus: "asc" },
    }),
    prisma.enquiry.groupBy({
      by: ["interest"],
      _count: { _all: true },
      orderBy: [{ _count: { id: "desc" } }, { interest: "asc" }],
      take: 10,
    }),
    prisma.partnerEnquiry.groupBy({
      by: ["locations"],
      _count: { _all: true },
      orderBy: [{ _count: { id: "desc" } }, { locations: "asc" }],
      take: 10,
    }),
    prisma.enquiry.findMany({
      take: 10,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        interest: true,
        createdAt: true,
      },
    }),
    prisma.partnerEnquiry.findMany({
      take: 10,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        contactName: true,
        organisation: true,
        workEmail: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<Array<{ monthKey: string; count: bigint }>>`
      SELECT
        DATE_FORMAT(DATE_ADD(createdAt, INTERVAL 345 MINUTE), '%Y-%m') AS monthKey,
        COUNT(*) AS count
      FROM Enquiry
      WHERE createdAt >= ${monthlyRange.start}
        AND createdAt < ${monthlyRange.end}
      GROUP BY monthKey
      ORDER BY monthKey ASC
    `,
    Promise.resolve(monthlyRange.monthKeys),
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
        <p>Please refresh the page in a moment.</p>
      </section>
    );
  }

  const [
    totalStudents,
    studentsToday,
    studentsThisWeek,
    studentsThisMonth,
    totalPartners,
    partnersToday,
    partnersThisWeek,
    partnersThisMonth,
    studentNotificationGroups,
    partnerNotificationGroups,
    studentInterestGroups,
    partnerLocationGroups,
    recentStudents,
    recentPartners,
    monthlyStudentGroups,
    monthlyStudentKeys,
  ] = dashboardData;

  const studentSummary = [
    { label: "Total", value: totalStudents },
    { label: "Today", value: studentsToday },
    { label: "This week", value: studentsThisWeek },
    { label: "This month", value: studentsThisMonth },
  ];
  const partnerSummary = [
    { label: "Total", value: totalPartners },
    { label: "Today", value: partnersToday },
    { label: "This week", value: partnersThisWeek },
    { label: "This month", value: partnersThisMonth },
  ];
  const studentBreakdown = buildBreakdownRows(
    studentInterestGroups.map((group) => ({
      label: group.interest,
      count: group._count._all,
    })),
    totalStudents,
  );
  const partnerBreakdown = buildBreakdownRows(
    partnerLocationGroups.map((group) => ({
      label: group.locations,
      count: group._count._all,
    })),
    totalPartners,
  );
  const studentActivity: RecentActivity[] = recentStudents.map((enquiry) => ({
    id: enquiry.id,
    type: "Student",
    primaryName: enquiry.name,
    secondaryDescriptor: enquiry.email || enquiry.interest || "Not specified",
    createdAt: enquiry.createdAt,
    href: `/admin/enquiries/${encodeURIComponent(enquiry.id)}`,
  }));
  const partnerActivity: RecentActivity[] = recentPartners.map((enquiry) => ({
    id: enquiry.id,
    type: "Partner",
    primaryName: enquiry.contactName,
    secondaryDescriptor: enquiry.organisation || enquiry.workEmail,
    createdAt: enquiry.createdAt,
    href: `/admin/partner-enquiries/${encodeURIComponent(enquiry.id)}`,
  }));
  const recentActivity = mergeRecentActivity(
    studentActivity,
    partnerActivity,
  );
  const studentDestinationChart = buildBreakdownChartData(studentBreakdown);
  const partnerLocationChart = buildBreakdownChartData(partnerBreakdown);
  const monthlyStudentChart = buildMonthlyChartData(
    monthlyStudentGroups,
    monthlyStudentKeys,
  );

  return (
    <div className="admin-dashboard admin-analytics-dashboard">
      <section className="admin-dashboard-heading" aria-labelledby="admin-heading">
        <div>
          <span className="login-eyebrow">Administrator overview</span>
          <h1 id="admin-heading">Dashboard</h1>
          <p>Monitor enquiry volume, notification delivery, and recent activity.</p>
        </div>
        <p className="admin-signed-in">
          Signed in as <strong>{session.user.email}</strong>
        </p>
      </section>

      <div className="admin-analytics-summary-grid">
        <SummarySection title="Student Enquiries" statistics={studentSummary} />
        <SummarySection title="Partner Enquiries" statistics={partnerSummary} />
        <section className="admin-analytics-card" aria-labelledby="notification-summary-heading">
          <h2 id="notification-summary-heading">Notification Status</h2>
          <div className="admin-notification-summary">
            <NotificationSummary title="Student" groups={studentNotificationGroups} />
            <NotificationSummary title="Partner" groups={partnerNotificationGroups} />
          </div>
        </section>
      </div>

      <DashboardCharts
        studentDestinations={studentDestinationChart}
        partnerLocations={partnerLocationChart}
        monthlyStudents={monthlyStudentChart}
      />

      <div className="admin-breakdown-grid">
        <BreakdownTable
          heading="Student destination / interest"
          eyebrow="Student enquiries"
          labelHeading="Destination / Interest"
          rows={studentBreakdown}
          emptyMessage="No student destination data available."
        />
        <BreakdownTable
          heading="Submitted location values"
          eyebrow="Partner enquiries"
          labelHeading="Location value"
          rows={partnerBreakdown}
          emptyMessage="No partner location data available."
        />
      </div>

      <section className="admin-table-card" aria-labelledby="recent-activity-heading">
        <div className="admin-table-heading">
          <div>
            <span>Across all enquiries</span>
            <h2 id="recent-activity-heading">Recent Activity</h2>
          </div>
          <small>Latest 10 submissions</small>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Primary Name</th>
                <th scope="col">Details</th>
                <th scope="col">Submitted Date</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length ? (
                recentActivity.map((activity) => (
                  <tr key={`${activity.type}-${activity.id}`}>
                    <td data-label="Type">{activity.type}</td>
                    <td data-label="Primary Name">{activity.primaryName}</td>
                    <td data-label="Details">{activity.secondaryDescriptor}</td>
                    <td data-label="Submitted Date">
                      {formatAnalyticsDate(activity.createdAt)}
                    </td>
                    <td className="admin-table-action">
                      <Link
                        href={activity.href}
                        aria-label={`View ${activity.type.toLowerCase()} enquiry from ${activity.primaryName}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan={5}>
                    No recent activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type SummarySectionProps = {
  title: string;
  statistics: Array<{ label: string; value: number }>;
};

function SummarySection({ title, statistics }: SummarySectionProps) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-summary`;
  return (
    <section className="admin-analytics-card" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <dl className="admin-analytics-stat-grid">
        {statistics.map((statistic) => (
          <div key={statistic.label}>
            <dt>{statistic.label}</dt>
            <dd>{statistic.value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type NotificationGroup = {
  notificationStatus: string;
  _count: { _all: number };
};

function NotificationSummary({
  title,
  groups,
}: {
  title: string;
  groups: NotificationGroup[];
}) {
  return (
    <div>
      <h3>{title}</h3>
      {groups.length ? (
        <dl>
          {groups.map((group) => (
            <div key={group.notificationStatus}>
              <dt>{group.notificationStatus}</dt>
              <dd>{group._count._all.toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>No notifications yet.</p>
      )}
    </div>
  );
}

type BreakdownTableProps = {
  heading: string;
  eyebrow: string;
  labelHeading: string;
  rows: Array<{ label: string; count: number; percentage: string }>;
  emptyMessage: string;
};

function BreakdownTable({
  heading,
  eyebrow,
  labelHeading,
  rows,
  emptyMessage,
}: BreakdownTableProps) {
  const headingId = `${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <section className="admin-table-card" aria-labelledby={headingId}>
      <div className="admin-table-heading">
        <div>
          <span>{eyebrow}</span>
          <h2 id={headingId}>{heading}</h2>
        </div>
        <small>Top 10 exact values</small>
      </div>
      <div className="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{labelHeading}</th>
              <th scope="col">Count</th>
              <th scope="col">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.label}>
                  <td data-label={labelHeading}>{row.label}</td>
                  <td data-label="Count">{row.count.toLocaleString("en-US")}</td>
                  <td data-label="Percentage">{row.percentage}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="admin-empty-row" colSpan={3}>{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
