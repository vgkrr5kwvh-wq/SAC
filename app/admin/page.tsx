import type { Metadata } from "next";
import Link from "next/link";
import {
  IoAlbumsOutline,
  IoBriefcaseOutline,
  IoCloudUploadOutline,
  IoImagesOutline,
  IoOpenOutline,
  IoPeopleOutline,
  IoPricetagsOutline,
  IoSparklesOutline,
} from "react-icons/io5";
import { buildHalfOpenDateFilter, formatAnalyticsDate, getNepalAnalyticsBoundaries } from "@/lib/admin-dashboard-analytics";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/admin-authorization";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "CMS dashboard",
  robots: { index: false, follow: false },
};

async function getDashboardData() {
  const boundaries = getNepalAnalyticsBoundaries();
  const today = buildHalfOpenDateFilter(boundaries.startOfToday, boundaries.startOfTomorrow);
  const month = buildHalfOpenDateFilter(boundaries.startOfMonth, boundaries.startOfNextMonth);

  return prisma.$transaction([
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { createdAt: today } }),
    prisma.enquiry.count({ where: { createdAt: month } }),
    prisma.partnerEnquiry.count(),
    prisma.partnerEnquiry.count({ where: { createdAt: today } }),
    prisma.partnerEnquiry.count({ where: { createdAt: month } }),
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    prisma.blogPost.count({ where: { status: "DRAFT" } }),
    prisma.blogPost.count({ where: { status: "PUBLISHED", publishedAt: month } }),
    prisma.category.count(),
    prisma.mediaAsset.count(),
    prisma.mediaAsset.count({ where: { createdAt: month } }),
    prisma.enquiry.findMany({ take: 5, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, name: true, interest: true, notificationStatus: true, createdAt: true } }),
    prisma.partnerEnquiry.findMany({ take: 5, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, contactName: true, organisation: true, notificationStatus: true, createdAt: true } }),
    prisma.blogPost.findMany({ take: 5, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, title: true, status: true, updatedAt: true } }),
    prisma.mediaAsset.findMany({ take: 5, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, originalName: true, provider: true, createdAt: true } }),
  ]);
}

