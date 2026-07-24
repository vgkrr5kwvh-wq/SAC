import type { OfficialPageKind } from "./types";

const excluded = /\b(news|athletics|alumni|donat|giving|social|facebook|instagram|youtube|linkedin)\b/i;

export function classifyOfficialLink(label: string, url: string): OfficialPageKind | null {
  const value = `${label} ${url}`;
  if (excluded.test(value)) return null;
  if (/\b(pathway|global)\b/i.test(value)) return "pathway";
  if (/\b(programs?|majors?)\b/i.test(value) && /\bgraduate\b/i.test(value)) return "program-directory-graduate";
  if (/\b(programs?|majors?)\b/i.test(value) && /\bundergraduate\b/i.test(value)) return "program-directory-undergraduate";
  if (/\benglish\b|\bielts\b|\btoefl\b/i.test(value)) return "english-proficiency";
  if (/\bscholarship|\bfinancial aid\b/i.test(value)) return "scholarships";
  if (/\btuition\b|\bcost of attendance\b|\bcosts?\b/i.test(value)) return "tuition";
  if (/\bgraduate admissions?\b/i.test(value)) return "graduate-admissions";
  if (/\bundergraduate admissions?\b/i.test(value)) return "undergraduate-admissions";
  if (/\binternational\b/i.test(value) && /\badmission|\bapply|\brequirement/i.test(value)) return "international-admissions";
  if (/\brequirements?\b|\bapply\b|\bdeadlines?\b/i.test(value)) return "application-requirements";
  return null;
}

