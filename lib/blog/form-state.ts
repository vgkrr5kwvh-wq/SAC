export type BlogFormState = {
  status: "idle" | "error";
  message: string;
  errors: Record<string, string[]>;
  values: Record<string, string>;
};

type InitialBlogValues = {
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

export function createInitialBlogFormState(initialValues: InitialBlogValues, selectedCategoryIds: string[] = []): BlogFormState {
  return {
    status: "idle",
    message: "",
    errors: {},
    values: {
      title: initialValues.title,
      slug: initialValues.slug,
      excerpt: initialValues.excerpt,
      content: initialValues.content,
      coverImageUrl: initialValues.coverImageUrl,
      status: initialValues.status,
      featured: initialValues.featured ? "true" : "",
      seoTitle: initialValues.seoTitle,
      metaDescription: initialValues.metaDescription,
      publishedAt: initialValues.publishedAt,
      categoryIds: selectedCategoryIds.join(","),
    },
  };
}
