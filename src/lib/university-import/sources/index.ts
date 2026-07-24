import type { UniversityImportSourceName, UniversitySourceAdapter } from "../types";
import { studiesOverseasAdapter } from "./studies-overseas";
import { universityStudyAdapter } from "./university-study";

const adapters: Record<UniversityImportSourceName, UniversitySourceAdapter> = {
  "university-study": universityStudyAdapter,
  "studies-overseas": studiesOverseasAdapter,
};

export function getUniversitySourceAdapter(source: UniversityImportSourceName): UniversitySourceAdapter {
  return adapters[source];
}

