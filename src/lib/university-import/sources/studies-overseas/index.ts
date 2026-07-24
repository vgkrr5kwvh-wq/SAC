import type { UniversitySourceAdapter } from "../../types";
import { validateNormalizedUniversity } from "../../validation";
import { discoverStudiesOverseasUrls } from "./discover";
import { extractStudiesOverseas } from "./extract";
import { mapStudiesOverseasUniversity } from "./map";

export const studiesOverseasAdapter: UniversitySourceAdapter = {
  sourceName: "studies-overseas",
  discoverUniversityUrls: discoverStudiesOverseasUrls,
  extractUniversity: extractStudiesOverseas,
  normalizeUniversity: mapStudiesOverseasUniversity,
  validateUniversity: validateNormalizedUniversity,
};

