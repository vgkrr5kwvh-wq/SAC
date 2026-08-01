import type {
  AdmissionRequirementManagementFilters,
  AdmissionRequirementManagementResult,
  AdmissionRequirementRepository,
  UniversityManagementIdentity,
  UniversityRepository,
} from "@/lib/university-intelligence";

export type AdmissionRequirementManagementRepositories = {
  universities: Pick<UniversityRepository, "getManagementIdentityById">;
  requirements: Pick<AdmissionRequirementRepository, "listForManagement">;
};

export type UniversityAdmissionRequirementManagementResult = {
  university: UniversityManagementIdentity;
  result: AdmissionRequirementManagementResult;
};

export class AdmissionRequirementManagementService {
  constructor(private readonly repositories: AdmissionRequirementManagementRepositories) {}

  async listUniversityRequirements(universityId: string, filters: AdmissionRequirementManagementFilters = {}): Promise<UniversityAdmissionRequirementManagementResult | null> {
    const university = await this.repositories.universities.getManagementIdentityById(universityId);
    if (!university) return null;
    return { university, result: await this.repositories.requirements.listForManagement(university.id, filters) };
  }
}
