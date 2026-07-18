import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBreakdownChartData,
  buildHalfOpenDateFilter,
  buildMonthlyChartData,
  formatMonthLabel,
  formatPercentage,
  getNepalAnalyticsBoundaries,
  getNepalMonthlyRange,
  isWithinHalfOpenRange,
  mergeRecentActivity,
  normalizeGroupingLabel,
  type RecentActivity,
} from "../lib/admin-dashboard-analytics";

test("calculates Nepal today, week, and month boundaries in UTC", () => {
  const boundaries = getNepalAnalyticsBoundaries(
    new Date("2026-07-18T10:47:00.000Z"),
  );

  assert.equal(boundaries.startOfToday.toISOString(), "2026-07-17T18:15:00.000Z");
  assert.equal(boundaries.startOfTomorrow.toISOString(), "2026-07-18T18:15:00.000Z");
  assert.equal(boundaries.startOfWeek.toISOString(), "2026-07-12T18:15:00.000Z");
  assert.equal(boundaries.startOfNextWeek.toISOString(), "2026-07-19T18:15:00.000Z");
  assert.equal(boundaries.startOfMonth.toISOString(), "2026-06-30T18:15:00.000Z");
  assert.equal(boundaries.startOfNextMonth.toISOString(), "2026-07-31T18:15:00.000Z");
});

test("uses Monday as the Nepal week boundary across month rollover", () => {
  const boundaries = getNepalAnalyticsBoundaries(
    new Date("2026-08-02T20:00:00.000Z"),
  );

  assert.equal(boundaries.startOfWeek.toISOString(), "2026-08-02T18:15:00.000Z");
  assert.equal(boundaries.startOfNextWeek.toISOString(), "2026-08-09T18:15:00.000Z");
});

test("builds and applies half-open date ranges", () => {
  const start = new Date("2026-07-17T18:15:00.000Z");
  const end = new Date("2026-07-18T18:15:00.000Z");

  assert.deepEqual(buildHalfOpenDateFilter(start, end), { gte: start, lt: end });
  assert.equal(isWithinHalfOpenRange(start, start, end), true);
  assert.equal(isWithinHalfOpenRange(new Date(end.getTime() - 1), start, end), true);
  assert.equal(isWithinHalfOpenRange(end, start, end), false);
});

test("formats percentages safely and consistently", () => {
  assert.equal(formatPercentage(1, 0), "0.0%");
  assert.equal(formatPercentage(1, 4), "25.0%");
  assert.equal(formatPercentage(1, 3), "33.3%");
});

test("normalizes null and blank grouping labels", () => {
  assert.equal(normalizeGroupingLabel(null), "Not specified");
  assert.equal(normalizeGroupingLabel("   "), "Not specified");
  assert.equal(normalizeGroupingLabel("  Canada  "), "Canada");
});

test("transforms breakdown rows into chart data", () => {
  assert.deepEqual(
    buildBreakdownChartData([
      { label: "Canada", count: 4, percentage: "40.0%" },
      { label: "Australia", count: 3, percentage: "30.0%" },
    ]),
    [
      { label: "Canada", value: 4 },
      { label: "Australia", value: 3 },
    ],
  );
  assert.deepEqual(buildBreakdownChartData([]), []);
});

test("builds and labels a trailing Nepal monthly series", () => {
  const range = getNepalMonthlyRange(
    new Date("2026-07-18T10:47:00.000Z"),
    3,
  );

  assert.equal(range.start.toISOString(), "2026-04-30T18:15:00.000Z");
  assert.equal(range.end.toISOString(), "2026-07-31T18:15:00.000Z");
  assert.deepEqual(range.monthKeys, ["2026-05", "2026-06", "2026-07"]);
  assert.equal(formatMonthLabel("2026-07"), "Jul 2026");
  assert.equal(formatMonthLabel("invalid"), "invalid");
  assert.deepEqual(
    buildMonthlyChartData(
      [
        { monthKey: "2026-05", count: BigInt(2) },
        { monthKey: "2026-07", count: BigInt(4) },
      ],
      range.monthKeys,
    ),
    [
      { label: "May 2026", value: 2 },
      { label: "Jun 2026", value: 0 },
      { label: "Jul 2026", value: 4 },
    ],
  );
});

test("handles empty monthly aggregation data", () => {
  assert.deepEqual(
    buildMonthlyChartData([], ["2026-06", "2026-07"]),
    [
      { label: "Jun 2026", value: 0 },
      { label: "Jul 2026", value: 0 },
    ],
  );
});

function activity(
  id: string,
  type: "Student" | "Partner",
  createdAt: string,
): RecentActivity {
  return {
    id,
    type,
    primaryName: `${type} name`,
    secondaryDescriptor: `${type} descriptor`,
    createdAt: new Date(createdAt),
    href: `/admin/${type.toLowerCase()}/${id}`,
  };
}

test("merges recent activity newest first with deterministic ties", () => {
  const result = mergeRecentActivity(
    [
      activity("cstudent2", "Student", "2026-07-18T10:00:00.000Z"),
      activity("cstudent1", "Student", "2026-07-18T10:00:00.000Z"),
    ],
    [activity("cpartner1", "Partner", "2026-07-18T10:00:00.000Z")],
  );

  assert.deepEqual(result.map((item) => item.id), [
    "cpartner1",
    "cstudent2",
    "cstudent1",
  ]);
});

test("limits merged recent activity to ten items", () => {
  const students = Array.from({ length: 7 }, (_, index) =>
    activity(
      `cstudent${index}`,
      "Student",
      `2026-07-18T10:00:0${index}.000Z`,
    ),
  );
  const partners = Array.from({ length: 7 }, (_, index) =>
    activity(
      `cpartner${index}`,
      "Partner",
      `2026-07-18T10:00:0${index}.000Z`,
    ),
  );

  assert.equal(mergeRecentActivity(students, partners).length, 10);
});
