"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { canDeleteMediaRecord, getMediaStorageProvider, uploadToCloudinary } from "@/lib/media/storage";
import { readImageDimensions } from "@/lib/media/image-metadata";
import { hasAuthenticatedMediaAdmin, isMediaAssetId, mediaMetadataSchema, validateImageFile } from "@/lib/media/validation";
import { prisma } from "@/lib/prisma";
import { CloudinaryConfigurationError } from "@/lib/media/cloudinary-config-values";
import { mediaFormValues, type MediaFormState } from "@/lib/media/form-state";
import { hasAdminPermission } from "@/lib/admin-authorization";

const genericState = (message: string, values: MediaFormState["values"]): MediaFormState => ({ message, errors: {}, values });

export async function createMediaAction(_state: MediaFormState, formData: FormData): Promise<MediaFormState> {
  const values = mediaFormValues(formData);
  const session = await auth();
  if (!hasAuthenticatedMediaAdmin(session) || !session?.user?.id || !hasAdminPermission(session.user.role, "manage_media")) return genericState("Unable to add media asset.", values);
  const file = formData.get("file");
  if (!(file instanceof File)) return { message: "Please select an image.", errors: { file: ["Choose an image to upload."] }, values };
  const fileError = validateImageFile(file);
  if (fileError) return { message: "Please correct the highlighted fields.", errors: { file: [fileError] }, values };
  const metadata = mediaMetadataSchema.safeParse({ originalName: file.name, altText: formData.get("altText"), caption: formData.get("caption"), folder: formData.get("folder") });
  if (!metadata.success) return { message: "Please correct the highlighted fields.", errors: metadata.error.flatten().fieldErrors, values };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dimensions = readImageDimensions(buffer, file.type);
    if (!dimensions) return { message: "Please correct the highlighted fields.", errors: { file: ["The image is invalid, corrupt, or exceeds 8000 × 8000 pixels."] }, values };
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const duplicate = await prisma.mediaAsset.findUnique({ where: { checksum }, select: { id: true } });
    if (duplicate) return { message: "This image is already in the Media Library.", errors: { file: ["Duplicate image."] }, values };
    const uploaded = await uploadToCloudinary(file, metadata.data.folder ?? undefined);
    const asset = await prisma.mediaAsset.create({
      data: { fileName: `${uploaded.public_id}.${uploaded.format}`.slice(-255), originalName: metadata.data.originalName, mimeType: file.type, size: file.size, width: dimensions.width, height: dimensions.height, provider: "CLOUDINARY", publicId: uploaded.public_id, url: uploaded.url, secureUrl: uploaded.secure_url, altText: metadata.data.altText, caption: metadata.data.caption, folder: metadata.data.folder, checksum, uploadedById: session.user.id },
      select: { id: true },
    });
    revalidatePath("/admin/media");
    revalidatePath(`/admin/media/${asset.id}`);
    redirect(`/admin/media/${asset.id}?created=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof CloudinaryConfigurationError) return genericState(error.message, values);
    return genericState("Unable to add media asset.", values);
  }
}

export async function updateMediaAction(id: string, _state: MediaFormState, formData: FormData): Promise<MediaFormState> {
  const values = mediaFormValues(formData);
  const session = await auth();
  if (!hasAuthenticatedMediaAdmin(session) || !session?.user?.id || !hasAdminPermission(session.user.role, "manage_media")) return genericState("Unable to update media asset.", values);
  if (!isMediaAssetId(id)) return genericState("Unable to update media asset.", values);
  const parsed = mediaMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Please correct the highlighted fields.", errors: parsed.error.flatten().fieldErrors, values };

  try {
    await prisma.mediaAsset.update({ where: { id }, data: parsed.data, select: { id: true } });
    revalidatePath("/admin/media");
    revalidatePath(`/admin/media/${id}`);
    redirect(`/admin/media/${id}?saved=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return genericState("Unable to update media asset.", values);
  }
}

export async function deleteMediaAction(id: string): Promise<void> {
  const session = await auth();
  if (!hasAuthenticatedMediaAdmin(session) || !session?.user?.id) redirect("/login?callbackUrl=/admin/media");
  if (!hasAdminPermission(session.user.role, "delete_media")) redirect("/admin/forbidden");
  if (!isMediaAssetId(id)) redirect("/admin/media?delete=missing");

  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { provider: true, publicId: true, url: true, secureUrl: true },
    });
    if (!asset) redirect("/admin/media?delete=missing");
    const reference = await prisma.blogPost.findFirst({
      where: { status: "PUBLISHED", OR: [{ coverImageUrl: { in: [asset.url, asset.secureUrl].filter((url): url is string => Boolean(url)) } }, { content: { contains: asset.url } }, ...(asset.secureUrl && asset.secureUrl !== asset.url ? [{ content: { contains: asset.secureUrl } }] : [])] },
      select: { id: true },
    });
    if (reference) redirect(`/admin/media/${id}?delete=referenced`);
    const provider = getMediaStorageProvider(asset.provider);
    if (!provider) redirect(`/admin/media/${id}?delete=unsupported`);
    const result = await provider.delete({ publicId: asset.publicId, url: asset.url });
    if (!canDeleteMediaRecord(result)) redirect(`/admin/media/${id}?delete=failed`);
    await prisma.mediaAsset.delete({ where: { id } });
    revalidatePath("/admin/media");
    revalidatePath(`/admin/media/${id}`);
    redirect("/admin/media?deleted=1");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/admin/media/${id}?delete=failed`);
  }
}
