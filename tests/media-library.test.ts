import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildMediaAdminUrl, buildMediaSearchWhere, formatDimensions, formatFileSize, parseMediaPage, parseMediaSearch, parseMediaType } from "../lib/media/params";
import { canDeleteMediaRecord, externalStorageProvider, getMediaStorageProvider, normalizeExternalResult } from "../lib/media/storage";
import { hasAuthenticatedMediaAdmin, isMediaAssetId, isPublishedMediaReference, isSafeMediaImageUrl, mediaCreateSchema, mediaDuplicateKey, mediaMetadataSchema, validateImageFile, validateMediaUpload } from "../lib/media/validation";
import { readImageDimensions } from "../lib/media/image-metadata";
import { CloudinaryConfigurationError, parseCloudinaryConfig } from "../lib/media/cloudinary-config-values";

const validImage = {
  url: "https://cdn.example.com/media/campus.webp",
  originalName: " Campus photo.webp ",
  mimeType: "image/webp",
  fileType: "IMAGE",
  fileSize: "2048",
  width: "1200",
  height: "800",
  altText: " Campus in Kathmandu ",
  caption: "",
  folder: " blog/covers ",
};

test("validates and normalizes an external HTTPS image", () => {
  const value = mediaCreateSchema.parse(validImage);
  assert.equal(value.url, validImage.url);
  assert.equal(value.originalName, "Campus photo.webp");
  assert.equal(value.fileSize, 2048);
  assert.equal(value.width, 1200);
  assert.equal(value.caption, null);
  assert.equal(value.folder, "blog/covers");
  assert.equal(validateMediaUpload(validImage).success, true);
});

test("rejects unsafe and non-HTTPS media URLs", () => {
  for (const url of ["http://example.com/a.jpg", "javascript:alert(1)", "data:image/png;base64,abc", "blob:https://example.com/id", "//example.com/a.jpg"]) {
    assert.equal(mediaCreateSchema.safeParse({ ...validImage, url }).success, false);
    assert.equal(isSafeMediaImageUrl(url), false);
  }
  assert.equal(isSafeMediaImageUrl(validImage.url), true);
});

test("enforces supported MIME and file-type consistency", () => {
  assert.equal(mediaCreateSchema.safeParse({ ...validImage, mimeType: "application/pdf", fileType: "IMAGE" }).success, false);
  assert.equal(mediaCreateSchema.safeParse({ ...validImage, mimeType: "application/octet-stream" }).success, false);
  assert.equal(mediaCreateSchema.safeParse({ ...validImage, mimeType: "application/pdf", fileType: "DOCUMENT", width: "", height: "" }).success, true);
});

test("validates positive file sizes and dimensions", () => {
  assert.equal(mediaCreateSchema.safeParse({ ...validImage, fileSize: "0" }).success, false);
  assert.equal(mediaCreateSchema.safeParse({ ...validImage, fileSize: "-1" }).success, false);
  assert.equal(mediaCreateSchema.safeParse({ ...validImage, width: "0" }).success, false);
  assert.equal(mediaCreateSchema.safeParse({ ...validImage, height: "-2" }).success, false);
});

test("normalizes optional metadata and validates metadata edits", () => {
  const metadata = mediaMetadataSchema.parse({ originalName: " Guide.pdf ", altText: "", caption: " Notes ", folder: "" });
  assert.deepEqual(metadata, { originalName: "Guide.pdf", altText: null, caption: "Notes", folder: null });
  assert.equal(mediaMetadataSchema.safeParse({ ...metadata, originalName: "" }).success, false);
});

test("normalizes provider results without inventing upload support", async () => {
  const input = mediaCreateSchema.parse(validImage);
  const result = normalizeExternalResult(input);
  assert.equal(result.provider, "EXTERNAL");
  assert.equal(result.fileName, "campus.webp");
  assert.equal(result.secureUrl, input.url);
  assert.equal(result.publicId, null);
  assert.deepEqual(await externalStorageProvider.delete({ publicId: null, url: input.url }), { status: "unsupported" });
});

test("deletes records only after deleted or explicitly unsupported provider outcomes", () => {
  assert.equal(canDeleteMediaRecord({ status: "deleted" }), true);
  assert.equal(canDeleteMediaRecord({ status: "unsupported" }), true);
  assert.equal(canDeleteMediaRecord({ status: "failed" }), false);
  assert.equal(getMediaStorageProvider("EXTERNAL"), externalStorageProvider);
  assert.equal(getMediaStorageProvider("UNKNOWN"), null);
});

