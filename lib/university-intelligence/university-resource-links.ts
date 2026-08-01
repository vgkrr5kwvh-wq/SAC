import type {
  UniversityPublicLink,
  UniversityManagementSource,
} from "@/lib/university-intelligence";
import { safePublicUrl } from "./safe-public-url";

export type UniversityResourceLink = { id: string; label: string; url: string };
export type UniversityResourceGroup = { title: string; links: UniversityResourceLink[] };

function linkLabel(link: UniversityPublicLink): string {
  const supplied = link.label?.trim();
  if (supplied) return supplied;
  if (link.type.startsWith("program-directory-")) return "Program directory";
  if (link.type === "source-listing") return "Source reference";
  return "Official university resource";
}

export function groupUniversityResourceLinks(
  officialWebsiteUrl: string | null,
  links: UniversityPublicLink[],
  sources: UniversityManagementSource[],
): UniversityResourceGroup[] {
  const officialWebsite = safePublicUrl(officialWebsiteUrl);
  const official: UniversityResourceLink[] = officialWebsite
    ? [{ id: "official-website", label: "Official website", url: officialWebsite }]
    : [];
  const programs: UniversityResourceLink[] = [];
  const references: UniversityResourceLink[] = [];

  for (const link of links) {
    const url = safePublicUrl(link.url);
    if (!url) continue;
    const presented = { id: link.id, label: linkLabel(link), url };
    if (link.type.startsWith("program-directory-")) programs.push(presented);
    else if (link.type === "source-listing") references.push(presented);
    else official.push(presented);
  }
  for (const source of sources) {
    const url = safePublicUrl(source.url);
    if (url) references.push({ id: `source-${source.id}`, label: `${source.name} profile`, url });
  }

  return [
    { title: "Official university resources", links: official },
    { title: "Program directories", links: programs },
    { title: "Partner/source references", links: references },
  ].map((group) => ({
    ...group,
    links: group.links.filter((link, index, all) =>
      all.findIndex((candidate) => candidate.url === link.url) === index
    ),
  }));
}
