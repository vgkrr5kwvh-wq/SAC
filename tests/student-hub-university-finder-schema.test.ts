import assert from "node:assert/strict";
import test from "node:test";
import {
  universityFinderSchema,
  universityFinderStep1Schema,
  universityFinderStep2Schema,
  universityFinderStep3Schema,
  universityFinderStep4Schema,
} from "../lib/student-hub/university-finder/schema";

const validPayload = {
  destination: "CA",
  studyLevel: "master",
  subject: "computer-science",
  preferredIntake: "september-december",
  previousQualification: "bachelor-degree",
  gradingSystem: "gpa-4",
  academicScore: "3.5",
  customGpaScale: "",
  englishTest: "IELTS",
  englishScore: "7.5",
  otherEnglishTest: "",
  annualTuitionBudget: "25000",
  locationType: "major-city",
  scholarshipPreference: "preferred",
} as const;

function issueFields(result: ReturnType<typeof universityFinderSchema.safeParse>) {
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path[0]);
}

test("accepts a complete valid University Finder payload", () => {
  assert.equal(universityFinderSchema.safeParse(validPayload).success, true);
});

test("validates required study-plan selections and rejects unknown options", () => {
  const missing = universityFinderStep1Schema.safeParse({
    destination: "",
    studyLevel: "",
    subject: "",
    preferredIntake: "",
  });
  assert.equal(missing.success, false);
  if (!missing.success) {
    assert.deepEqual(missing.error.issues.map((issue) => issue.path[0]), [
      "destination",
      "studyLevel",
      "subject",
    ]);
  }

  assert.equal(universityFinderStep1Schema.safeParse({
    ...validPayload,
    destination: "XX",
    preferredIntake: "invalid-intake",
  }).success, false);
});

test("accepts academic scores at each selected scale boundary", () => {
  for (const [gradingSystem, academicScore] of [
    ["percentage-100", "100"],
    ["gpa-4", "4"],
    ["gpa-5", "5"],
    ["gpa-10", "10"],
  ]) {
    assert.equal(universityFinderStep2Schema.safeParse({
      previousQualification: "bachelor-degree",
      gradingSystem,
      academicScore,
      customGpaScale: "",
    }).success, true, gradingSystem);
  }
});

test("rejects negative, non-numeric, and above-scale academic scores", () => {
  for (const academicScore of ["-0.1", "not-a-number", "4.01"]) {
    const result = universityFinderStep2Schema.safeParse({
      previousQualification: "bachelor-degree",
      gradingSystem: "gpa-4",
      academicScore,
      customGpaScale: "",
    });
    assert.equal(result.success, false, academicScore);
    if (!result.success) assert.equal(result.error.issues[0]?.path[0], "academicScore");
  }
});

test("requires a positive custom scale and prevents GPA exceeding it", () => {
  const missingScale = universityFinderStep2Schema.safeParse({
    previousQualification: "other",
    gradingSystem: "other",
    academicScore: "7",
    customGpaScale: "",
  });
  assert.equal(missingScale.success, false);
  if (!missingScale.success) assert.ok(missingScale.error.issues.some((issue) => issue.path[0] === "customGpaScale"));

  assert.equal(universityFinderStep2Schema.safeParse({
    previousQualification: "other",
    gradingSystem: "other",
    academicScore: "7",
    customGpaScale: "0",
  }).success, false);

  const aboveScale = universityFinderStep2Schema.safeParse({
    previousQualification: "other",
    gradingSystem: "other",
    academicScore: "7.1",
    customGpaScale: "7",
  });
  assert.equal(aboveScale.success, false);
  if (!aboveScale.success) assert.ok(aboveScale.error.issues.some((issue) => issue.path[0] === "academicScore"));

  assert.equal(universityFinderStep2Schema.safeParse({
    previousQualification: "other",
    gradingSystem: "other",
    academicScore: "7",
    customGpaScale: "7",
  }).success, true);
});

test("validates IELTS range and half-point increments", () => {
  for (const englishScore of ["0", "0.5", "9"]) {
    assert.equal(universityFinderStep3Schema.safeParse({
      englishTest: "IELTS",
      englishScore,
      otherEnglishTest: "",
    }).success, true, englishScore);
  }
  for (const englishScore of ["-0.5", "7.25", "9.5"]) {
    assert.equal(universityFinderStep3Schema.safeParse({
      englishTest: "IELTS",
      englishScore,
      otherEnglishTest: "",
    }).success, false, englishScore);
  }
});

test("validates TOEFL and PTE integer boundaries", () => {
  for (const [englishTest, validScores, invalidScores] of [
    ["TOEFL", ["0", "120"], ["-1", "100.5", "121"]],
    ["PTE", ["10", "90"], ["9", "45.5", "91"]],
  ] as const) {
    for (const englishScore of validScores) {
      assert.equal(universityFinderStep3Schema.safeParse({ englishTest, englishScore, otherEnglishTest: "" }).success, true);
    }
    for (const englishScore of invalidScores) {
      assert.equal(universityFinderStep3Schema.safeParse({ englishTest, englishScore, otherEnglishTest: "" }).success, false);
    }
  }
});

test("validates Duolingo range and five-point increments", () => {
  for (const englishScore of ["10", "105", "160"]) {
    assert.equal(universityFinderStep3Schema.safeParse({
      englishTest: "DUOLINGO",
      englishScore,
      otherEnglishTest: "",
    }).success, true);
  }
  for (const englishScore of ["5", "12", "162", "165"]) {
    assert.equal(universityFinderStep3Schema.safeParse({
      englishTest: "DUOLINGO",
      englishScore,
      otherEnglishTest: "",
    }).success, false);
  }
});

test("does not require a score when an English test has not been taken", () => {
  assert.equal(universityFinderStep3Schema.safeParse({
    englishTest: "NOT_TAKEN",
    englishScore: "",
    otherEnglishTest: "",
  }).success, true);
});

test("requires descriptive information for another English test without score rules", () => {
  assert.equal(universityFinderStep3Schema.safeParse({
    englishTest: "OTHER",
    englishScore: "",
    otherEnglishTest: "",
  }).success, false);

  assert.equal(universityFinderStep3Schema.safeParse({
    englishTest: "OTHER",
    englishScore: "not-a-standard-score",
    otherEnglishTest: "Cambridge C1 Advanced — Grade B",
  }).success, true);
});

test("validates optional preferences when values are supplied", () => {
  assert.equal(universityFinderStep4Schema.safeParse({
    annualTuitionBudget: "",
    locationType: "",
    scholarshipPreference: "",
  }).success, true);

  for (const annualTuitionBudget of ["-1", "invalid"]) {
    assert.equal(universityFinderStep4Schema.safeParse({
      annualTuitionBudget,
      locationType: "major-city",
      scholarshipPreference: "required",
    }).success, false);
  }
});

test("complete validation reports conditional errors on their fields", () => {
  const result = universityFinderSchema.safeParse({
    ...validPayload,
    gradingSystem: "other",
    academicScore: "8",
    customGpaScale: "7",
    englishTest: "DUOLINGO",
    englishScore: "12",
  });
  assert.equal(result.success, false);
  assert.deepEqual(issueFields(result).sort(), ["academicScore", "englishScore"]);
});
