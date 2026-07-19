import type { MediaStorageProvider, MediaUploadInput, StoredMediaAsset, StorageDeleteResult } from "./types";
import { createHash } from "node:crypto";
import { mediaCreateSchema } from "./validation";
import { getCloudinaryConfig } from "./cloudinary-config";

function fileNameFromUrl(url: string, fallback: string): string {
  const segment = new URL(url).pathname.split("/").filter(Boolean).at(-1);
  if (!segment) return fallback;
  try {
    const decoded = decodeURIComponent(segment).trim();
    return decoded ? decoded.slice(0, 255) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeExternalResult(input: MediaUploadInput): StoredMediaAsset {
  return {
    ...input,
    fileName: fileNameFromUrl(input.url, input.originalName),
    secureUrl: input.url,
    publicId: null,
    provider: "EXTERNAL",
  };
}

export const externalStorageProvider: MediaStorageProvider = {
  name: "EXTERNAL",
  async upload(input) {
    return normalizeExternalResult(mediaCreateSchema.parse(input));
  },
  async delete() {
    return { status: "unsupported" };
  },
};

export function canDeleteMediaRecord(result: StorageDeleteResult): boolean {
  return result.status === "deleted" || result.status === "unsupported";
}

export function getMediaStorageProvider(provider: string): MediaStorageProvider | null {
  if (provider === externalStorageProvider.name) return externalStorageProvider;
  if (provider === cloudinaryStorageProvider.name) return cloudinaryStorageProvider;
  return null;
}

function signature(parameters: Record<string, string>, secret: string) {
  const value = Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${key}=${item}`).join("&");
  return createHash("sha1").update(value + secret).digest("hex");
}

export async function uploadToCloudinary(file: File, folder = "sac/media") {
  const config = getCloudinaryConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const parameters = { folder, overwrite: "false", timestamp, unique_filename: "true" };
  const body = new FormData();
  body.set("file", file); body.set("api_key", config.apiKey); body.set("signature", signature(parameters, config.apiSecret));
  for (const [key, value] of Object.entries(parameters)) body.set(key, value);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, { method: "POST", body });
  if (!response.ok) throw new Error("Cloudinary upload failed");
  return await response.json() as import("./types").CloudinaryUploadResult;
}

export const cloudinaryStorageProvider: MediaStorageProvider = {
  name: "CLOUDINARY",
  async upload() { throw new Error("Use uploadToCloudinary for file uploads"); },
  async delete(asset) {
    if (!asset.publicId) return { status: "failed" };
    try {
      const config = getCloudinaryConfig(); const timestamp = String(Math.floor(Date.now() / 1000));
      const parameters = { public_id: asset.publicId, timestamp };
      const body = new URLSearchParams({ ...parameters, api_key: config.apiKey, signature: signature(parameters, config.apiSecret) });
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/destroy`, { method: "POST", body });
      const result = await response.json() as { result?: string };
      return response.ok && (result.result === "ok" || result.result === "not found") ? { status: "deleted" } : { status: "failed" };
    } catch { return { status: "failed" }; }
  },
};
