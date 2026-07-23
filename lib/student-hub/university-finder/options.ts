export type FinderOption<Value extends string = string> = Readonly<{ value: Value; label: string }>;

export const selectPrompts = {
  destination: "Select a destination",
  studyLevel: "Select a study level",
  subject: "Select a subject area",
  preferredIntake: "Select an intake",
  previousQualification: "Select a qualification",
  gradingSystem: "Select a grading system",
  englishTest: "Select an English test",
  locationType: "Select a location preference",
  scholarshipPreference: "Select a scholarship preference",
} as const;

export const destinationOptions = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "KR", label: "South Korea" },
] as const satisfies readonly FinderOption[];

export const studyLevelOptions = [
  { value: "foundation", label: "Foundation" },
  { value: "associate", label: "Associate degree" },
  { value: "bachelor", label: "Bachelor’s degree" },
  { value: "postgraduate-certificate", label: "Postgraduate certificate" },
  { value: "master", label: "Master’s degree" },
  { value: "doctorate", label: "Doctorate" },
] as const satisfies readonly FinderOption[];

export const subjectOptions = [
  { value: "business-management", label: "Business and Management" },
  { value: "computer-science", label: "Computer Science and IT" },
  { value: "engineering", label: "Engineering" },
  { value: "health-sciences", label: "Health Sciences" },
  { value: "social-sciences", label: "Social Sciences" },
  { value: "arts-design", label: "Arts and Design" },
  { value: "hospitality-tourism", label: "Hospitality and Tourism" },
  { value: "natural-sciences", label: "Natural Sciences" },
  { value: "other", label: "Another subject area" },
] as const satisfies readonly FinderOption[];

export const intakeOptions = [
  { value: "no-preference", label: "No preference" },
  { value: "january-april", label: "January–April" },
  { value: "may-august", label: "May–August" },
  { value: "september-december", label: "September–December" },
] as const satisfies readonly FinderOption[];

export const qualificationOptions = [
  { value: "secondary-school", label: "Secondary school" },
  { value: "higher-secondary", label: "Higher secondary school / Grade 12" },
  { value: "diploma", label: "Diploma" },
  { value: "associate-degree", label: "Associate degree" },
  { value: "bachelor-degree", label: "Bachelor’s degree" },
  { value: "postgraduate-qualification", label: "Postgraduate diploma or certificate" },
  { value: "master-degree", label: "Master’s degree" },
  { value: "other", label: "Other qualification" },
] as const satisfies readonly FinderOption[];

export const gradingSystemOptions = [
  { value: "percentage-100", label: "Percentage out of 100" },
  { value: "gpa-4", label: "GPA out of 4" },
  { value: "gpa-5", label: "GPA out of 5" },
  { value: "gpa-10", label: "GPA out of 10" },
  { value: "other", label: "Other numeric scale" },
] as const satisfies readonly FinderOption[];

export const englishTestOptions = [
  { value: "IELTS", label: "IELTS" },
  { value: "TOEFL", label: "TOEFL iBT" },
  { value: "PTE", label: "PTE Academic" },
  { value: "DUOLINGO", label: "Duolingo English Test" },
  { value: "OTHER", label: "Other English test" },
  { value: "NOT_TAKEN", label: "Not taken yet" },
] as const satisfies readonly FinderOption[];

export const locationTypeOptions = [
  { value: "no-preference", label: "No preference" },
  { value: "major-city", label: "Major city" },
  { value: "smaller-city", label: "Smaller city" },
  { value: "suburban", label: "Suburban" },
  { value: "regional-rural", label: "Regional or rural" },
] as const satisfies readonly FinderOption[];

export const scholarshipPreferenceOptions = [
  { value: "required", label: "Scholarship required" },
  { value: "preferred", label: "Scholarship preferred" },
  { value: "not-essential", label: "Not essential" },
  { value: "no-preference", label: "No preference" },
] as const satisfies readonly FinderOption[];

export function getOptionLabel(options: readonly FinderOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? "Not provided";
}
