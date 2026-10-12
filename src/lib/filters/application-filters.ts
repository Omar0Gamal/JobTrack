import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";
import {
  APPLICATION_STATUS_ORDER,
  APPLICATION_SOURCE_ORDER,
  PRIORITY_ORDER,
  LOCATION_TYPE_ORDER,
  type ApplicationStatus,
  type ApplicationSource,
  type Priority,
  type LocationType,
} from "@/schemas/enums";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";

export interface BoardFilterParams {
  view: "board" | "table";
  q: string;
  status: ApplicationStatus | "ALL";
  source: ApplicationSource | "ALL";
  priority: Priority | "ALL";
  locationType: LocationType | "ALL";
  resumeVersionId: string | "ALL";
  from: string; // YYYY-MM-DD or ""
  to: string;   // YYYY-MM-DD or ""
  archived: boolean;
  sortBy: "appliedDate" | "company" | "role" | "status" | "priority" | "salaryMax" | "followUpDate" | "updatedAt";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_BOARD_FILTER_PARAMS: BoardFilterParams = {
  view: "board",
  q: "",
  status: "ALL",
  source: "ALL",
  priority: "ALL",
  locationType: "ALL",
  resumeVersionId: "ALL",
  from: "",
  to: "",
  archived: false,
  sortBy: "appliedDate",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
};

const VALID_SORT_KEYS = [
  "appliedDate",
  "company",
  "role",
  "status",
  "priority",
  "salaryMax",
  "followUpDate",
  "updatedAt",
] as const;

type SortByKey = (typeof VALID_SORT_KEYS)[number];

function getParamValue(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined> | null | undefined,
  key: string
): string | undefined {
  if (!searchParams) {
    return undefined;
  }
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined;
  }
  const val = searchParams[key];
  if (Array.isArray(val)) {
    return val[0];
  }
  return val;
}

/**
 * Safely parses URL search params into typed BoardFilterParams.
 * Supports both unified `sort=<field>:<dir>` and separate `sortBy` / `sortDir`.
 */
