import { describe, it, expect } from "vitest";
import Papa from "papaparse";
import {
  autoMapCsvHeaders,
  parseCsvText,
  validateMappedCsvRows,
  generateApplicationsCsv,
  CSV_TARGET_FIELDS,
  type CsvTargetFieldKey,
} from "@/lib/csv/parser";
import {
  CsvImportRowSchema,
  FullBackupJsonSchema,
  type FullBackupJsonPayload,
} from "@/schemas/import-export.schema";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import type {
  ApplicationStatus,
  Priority,
  LocationType,
  ApplicationSource,
} from "@/schemas/enums";

function createMockApplication(
  overrides: Partial<ApplicationWithRelations> = {}
): ApplicationWithRelations {
  return {
    id: overrides.id ?? "app_test_1",
    userId: overrides.userId ?? "user_test_1",
    company: overrides.company ?? "Stripe",
    role: overrides.role ?? "Staff Systems Engineer",
    status: overrides.status ?? ("APPLIED" as ApplicationStatus),
    priority: overrides.priority ?? ("HIGH" as Priority),
    locationType: overrides.locationType ?? ("REMOTE" as LocationType),
    location: overrides.location !== undefined ? overrides.location : "San Francisco, CA",
    salaryMin: overrides.salaryMin !== undefined ? overrides.salaryMin : 190000,
    salaryMax: overrides.salaryMax !== undefined ? overrides.salaryMax : 230000,
    currency: overrides.currency ?? "USD",
    source: overrides.source ?? ("LINKEDIN" as ApplicationSource),
    jobUrl: overrides.jobUrl !== undefined ? overrides.jobUrl : "https://stripe.com/jobs/123",
    appliedDate: overrides.appliedDate ?? new Date("2026-09-15T00:00:00.000Z"),
    followUpDate: overrides.followUpDate !== undefined ? overrides.followUpDate : new Date("2026-09-22T00:00:00.000Z"),
    resumeVersionId: overrides.resumeVersionId !== undefined ? overrides.resumeVersionId : null,
    position: overrides.position ?? 1000,
    archivedAt: overrides.archivedAt !== undefined ? overrides.archivedAt : null,
    deletedAt: overrides.deletedAt !== undefined ? overrides.deletedAt : null,
    createdAt: overrides.createdAt ?? new Date("2026-09-15T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-09-15T00:00:00.000Z"),
    resumeVersion: overrides.resumeVersion !== undefined ? overrides.resumeVersion : null,
    interviews: overrides.interviews ?? [],
    notes: overrides.notes ?? [],
    contacts: overrides.contacts ?? [],
    statusHistory: overrides.statusHistory ?? [],
  };
}

describe("CSV Target Fields Registry", () => {
  it("contains all required and optional target fields", () => {
    expect(CSV_TARGET_FIELDS.length).toBe(13);
    const companyField = CSV_TARGET_FIELDS.find((f) => f.key === "company");
    const roleField = CSV_TARGET_FIELDS.find((f) => f.key === "role");
    expect(companyField?.required).toBe(true);
    expect(roleField?.required).toBe(true);

    const statusField = CSV_TARGET_FIELDS.find((f) => f.key === "status");
    expect(statusField?.required).toBe(false);
  });
});

