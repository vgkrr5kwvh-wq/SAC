import {
  ProgramRepository,
  ScholarshipRepository,
  UniversityRepository,
} from "@/lib/university-intelligence";

export const runtime = "nodejs";

type DetailRepositories = {
  universities: Pick<UniversityRepository, "getBySlug">;
  programs: Pick<ProgramRepository, "listByUniversity">;
  scholarships: Pick<ScholarshipRepository, "listByUniversity">;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function handleUniversityDetailRequest(
  slugValue: string,
  repositories: DetailRepositories,
): Promise<Response> {
  const slug = slugValue.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return errorResponse(404, "NOT_FOUND", "University not found.");
  }

  try {
    const university = await repositories.universities.getBySlug(slug);
    if (!university) {
      return errorResponse(404, "NOT_FOUND", "University not found.");
    }
    const [programs, scholarships] = await Promise.all([
      repositories.programs.listByUniversity(university.id, {
        page: 1,
        pageSize: 100,
        publishedOnly: true,
      }),
      repositories.scholarships.listByUniversity(university.id, {
        page: 1,
        pageSize: 100,
        publishedOnly: true,
      }),
    ]);

    return Response.json(
      { university, programs, scholarships },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    console.error("University detail request failed.");
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The university profile could not be loaded.",
    );
  }
}

const repositories: DetailRepositories = {
  universities: new UniversityRepository(),
  programs: new ProgramRepository(),
  scholarships: new ScholarshipRepository(),
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return handleUniversityDetailRequest(
    (await context.params).slug,
    repositories,
  );
}
