import type { StudentTool } from "./types";

const siteUrl = "https://selfapplycenter.com";

export function buildStudentHubStructuredData(tools: readonly StudentTool[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Student Hub",
    description: "Free planning tools and guidance for students preparing to study abroad.",
    url: `${siteUrl}/student-hub`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.title,
        url: `${siteUrl}${tool.href}`,
      })),
    },
  };
}
