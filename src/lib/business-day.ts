import { formatDateKey, toDateKey } from "./format";

/** Shop opens at 8:00 AM and closes at 4:00 AM the next calendar day. */
export const SHOP_OPEN_HOUR = 8;
export const SHOP_CLOSE_HOUR = 4;

export interface BusinessDayRange {
  /** Calendar date the shift belongs to (the day shop opened at 8 AM). */
  businessDateKey: string;
  from: Date;
  to: Date;
  /** Reporting end — now while the shift is open, otherwise shift close. */
  effectiveTo: Date;
  isComplete: boolean;
}

function atHour(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Resolve which calendar date a timestamp belongs to for the business day label. */
export function getBusinessDateForTimestamp(date: Date = new Date()): Date {
  const hour = date.getHours();
  const businessDate = new Date(date);
  businessDate.setHours(0, 0, 0, 0);

  if (hour < SHOP_CLOSE_HOUR) {
    businessDate.setDate(businessDate.getDate() - 1);
  } else if (hour >= SHOP_CLOSE_HOUR && hour < SHOP_OPEN_HOUR) {
    businessDate.setDate(businessDate.getDate() - 1);
  }

  return businessDate;
}

export function getBusinessDayRange(
  reference: Date = new Date()
): BusinessDayRange {
  const now = reference;
  const businessDate = getBusinessDateForTimestamp(now);
  const from = atHour(businessDate, SHOP_OPEN_HOUR);

  const closeDate = new Date(businessDate);
  closeDate.setDate(closeDate.getDate() + 1);
  const to = atHour(closeDate, SHOP_CLOSE_HOUR);

  const isComplete = now >= to;
  const effectiveTo = isComplete ? to : now;

  return {
    businessDateKey: toDateKey(businessDate),
    from,
    to,
    effectiveTo,
    isComplete,
  };
}

export function formatBusinessDayLabel(dateKey: string): string {
  return formatDateKey(dateKey);
}

export function formatBusinessDayHours(): string {
  return "8:00 AM – 4:00 AM (next day)";
}

/** Full shift window for a business date (8 AM that day → 4 AM next day). */
export function getBusinessDayRangeForDateKey(businessDateKey: string): BusinessDayRange {
  const parts = businessDateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return getBusinessDayRange();
  }

  const [year, month, day] = parts;
  const businessDate = new Date(year, month - 1, day);
  const from = atHour(businessDate, SHOP_OPEN_HOUR);

  const closeDate = new Date(businessDate);
  closeDate.setDate(closeDate.getDate() + 1);
  const to = atHour(closeDate, SHOP_CLOSE_HOUR);

  return {
    businessDateKey,
    from,
    to,
    effectiveTo: to,
    isComplete: true,
  };
}

export function formatBusinessDayPeriod(range: BusinessDayRange): string {
  const openLabel = range.from.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const closeLabel = range.effectiveTo.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${openLabel} to ${closeLabel}`;
}

export function isWithinBusinessDayRange(
  iso: string,
  range: BusinessDayRange
): boolean {
  const date = new Date(iso);
  return date >= range.from && date <= range.effectiveTo;
}
