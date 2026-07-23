import type { Metadata } from "next";
import StudentHubToolPlaceholder from "@/components/student-hub/student-hub-tool-placeholder";

export const metadata: Metadata = { title: "Document Checklist", description: "Organise the documents needed for your study-abroad application." };

export default function DocumentChecklistPage() {
  // TODO: Add the Document Checklist workflow.
  return <StudentHubToolPlaceholder title="Document Checklist" description="A personalised application-document checklist is being prepared." />;
}
