"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { initialBlogFormState, saveBlogPostAction } from "@/app/admin/blog/actions";

export type BlogFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: "DRAFT" | "PUBLISHED";
  featured: boolean;
  seoTitle: string;
  metaDescription: string;
  publishedAt: string;
};

export default function BlogPostForm({ postId, initialValues, categories, selectedCategoryIds = [] }: { postId: string | null; initialValues: BlogFormValues; categories: Array<{ id: string; name: string; isActive: boolean }>; selectedCategoryIds?: string[] }) {
  const action = saveBlogPostAction.bind(null, postId);
  const [state, formAction] = useActionState(action, initialBlogFormState);
  const value = (name: keyof BlogFormValues) => state.values[name] ?? String(initialValues[name]);
  const error = (name: keyof BlogFormValues) => state.errors[name]?.[0];
  const fieldA11y = (name: keyof BlogFormValues, hasHelp = false) => ({
    "aria-invalid": Boolean(error(name)),
    "aria-describedby": [error(name) ? `blog-${name}-error` : "", hasHelp ? `blog-${name}-help` : ""].filter(Boolean).join(" ") || undefined,
  });

  return (
    <form className="admin-blog-form" action={formAction} noValidate>
      <div className="admin-blog-form-grid">
        <Field label="Title" name="title" error={error("title")}>
          <input id="blog-title" name="title" defaultValue={value("title")} maxLength={200} required {...fieldA11y("title")} />
        </Field>
        <Field label="Slug" name="slug" error={error("slug")} help="Lowercase letters, numbers, and hyphens only.">
          <input id="blog-slug" name="slug" defaultValue={value("slug")} maxLength={220} required {...fieldA11y("slug", true)} />
        </Field>
        <Field label="Excerpt" name="excerpt" error={error("excerpt")} wide>
          <textarea id="blog-excerpt" name="excerpt" defaultValue={value("excerpt")} maxLength={500} rows={3} {...fieldA11y("excerpt")} />
        </Field>
        <Field label="Content" name="content" error={error("content")} help="Markdown supports headings, emphasis, links, lists, blockquotes, and code blocks." wide>
          <textarea id="blog-content" name="content" defaultValue={value("content")} rows={18} required {...fieldA11y("content", true)} />
        </Field>
        <Field label="Cover image URL" name="coverImageUrl" error={error("coverImageUrl")}>
          <input id="blog-coverImageUrl" name="coverImageUrl" type="url" defaultValue={value("coverImageUrl")} maxLength={2048} placeholder="https://example.com/image.jpg" {...fieldA11y("coverImageUrl")} />
        </Field>
        <Field label="Status" name="status" error={error("status")}>
          <select id="blog-status" name="status" defaultValue={value("status")} {...fieldA11y("status")}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
        </Field>
        <Field label="Published date and time (Nepal Time)" name="publishedAt" error={error("publishedAt")} help="Optional. Publishing without a date uses the current time.">
          <input id="blog-publishedAt" name="publishedAt" type="datetime-local" defaultValue={value("publishedAt")} {...fieldA11y("publishedAt", true)} />
        </Field>
        <label className="admin-blog-checkbox"><input name="featured" type="checkbox" defaultChecked={(state.values.featured ?? String(initialValues.featured)) === "true"} /> <span>Feature this post</span></label>
        <fieldset className="admin-blog-field is-wide"><legend>Categories</legend><div className="admin-category-options">{categories.length ? categories.map((category) => <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedCategoryIds.includes(category.id)}/> {category.name}{category.isActive ? "" : " (Inactive)"}</label>) : <p>No active categories available.</p>}</div>{state.errors.categoryIds ? <p className="admin-blog-field-error">{state.errors.categoryIds[0]}</p> : null}</fieldset>
        <Field label="SEO title" name="seoTitle" error={error("seoTitle")}>
          <input id="blog-seoTitle" name="seoTitle" defaultValue={value("seoTitle")} maxLength={70} {...fieldA11y("seoTitle")} />
        </Field>
        <Field label="Meta description" name="metaDescription" error={error("metaDescription")} wide>
          <textarea id="blog-metaDescription" name="metaDescription" defaultValue={value("metaDescription")} maxLength={160} rows={3} {...fieldA11y("metaDescription")} />
        </Field>
      </div>
      {state.message ? <p className="admin-profile-message" role="alert">{state.message}</p> : null}
      <SubmitButton label={postId ? "Save changes" : "Create post"} />
    </form>
  );
}

function Field({ label, name, error, help, wide, children }: { label: string; name: keyof BlogFormValues; error?: string; help?: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`admin-blog-field${wide ? " is-wide" : ""}`}><label htmlFor={`blog-${name}`}>{label}</label>{children}{help ? <p id={`blog-${name}-help`} className="admin-profile-help">{help}</p> : null}{error ? <p id={`blog-${name}-error`} className="admin-blog-field-error">{error}</p> : null}</div>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}
