import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`;
}

export function initials(user: { firstName: string; lastName: string }) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function formatDays(days: number) {
  const value = Number.isInteger(days) ? days.toString() : days.toFixed(1);
  return `${value} day${days === 1 ? "" : "s"}`;
}