export default async function AdminPage() {
  const session = await requireAdmin("view_dashboard");
  let data;
  try {
    data = await getDashboardData();
  } catch {
    return <section className="admin-error" role="alert"><h1>Dashboard unavailable</h1><p>Please refresh the page in a moment.</p></section>;
  }

  const [students, studentsToday, studentsMonth, partners, partnersToday, partnersMonth, published, drafts, publishedMonth, categories, media, uploadsMonth, recentStudents, recentPartners, recentPosts, recentMedia] = data;
  const statistics = [
    { label: "Student Enquiries", value: students, secondary: `${studentsToday} today`, href: "/admin/enquiries", icon: IoPeopleOutline, tone: "blue" },
    { label: "Partner Enquiries", value: partners, secondary: `${partnersToday} today`, href: "/admin/partner-enquiries", icon: IoBriefcaseOutline, tone: "violet" },
    { label: "Published Blogs", value: published, secondary: `${publishedMonth} this month`, href: "/admin/blog", icon: IoAlbumsOutline, tone: "green" },
    { label: "Draft Blogs", value: drafts, secondary: "Awaiting publication", href: "/admin/blog", icon: IoSparklesOutline, tone: "amber" },
    { label: "Categories", value: categories, secondary: "Content groups", href: "/admin/blog/categories", icon: IoPricetagsOutline, tone: "rose" },
    { label: "Media Files", value: media, secondary: `${uploadsMonth} this month`, href: "/admin/media", icon: IoImagesOutline, tone: "cyan" },
  ];
  const quickActions = [
    { href: "/admin/blog/new", label: "New Blog", icon: IoAlbumsOutline, permission: "manage_blog" as const },
    { href: "/admin/media/new", label: "Upload Media", icon: IoCloudUploadOutline, permission: "manage_media" as const },
    { href: "/admin/blog/categories", label: "Manage Categories", icon: IoPricetagsOutline, permission: "manage_categories" as const },
  ].filter((action) => hasAdminPermission(session.user.role, action.permission));
  const canManageEnquiries = hasAdminPermission(session.user.role, "manage_enquiries");
  const canManageBlog = hasAdminPermission(session.user.role, "manage_blog");
  const canManageMedia = hasAdminPermission(session.user.role, "manage_media");

  return <div className="admin-dashboard cms-dashboard">
    <header className="cms-dashboard-heading">
      <div><span>Overview</span><h1>Dashboard</h1><p>Content, enquiries and media at a glance.</p></div>
      <div className="cms-quick-actions" aria-label="Quick actions">
        {quickActions.map(({ href, label, icon: Icon }) => <Link href={href} key={href}><Icon aria-hidden="true"/>{label}</Link>)}
        <Link href="/" target="_blank"><IoOpenOutline aria-hidden="true"/>View Website</Link>
      </div>
    </header>

    <section className="cms-stat-grid" aria-label="Content statistics">
      {statistics.map(({ icon: Icon, ...stat }) => <Link className={`cms-stat-card is-${stat.tone}`} href={stat.href} key={stat.label}>
        <span className="cms-stat-icon"><Icon aria-hidden="true"/></span>
        <span className="cms-stat-label">{stat.label}</span>
        <strong>{stat.value.toLocaleString("en-US")}</strong>
        <small>{stat.secondary}</small>
      </Link>)}
    </section>

    <section className="cms-analytics-grid" aria-labelledby="analytics-title">
      <div className="cms-section-heading"><div><span>Current month</span><h2 id="analytics-title">Analytics snapshot</h2></div></div>
      <AnalyticsCard label="Student enquiries" value={studentsMonth} total={students} tone="blue" />
      <AnalyticsCard label="Partner enquiries" value={partnersMonth} total={partners} tone="violet" />
      <AnalyticsCard label="Published blogs" value={publishedMonth} total={published} tone="green" />
      <AnalyticsCard label="Recent uploads" value={uploadsMonth} total={media} tone="cyan" />
    </section>

    <section className="cms-activity-section" aria-labelledby="activity-title">
      <div className="cms-section-heading"><div><span>Latest records</span><h2 id="activity-title">Recent activity</h2></div><small>Five newest in each collection</small></div>
      <div className="cms-activity-grid">
        {canManageEnquiries ? <><ActivityCard title="Latest Student Enquiries" href="/admin/enquiries" empty="No enquiries yet" items={recentStudents.map((item) => ({ id: item.id, title: item.name, detail: item.interest || "General enquiry", status: item.notificationStatus, date: item.createdAt, href: `/admin/enquiries/${item.id}` }))}/><ActivityCard title="Latest Partner Enquiries" href="/admin/partner-enquiries" empty="No partner enquiries yet" items={recentPartners.map((item) => ({ id: item.id, title: item.contactName, detail: item.organisation, status: item.notificationStatus, date: item.createdAt, href: `/admin/partner-enquiries/${item.id}` }))}/></> : null}
        {canManageBlog ? <ActivityCard title="Latest Blog Posts" href="/admin/blog" empty="No blog posts" items={recentPosts.map((item) => ({ id: item.id, title: item.title, detail: "Blog post", status: item.status, date: item.updatedAt, href: `/admin/blog/${item.id}/edit` }))}/> : null}
        {canManageMedia ? <ActivityCard title="Latest Uploaded Images" href="/admin/media" empty="No media uploaded" items={recentMedia.map((item) => ({ id: item.id, title: item.originalName, detail: "Image asset", status: item.provider, date: item.createdAt, href: `/admin/media/${item.id}` }))}/> : null}
      </div>
    </section>
  </div>;
}

function AnalyticsCard({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return <article className={`cms-analytics-card is-${tone}`}><div><span>{label}</span><strong>{value.toLocaleString("en-US")}</strong></div><p>{percentage}% of all-time total</p><div className="cms-progress" aria-label={`${label}: ${percentage}% of all-time total`}><span style={{ width: `${percentage}%` }}/></div></article>;
}

type ActivityItem = { id: string; title: string; detail: string; status: string; date: Date; href: string };
function ActivityCard({ title, href, empty, items }: { title: string; href: string; empty: string; items: ActivityItem[] }) {
  return <article className="cms-activity-card"><header><h3>{title}</h3><Link href={href}>View all</Link></header>{items.length ? <ul>{items.map((item) => <li key={item.id}><Link href={item.href}><span className="cms-activity-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><span className="cms-activity-meta"><em className={`cms-status is-${item.status.toLowerCase()}`}>{item.status}</em><time dateTime={item.date.toISOString()}>{formatAnalyticsDate(item.date)}</time></span></Link></li>)}</ul> : <div className="cms-empty-state"><span><IoSparklesOutline aria-hidden="true"/></span><strong>{empty}</strong><p>New records will appear here.</p></div>}</article>;
}
