import type { RawExtractedUniversity } from "../../types";
import { mapRawUniversity } from "../shared-map";

export function mapUniversityStudyUniversity(raw: RawExtractedUniversity) {
  return mapRawUniversity(raw, "university-study");
}

