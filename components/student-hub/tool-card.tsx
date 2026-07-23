import Link from "next/link";
import {
  IoCalculatorOutline,
  IoDocumentTextOutline,
  IoEarthOutline,
  IoSchoolOutline,
  IoWalletOutline,
} from "react-icons/io5";
import type { StudentTool, StudentToolIcon } from "@/lib/student-hub/types";

const icons = {
  school: IoSchoolOutline,
  passport: IoEarthOutline,
  calculator: IoCalculatorOutline,
  scholarship: IoWalletOutline,
  documents: IoDocumentTextOutline,
} satisfies Record<StudentToolIcon, typeof IoSchoolOutline>;

export default function ToolCard({ tool }: { tool: StudentTool }) {
  const Icon = icons[tool.icon];
  const launchingFirst = tool.status === "launching-first";

  return <article className={`student-tool-card${launchingFirst ? " is-launching-first" : ""}`}>
    <div className="student-tool-card-topline">
      <span className="student-tool-icon" aria-hidden="true"><Icon /></span>
      <span className={`student-tool-status is-${tool.status}`}>{launchingFirst ? "Launching First" : "Coming Soon"}</span>
    </div>
    <h3>{tool.title}</h3>
    <p>{tool.description}</p>
    <Link href={tool.href} aria-label={`View ${tool.title} preview`}>View preview <span aria-hidden="true">→</span></Link>
  </article>;
}
