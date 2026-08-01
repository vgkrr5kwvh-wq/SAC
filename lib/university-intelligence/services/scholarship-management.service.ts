import type {
  ScholarshipManagementFilters,
  ScholarshipManagementResult,
  ScholarshipRepository,
  UniversityManagementIdentity,
  UniversityRepository,
} from "@/lib/university-intelligence";

export type ScholarshipManagementRepositories = {
  universities: Pick<UniversityRepository, "getManagementIdentityById">;
  scholarships: Pick<ScholarshipRepository, "listForManagement">;
};

export type UniversityScholarshipManagementResult = {
  university: UniversityManagementIdentity;
  result: ScholarshipManagementResult;
};

export class ScholarshipManagementService {
  constructor(private readonly repositories: ScholarshipManagementRepositories) {}

  async listUniversityScholarships(
    universityId: string,
    filters: ScholarshipManagementFilters = {},
  ): Promise<UniversityScholarshipManagementResult | null> {
    const university = await this.repositories.universities.getManagementIdentityById(universityId);
    if (!university) return null;
    return {
      university,
      result: await this.repositories.scholarships.listForManagement(university.id, filters),
    };
  }
}