describe("autoMapCsvHeaders", () => {
  it("maps common header variations to expected target field keys", () => {
    const inputHeaders = [
      "Company Name",
      "Job Title",
      "Stage",
      "Min Salary",
      "Max Salary",
      "Work Mode",
      "Job URL",
      "Date Applied",
    ];

    const mapping = autoMapCsvHeaders(inputHeaders);

    expect(mapping["Company Name"]).toBe("company");
    expect(mapping["Job Title"]).toBe("role");
    expect(mapping["Stage"]).toBe("status");
    expect(mapping["Min Salary"]).toBe("salaryMin");
    expect(mapping["Max Salary"]).toBe("salaryMax");
    expect(mapping["Work Mode"]).toBe("locationType");
    expect(mapping["Job URL"]).toBe("jobUrl");
    expect(mapping["Date Applied"]).toBe("appliedDate");
  });

  it("maps additional common synonyms accurately", () => {
    const headers = [
      "employer",
      "position",
      "state",
      "urgency",
      "workplace",
      "city",
      "minimum salary",
      "compensation",
      "salary currency",
      "channel",
      "posting url",
      "application date",
      "next follow up",
    ];

    const mapping = autoMapCsvHeaders(headers);

    expect(mapping["employer"]).toBe("company");
    expect(mapping["position"]).toBe("role");
    expect(mapping["state"]).toBe("status");
    expect(mapping["urgency"]).toBe("priority");
    expect(mapping["workplace"]).toBe("locationType");
    expect(mapping["city"]).toBe("location");
    expect(mapping["minimum salary"]).toBe("salaryMin");
    expect(mapping["compensation"]).toBe("salaryMax");
    expect(mapping["salary currency"]).toBe("currency");
    expect(mapping["channel"]).toBe("source");
    expect(mapping["posting url"]).toBe("jobUrl");
    expect(mapping["application date"]).toBe("appliedDate");
    expect(mapping["next follow up"]).toBe("followUpDate");
  });

  it("maps unknown headers to IGNORE", () => {
    const unknownHeaders = ["Random Column", "Internal Notes ID", "Tags", "Score"];
    const mapping = autoMapCsvHeaders(unknownHeaders);

    for (const h of unknownHeaders) {
      expect(mapping[h]).toBe("IGNORE");
    }
  });

  it("handles empty array cleanly", () => {
    const mapping = autoMapCsvHeaders([]);
    expect(Object.keys(mapping)).toHaveLength(0);
  });
});

