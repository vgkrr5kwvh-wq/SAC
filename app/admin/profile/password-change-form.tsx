"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { initialPasswordChangeState } from "@/lib/admin-password-change-state";
import { changePasswordAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button primary admin-profile-submit" type="submit" disabled={pending}>
      {pending ? "Updating password…" : "Update password"}
    </button>
  );
}

export default function PasswordChangeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    changePasswordAction,
    initialPasswordChangeState,
  );

  useEffect(() => {
    if (state.submission > 0) formRef.current?.reset();
  }, [state.submission]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="admin-profile-form"
      noValidate
    >
      <label htmlFor="current-password">Current Password</label>
      <input
        id="current-password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        maxLength={128}
      />

      <label htmlFor="new-password">New Password</label>
      <input
        id="new-password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={128}
        aria-describedby="password-requirements"
      />
      <p id="password-requirements" className="admin-profile-help">
        Use at least 12 characters with uppercase, lowercase, number, and special character.
      </p>

      <label htmlFor="confirm-password">Confirm New Password</label>
      <input
        id="confirm-password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={128}
      />

      <p
        className={`admin-profile-message${state.status === "success" ? " is-success" : ""}`}
        role={state.status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {state.message}
      </p>

      <SubmitButton />
    </form>
  );
}
