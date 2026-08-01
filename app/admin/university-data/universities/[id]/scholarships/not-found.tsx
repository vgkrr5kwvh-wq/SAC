import Link from "next/link";
export default function ScholarshipManagementNotFound() {
  return <div className="university-management-state"><span>University Intelligence</span><h1>University not found</h1><p>The university for this scholarship list does not exist.</p><Link className="button primary" href="/admin/university-data/universities">Back to Universities</Link></div>;
}
