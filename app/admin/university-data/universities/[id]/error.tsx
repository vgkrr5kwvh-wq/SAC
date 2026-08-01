"use client";

import Link from "next/link";

export default function UniversityManagementDetailError({ reset }: { error: Error; reset: () => void }) {
  return <div className="university-management-state" role="alert"><span>University Intelligence</span><h1>University overview unavailable</h1><p>We could not safely load this university record.</p><div><button className="button primary" type="button" onClick={reset}>Try again</button><Link className="button secondary" href="/admin/university-data/universities">Back to Universities</Link></div></div>;
}