export function parseBoardFilterParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined> | null | undefined
): BoardFilterParams {
  const viewVal = getParamValue(searchParams, "view");
  const view: "board" | "table" = viewVal === "table" ? "table" : "board";

  const q = getParamValue(searchParams, "q")?.trim() ?? "";

  const statusVal = getParamValue(searchParams, "status");
  const status: ApplicationStatus | "ALL" =
    statusVal && (APPLICATION_STATUS_ORDER as readonly string[]).includes(statusVal)
      ? (statusVal as ApplicationStatus)
      : "ALL";

  const sourceVal = getParamValue(searchParams, "source");
  const source: ApplicationSource | "ALL" =
    sourceVal && (APPLICATION_SOURCE_ORDER as readonly string[]).includes(sourceVal)
      ? (sourceVal as ApplicationSource)
      : "ALL";

  const priorityVal = getParamValue(searchParams, "priority");
  const priority: Priority | "ALL" =
    priorityVal && (PRIORITY_ORDER as readonly string[]).includes(priorityVal)
      ? (priorityVal as Priority)
      : "ALL";

  const locationTypeVal = getParamValue(searchParams, "locationType");
  const locationType: LocationType | "ALL" =
    locationTypeVal && (LOCATION_TYPE_ORDER as readonly string[]).includes(locationTypeVal)
      ? (locationTypeVal as LocationType)
      : "ALL";

  const resumeVersionIdVal = getParamValue(searchParams, "resumeVersionId");
  const resumeVersionId =
    resumeVersionIdVal && resumeVersionIdVal.trim() !== ""
      ? resumeVersionIdVal.trim()
      : "ALL";

  const from = getParamValue(searchParams, "from")?.trim() ?? "";
  const to = getParamValue(searchParams, "to")?.trim() ?? "";

  const archivedVal = getParamValue(searchParams, "archived");
  const archived = archivedVal === "true" || archivedVal === "1";

  // Sorting
  const sortCombined = getParamValue(searchParams, "sort");
  let sortBy: SortByKey = DEFAULT_BOARD_FILTER_PARAMS.sortBy;
  let sortDir: "asc" | "desc" = DEFAULT_BOARD_FILTER_PARAMS.sortDir;

  if (sortCombined) {
    const colonIndex = sortCombined.indexOf(":");
    if (colonIndex !== -1) {
      const field = sortCombined.slice(0, colonIndex);
      const dir = sortCombined.slice(colonIndex + 1);
      if ((VALID_SORT_KEYS as readonly string[]).includes(field)) {
        sortBy = field as SortByKey;
      }
      if (dir === "asc" || dir === "desc") {
        sortDir = dir;
      }
    } else if ((VALID_SORT_KEYS as readonly string[]).includes(sortCombined)) {
      sortBy = sortCombined as SortByKey;
    }
  } else {
    const sortByVal = getParamValue(searchParams, "sortBy");
    if (sortByVal && (VALID_SORT_KEYS as readonly string[]).includes(sortByVal)) {
      sortBy = sortByVal as SortByKey;
    }
    const sortDirVal = getParamValue(searchParams, "sortDir");
    if (sortDirVal === "asc" || sortDirVal === "desc") {
      sortDir = sortDirVal;
    }
  }

  // Pagination
  const pageVal = getParamValue(searchParams, "page");
  const parsedPage = pageVal ? parseInt(pageVal, 10) : 1;
  const page = !Number.isNaN(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const pageSizeVal = getParamValue(searchParams, "pageSize");
  const parsedPageSize = pageSizeVal ? parseInt(pageSizeVal, 10) : 10;
  const pageSize = !Number.isNaN(parsedPageSize) && parsedPageSize >= 1 ? parsedPageSize : 10;

  return {
    view,
    q,
    status,
    source,
    priority,
    locationType,
    resumeVersionId,
    from,
    to,
    archived,
    sortBy,
    sortDir,
    page,
    pageSize,
  };
}

/**
 * Serializes partial filter parameters into a URL query string, omitting defaults
 * and preserving existing query parameters such as `?app=ID`.
 */
export function serializeBoardFilterParams(
  params: Partial<BoardFilterParams>,
  currentSearchParams?: URLSearchParams
): string {
  const next = new URLSearchParams(currentSearchParams ? currentSearchParams.toString() : "");

  if (params.view !== undefined) {
    if (params.view === "table") {
      next.set("view", "table");
    } else {
      next.delete("view");
    }
  }

  if (params.q !== undefined) {
    const trimmed = params.q.trim();
    if (trimmed) {
      next.set("q", trimmed);
    } else {
      next.delete("q");
    }
  }

  if (params.status !== undefined) {
    if (params.status !== "ALL") {
      next.set("status", params.status);
    } else {
      next.delete("status");
    }
  }

  if (params.source !== undefined) {
    if (params.source !== "ALL") {
      next.set("source", params.source);
    } else {
      next.delete("source");
    }
  }

  if (params.priority !== undefined) {
    if (params.priority !== "ALL") {
      next.set("priority", params.priority);
    } else {
      next.delete("priority");
    }
  }

  if (params.locationType !== undefined) {
    if (params.locationType !== "ALL") {
      next.set("locationType", params.locationType);
    } else {
      next.delete("locationType");
    }
  }

  if (params.resumeVersionId !== undefined) {
    if (params.resumeVersionId !== "ALL" && params.resumeVersionId.trim() !== "") {
      next.set("resumeVersionId", params.resumeVersionId.trim());
    } else {
      next.delete("resumeVersionId");
    }
  }

  if (params.from !== undefined) {
    const trimmed = params.from.trim();
    if (trimmed) {
      next.set("from", trimmed);
    } else {
      next.delete("from");
    }
  }

  if (params.to !== undefined) {
    const trimmed = params.to.trim();
    if (trimmed) {
      next.set("to", trimmed);
    } else {
      next.delete("to");
    }
  }

  if (params.archived !== undefined) {
    if (params.archived) {
      next.set("archived", "true");
    } else {
      next.delete("archived");
    }
  }

  if (params.sortBy !== undefined || params.sortDir !== undefined) {
    const finalSortBy = params.sortBy ?? DEFAULT_BOARD_FILTER_PARAMS.sortBy;
    const finalSortDir = params.sortDir ?? DEFAULT_BOARD_FILTER_PARAMS.sortDir;

    next.delete("sortBy");
    next.delete("sortDir");

    if (
      finalSortBy === DEFAULT_BOARD_FILTER_PARAMS.sortBy &&
      finalSortDir === DEFAULT_BOARD_FILTER_PARAMS.sortDir
    ) {
      next.delete("sort");
    } else {
      next.set("sort", `${finalSortBy}:${finalSortDir}`);
    }
  }

  if (params.page !== undefined) {
    if (params.page > 1) {
      next.set("page", String(params.page));
    } else {
      next.delete("page");
    }
  }

  if (params.pageSize !== undefined) {
    if (params.pageSize !== DEFAULT_BOARD_FILTER_PARAMS.pageSize) {
      next.set("pageSize", String(params.pageSize));
    } else {
      next.delete("pageSize");
    }
  }

  return next.toString();
}

/**
 * Counts how many filter fields differ from their default values.
 * Filter fields counted: q, status, source, priority, locationType, resumeVersionId, from, to, archived.
 */
export function countActiveFilters(params: BoardFilterParams): number {
  let count = 0;
  if (params.q.trim() !== "") count++;
  if (params.status !== "ALL") count++;
  if (params.source !== "ALL") count++;
  if (params.priority !== "ALL") count++;
  if (params.locationType !== "ALL") count++;
  if (params.resumeVersionId !== "ALL" && params.resumeVersionId.trim() !== "") count++;
  if (params.from.trim() !== "") count++;
  if (params.to.trim() !== "") count++;
  if (params.archived) count++;
  return count;
}

/**
 * Pure function that filters and sorts an array of applications according to BoardFilterParams.
 */
export function filterAndSortApplications<T extends ApplicationWithRelations>(
  applications: T[],
  params: BoardFilterParams
): T[] {
  const filtered = applications.filter((app) => {
    // 1. Archived filter
    if (!params.archived) {
      if (app.archivedAt !== null) {
        return false;
      }
    }

    // 2. Search query matching company, role, or location
    const qTrimmed = params.q.trim().toLowerCase();
    if (qTrimmed) {
      const companyMatch = app.company.toLowerCase().includes(qTrimmed);
      const roleMatch = app.role.toLowerCase().includes(qTrimmed);
      const locationMatch = (app.location ?? "").toLowerCase().includes(qTrimmed);
      if (!companyMatch && !roleMatch && !locationMatch) {
        return false;
      }
    }

    // 3. Status filter
    if (params.status !== "ALL" && app.status !== params.status) {
      return false;
    }

    // 4. Source filter
    if (params.source !== "ALL" && app.source !== params.source) {
      return false;
    }

    // 5. Priority filter
    if (params.priority !== "ALL" && app.priority !== params.priority) {
      return false;
    }

    // 6. Location Type filter
    if (params.locationType !== "ALL" && app.locationType !== params.locationType) {
      return false;
    }

    // 7. Resume Version filter
    if (
      params.resumeVersionId !== "ALL" &&
      params.resumeVersionId.trim() !== "" &&
      app.resumeVersionId !== params.resumeVersionId
    ) {
      return false;
    }

    // 8. Date Range filter (appliedDate)
    const appAppliedDate = new Date(app.appliedDate);
    if (params.from.trim()) {
      const fromDate = startOfDay(parseISO(params.from.trim()));
      if (isValid(fromDate) && appAppliedDate < fromDate) {
        return false;
      }
    }
    if (params.to.trim()) {
      const toDate = endOfDay(parseISO(params.to.trim()));
      if (isValid(toDate) && appAppliedDate > toDate) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    const dirMultiplier = params.sortDir === "asc" ? 1 : -1;
    let cmp = 0;

    switch (params.sortBy) {
      case "company":
        cmp = a.company.localeCompare(b.company, undefined, { sensitivity: "base" });
        break;
      case "role":
        cmp = a.role.localeCompare(b.role, undefined, { sensitivity: "base" });
        break;
      case "status": {
        const indexA = APPLICATION_STATUS_ORDER.indexOf(a.status);
        const indexB = APPLICATION_STATUS_ORDER.indexOf(b.status);
        cmp = indexA - indexB;
        break;
      }
      case "priority": {
        const indexA = PRIORITY_ORDER.indexOf(a.priority);
        const indexB = PRIORITY_ORDER.indexOf(b.priority);
        cmp = indexA - indexB;
        break;
      }
      case "salaryMax": {
        const valA = a.salaryMax ?? -1;
        const valB = b.salaryMax ?? -1;
        cmp = valA - valB;
        break;
      }
      case "appliedDate": {
        const timeA = new Date(a.appliedDate).getTime();
        const timeB = new Date(b.appliedDate).getTime();
        cmp = timeA - timeB;
        break;
      }
      case "followUpDate": {
        const timeA = a.followUpDate ? new Date(a.followUpDate).getTime() : 0;
        const timeB = b.followUpDate ? new Date(b.followUpDate).getTime() : 0;
        cmp = timeA - timeB;
        break;
      }
      case "updatedAt": {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        cmp = timeA - timeB;
        break;
      }
      default:
        cmp = 0;
        break;
    }

    if (cmp !== 0) {
      return cmp * dirMultiplier;
    }

    // Deterministic fallback: appliedDate desc, then id
    const fallbackTime = new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
    if (fallbackTime !== 0) {
      return fallbackTime;
    }
    return a.id.localeCompare(b.id);
  });
}
