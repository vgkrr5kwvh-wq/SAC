const kathmanduOffsetMilliseconds = 345 * 60 * 1000;

const analyticsDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kathmandu",
});

export type AnalyticsDateBoundaries = {
  startOfToday: Date;
  startOfTomorrow: Date;
  startOfWeek: Date;
  startOfNextWeek: Date;
  startOfMonth: Date;
  startOfNextMonth: Date;
};

export type GroupedValue = {
  label: string | null;
  count: number;
};

export type BreakdownRow = {
  label: string;
  count: number;
  percentage: string;
};

export type RecentActivity = {
  id: string;
  type: "Student" | "Partner";
  primaryName: string;
  secondaryDescriptor: string;
  createdAt: Date;
  href: string;
};

export type ChartDatum = {
  label: string;
  value: number;
};

export type MonthlyAggregationRow = {
  monthKey: string;
  count: number | bigint;
};

function nepalBoundaryUtc(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(
    Date.UTC(year, month, day) - kathmanduOffsetMilliseconds,
  );
}

export function getNepalAnalyticsBoundaries(
  now = new Date(),
): AnalyticsDateBoundaries {
  const nepalTime = new Date(now.getTime() + kathmanduOffsetMilliseconds);
  const year = nepalTime.getUTCFullYear();
  const month = nepalTime.getUTCMonth();
  const day = nepalTime.getUTCDate();
  const daysSinceMonday = (nepalTime.getUTCDay() + 6) % 7;

  return {
    startOfToday: nepalBoundaryUtc(year, month, day),
    startOfTomorrow: nepalBoundaryUtc(year, month, day + 1),
    startOfWeek: nepalBoundaryUtc(year, month, day - daysSinceMonday),
    startOfNextWeek: nepalBoundaryUtc(
      year,
      month,
      day - daysSinceMonday + 7,
    ),
    startOfMonth: nepalBoundaryUtc(year, month, 1),
    startOfNextMonth: nepalBoundaryUtc(year, month + 1, 1),
  };
}

export function getNepalMonthlyRange(
  now = new Date(),
  monthCount = 12,
): { start: Date; end: Date; monthKeys: string[] } {
  const nepalTime = new Date(now.getTime() + kathmanduOffsetMilliseconds);
  const endYear = nepalTime.getUTCFullYear();
  const endMonth = nepalTime.getUTCMonth();
  const safeMonthCount = Math.max(1, Math.trunc(monthCount));
  const startMarker = new Date(
    Date.UTC(endYear, endMonth - safeMonthCount + 1, 1),
  );
  const monthKeys = Array.from({ length: safeMonthCount }, (_, index) => {
    const month = new Date(
      Date.UTC(
        startMarker.getUTCFullYear(),
        startMarker.getUTCMonth() + index,
        1,
      ),
    );
    return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
  });

  return {
    start: nepalBoundaryUtc(
      startMarker.getUTCFullYear(),
      startMarker.getUTCMonth(),
      1,
    ),
    end: nepalBoundaryUtc(endYear, endMonth + 1, 1),
    monthKeys,
  };
}

export function buildHalfOpenDateFilter(start: Date, end: Date) {
  return { gte: start, lt: end };
}

export function isWithinHalfOpenRange(
  value: Date,
  start: Date,
  end: Date,
): boolean {
  return value >= start && value < end;
}

export function formatPercentage(count: number, total: number): string {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) {
    return "0.0%";
  }

  return `${((Math.max(0, count) / total) * 100).toFixed(1)}%`;
}

export function normalizeGroupingLabel(
  value: string | null | undefined,
): string {
  return value?.trim() || "Not specified";
}

export function buildBreakdownRows(
  groups: GroupedValue[],
  total: number,
  limit = 10,
): BreakdownRow[] {
  const combinedGroups = new Map<string, number>();
  for (const group of groups) {
    const label = normalizeGroupingLabel(group.label);
    combinedGroups.set(label, (combinedGroups.get(label) ?? 0) + group.count);
  }

  const rows = [...combinedGroups.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) =>
      right.count - left.count || left.label.localeCompare(right.label),
    )
    .slice(0, limit);
  const representedCount = rows.reduce((sum, row) => sum + row.count, 0);
  const otherCount = Math.max(0, total - representedCount);

  const breakdown = rows.map((row) => ({
    ...row,
    percentage: formatPercentage(row.count, total),
  }));

  if (otherCount > 0) {
    breakdown.push({
      label: "Other",
      count: otherCount,
      percentage: formatPercentage(otherCount, total),
    });
  }

  return breakdown;
}

export function buildBreakdownChartData(
  rows: BreakdownRow[],
): ChartDatum[] {
  return rows.map((row) => ({
    label: row.label,
    value: row.count,
  }));
}

export function formatMonthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return monthKey;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function buildMonthlyChartData(
  rows: MonthlyAggregationRow[],
  monthKeys: string[],
): ChartDatum[] {
  const counts = new Map(
    rows.map((row) => [row.monthKey, Number(row.count)]),
  );

  return monthKeys.map((monthKey) => ({
    label: formatMonthLabel(monthKey),
    value: Number.isFinite(counts.get(monthKey)) ? counts.get(monthKey)! : 0,
  }));
}

export function mergeRecentActivity(
  studentActivity: RecentActivity[],
  partnerActivity: RecentActivity[],
  limit = 10,
): RecentActivity[] {
  return [...studentActivity, ...partnerActivity]
    .sort((left, right) => {
      const dateDifference = right.createdAt.getTime() - left.createdAt.getTime();
      if (dateDifference) return dateDifference;

      const typeDifference = left.type.localeCompare(right.type);
      if (typeDifference) return typeDifference;

      return right.id.localeCompare(left.id);
    })
    .slice(0, limit);
}

export function formatAnalyticsDate(date: Date): string {
  return `${analyticsDateFormatter.format(date)} NPT`;
}
