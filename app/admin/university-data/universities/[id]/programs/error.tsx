"use client";

import Link from "next/link";

export default function ProgramManagementError({ reset }: { error: Error; reset: () => void }) {
  return <div className="university-management-state" role="alert"><span>University Intelligence</span><h1>Programs unavailable</h1><p>We could not safely load these program records.</p><div><button className="button primary" type="button" onClick={reset}>Try again</button><Link className="button secondary" href="/admin/university-data/universities">Back to Universities</Link></div></div>;
}
