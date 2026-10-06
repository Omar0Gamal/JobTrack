import { z } from "zod";

export const AppModeSchema = z.enum(["demo", "personal"]);
export type AppMode = z.infer<typeof AppModeSchema>;

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_MODE: AppModeSchema.default("demo"),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  ALLOWED_EMAILS: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

const DEV_AUTH_SECRET_FALLBACK = "jobtrack-dev-fallback-auth-secret-min-32-chars-key!!";

export function getAppMode(): AppMode {
  const mode = process.env.APP_MODE?.trim().toLowerCase();
  if (mode === "personal") {
    return "personal";
  }
  return "demo";
}

export function isDemoMode(): boolean {
  return getAppMode() === "demo";
}

export function isPersonalMode(): boolean {
  return getAppMode() === "personal";
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length > 0) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET environment variable is missing or empty in production mode. Please set AUTH_SECRET."
    );
  }
  return DEV_AUTH_SECRET_FALLBACK;
}

export function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function getCronSecret(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret && secret.length > 0 ? secret : undefined;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url && url.length > 0) {
    return url;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL environment variable is required in production.");
  }
  return "postgresql://postgres:postgres@localhost:5432/jobtrack_dev?schema=public";
}
