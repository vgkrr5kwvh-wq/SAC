"use client";
export default function AdmissionRequirementsError({ reset }: { reset: () => void }) {
  return <div className="requirement-management-state" role="alert"><h1>Admission requirements unavailable</h1><p>The admission requirements could not be loaded safely.</p><button className="button primary" type="button" onClick={reset}>Try again</button></div>;
}