describe("parseCsvText", () => {
  it("parses valid CSV text into headers and rows", () => {
    const csvContent = [
      "Company,Role,Status,Salary Min,Salary Max",
      "Acme Corp,Frontend Architect,APPLIED,140000,180000",
      "Globex,Backend Engineer,INTERVIEW,150000,190000",
    ].join("\n");

    const result = parseCsvText(csvContent);

    expect(result.headers).toEqual(["Company", "Role", "Status", "Salary Min", "Salary Max"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.["Company"]).toBe("Acme Corp");
    expect(result.rows[0]?.["Role"]).toBe("Frontend Architect");
    expect(result.rows[1]?.["Company"]).toBe("Globex");
    expect(result.parseErrors).toHaveLength(0);
  });

  it("trims whitespace from headers and values and ignores blank lines", () => {
    const csvWithSpaces = [
      "  Company  ,  Role  ,  Status  ",
      "  Initech  ,  DevOps Lead  ,  OFFER  ",
      "   ",
      "",
      "  Umbrella Corp  ,  Security Engineer  ,  WISHLIST  ",
    ].join("\r\n");

    const result = parseCsvText(csvWithSpaces);

    expect(result.headers).toEqual(["Company", "Role", "Status"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.["Company"]).toBe("Initech");
    expect(result.rows[0]?.["Role"]).toBe("DevOps Lead");
    expect(result.rows[0]?.["Status"]).toBe("OFFER");
    expect(result.rows[1]?.["Company"]).toBe("Umbrella Corp");
  });

  it("handles quotes and commas within fields", () => {
    const csvQuoted = [
      'Company,Role,Location',
      '"Wayne Enterprises, Inc.",Senior Architect,"Gotham, NY"',
    ].join("\n");

    const result = parseCsvText(csvQuoted);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.["Company"]).toBe("Wayne Enterprises, Inc.");
    expect(result.rows[0]?.["Role"]).toBe("Senior Architect");
    expect(result.rows[0]?.["Location"]).toBe("Gotham, NY");
  });
});

describe("validateMappedCsvRows", () => {
  const standardMapping: Record<string, CsvTargetFieldKey | "IGNORE"> = {
    Company: "company",
    Role: "role",
    Stage: "status",
    Priority: "priority",
    WorkMode: "locationType",
    Location: "location",
    MinSalary: "salaryMin",
    MaxSalary: "salaryMax",
    Currency: "currency",
    Channel: "source",
    PostingUrl: "jobUrl",
    AppliedDate: "appliedDate",
    FollowUpDate: "followUpDate",
    ExtraInfo: "IGNORE",
  };

  it("validates clean rows and normalizes enums successfully", () => {
    const rawRows: Record<string, string>[] = [
      {
        Company: "OpenAI",
        Role: "Research Engineer",
        Stage: "Phone Screen",
        Priority: "High",
        WorkMode: "Hybrid",
        Location: "San Francisco, CA",
        MinSalary: "$180,000",
        MaxSalary: "$250,000",
        Currency: "usd",
        Channel: "Company Site",
        PostingUrl: "https://openai.com/careers/research-eng",
        AppliedDate: "2026-10-01",
        FollowUpDate: "2026-10-15",
        ExtraInfo: "Referred by researcher",
      },
      {
        Company: "Anthropic",
        Role: "Safety Specialist",
        Stage: "interview",
        Priority: "med",
        WorkMode: "remote",
        Location: "Seattle, WA",
        MinSalary: "160000",
        MaxSalary: "200000",
        Currency: "USD",
        Channel: "referral",
        PostingUrl: "https://anthropic.com/careers/safety",
        AppliedDate: "2026-10-05",
        FollowUpDate: "",
        ExtraInfo: "",
      },
    ];

    const result = validateMappedCsvRows(rawRows, standardMapping);

    expect(result.validRows).toHaveLength(2);
    expect(result.invalidRows).toHaveLength(0);
    expect(result.previewRows).toHaveLength(2);

    const firstValid = result.validRows[0]?.data;
    expect(firstValid?.company).toBe("OpenAI");
    expect(firstValid?.role).toBe("Research Engineer");
    expect(firstValid?.status).toBe("PHONE_SCREEN");
    expect(firstValid?.priority).toBe("HIGH");
    expect(firstValid?.locationType).toBe("HYBRID");
    expect(firstValid?.source).toBe("COMPANY_SITE");
    expect(firstValid?.salaryMin).toBe(180000);
    expect(firstValid?.salaryMax).toBe(250000);
    expect(firstValid?.currency).toBe("USD");

    const secondValid = result.validRows[1]?.data;
    expect(secondValid?.company).toBe("Anthropic");
    expect(secondValid?.status).toBe("INTERVIEW");
    expect(secondValid?.priority).toBe("MEDIUM");
    expect(secondValid?.locationType).toBe("REMOTE");
    expect(secondValid?.source).toBe("REFERRAL");
  });

  it("flags invalid rows with missing company or role in invalidRows", () => {
    const rawRows: Record<string, string>[] = [
      {
        Company: "",
        Role: "Senior Backend Developer",
        Stage: "APPLIED",
      },
      {
        Company: "Datadog",
        Role: "",
        Stage: "APPLIED",
      },
    ];

    const mapping: Record<string, CsvTargetFieldKey | "IGNORE"> = {
      Company: "company",
      Role: "role",
      Stage: "status",
    };

    const result = validateMappedCsvRows(rawRows, mapping);

    expect(result.validRows).toHaveLength(0);
    expect(result.invalidRows).toHaveLength(2);
    expect(result.invalidRows[0]?.errors.length).toBeGreaterThan(0);
    expect(result.invalidRows[0]?.errors.some((e) => /company/i.test(e))).toBe(true);
    expect(result.invalidRows[1]?.errors.some((e) => /role/i.test(e))).toBe(true);

    expect(result.previewRows[0]?.valid).toBe(false);
    expect(result.previewRows[1]?.valid).toBe(false);
  });

  it("flags invalid jobUrl format in invalidRows", () => {
    const rawRows: Record<string, string>[] = [
      {
        Company: "Figma",
        Role: "Product Designer",
        PostingUrl: "not-a-valid-http-url",
      },
    ];

    const mapping: Record<string, CsvTargetFieldKey | "IGNORE"> = {
      Company: "company",
      Role: "role",
      PostingUrl: "jobUrl",
    };

    const result = validateMappedCsvRows(rawRows, mapping);

    expect(result.validRows).toHaveLength(0);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0]?.errors.some((e) => /url/i.test(e))).toBe(true);
  });

  it("flags salaryMax < salaryMin in invalidRows while keeping valid rows", () => {
    const rawRows: Record<string, string>[] = [
      {
        Company: "Valid Corp",
        Role: "Staff Engineer",
        MinSalary: "100000",
        MaxSalary: "150000",
      },
      {
        Company: "Invalid Salary Inc",
        Role: "Lead Engineer",
        MinSalary: "200000",
        MaxSalary: "100000", // Max < Min
      },
    ];

    const mapping: Record<string, CsvTargetFieldKey | "IGNORE"> = {
      Company: "company",
      Role: "role",
      MinSalary: "salaryMin",
      MaxSalary: "salaryMax",
    };

    const result = validateMappedCsvRows(rawRows, mapping);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0]?.data.company).toBe("Valid Corp");

    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0]?.rowNumber).toBe(2);
    expect(
      result.invalidRows[0]?.errors.some((e) =>
        /maximum salary must be greater than or equal/i.test(e)
      )
    ).toBe(true);
  });

  it("limits previewRows to the first 10 rows with accurate valid and errors fields", () => {
    const rawRows: Record<string, string>[] = [];
    for (let i = 1; i <= 25; i++) {
      rawRows.push({
        Company: i % 5 === 0 ? "" : `Company ${i}`, // row 5, 10, 15, 20, 25 are invalid
        Role: `Role ${i}`,
        Stage: "APPLIED",
      });
    }

    const mapping: Record<string, CsvTargetFieldKey | "IGNORE"> = {
      Company: "company",
      Role: "role",
      Stage: "status",
    };

    const result = validateMappedCsvRows(rawRows, mapping);

    // Exactly 10 preview rows
    expect(result.previewRows).toHaveLength(10);

    // 20 valid rows total (25 - 5)
    expect(result.validRows).toHaveLength(20);
    // 5 invalid rows total
    expect(result.invalidRows).toHaveLength(5);

    // In preview (rows 1-10), rows 5 and 10 should be invalid, others valid
    expect(result.previewRows[0]?.valid).toBe(true);
    expect(result.previewRows[3]?.valid).toBe(true);
    expect(result.previewRows[4]?.valid).toBe(false); // row 5
    expect(result.previewRows[4]?.errors.length).toBeGreaterThan(0);
    expect(result.previewRows[9]?.valid).toBe(false); // row 10
  });
});

