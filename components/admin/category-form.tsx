"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategoryAction, type CategoryFormState } from "@/app/admin/blog/categories/actions";

const initialCategoryFormState: CategoryFormState = { message: "", errors: {}, values: {} };
type CategoryValues = { name: string; slug: string; description: string; isActive: boolean; sortOrder: number };

export default function CategoryForm({ id = null, values = { name: "", slug: "", description: "", isActive: true, sortOrder: 0 } }: { id?: string | null; values?: CategoryValues }) {
  const [state, action] = useActionState(saveCategoryAction.bind(null, id), initialCategoryFormState);
  const value = (name: string, fallback: string) => state.values[name] ?? fallback;
  const error = (name: string) => state.errors[name]?.[0];
  const describedBy = (name: string) => error(name) ? `category-${name}-error` : undefined;
  return <form action={action} className="admin-category-form" noValidate>
    <label htmlFor="category-name">Name</label><input id="category-name" name="name" defaultValue={value("name", values.name)} required maxLength={120} aria-invalid={Boolean(error("name"))} aria-describedby={describedBy("name")}/><FieldError name="name" error={error("name")}/>
    <label htmlFor="category-slug">Slug</label><input id="category-slug" name="slug" defaultValue={value("slug", values.slug)} required maxLength={160} aria-invalid={Boolean(error("slug"))} aria-describedby={describedBy("slug")}/><FieldError name="slug" error={error("slug")}/>
    <label htmlFor="category-description">Description</label><textarea id="category-description" name="description" defaultValue={value("description", values.description)} maxLength={500} aria-invalid={Boolean(error("description"))} aria-describedby={describedBy("description")}/><FieldError name="description" error={error("description")}/>
    <label htmlFor="category-sortOrder">Sort order</label><input id="category-sortOrder" name="sortOrder" type="number" defaultValue={value("sortOrder", String(values.sortOrder))} min={-10000} max={10000} aria-invalid={Boolean(error("sortOrder"))} aria-describedby={describedBy("sortOrder")}/><FieldError name="sortOrder" error={error("sortOrder")}/>
    <label className="admin-blog-checkbox"><input name="isActive" type="checkbox" defaultChecked={value("isActive", String(values.isActive)) === "true"}/> Active</label>
    {state.message ? <p className="admin-profile-message" role="alert">{state.message}</p> : null}<Submit label={id ? "Save category" : "Create category"}/>
  </form>;
}

function FieldError({ name, error }: { name: string; error?: string }) {
  return error ? <p className="admin-blog-field-error" id={`category-${name}-error`}>{error}</p> : null;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}
