import {
  eachDayOfInterval,
  format,
  getDay,
  isWithinInterval,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import { prisma } from "@/lib/db";

export function businessDaysBetween(
  start: Date,
  end: Date,
  holidayDates: Set<string>,
  halfDay = false,
) {
  const days = eachDayOfInterval({ start, end });
  let count = 0;

  for (const day of days) {
    const weekday = getDay(day);
    if (weekday === 0 || weekday === 6) continue;
    const key = format(day, "yyyy-MM-dd");
    if (holidayDates.has(key)) continue;
    count += 1;
  }

  if (halfDay && count > 0) {
    return 0.5;
  }

  return count;
}

export async function getHolidaySet(country: string, start: Date, end: Date) {
  const holidays = await prisma.holiday.findMany({
    where: {
      country,
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  return new Set(holidays.map((h) => format(h.date, "yyyy-MM-dd")));
}

export async function calculateLeaveDays(input: {
  startDate: string;
  endDate: string;
  country: string;
  halfDay?: boolean;
}) {
  const start = parseISO(input.startDate);
  const end = parseISO(input.endDate);

  if (end < start) {
    throw new Error("End date cannot be before start date");
  }

  const holidaySet = await getHolidaySet(input.country, start, end);
  const days = businessDaysBetween(start, end, holidaySet, Boolean(input.halfDay));

  if (days <= 0) {
    throw new Error("Selected range has no working days");
  }

  return days;
}

export async function assertNoOverlap(userId: string, start: Date, end: Date, excludeId?: string) {
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  if (overlapping) {
    throw new Error("You already have leave overlapping these dates");
  }
}

export async function assertNotInBlackout(
  start: Date,
  end: Date,
  departmentId: string | null | undefined,
) {
  const blackouts = await prisma.blackoutPeriod.findMany({
    where: {
      startDate: { lte: end },
      endDate: { gte: start },
      OR: [{ departmentId: null }, ...(departmentId ? [{ departmentId }] : [])],
    },
  });

  if (blackouts.length > 0) {
    throw new Error(`Dates fall in blackout: ${blackouts[0].name}`);
  }
}

export async function getAvailableBalance(userId: string, leaveTypeId: string, year: number) {
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      userId_leaveTypeId_year: { userId, leaveTypeId, year },
    },
  });

  if (!balance) return 0;
  return balance.entitled + balance.carried - balance.used - balance.pending;
}

export function coverageScore(onLeave: number, teamSize: number) {
  if (teamSize <= 0) return 100;
  const available = Math.max(teamSize - onLeave, 0);
  return Math.round((available / teamSize) * 100);
}

export function spanLabel(start: Date, end: Date) {
  if (differenceInCalendarDays(end, start) === 0) {
    return format(start, "dd MMM yyyy");
  }
  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
}

export function isDateInRange(date: Date, start: Date, end: Date) {
  return isWithinInterval(date, { start, end });
}
