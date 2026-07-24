import type { RawExtractedUniversity } from "../../types";
import { mapRawUniversity } from "../shared-map";

export function mapStudiesOverseasUniversity(raw: RawExtractedUniversity) {
  return mapRawUniversity(raw, "studies-overseas");
}

