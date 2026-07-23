import { getOptionLabel, destinationOptions, englishTestOptions, gradingSystemOptions, intakeOptions, locationTypeOptions, qualificationOptions, scholarshipPreferenceOptions, studyLevelOptions, subjectOptions } from "@/lib/student-hub/university-finder/options";
import type { UniversityFinderAnswers } from "@/lib/student-hub/university-finder/types";

export default function ToolReviewSummary({ answers }: { answers: UniversityFinderAnswers }) {
  const rows = [
    ["Destination", getOptionLabel(destinationOptions, answers.destination)],
    ["Study level", getOptionLabel(studyLevelOptions, answers.studyLevel)],
    ["Subject", getOptionLabel(subjectOptions, answers.subject)],
    ["Preferred intake", getOptionLabel(intakeOptions, answers.preferredIntake)],
    ["Previous qualification", getOptionLabel(qualificationOptions, answers.previousQualification)],
    ["Academic result", answers.academicScore ? `${answers.academicScore} · ${getOptionLabel(gradingSystemOptions, answers.gradingSystem)}` : "Not provided"],
    ["English preparation", getOptionLabel(englishTestOptions, answers.englishTest)],
    ["English score", answers.englishScore || answers.otherEnglishTest || "Not provided"],
    ["Annual tuition budget", answers.annualTuitionBudget || "Not provided"],
    ["Location preference", getOptionLabel(locationTypeOptions, answers.locationType)],
    ["Scholarship preference", getOptionLabel(scholarshipPreferenceOptions, answers.scholarshipPreference)],
  ];

  return <section className="student-finder-review" aria-labelledby="student-finder-review-heading"><h3 id="student-finder-review-heading">Review your answers</h3><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>;
}
