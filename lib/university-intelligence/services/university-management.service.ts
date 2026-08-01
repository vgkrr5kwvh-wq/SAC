import type {
  ProgramRepository,
  ScholarshipRepository,
  UniversityRepository,
} from "@/lib/university-intelligence";
import type { UniversityManagementOverview } from "../dto/university.dto";

export type UniversityManagementOverviewRepositories = {
  universities: Pick<UniversityRepository, "getManagementOverviewById">;
  programs: Pick<ProgramRepository, "listByUniversity">;
  scholarships: Pick<ScholarshipRepository, "listByUniversity">;
};

export class UniversityManagementService {
  constructor(private readonly repositories: UniversityManagementOverviewRepositories) {}

  async getOverview(id: string): Promise<UniversityManagementOverview | null> {
    const overview = await this.repositories.universities.getManagementOverviewById(id);
    if (!overview) return null;
    const [allPrograms, publishedPrograms, scholarships] = await Promise.all([
      this.repositories.programs.listByUniversity(id, { page: 1, pageSize: 1, publishedOnly: false }),
      this.repositories.programs.listByUniversity(id, { page: 1, pageSize: 1, publishedOnly: true }),
      this.repositories.scholarships.listByUniversity(id, { page: 1, pageSize: 1, publishedOnly: false }),
    ]);
    return {
      ...overview,
      statistics: {
        totalPrograms: allPrograms.pagination.totalItems,
        publishedPrograms: publishedPrograms.pagination.totalItems,
        totalScholarships: scholarships.pagination.totalItems,
        pendingReviewItems: overview.pendingReviewItems,
      },
    };
  }
}
