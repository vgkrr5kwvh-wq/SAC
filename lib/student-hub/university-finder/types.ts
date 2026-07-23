export type UniversityFinderAnswers = {
  destination: string;
  studyLevel: string;
  subject: string;
  preferredIntake: string;
  previousQualification: string;
  gradingSystem: string;
  academicScore: string;
  customGpaScale: string;
  englishTest: string;
  englishScore: string;
  otherEnglishTest: string;
  annualTuitionBudget: string;
  locationType: string;
  scholarshipPreference: string;
};

export type UniversityFinderField = keyof UniversityFinderAnswers;

export const initialUniversityFinderAnswers: UniversityFinderAnswers = {
  destination: "",
  studyLevel: "",
  subject: "",
  preferredIntake: "",
  previousQualification: "",
  gradingSystem: "",
  academicScore: "",
  customGpaScale: "",
  englishTest: "",
  englishScore: "",
  otherEnglishTest: "",
  annualTuitionBudget: "",
  locationType: "",
  scholarshipPreference: "",
};
