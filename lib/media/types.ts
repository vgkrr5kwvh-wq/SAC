export const mediaProviders = ["EXTERNAL", "CLOUDINARY"] as const;
export type MediaProvider = (typeof mediaProviders)[number];

export type MediaFileTypeValue = "IMAGE" | "DOCUMENT";

export type MediaUploadInput = {
  url: string;
  originalName: string;
  mimeType: string;
  fileType: MediaFileTypeValue;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  folder: string | null;
};

export type StoredMediaAsset = MediaUploadInput & {
  fileName: string;
  secureUrl: string | null;
  publicId: string | null;
  provider: MediaProvider;
};

export type CloudinaryUploadResult = {
  public_id: string; secure_url: string; url: string; bytes: number;
  width: number; height: number; format: string; original_filename: string;
};

export type StorageDeleteResult =
  | { status: "deleted" }
  | { status: "unsupported" }
  | { status: "failed" };

export interface MediaStorageProvider {
  readonly name: MediaProvider;
  upload(input: MediaUploadInput): Promise<StoredMediaAsset>;
  delete(asset: { publicId: string | null; url: string }): Promise<StorageDeleteResult>;
}
