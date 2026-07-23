import type { Metadata } from "next";
import StudentHubToolPlaceholder from "@/components/student-hub/student-hub-tool-placeholder";

export const metadata: Metadata = { title: "Cost Calculator", description: "Estimate the costs involved in studying abroad." };

export default function CostCalculatorPage() {
  // TODO: Add the Cost Calculator workflow.
  return <StudentHubToolPlaceholder title="Cost Calculator" description="Study-cost estimates and breakdowns are being prepared." />;
}
