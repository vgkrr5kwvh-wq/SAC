import Link from "next/link";
export default function AdmissionRequirementsNotFound() {
  return <div className="requirement-management-state"><h1>University not found</h1><p>The requested university is unavailable.</p><Link className="button secondary" href="/admin/university-data/universities">Back to Universities</Link></div>;
}
