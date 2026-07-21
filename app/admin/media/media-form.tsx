"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createInitialMediaFormState, type MediaFormValues } from "@/lib/media/form-state";
import { createMediaAction, updateMediaAction } from "./actions";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.[0] ? <p className="admin-media-field-error" id={id}>{errors[0]}</p> : null;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="button primary" disabled={pending} type="submit" aria-disabled={pending}>{pending ? "Uploading…" : label}</button>;
}

export function CreateMediaForm() {
  const [state, action] = useActionState(createMediaAction, createInitialMediaFormState());
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return <form action={action} className="admin-media-form" noValidate>
    <div className={`admin-media-dropzone${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (inputRef.current && event.dataTransfer.files[0]) { const transfer = new DataTransfer(); transfer.items.add(event.dataTransfer.files[0]); inputRef.current.files = transfer.files; } }}>
      <label htmlFor="media-file">Choose an image or drag and drop it here</label><p id="media-file-help">JPEG, PNG, WebP, GIF, or AVIF. Maximum 10 MB and 8000 × 8000 pixels.</p><input ref={inputRef} id="media-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" required aria-invalid={Boolean(state.errors.file)} aria-describedby={`media-file-help${state.errors.file ? " media-file-error" : ""}`}/><FieldError id="media-file-error" errors={state.errors.file}/>
    </div>
    <label htmlFor="media-folder">Cloudinary folder (optional)</label><input id="media-folder" name="folder" defaultValue={state.values.folder} maxLength={255} placeholder="sac/media" aria-invalid={Boolean(state.errors.folder)} aria-describedby={state.errors.folder ? "media-folder-error" : undefined}/><FieldError id="media-folder-error" errors={state.errors.folder}/>
    <label htmlFor="media-alt">Alt text (optional)</label><input id="media-alt" name="altText" defaultValue={state.values.altText} maxLength={300} aria-invalid={Boolean(state.errors.altText)} aria-describedby={state.errors.altText ? "media-alt-error" : undefined}/><FieldError id="media-alt-error" errors={state.errors.altText}/>
    <label htmlFor="media-caption">Caption (optional)</label><textarea id="media-caption" name="caption" defaultValue={state.values.caption} maxLength={1000} aria-invalid={Boolean(state.errors.caption)} aria-describedby={state.errors.caption ? "media-caption-error" : undefined}/><FieldError id="media-caption-error" errors={state.errors.caption}/>
    {state.message ? <p className="admin-media-message is-error" role="alert">{state.message}</p> : null}<SubmitButton label="Upload image"/>
  </form>;
}

export function EditMediaForm({ id, values }: { id: string; values: MediaFormValues }) {
  const [state, action] = useActionState(updateMediaAction.bind(null, id), createInitialMediaFormState(values));
  return <form action={action} className="admin-media-form" noValidate>
    <label htmlFor="media-name">Original filename</label><input id="media-name" name="originalName" defaultValue={state.values.originalName} required maxLength={255} aria-invalid={Boolean(state.errors.originalName)} aria-describedby={state.errors.originalName ? "media-name-error" : undefined}/><FieldError id="media-name-error" errors={state.errors.originalName}/>
    <label htmlFor="media-alt">Alt text</label><input id="media-alt" name="altText" defaultValue={state.values.altText} maxLength={300} aria-invalid={Boolean(state.errors.altText)} aria-describedby={state.errors.altText ? "media-alt-error" : undefined}/><FieldError id="media-alt-error" errors={state.errors.altText}/>
    <label htmlFor="media-caption">Caption</label><textarea id="media-caption" name="caption" defaultValue={state.values.caption} maxLength={1000} aria-invalid={Boolean(state.errors.caption)} aria-describedby={state.errors.caption ? "media-caption-error" : undefined}/><FieldError id="media-caption-error" errors={state.errors.caption}/>
    <label htmlFor="media-folder">Folder</label><input id="media-folder" name="folder" defaultValue={state.values.folder} maxLength={255} aria-invalid={Boolean(state.errors.folder)} aria-describedby={state.errors.folder ? "media-folder-error" : undefined}/><FieldError id="media-folder-error" errors={state.errors.folder}/>
    {state.message ? <p className="admin-media-message is-error" role="alert">{state.message}</p> : null}<SubmitButton label="Save metadata"/>
  </form>;
}
