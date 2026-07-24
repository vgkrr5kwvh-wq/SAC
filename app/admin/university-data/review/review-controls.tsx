"use client";

import { useActionState } from "react";
import { reviewImportRecordAction, type ImportReviewActionState } from "../actions";

const initialState: ImportReviewActionState = { status: "idle", message: "" };

export default function ReviewControls({ recordId, enrichment = false }: { recordId: string; enrichment?: boolean }) {
  const [state, action, pending] = useActionState(reviewImportRecordAction, initialState);
  return (
    <form action={action} className="university-review-controls">
      <input type="hidden" name="recordId" value={recordId} />
      <label>Review note<textarea name="reviewNote" maxLength={2000} rows={2} /></label>
      <div>
        <button name="decision" value="APPROVED" type="submit" disabled={pending}>{enrichment ? "Approve enrichment" : "Approve"}</button>
        <button className="is-reject" name="decision" value="REJECTED" type="submit" disabled={pending}>{enrichment ? "Reject enrichment" : "Reject"}</button>
      </div>
      {state.message ? <p role="status" className={state.status === "error" ? "is-error" : ""}>{state.message}</p> : null}
    </form>
  );
}
