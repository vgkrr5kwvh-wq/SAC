import { z } from "zod";
import {
  destinationOptions,
  englishTestOptions,
  gradingSystemOptions,
  intakeOptions,
  locationTypeOptions,
  qualificationOptions,
  scholarshipPreferenceOptions,
  studyLevelOptions,
  subjectOptions,
  type FinderOption,
} from "./options";

function optionEnum<const Options extends readonly FinderOption[]>(
  options: Options,
  message: string,
) {
  type Value = Options[number]["value"];
  return z.enum(options.map((option) => option.value) as [Value, ...Value[]], {
    error: message,
  });
}

function optionalOption<Schema extends z.ZodEnum>(schema: Schema) {
  return z.union([z.literal(""), schema]);
}

function addIssue(
  context: z.RefinementCtx,
  field: string,
  message: string,
) {
  context.addIssue({
    code: "custom",
    path: [field],
    message,
  });
}

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const destinationSchema = optionEnum(destinationOptions, "Select an intended destination.");
const studyLevelSchema = optionEnum(studyLevelOptions, "Select a study level.");
const subjectSchema = optionEnum(subjectOptions, "Select an intended subject.");
const intakeSchema = optionEnum(intakeOptions, "Select a valid preferred intake.");
const qualificationSchema = optionEnum(qualificationOptions, "Select your previous qualification.");
const gradingSystemSchema = optionEnum(gradingSystemOptions, "Select a GPA scale or grading system.");
const englishTestSchema = optionEnum(englishTestOptions, "Select an English test.");
const locationTypeSchema = optionEnum(locationTypeOptions, "Select a valid preferred location.");
const scholarshipPreferenceSchema = optionEnum(scholarshipPreferenceOptions, "Select a valid scholarship preference.");

const step1Shape = {
  destination: destinationSchema,
  studyLevel: studyLevelSchema,
  subject: subjectSchema,
  preferredIntake: optionalOption(intakeSchema),
};

const step2Shape = {
  previousQualification: qualificationSchema,
  gradingSystem: gradingSystemSchema,
  academicScore: z.string(),
  customGpaScale: z.string(),
};

const step3Shape = {
  englishTest: englishTestSchema,
  englishScore: z.string(),
  otherEnglishTest: z.string(),
};

const step4Shape = {
  annualTuitionBudget: z.string(),
  locationType: optionalOption(locationTypeSchema),
  scholarshipPreference: optionalOption(scholarshipPreferenceSchema),
};

const gradingMaximums: Readonly<Record<string, number>> = {
  "percentage-100": 100,
  "gpa-4": 4,
  "gpa-5": 5,
  "gpa-10": 10,
};

function validateAcademicProfile(
  values: z.infer<z.ZodObject<typeof step2Shape>>,
  context: z.RefinementCtx,
) {
  const score = parseNumber(values.academicScore);
  if (score === null) {
    addIssue(context, "academicScore", "Enter a valid GPA or percentage.");
  } else if (score < 0) {
    addIssue(context, "academicScore", "GPA or percentage cannot be negative.");
  }

  let maximum = gradingMaximums[values.gradingSystem];
  if (values.gradingSystem === "other") {
    const customMaximum = parseNumber(values.customGpaScale);
    if (customMaximum === null || customMaximum <= 0) {
      addIssue(context, "customGpaScale", "Enter a maximum grading scale greater than zero.");
    } else {
      maximum = customMaximum;
    }
  }

  if (score !== null && maximum !== undefined && score > maximum) {
    addIssue(context, "academicScore", `GPA or percentage cannot exceed ${maximum}.`);
  }
}

function validateEnglishPreparation(
  values: z.infer<z.ZodObject<typeof step3Shape>>,
  context: z.RefinementCtx,
) {
  if (values.englishTest === "NOT_TAKEN") return;

  if (values.englishTest === "OTHER") {
    const details = values.otherEnglishTest.trim();
    if (!details) {
      addIssue(context, "otherEnglishTest", "Enter the other English test information.");
    } else if (details.length > 160) {
      addIssue(context, "otherEnglishTest", "Other English test information must be 160 characters or fewer.");
    }
    return;
  }

  const score = parseNumber(values.englishScore);
  if (score === null) {
    addIssue(context, "englishScore", "Enter a valid English test score.");
    return;
  }

  const rules = {
    IELTS: {
      valid: score >= 0 && score <= 9 && Number.isInteger(score * 2),
      message: "IELTS score must be between 0 and 9 in 0.5 increments.",
    },
    TOEFL: {
      valid: score >= 0 && score <= 120 && Number.isInteger(score),
      message: "TOEFL score must be a whole number between 0 and 120.",
    },
    PTE: {
      valid: score >= 10 && score <= 90 && Number.isInteger(score),
      message: "PTE score must be a whole number between 10 and 90.",
    },
    DUOLINGO: {
      valid: score >= 10 && score <= 160 && Number.isInteger(score) && score % 5 === 0,
      message: "Duolingo score must be between 10 and 160 in increments of 5.",
    },
  } as const;
  const rule = rules[values.englishTest];

  if (!rule.valid) addIssue(context, "englishScore", rule.message);
}

function validatePreferences(
  values: z.infer<z.ZodObject<typeof step4Shape>>,
  context: z.RefinementCtx,
) {
  if (!values.annualTuitionBudget.trim()) return;
  const budget = parseNumber(values.annualTuitionBudget);
  if (budget === null || budget < 0) {
    addIssue(context, "annualTuitionBudget", "Tuition budget must be zero or greater.");
  }
}

export const universityFinderStep1Schema = z.object(step1Shape);
export const universityFinderStep2Schema = z.object(step2Shape).superRefine(validateAcademicProfile);
export const universityFinderStep3Schema = z.object(step3Shape).superRefine(validateEnglishPreparation);
export const universityFinderStep4Schema = z.object(step4Shape).superRefine(validatePreferences);

export const universityFinderSchema = z.object({
  ...step1Shape,
  ...step2Shape,
  ...step3Shape,
  ...step4Shape,
}).superRefine((values, context) => {
  validateAcademicProfile(values, context);
  validateEnglishPreparation(values, context);
  validatePreferences(values, context);
});

export type UniversityFinderStep1Input = z.infer<typeof universityFinderStep1Schema>;
export type UniversityFinderStep2Input = z.infer<typeof universityFinderStep2Schema>;
export type UniversityFinderStep3Input = z.infer<typeof universityFinderStep3Schema>;
export type UniversityFinderStep4Input = z.infer<typeof universityFinderStep4Schema>;
export type UniversityFinderInput = z.infer<typeof universityFinderSchema>;
