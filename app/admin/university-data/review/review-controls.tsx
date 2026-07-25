"use client";

import { useActionState } from "react";
import { reviewImportRecordAction, type ImportReviewActionState } from "../actions";

const initialState: ImportReviewActionState = { status: "idle", message: "" };

export function ReviewActionButtons({
  enrichment,
  pending,
}: {
  enrichment: boolean;
  pending: boolean;
}) {
  return <div className="university-review-action-buttons">
    <button name="decision" value="APPROVED" type="submit" disabled={pending}>
      {enrichment ? "Approve enrichment" : "Approve"}
    </button>
    <button className="is-reject" name="decision" value="REJECTED" type="submit" disabled={pending}>
      {enrichment ? "Reject enrichment" : "Reject"}
    </button>
  </div>;
}

export default function ReviewControls({
  recordId,
  enrichment = false,
  status,
  entityType,
  createdAt,
  claimCount,
}: {
  recordId: string;
  enrichment?: boolean;
  status: string;
  entityType: string;
  createdAt: string;
  claimCount: number;
}) {
  const [state, action, pending] = useActionState(reviewImportRecordAction, initialState);
  return (
    <form action={action} className="university-review-controls" id={`review-actions-${recordId}`} aria-busy={pending}>
      <input type="hidden" name="recordId" value={recordId} />
      <div className="university-review-action-summary">
        <dl>
          <div><dt>Status</dt><dd>{status.replaceAll("_", " ")}</dd></div>
          <div><dt>Entity type</dt><dd>{entityType.replaceAll("-", " ")}</dd></div>
          <div><dt>Created</dt><dd>{createdAt}</dd></div>
          <div><dt>Claims</dt><dd>{claimCount}</dd></div>
        </dl>
        <div className="university-review-action-links">
          <a href={enrichment ? `#claims-${recordId}` : `#record-details-${recordId}`}>
            {enrichment ? "Jump to claims" : "Jump to record details"}
          </a>
          <ReviewActionButtons enrichment={enrichment} pending={pending} />
        </div>
      </div>
      <label>Review note<textarea name="reviewNote" maxLength={2000} rows={2} disabled={pending} /></label>
      {state.message ? <p role="status" className={state.status === "error" ? "is-error" : ""}>{state.message}</p> : null}
    </form>
  );
}