describe("generateApplicationsCsv", () => {
  it("serializes applications into valid CSV text with expected headers and values", () => {
    const apps: ApplicationWithRelations[] = [
      createMockApplication({
        id: "app_1",
        company: "Vercel",
        role: "Solutions Architect",
        status: "OFFER",
        priority: "HIGH",
        locationType: "REMOTE",
        location: "Worldwide",
        salaryMin: 180000,
        salaryMax: 220000,
        currency: "USD",
        source: "REFERRAL",
        jobUrl: "https://vercel.com/careers/solutions",
        appliedDate: new Date("2026-09-01T00:00:00.000Z"),
        followUpDate: new Date("2026-09-10T00:00:00.000Z"),
      }),
      createMockApplication({
        id: "app_2",
        company: "Linear",
        role: "Product Engineer",
        status: "APPLIED",
        priority: "MEDIUM",
        locationType: "HYBRID",
        location: "San Francisco",
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        source: "OTHER",
        jobUrl: null,
        appliedDate: new Date("2026-09-05T00:00:00.000Z"),
        followUpDate: null,
      }),
    ];

    const csvOutput = generateApplicationsCsv(apps);

    expect(typeof csvOutput).toBe("string");
    expect(csvOutput).toContain("Company,Role,Status,Priority,Location Type,Location,Salary Min,Salary Max,Currency,Source,Job URL,Applied Date,Follow Up Date");
    expect(csvOutput).toContain("Vercel");
    expect(csvOutput).toContain("Solutions Architect");
    expect(csvOutput).toContain("Linear");
    expect(csvOutput).toContain("Product Engineer");

    // Verify it parses back with Papa
    const parsed = Papa.parse<Record<string, string>>(csvOutput, { header: true });
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[0]?.["Company"]).toBe("Vercel");
    expect(parsed.data[0]?.["Status"]).toBe("OFFER");
    expect(parsed.data[0]?.["Salary Min"]).toBe("180000");
    expect(parsed.data[1]?.["Company"]).toBe("Linear");
    expect(parsed.data[1]?.["Salary Min"]).toBe("");
  });
});

