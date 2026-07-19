import { z } from "zod";
import type { MediaFileTypeValue } from "./types";

export const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export const documentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;
const supportedMimeTypes = new Set<string>([...imageMimeTypes, ...documentMimeTypes]);
export const maxImageFileSize = 10 * 1024 * 1024;
export const maxImageDimension = 8000;

function optionalText(max: number) {
  return z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(max).nullable().optional().transform((value) => value ?? null),
  );
}

export const safeHttpsUrlSchema = z.string().trim().max(2048).url().superRefine((value, context) => {
  try {
    if (new URL(value).protocol !== "https:") context.addIssue({ code: "custom", message: "Use a valid HTTPS URL." });
  } catch {
    context.addIssue({ code: "custom", message: "Use a valid HTTPS URL." });
  }
});

const positiveOptionalInteger = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? null : value,
  z.coerce.number().int().positive().max(100000).nullable(),
);

export const mediaCreateSchema = z.object({
  url: safeHttpsUrlSchema,
  originalName: z.string().trim().min(1, "Original filename is required.").max(255),
  mimeType: z.string().trim().toLowerCase().max(100).refine((value) => supportedMimeTypes.has(value), "Unsupported MIME type."),
  fileType: z.enum(["IMAGE", "DOCUMENT"]),
  fileSize: z.coerce.number().int().positive("File size must be positive.").max(maxImageFileSize, "File size must not exceed 10 MB."),
  width: positiveOptionalInteger,
  height: positiveOptionalInteger,
  altText: optionalText(300),
  caption: optionalText(1000),
  folder: optionalText(255),
}).superRefine((value, context) => {
  const expectedType: MediaFileTypeValue = value.mimeType.startsWith("image/") ? "IMAGE" : "DOCUMENT";
  if (value.fileType !== expectedType) context.addIssue({ code: "custom", path: ["fileType"], message: `This MIME type must use ${expectedType}.` });
  if (value.fileType === "DOCUMENT" && (value.width !== null || value.height !== null)) {
    context.addIssue({ code: "custom", path: ["width"], message: "Document dimensions must be empty." });
  }
});

export const mediaMetadataSchema = z.object({
  originalName: z.string().trim().min(1, "Original filename is required.").max(255),
  altText: optionalText(300),
  caption: optionalText(1000),
  folder: optionalText(255),
});

export function validateMediaUpload(value: unknown) {
  return mediaCreateSchema.safeParse(value);
}

export function validateImageFile(file: File): string | null {
  if (!imageMimeTypes.includes(file.type as (typeof imageMimeTypes)[number])) return "Choose a JPEG, PNG, WebP, GIF, or AVIF image.";
  if (file.size <= 0) return "The selected image is empty.";
  if (file.size > maxImageFileSize) return "The image must not exceed 10 MB.";
  return null;
}

export function isValidImageDimensions(width: number, height: number): boolean {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= maxImageDimension && height <= maxImageDimension;
}

export function mediaDuplicateKey(checksum: string): { checksum: string } {
  return { checksum };
}

export function isPublishedMediaReference(asset: { url: string; secureUrl: string | null }, post: { content: string; coverImageUrl: string | null }): boolean {
  const urls = [asset.url, asset.secureUrl].filter((url): url is string => Boolean(url));
  return urls.some((url) => post.coverImageUrl === url || post.content.includes(url));
}

export function hasAuthenticatedMediaAdmin(value: unknown): boolean {
  if (!value || typeof value !== "object" || !("user" in value)) return false;
  const user = value.user;
  return Boolean(user && typeof user === "object" && "id" in user && typeof user.id === "string" && user.id.length > 0);
}

export function isSafeMediaImageUrl(value: unknown): value is string {
  return safeHttpsUrlSchema.safeParse(value).success;
}

export function isMediaAssetId(value: unknown): value is string {
  return typeof value === "string" && /^c[a-z0-9]{20,29}$/.test(value);
}
