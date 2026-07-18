"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDatum } from "@/lib/admin-dashboard-analytics";

type DashboardChartsProps = {
  studentDestinations: ChartDatum[];
  partnerLocations: ChartDatum[];
  monthlyStudents: ChartDatum[];
};

export default function DashboardCharts({
  studentDestinations,
  partnerLocations,
  monthlyStudents,
}: DashboardChartsProps) {
  return (
    <div className="admin-chart-stack">
      <HorizontalBarChart
        id="student-destination-chart"
        title="Student enquiries by destination"
        description="Counts for the leading student destination or interest values."
        data={studentDestinations}
        emptyMessage="No student destination data available for this chart."
      />
      <HorizontalBarChart
        id="partner-location-chart"
        title="Partner enquiries by submitted location"
        description="Counts based on exact location values submitted by partners."
        data={partnerLocations}
        emptyMessage="No partner location data available for this chart."
      />
      <MonthlyTrendChart data={monthlyStudents} />
    </div>
  );
}

function HorizontalBarChart({
  id,
  title,
  description,
  data,
  emptyMessage,
}: {
  id: string;
  title: string;
  description: string;
  data: ChartDatum[];
  emptyMessage: string;
}) {
  return (
    <section className="admin-chart-card" aria-labelledby={`${id}-heading`}>
      <header>
        <span>Visual breakdown</span>
        <h2 id={`${id}-heading`}>{title}</h2>
        <p>{description}</p>
      </header>
      {data.length ? (
        <div
          className="admin-chart-canvas"
          role="img"
          aria-label={`${title}. ${data.map((item) => `${item.label}: ${item.value}`).join(", ")}.`}
        >
          <ResponsiveContainer width="100%" height={Math.max(260, data.length * 44)}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 38, bottom: 8, left: 8 }}
              accessibilityLayer
            >
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="var(--muted)" />
              <YAxis
                type="category"
                dataKey="label"
                width={125}
                stroke="var(--muted)"
                tickFormatter={formatAxisLabel}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(2,132,232,.08)" }} />
              <Bar dataKey="value" name="Enquiries" fill="var(--blue)" radius={[0, 6, 6, 0]}>
                <LabelList dataKey="value" position="right" fill="var(--ink)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="admin-chart-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

function MonthlyTrendChart({ data }: { data: ChartDatum[] }) {
  const hasActivity = data.some((item) => item.value > 0);
  return (
    <section className="admin-chart-card" aria-labelledby="student-timeline-chart-heading">
      <header>
        <span>Monthly trend</span>
        <h2 id="student-timeline-chart-heading">Student enquiry timeline</h2>
        <p>Student enquiries submitted during the trailing 12 Nepal calendar months.</p>
      </header>
      {hasActivity ? (
        <div
          className="admin-chart-canvas admin-chart-timeline"
          role="img"
          aria-label={`Student enquiry timeline. ${data.map((item) => `${item.label}: ${item.value}`).join(", ")}.`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 22, right: 24, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted)" minTickGap={20} />
              <YAxis allowDecimals={false} stroke="var(--muted)" width={42} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                name="Student enquiries"
                stroke="var(--blue)"
                strokeWidth={3}
                dot={{ fill: "var(--white)", stroke: "var(--blue)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              >
                <LabelList dataKey="value" position="top" fill="var(--ink)" />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="admin-chart-empty">No student timeline data available.</p>
      )}
    </section>
  );
}

function formatAxisLabel(value: string): string {
  return value.length > 18 ? `${value.slice(0, 17)}…` : value;
}

const tooltipStyle = {
  border: "1px solid var(--line)",
  borderRadius: "8px",
  color: "var(--ink)",
  backgroundColor: "var(--white)",
};