describe("FullBackupJsonSchema", () => {
  const validBackup: FullBackupJsonPayload = {
    version: 1,
    exportedAt: new Date("2026-10-17T12:00:00.000Z"),
    resumeVersions: [
      {
        id: "resume_1",
        name: "Full Stack Resume v3",
        description: "Primary TypeScript resume",
        fileName: "resume_v3.pdf",
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ],
    applications: [
      {
        id: "app_1",
        company: "Stripe",
        role: "Staff Infrastructure Engineer",
        status: "INTERVIEW",
        priority: "HIGH",
        locationType: "REMOTE",
        location: "San Francisco, CA",
        salaryMin: 220000,
        salaryMax: 270000,
        currency: "USD",
        source: "LINKEDIN",
        jobUrl: "https://stripe.com/jobs/staff-infra",
        appliedDate: new Date("2026-09-01T00:00:00.000Z"),
        followUpDate: new Date("2026-09-15T00:00:00.000Z"),
        resumeVersionId: "resume_1",
        position: 1000,
        archivedAt: null,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: new Date("2026-09-05T00:00:00.000Z"),
        interviews: [
          {
            id: "int_1",
            round: 1,
            type: "HR",
            scheduledAt: new Date("2026-09-10T14:00:00.000Z"),
            durationMinutes: 45,
            prepNotes: "Review recruiter background",
            outcome: "PASSED",
            feedback: "Advanced to technical interview",
            createdAt: new Date("2026-09-02T00:00:00.000Z"),
            updatedAt: new Date("2026-09-10T15:00:00.000Z"),
          },
        ],
        notes: [
          {
            id: "note_1",
            content: "Discussed distributed ledger architecture",
            createdAt: new Date("2026-09-03T00:00:00.000Z"),
          },
        ],
        contacts: [
          {
            id: "contact_1",
            name: "Jane Doe",
            title: "Senior Recruiter",
            email: "jane@stripe.com",
            linkedinUrl: "https://linkedin.com/in/janedoe",
            createdAt: new Date("2026-09-01T00:00:00.000Z"),
          },
        ],
        statusHistory: [
          {
            id: "sh_1",
            fromStatus: null,
            toStatus: "APPLIED",
            changedAt: new Date("2026-09-01T00:00:00.000Z"),
          },
          {
            id: "sh_2",
            fromStatus: "APPLIED",
            toStatus: "INTERVIEW",
            changedAt: new Date("2026-09-05T00:00:00.000Z"),
          },
        ],
      },
    ],
  };

  it("validates a complete valid backup payload successfully", () => {
    const parseResult = FullBackupJsonSchema.safeParse(validBackup);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.version).toBe(1);
      expect(parseResult.data.resumeVersions).toHaveLength(1);
      expect(parseResult.data.applications).toHaveLength(1);
      expect(parseResult.data.applications[0]?.interviews).toHaveLength(1);
      expect(parseResult.data.applications[0]?.notes).toHaveLength(1);
      expect(parseResult.data.applications[0]?.contacts).toHaveLength(1);
      expect(parseResult.data.applications[0]?.statusHistory).toHaveLength(2);
    }
  });

  it("validates empty accounts with 0 resumes and 0 applications", () => {
    const emptyPayload = {
      version: 1,
      exportedAt: "2026-10-17T12:00:00.000Z",
      resumeVersions: [],
      applications: [],
    };
    const parseResult = FullBackupJsonSchema.safeParse(emptyPayload);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.applications).toHaveLength(0);
      expect(parseResult.data.resumeVersions).toHaveLength(0);
    }
  });

  it("rejects backup payloads with unsupported or missing versions", () => {
    const v2Payload = {
      ...validBackup,
      version: 2,
    };
    const v2Result = FullBackupJsonSchema.safeParse(v2Payload);
    expect(v2Result.success).toBe(false);

    const stringVersionPayload = {
      ...validBackup,
      version: "1",
    };
    const strResult = FullBackupJsonSchema.safeParse(stringVersionPayload);
    expect(strResult.success).toBe(false);
  });

  it("rejects malformed payloads with missing required fields in applications", () => {
    const malformed = {
      version: 1,
      exportedAt: new Date(),
      applications: [
        {
          // missing company and role
          status: "APPLIED",
        },
      ],
    };
    const result = FullBackupJsonSchema.safeParse(malformed);
    expect(result.success).toBe(false);
  });

  it("rejects negative salaries and invalid email formats", () => {
    const invalidData = {
      version: 1,
      exportedAt: new Date(),
      applications: [
        {
          company: "Acme",
          role: "Engineer",
          salaryMin: -5000,
          contacts: [
            {
              name: "Bob",
              email: "invalid-email-address",
            },
          ],
        },
      ],
    };
    const result = FullBackupJsonSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
