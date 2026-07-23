import ToolCard from "@/components/student-hub/tool-card";
import type { StudentTool } from "@/lib/student-hub/types";

export default function FeaturedTools({ tools }: { tools: readonly StudentTool[] }) {
  return <div className="student-tool-grid">{tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div>;
}
