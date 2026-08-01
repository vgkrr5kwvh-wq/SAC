import Link from "next/link";

export default function UniversityManagementDetailNotFound() {
  return <div className="university-management-state"><span>University Intelligence</span><h1>University not found</h1><p>The university may have been removed or the management link is invalid.</p><Link className="button primary" href="/admin/university-data/universities">Back to Universities</Link></div>;
}
