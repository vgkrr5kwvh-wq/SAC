export type CatalogIssueCode =
  | "schema-validation"
  | "invariant-violation"
  | "duplicate-identifier"
  | "invalid-verification-metadata"
  | "stale-verification"
  | "unsupported-value"
  | "normalization-warning";

export type CatalogIssueSeverity = "error" | "warning";

export type CatalogIngestionIssue = {
  code: CatalogIssueCode;
  severity: CatalogIssueSeverity;
  path: readonly (string | number)[];
  message: string;
  universitySlug?: string;
  programSlug?: string;
  originalValue?: string | number | boolean | null;
  suggestedRemediation?: string;
};

export class CatalogIngestionError extends Error {
  readonly issues: readonly CatalogIngestionIssue[];

  constructor(issues: readonly CatalogIngestionIssue[]) {
    super("University catalog ingestion failed.");
    this.name = "CatalogIngestionError";
    this.issues = issues;
  }
}
