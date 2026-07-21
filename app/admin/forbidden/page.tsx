import Link from "next/link";

export default function PermissionDeniedPage() {
  return <section className="admin-error cms-permission-denied" role="alert"><span className="login-eyebrow">Permission denied</span><h1>You do not have access to this area.</h1><p>Your account is active, but its assigned role does not include this permission.</p><Link className="button primary" href="/admin">Return to dashboard</Link></section>;
}
