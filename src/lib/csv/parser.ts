import Papa from "papaparse";
import {
  CsvImportRowSchema,
  type CsvImportRowInput,
} from "@/schemas/import-export.schema";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import type {
  ApplicationStatus,
  Priority,
  LocationType,
  ApplicationSource,
} from "@/schemas/enums";

export type CsvTargetFieldKey =
  | "company"
  | "role"
  | "status"
  | "priority"
  | "locationType"
  | "location"
  | "salaryMin"
  | "salaryMax"
  | "currency"
  | "source"
  | "jobUrl"
  | "appliedDate"
  | "followUpDate";

export const CSV_TARGET_FIELDS: Array<{
  key: CsvTargetFieldKey;
  label: string;
  required: boolean;
}> = [
  { key: "company", label: "Company", required: true },
  { key: "role", label: "Role / Job Title", required: true },
  { key: "status", label: "Status", required: false },
  { key: "priority", label: "Priority", required: false },
  { key: "locationType", label: "Location Type", required: false },
  { key: "location", label: "Location", required: false },
  { key: "salaryMin", label: "Salary Min", required: false },
  { key: "salaryMax", label: "Salary Max", required: false },
  { key: "currency", label: "Currency", required: false },
  { key: "source", label: "Source", required: false },
  { key: "jobUrl", label: "Job URL", required: false },
  { key: "appliedDate", label: "Applied Date", required: false },
  { key: "followUpDate", label: "Follow Up Date", required: false },
];

export function autoMapCsvHeaders(
  headers: string[]
): Record<string, CsvTargetFieldKey | "IGNORE"> {
  const mapping: Record<string, CsvTargetFieldKey | "IGNORE"> = {};

  const aliasMap: Record<string, CsvTargetFieldKey> = {
    company: "company",
    companyname: "company",
    employer: "company",
    organization: "company",
    firm: "company",

    role: "role",
    jobtitle: "role",
    title: "role",
    position: "role",
    job: "role",

    status: "status",
    stage: "status",
    state: "status",
    pipeline: "status",

    priority: "priority",
    urgency: "priority",

    locationtype: "locationType",
    workmode: "locationType",
    workplace: "locationType",
    type: "locationType",

    location: "location",
    city: "location",
    office: "location",

    salarymin: "salaryMin",
    minsalary: "salaryMin",
    minimumsalary: "salaryMin",

    salarymax: "salaryMax",
    maxsalary: "salaryMax",
    salary: "salaryMax",
    maximumsalary: "salaryMax",
    compensation: "salaryMax",

    currency: "currency",
    salarycurrency: "currency",

    source: "source",
    channel: "source",
    origin: "source",

    joburl: "jobUrl",
    url: "jobUrl",
    link: "jobUrl",
    postingurl: "jobUrl",
    jobposting: "jobUrl",

    applieddate: "appliedDate",
    dateapplied: "appliedDate",
    applied: "appliedDate",
    applicationdate: "appliedDate",

    followupdate: "followUpDate",
    followup: "followUpDate",
    nextfollowup: "followUpDate",
  };

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matched = aliasMap[normalized];
    mapping[header] = matched ?? "IGNORE";
  }

  return mapping;
}

export function parseCsvText(csvText: string): {
  headers: string[];
  rows: Record<string, string>[];
  parseErrors: string[];
} {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const rows: Record<string, string>[] = [];

  for (const rawRow of result.data) {
    const cleanedRow: Record<string, string> = {};
    let hasAnyValue = false;
    for (const key of headers) {
      const val = rawRow[key];
      const trimmed = val ? val.trim() : "";
      if (trimmed.length > 0) {
        hasAnyValue = true;
      }
      cleanedRow[key] = trimmed;
    }
    if (hasAnyValue) {
      rows.push(cleanedRow);
    }
  }

  const parseErrors = result.errors.map(
    (err) => `Row ${err.row ?? "unknown"}: ${err.message}`
  );

  return {
    headers,
    rows,
    parseErrors,
  };
}