test("rejects unauthenticated media mutation contexts", () => {
  assert.equal(hasAuthenticatedMediaAdmin(null), false);
  assert.equal(hasAuthenticatedMediaAdmin({ user: null }), false);
  assert.equal(hasAuthenticatedMediaAdmin({ user: { id: "" } }), false);
  assert.equal(hasAuthenticatedMediaAdmin({ user: { id: "c12345678901234567890" } }), true);
});

test("parses media pagination and filter state safely", () => {
  assert.equal(parseMediaPage(undefined), 1);
  assert.equal(parseMediaPage("0"), 1);
  assert.equal(parseMediaPage("2.5"), 1);
  assert.equal(parseMediaPage(["2"]), 1);
  assert.equal(parseMediaPage("42"), 42);
  assert.equal(parseMediaType("IMAGE"), "IMAGE");
  assert.equal(parseMediaType("unsafe"), "");
  assert.equal(buildMediaAdminUrl(3, "DOCUMENT"), "/admin/media?page=3&type=DOCUMENT");
  assert.equal(parseMediaSearch(["bad"]), "");
  assert.equal(parseMediaSearch(" campus.png "), "campus.png");
  assert.equal(buildMediaAdminUrl(2, "", "campus.png"), "/admin/media?page=2&search=campus.png");
  assert.deepEqual(buildMediaSearchWhere("campus"), { OR: [{ fileName: { contains: "campus" } }, { originalName: { contains: "campus" } }] });
  assert.deepEqual(buildMediaSearchWhere(""), {});
});

test("validates upload MIME and maximum size", () => {
  assert.equal(validateImageFile(new File(["image"], "campus.png", { type: "image/png" })), null);
  assert.match(validateImageFile(new File(["text"], "notes.txt", { type: "text/plain" })) ?? "", /JPEG/);
  assert.match(validateImageFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })) ?? "", /10 MB/);
});

test("reports every missing Cloudinary environment variable without exposing values", () => {
  assert.throws(
    () => parseCloudinaryConfig({ CLOUDINARY_CLOUD_NAME: " ", CLOUDINARY_API_KEY: undefined, CLOUDINARY_API_SECRET: "" }),
    (error) => error instanceof CloudinaryConfigurationError
      && error.message.includes("CLOUDINARY_CLOUD_NAME")
      && error.message.includes("CLOUDINARY_API_KEY")
      && error.message.includes("CLOUDINARY_API_SECRET"),
  );
});

test("parses trimmed Cloudinary server configuration", () => {
  assert.deepEqual(parseCloudinaryConfig({
    CLOUDINARY_CLOUD_NAME: " sac-cloud ",
    CLOUDINARY_API_KEY: " key-123 ",
    CLOUDINARY_API_SECRET: " secret-456 ",
  }), { cloudName: "sac-cloud", apiKey: "key-123", apiSecret: "secret-456" });
});

test("does not reference Cloudinary secrets in Media Library client components", () => {
  for (const file of ["app/admin/media/media-form.tsx", "app/admin/media/media-card-actions.tsx", "components/admin/blog-post-form.tsx"]) {
    assert.doesNotMatch(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), /CLOUDINARY_API_SECRET|NEXT_PUBLIC_CLOUDINARY/);
  }
});

test("reads and validates PNG dimensions", () => {
  const png = Buffer.alloc(24); Buffer.from("89504e470d0a1a0a", "hex").copy(png); png.writeUInt32BE(1200, 16); png.writeUInt32BE(800, 20);
  assert.deepEqual(readImageDimensions(png, "image/png"), { width: 1200, height: 800 });
  png.writeUInt32BE(9000, 16);
  assert.equal(readImageDimensions(png, "image/png"), null);
});

test("builds stable duplicate keys", () => {
  assert.deepEqual(mediaDuplicateKey("abc123"), { checksum: "abc123" });
});

test("detects references from published post fields", () => {
  const asset = { url: "http://cdn/image.jpg", secureUrl: "https://cdn/image.jpg" };
  assert.equal(isPublishedMediaReference(asset, { coverImageUrl: asset.secureUrl, content: "text" }), true);
  assert.equal(isPublishedMediaReference(asset, { coverImageUrl: null, content: `![image](${asset.url})` }), true);
  assert.equal(isPublishedMediaReference(asset, { coverImageUrl: null, content: "unrelated" }), false);
});

test("validates media asset route identifiers", () => {
  assert.equal(isMediaAssetId("c12345678901234567890"), true);
  assert.equal(isMediaAssetId(" invalid "), false);
  assert.equal(isMediaAssetId(["c12345678901234567890"]), false);
  assert.equal(isMediaAssetId("c".repeat(40)), false);
});

test("formats file metadata for the admin list", () => {
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatDimensions(1200, 800), "1200 × 800 px");
  assert.equal(formatDimensions(null, null), "Not available");
});
