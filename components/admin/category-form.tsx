"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategoryAction, type CategoryFormState } from "@/app/admin/blog/categories/actions";

const initialCategoryFormState: CategoryFormState = { message: "", errors: {} };

export default function CategoryForm({ id = null, values = { name: "", slug: "", description: "", isActive: true, sortOrder: 0 } }: { id?: string | null; values?: { name: string; slug: string; description: string; isActive: boolean; sortOrder: number } }) {
  const [state, action] = useActionState(saveCategoryAction.bind(null, id), initialCategoryFormState);
  return <form action={action} className="admin-category-form" noValidate><label>Name<input name="name" defaultValue={values.name} required maxLength={120} aria-describedby={state.errors.name ? "category-name-error" : undefined}/></label>{state.errors.name ? <p id="category-name-error">{state.errors.name[0]}</p> : null}<label>Slug<input name="slug" defaultValue={values.slug} required maxLength={160} aria-describedby={state.errors.slug ? "category-slug-error" : undefined}/></label>{state.errors.slug ? <p id="category-slug-error">{state.errors.slug[0]}</p> : null}<label>Description<textarea name="description" defaultValue={values.description} maxLength={500}/></label><label>Sort order<input name="sortOrder" type="number" defaultValue={values.sortOrder} min={-10000} max={10000}/></label><label className="admin-blog-checkbox"><input name="isActive" type="checkbox" defaultChecked={values.isActive}/> Active</label>{state.message ? <p role="alert">{state.message}</p> : null}<Submit label={id ? "Save category" : "Create category"}/></form>;
}
function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="button primary" disabled={pending}>{pending ? "Saving…" : label}</button>; }
