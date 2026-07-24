import type { UniversitySourceAdapter } from "../../types";
import { validateNormalizedUniversity } from "../../validation";
import { discoverUniversityStudyUrls } from "./discover";
import { extractUniversityStudy } from "./extract";
import { mapUniversityStudyUniversity } from "./map";

export const universityStudyAdapter: UniversitySourceAdapter = {
  sourceName: "university-study",
  discoverUniversityUrls: discoverUniversityStudyUrls,
  extractUniversity: extractUniversityStudy,
  normalizeUniversity: mapUniversityStudyUniversity,
  validateUniversity: validateNormalizedUniversity,
};