function normalizeStatus(value: string): ApplicationStatus | string {
  const clean = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const statusMap: Record<string, ApplicationStatus> = {
    WISHLIST: "WISHLIST",
    APPLIED: "APPLIED",
    PHONE_SCREEN: "PHONE_SCREEN",
    PHONESCREEN: "PHONE_SCREEN",
    PHONE: "PHONE_SCREEN",
    INTERVIEW: "INTERVIEW",
    INTERVIEWING: "INTERVIEW",
    OFFER: "OFFER",
    OFFERED: "OFFER",
    REJECTED: "REJECTED",
    REJECT: "REJECTED",
  };
  return statusMap[clean] ?? clean;
}

function normalizePriority(value: string): Priority | string {
  const clean = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const priorityMap: Record<string, Priority> = {
    LOW: "LOW",
    MED: "MEDIUM",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
  };
  return priorityMap[clean] ?? clean;
}

function normalizeLocationType(value: string): LocationType | string {
  const clean = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const locationTypeMap: Record<string, LocationType> = {
    REMOTE: "REMOTE",
    HYBRID: "HYBRID",
    ONSITE: "ONSITE",
    ON_SITE: "ONSITE",
  };
  return locationTypeMap[clean] ?? clean;
}

function normalizeSource(value: string): ApplicationSource | string {
  const clean = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const sourceMap: Record<string, ApplicationSource> = {
    LINKEDIN: "LINKEDIN",
    REFERRAL: "REFERRAL",
    COMPANY_SITE: "COMPANY_SITE",
    COMPANYSITE: "COMPANY_SITE",
    COMPANY: "COMPANY_SITE",
    WEBSITE: "COMPANY_SITE",
    CAREERS: "COMPANY_SITE",
    INDEED: "INDEED",
    RECRUITER: "RECRUITER",
    OTHER: "OTHER",
  };
  return sourceMap[clean] ?? clean;
}

function parseSalary(value: string | undefined): number | null | undefined {
  if (!value || value.trim() === "") return undefined;
  const stripped = value.replace(/[$,]/g, "").trim();
  if (stripped === "") return undefined;
  const num = Number(stripped);
  if (Number.isNaN(num)) return undefined;
  return Math.round(num);
}

