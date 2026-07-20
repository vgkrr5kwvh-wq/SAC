"use client";
/* eslint-disable @next/next/no-img-element -- Cloudinary assets are selected dynamically by administrators. */

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveBlogPostAction } from "@/app/admin/blog/actions";
import { createInitialBlogFormState } from "@/lib/blog/form-state";

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
export type BlogMediaOption = { id: string; originalName: string; url: string; altText: string | null; width: number; height: number };

export default function BlogPostForm({ postId, initialValues, categories, selectedCategoryIds = [], media = [] }: { postId: string | null; initialValues: BlogFormValues; categories: Array<{ id: string; name: string; isActive: boolean }>; selectedCategoryIds?: string[]; media?: BlogMediaOption[] }) {
  const action = saveBlogPostAction.bind(null, postId);
  const [state, formAction] = useActionState(action, createInitialBlogFormState(initialValues, selectedCategoryIds));
  const value = (name: keyof BlogFormValues) => state.values[name];
  const error = (name: keyof BlogFormValues) => state.errors[name]?.[0];
  const selectedCategories = state.values.categoryIds.split(",").filter(Boolean);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const closePickerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const pickerTriggerRef = useRef<HTMLElement | null>(null);
  const [picker, setPicker] = useState<"content" | "cover" | null>(null);
  const openPicker = (target: "content" | "cover") => {
    pickerTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPicker(target);
  };
  const closePicker = () => {
    setPicker(null);
    requestAnimationFrame(() => pickerTriggerRef.current?.focus());
  };
  const chooseMedia = (asset: BlogMediaOption) => {
    if (picker === "cover" && coverRef.current) coverRef.current.value = asset.url;
    if (picker === "content" && contentRef.current) {
      const textarea = contentRef.current;
      const start = textarea.selectionStart;
      const markdown = `![${asset.altText ?? asset.originalName}](${asset.url})`;
      textarea.value = `${textarea.value.slice(0, start)}${markdown}${textarea.value.slice(textarea.selectionEnd)}`;
      textarea.focus();
      textarea.setSelectionRange(start + markdown.length, start + markdown.length);
    }
    closePicker();
  };
  useEffect(() => {
    if (!picker) return;
    closePickerRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closePicker(); return; }
      if (event.key !== "Tab" || !pickerRef.current) return;
      const focusable = [...pickerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1) as HTMLElement;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [picker]);
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
          <textarea ref={contentRef} id="blog-content" name="content" defaultValue={value("content")} rows={18} required {...fieldA11y("content", true)} />
          <button className="button secondary admin-media-choose" type="button" onClick={() => openPicker("content")}>Choose from Media Library</button>
        </Field>
        <Field label="Cover image URL" name="coverImageUrl" error={error("coverImageUrl")}>
          <input ref={coverRef} id="blog-coverImageUrl" name="coverImageUrl" type="url" defaultValue={value("coverImageUrl")} maxLength={2048} placeholder="https://example.com/image.jpg" {...fieldA11y("coverImageUrl")} />
          <button className="button secondary admin-media-choose" type="button" onClick={() => openPicker("cover")}>Choose from Media Library</button>
        </Field>
        <Field label="Status" name="status" error={error("status")}>
          <select id="blog-status" name="status" defaultValue={value("status")} {...fieldA11y("status")}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
        </Field>
        <Field label="Published date and time (Nepal Time)" name="publishedAt" error={error("publishedAt")} help="Optional. Publishing without a date uses the current time.">
          <input id="blog-publishedAt" name="publishedAt" type="datetime-local" defaultValue={value("publishedAt")} {...fieldA11y("publishedAt", true)} />
        </Field>
        <label className="admin-blog-checkbox"><input name="featured" type="checkbox" defaultChecked={state.values.featured === "true"} /> <span>Feature this post</span></label>
        <fieldset className="admin-blog-field is-wide" aria-describedby={state.errors.categoryIds ? "blog-categoryIds-error" : undefined}><legend>Categories</legend><div className="admin-category-options">{categories.length ? categories.map((category) => <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedCategories.includes(category.id)}/> {category.name}{category.isActive ? "" : " (Inactive)"}</label>) : <p>No active categories available.</p>}</div>{state.errors.categoryIds ? <p id="blog-categoryIds-error" className="admin-blog-field-error">{state.errors.categoryIds[0]}</p> : null}</fieldset>
        <Field label="SEO title" name="seoTitle" error={error("seoTitle")}>
          <input id="blog-seoTitle" name="seoTitle" defaultValue={value("seoTitle")} maxLength={70} {...fieldA11y("seoTitle")} />
        </Field>
        <Field label="Meta description" name="metaDescription" error={error("metaDescription")} wide>
          <textarea id="blog-metaDescription" name="metaDescription" defaultValue={value("metaDescription")} maxLength={160} rows={3} {...fieldA11y("metaDescription")} />
        </Field>
      </div>
      {state.message ? <p className="admin-profile-message" role="alert">{state.message}</p> : null}
      <SubmitButton label={postId ? "Save changes" : "Create post"} />
      {picker ? <div className="admin-media-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePicker(); }}><section ref={pickerRef} className="admin-media-picker" role="dialog" aria-modal="true" aria-labelledby="media-picker-title"><header><h2 id="media-picker-title">Choose from Media Library</h2><button ref={closePickerRef} type="button" onClick={closePicker} aria-label="Close media library">×</button></header>{media.length ? <div className="admin-media-picker-grid">{media.map((asset) => <button type="button" key={asset.id} onClick={() => chooseMedia(asset)}><img src={asset.url} alt="" width={asset.width} height={asset.height} loading="lazy"/><span>{asset.originalName}</span></button>)}</div> : <p>No uploaded images are available. Upload one in the Media Library first.</p>}</section></div> : null}
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
