export type MediaFormValues = {
  originalName: string;
  altText: string;
  caption: string;
  folder: string;
};

export type MediaFormState = {
  message: string;
  errors: Record<string, string[]>;
  values: MediaFormValues;
};

export const emptyMediaFormValues: MediaFormValues = {
  originalName: "",
  altText: "",
  caption: "",
  folder: "",
};

export function createInitialMediaFormState(
  values: MediaFormValues = emptyMediaFormValues,
): MediaFormState {
  return {
    message: "",
    errors: {},
    values: { ...values },
  };
}

export function mediaFormValues(formData: FormData): MediaFormValues {
  return {
    originalName: String(formData.get("originalName") ?? ""),
    altText: String(formData.get("altText") ?? ""),
    caption: String(formData.get("caption") ?? ""),
    folder: String(formData.get("folder") ?? ""),
  };
}
