export type RangeKey = "today" | "week" | "month" | "year" | "all";

export function parseRange(value: string | undefined): RangeKey {
  const valid: RangeKey[] = ["today", "week", "month", "year", "all"];
  return (valid as string[]).includes(value || "") ? (value as RangeKey) : "month";
}

export function getRangeStart(range: RangeKey, now = new Date()): Date | null {
  const d = new Date(now);
  switch (range) {
    case "today":
      d.setHours(0, 0, 0, 0);
      return d;
    case "week": {
      const day = d.getDay() || 7; // Sun=0 → 7
      d.setDate(d.getDate() - day + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    case "year":
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    case "all":
    default:
      return null;
  }
}

export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Heute",
  week: "Diese Woche",
  month: "Diesen Monat",
  year: "Dieses Jahr",
  all: "Gesamt",
};
