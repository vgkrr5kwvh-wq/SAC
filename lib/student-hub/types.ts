export type StudentToolId =
  | "university-finder"
  | "visa-eligibility-checker"
  | "cost-calculator"
  | "scholarship-estimator"
  | "document-checklist";

export type StudentToolIcon = "school" | "passport" | "calculator" | "scholarship" | "documents";

export type StudentToolStatus = "launching-first" | "coming-soon";

export type StudentTool = {
  id: StudentToolId;
  slug: StudentToolId;
  href: `/student-hub/${StudentToolId}`;
  title: string;
  description: string;
  icon: StudentToolIcon;
  status: StudentToolStatus;
  order: number;
};
