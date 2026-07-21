"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAdminUserAction, resetAdminPasswordAction, updateAdminUserAction } from "./actions";
import { initialAdminUserFormState } from "@/lib/admin-user-management";
import type { AdminRole } from "@prisma/client";

function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>; }
function ErrorText({ errors, name }: { errors: Record<string,string[]>; name: string }) { return errors[name]?.[0] ? <p className="admin-blog-field-error" id={`user-${name}-error`}>{errors[name][0]}</p> : null; }

export function AdminUserForm({ id, initial }: { id?: string; initial?: { name: string; email: string; role: AdminRole; isActive: boolean } }) {
  const action = id ? updateAdminUserAction.bind(null, id) : createAdminUserAction;
  const [state, formAction] = useActionState(action, initialAdminUserFormState);
  const value = (name: string, fallback = "") => state.values[name] ?? fallback;
  return <form action={formAction} className="admin-category-form cms-user-form" noValidate>
    <label htmlFor="user-name">Display name</label><input id="user-name" name="name" defaultValue={value("name", initial?.name)} required maxLength={120} aria-invalid={Boolean(state.errors.name)}/><ErrorText errors={state.errors} name="name"/>
    <label htmlFor="user-email">Email address</label><input id="user-email" name="email" type="email" defaultValue={value("email", initial?.email)} required maxLength={191} aria-invalid={Boolean(state.errors.email)}/><ErrorText errors={state.errors} name="email"/>
    <label htmlFor="user-role">Role</label><select id="user-role" name="role" defaultValue={value("role", initial?.role ?? "STAFF")}><option value="SUPER_ADMIN">Super Admin</option><option value="EDITOR">Editor</option><option value="STAFF">Staff</option></select><ErrorText errors={state.errors} name="role"/>
    {id ? <label className="admin-blog-checkbox"><input name="isActive" type="checkbox" defaultChecked={value("isActive", String(initial?.isActive)) === "true"}/> Active account</label> : <><label htmlFor="user-password">Temporary password</label><input id="user-password" name="password" type="password" autoComplete="new-password" required/><ErrorText errors={state.errors} name="password"/><label htmlFor="user-confirm">Confirm password</label><input id="user-confirm" name="confirmPassword" type="password" autoComplete="new-password" required/><ErrorText errors={state.errors} name="confirmPassword"/></>}
    {state.message ? <p className="admin-profile-message" role="alert">{state.message}</p> : null}<Submit label={id ? "Save user" : "Create user"}/>
  </form>;
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action] = useActionState(resetAdminPasswordAction.bind(null, id), initialAdminUserFormState);
  return <form action={action} className="admin-category-form cms-user-form" noValidate><label htmlFor="reset-password">New password</label><input id="reset-password" name="password" type="password" autoComplete="new-password" required/><ErrorText errors={state.errors} name="password"/><label htmlFor="reset-confirm">Confirm new password</label><input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" required/><ErrorText errors={state.errors} name="confirmPassword"/>{state.message ? <p className="admin-profile-message" role="alert">{state.message}</p> : null}<Submit label="Reset password"/></form>;
}
