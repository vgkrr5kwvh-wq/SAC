const subjectAliases: Readonly<Record<string, string>> = {
  "arts and design": "arts-design",
  "business and management": "business-management",
  business: "business-management",
  "computer science": "computer-science",
  "computer science and it": "computer-science",
  computing: "computer-science",
  engineering: "engineering",
  "health sciences": "health-sciences",
  "hospitality and tourism": "hospitality-tourism",
  "information technology": "computer-science",
  "natural sciences": "natural-sciences",
  "social sciences": "social-sciences",
};

const studyLevelAliases: Readonly<Record<string, string>> = {
  undergraduate: "bachelor",
  bachelors: "bachelor",
  bachelor: "bachelor",
  postgraduate: "master",
  masters: "master",
  master: "master",
  phd: "doctorate",
  doctoral: "doctorate",
  doctorate: "doctorate",
};

const englishTestAliases: Readonly<Record<string, string>> = {
  ielts: "IELTS",
  toefl: "TOEFL",
  "toefl ibt": "TOEFL",
  pte: "PTE",
  "pte academic": "PTE",
  duolingo: "DUOLINGO",
  "duolingo english test": "DUOLINGO",
  other: "OTHER",
  "not taken": "NOT_TAKEN",
  "not taken yet": "NOT_TAKEN",
};

export const relatedSubjects: Readonly<Record<string, readonly string[]>> = {
  "arts-design": ["architecture", "creative arts", "fine arts", "graphic design"],
  "business-management": ["accounting", "economics", "finance", "marketing", "project management"],
  "computer-science": ["artificial intelligence", "cybersecurity", "data science", "software engineering"],
  engineering: ["architecture", "technology"],
  "health-sciences": ["medicine", "nursing", "pharmacy", "public health"],
  "hospitality-tourism": ["culinary arts", "event management", "hotel management"],
  "natural-sciences": ["biology", "chemistry", "environmental science", "mathematics", "physics"],
  "social-sciences": ["international studies", "political science", "psychology", "sociology"],
};

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSubjectTokens(value: string): readonly string[] {
  return normalizeText(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function normalizeSubject(value: string): string {
  const normalized = normalizeSubjectTokens(value).join(" ");
  return subjectAliases[normalized] ?? normalized.replace(/\s+/g, "-");
}

export function normalizeStudyLevel(value: string): string {
  const normalized = normalizeText(value).replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return studyLevelAliases[normalized] ?? normalized.replace(/\s+/g, "-");
}

export function normalizeEnglishTest(value: string): string {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
  return englishTestAliases[normalized] ?? normalized.toUpperCase().replace(/\s+/g, "_");
}

export function isExplicitlyRelatedSubject(
  intendedSubject: string,
  catalogSubject: string,
): boolean {
  const intended = normalizeSubject(intendedSubject);
  const catalog = normalizeSubjectTokens(catalogSubject).join(" ");
  return relatedSubjects[intended]?.includes(catalog) ?? false;
}
