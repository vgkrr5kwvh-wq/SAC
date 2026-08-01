import type {
  ProgramManagementFilters,
  ProgramManagementResult,
  ProgramRepository,
  UniversityManagementIdentity,
  UniversityRepository,
} from "@/lib/university-intelligence";

export type ProgramManagementRepositories = {
  universities: Pick<UniversityRepository, "getManagementIdentityById">;
  programs: Pick<ProgramRepository, "listForManagement">;
};

export type UniversityProgramManagementResult = {
  university: UniversityManagementIdentity;
  result: ProgramManagementResult;
};

export class ProgramManagementService {
  constructor(private readonly repositories: ProgramManagementRepositories) {}

  async listUniversityPrograms(
    universityId: string,
    filters: ProgramManagementFilters = {},
  ): Promise<UniversityProgramManagementResult | null> {
    const university = await this.repositories.universities.getManagementIdentityById(universityId);
    if (!university) return null;
    return {
      university,
      result: await this.repositories.programs.listForManagement(university.id, filters),
    };
  }
}
