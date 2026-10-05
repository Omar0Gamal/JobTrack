import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

function getCurrencySymbol(currency: string = "USD"): string {
  switch (currency.toUpperCase()) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "CAD":
      return "CA$";
    case "AUD":
      return "AU$";
    case "JPY":
      return "¥";
    default:
      return `${currency} `;
  }
}

function formatSingleSalary(amount: number, currency: string = "USD"): string {
  const symbol = getCurrencySymbol(currency);
  if (amount >= 1000) {
    const inK = amount / 1000;
    const formatted = inK % 1 === 0 ? inK.toString() : inK.toFixed(1).replace(/\.0$/, "");
    return `${symbol}${formatted}k`;
  }
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency: string = "USD"
): string {
  const hasMin = typeof min === "number" && !Number.isNaN(min) && min > 0;
  const hasMax = typeof max === "number" && !Number.isNaN(max) && max > 0;

  if (hasMin && hasMax) {
    if (min === max) {
      return formatSingleSalary(min, currency);
    }
    return `${formatSingleSalary(min, currency)} – ${formatSingleSalary(max, currency)}`;
  }
  if (hasMin) {
    return `From ${formatSingleSalary(min, currency)}`;
  }
  if (hasMax) {
    return `Up to ${formatSingleSalary(max, currency)}`;
  }
  return "";
}

export function getCompanyInitials(company: string): string {
  if (!company || !company.trim()) {
    return "?";
  }
  const clean = company.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const firstWord = words[0];
  if (!firstWord) {
    return "?";
  }
  if (words.length === 1) {
    return firstWord.slice(0, 2).toUpperCase();
  }
  const secondWord = words[1];
  const first = firstWord[0] ?? "";
  const second = secondWord?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

const AVATAR_COLOR_PALETTES = [
  "bg-indigo-600 text-white dark:bg-indigo-500",
  "bg-blue-600 text-white dark:bg-blue-500",
  "bg-violet-600 text-white dark:bg-violet-500",
  "bg-emerald-600 text-white dark:bg-emerald-500",
  "bg-teal-600 text-white dark:bg-teal-500",
  "bg-cyan-600 text-white dark:bg-cyan-500",
  "bg-amber-600 text-white dark:bg-amber-500",
  "bg-rose-600 text-white dark:bg-rose-500",
  "bg-purple-600 text-white dark:bg-purple-500",
  "bg-sky-600 text-white dark:bg-sky-500",
] as const;

export function getCompanyAvatarColor(company: string): string {
  if (!company || !company.trim()) {
    return AVATAR_COLOR_PALETTES[0];
  }
  let hash = 0;
  const str = company.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
  return AVATAR_COLOR_PALETTES[index] ?? AVATAR_COLOR_PALETTES[0];
}

