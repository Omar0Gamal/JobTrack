import { z } from "zod";

export const APPLICATION_STATUS_ORDER = [
  "WISHLIST",
  "APPLIED",
  "PHONE_SCREEN",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

export const ApplicationStatusSchema = z.enum(APPLICATION_STATUS_ORDER);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH"] as const;
export const PrioritySchema = z.enum(PRIORITY_ORDER);
export type Priority = z.infer<typeof PrioritySchema>;

export const LOCATION_TYPE_ORDER = ["REMOTE", "HYBRID", "ONSITE"] as const;
export const LocationTypeSchema = z.enum(LOCATION_TYPE_ORDER);
export type LocationType = z.infer<typeof LocationTypeSchema>;

export const APPLICATION_SOURCE_ORDER = [
  "LINKEDIN",
  "REFERRAL",
  "COMPANY_SITE",
  "INDEED",
  "RECRUITER",
  "OTHER",
] as const;
export const ApplicationSourceSchema = z.enum(APPLICATION_SOURCE_ORDER);
export type ApplicationSource = z.infer<typeof ApplicationSourceSchema>;

export const INTERVIEW_TYPE_ORDER = [
  "HR",
  "TECHNICAL",
  "BEHAVIORAL",
  "SYSTEM_DESIGN",
  "ONSITE",
  "OTHER",
] as const;
export const InterviewTypeSchema = z.enum(INTERVIEW_TYPE_ORDER);
export type InterviewType = z.infer<typeof InterviewTypeSchema>;

export const INTERVIEW_OUTCOME_ORDER = [
  "PENDING",
  "PASSED",
  "FAILED",
  "CANCELLED",
] as const;
export const InterviewOutcomeSchema = z.enum(INTERVIEW_OUTCOME_ORDER);
export type InterviewOutcome = z.infer<typeof InterviewOutcomeSchema>;

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "Onsite",
};

export const APPLICATION_SOURCE_LABELS: Record<ApplicationSource, string> = {
  LINKEDIN: "LinkedIn",
  REFERRAL: "Referral",
  COMPANY_SITE: "Company Site",
  INDEED: "Indeed",
  RECRUITER: "Recruiter",
  OTHER: "Other",
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  HR: "HR / Recruiter",
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  SYSTEM_DESIGN: "System Design",
  ONSITE: "Onsite",
  OTHER: "Other",
};

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  PENDING: "Pending",
  PASSED: "Passed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  WISHLIST: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  APPLIED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  PHONE_SCREEN: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  INTERVIEW: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  OFFER: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  REJECTED: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
};

export const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  REMOTE: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
  HYBRID: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  ONSITE: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
};

export const APPLICATION_SOURCE_COLORS: Record<ApplicationSource, string> = {
  LINKEDIN: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
  REFERRAL: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
  COMPANY_SITE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  INDEED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  RECRUITER: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800",
  OTHER: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
};

export const INTERVIEW_TYPE_COLORS: Record<InterviewType, string> = {
  HR: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  TECHNICAL: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
  BEHAVIORAL: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  SYSTEM_DESIGN: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  ONSITE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  OTHER: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
};

export const INTERVIEW_OUTCOME_COLORS: Record<InterviewOutcome, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  PASSED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
};