export function validateMappedCsvRows(
  rows: Record<string, string>[],
  columnMapping: Record<string, CsvTargetFieldKey | "IGNORE">
): {
  validRows: Array<{ rowNumber: number; data: CsvImportRowInput }>;
  invalidRows: Array<{
    rowNumber: number;
    raw: Record<string, string>;
    errors: string[];
  }>;
  previewRows: Array<{
    rowNumber: number;
    mapped: Record<string, string>;
    valid: boolean;
    errors: string[];
  }>;
} {
  const validRows: Array<{ rowNumber: number; data: CsvImportRowInput }> = [];
  const invalidRows: Array<{
    rowNumber: number;
    raw: Record<string, string>;
    errors: string[];
  }> = [];
  const previewRows: Array<{
    rowNumber: number;
    mapped: Record<string, string>;
    valid: boolean;
    errors: string[];
  }> = [];

  // Inverted map: TargetFieldKey -> RawHeader
  const targetToRawHeader = new Map<CsvTargetFieldKey, string>();
  for (const [rawHeader, targetKey] of Object.entries(columnMapping)) {
    if (targetKey !== "IGNORE") {
      targetToRawHeader.set(targetKey, rawHeader);
    }
  }

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 1;
    const mapped: Record<string, string> = {};

    const getRawVal = (field: CsvTargetFieldKey): string | undefined => {
      const header = targetToRawHeader.get(field);
      if (!header) return undefined;
      const v = rawRow[header];
      return v !== undefined && v !== "" ? v.trim() : undefined;
    };

    const companyRaw = getRawVal("company");
    const roleRaw = getRawVal("role");
    const statusRaw = getRawVal("status");
    const priorityRaw = getRawVal("priority");
    const locationTypeRaw = getRawVal("locationType");
    const locationRaw = getRawVal("location");
    const salaryMinRaw = getRawVal("salaryMin");
    const salaryMaxRaw = getRawVal("salaryMax");
    const currencyRaw = getRawVal("currency");
    const sourceRaw = getRawVal("source");
    const jobUrlRaw = getRawVal("jobUrl");
    const appliedDateRaw = getRawVal("appliedDate");
    const followUpDateRaw = getRawVal("followUpDate");

    if (companyRaw !== undefined) mapped.company = companyRaw;
    if (roleRaw !== undefined) mapped.role = roleRaw;
    if (statusRaw !== undefined) mapped.status = statusRaw;
    if (priorityRaw !== undefined) mapped.priority = priorityRaw;
    if (locationTypeRaw !== undefined) mapped.locationType = locationTypeRaw;
    if (locationRaw !== undefined) mapped.location = locationRaw;
    if (salaryMinRaw !== undefined) mapped.salaryMin = salaryMinRaw;
    if (salaryMaxRaw !== undefined) mapped.salaryMax = salaryMaxRaw;
    if (currencyRaw !== undefined) mapped.currency = currencyRaw;
    if (sourceRaw !== undefined) mapped.source = sourceRaw;
    if (jobUrlRaw !== undefined) mapped.jobUrl = jobUrlRaw;
    if (appliedDateRaw !== undefined) mapped.appliedDate = appliedDateRaw;
    if (followUpDateRaw !== undefined) mapped.followUpDate = followUpDateRaw;

    const rowObj: Record<string, unknown> = {};

    rowObj.company = companyRaw ?? "";
    rowObj.role = roleRaw ?? "";
    if (statusRaw !== undefined) rowObj.status = normalizeStatus(statusRaw);
    if (priorityRaw !== undefined) rowObj.priority = normalizePriority(priorityRaw);
    if (locationTypeRaw !== undefined)
      rowObj.locationType = normalizeLocationType(locationTypeRaw);
    if (locationRaw !== undefined) rowObj.location = locationRaw;

    const minSal = parseSalary(salaryMinRaw);
    if (minSal !== undefined) rowObj.salaryMin = minSal;

    const maxSal = parseSalary(salaryMaxRaw);
    if (maxSal !== undefined) rowObj.salaryMax = maxSal;

    if (currencyRaw !== undefined) rowObj.currency = currencyRaw.toUpperCase();
    if (sourceRaw !== undefined) rowObj.source = normalizeSource(sourceRaw);
    if (jobUrlRaw !== undefined) rowObj.jobUrl = jobUrlRaw;
    if (appliedDateRaw !== undefined) rowObj.appliedDate = appliedDateRaw;
    if (followUpDateRaw !== undefined) rowObj.followUpDate = followUpDateRaw;

    const parseResult = CsvImportRowSchema.safeParse(rowObj);

    if (parseResult.success) {
      validRows.push({ rowNumber, data: parseResult.data });
      if (previewRows.length < 10) {
        previewRows.push({
          rowNumber,
          mapped,
          valid: true,
          errors: [],
        });
      }
    } else {
      const errors = parseResult.error.issues.map((issue) => issue.message);
      invalidRows.push({
        rowNumber,
        raw: rawRow,
        errors,
      });
      if (previewRows.length < 10) {
        previewRows.push({
          rowNumber,
          mapped,
          valid: false,
          errors,
        });
      }
    }
  });

  return {
    validRows,
    invalidRows,
    previewRows,
  };
}

export function generateApplicationsCsv(
  applications: ApplicationWithRelations[]
): string {
  const data = applications.map((app) => ({
    Company: app.company,
    Role: app.role,
    Status: app.status,
    Priority: app.priority,
    "Location Type": app.locationType,
    Location: app.location ?? "",
    "Salary Min": app.salaryMin ?? "",
    "Salary Max": app.salaryMax ?? "",
    Currency: app.currency ?? "USD",
    Source: app.source,
    "Job URL": app.jobUrl ?? "",
    "Applied Date": app.appliedDate
      ? new Date(app.appliedDate).toISOString().split("T")[0]
      : "",
    "Follow Up Date": app.followUpDate
      ? new Date(app.followUpDate).toISOString().split("T")[0]
      : "",
  }));

  return Papa.unparse(data, {
    header: true,
    newline: "\r\n",
  });
}
