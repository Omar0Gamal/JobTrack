import { requireUser } from "@/server/auth/require-user";
import { isDemoMode } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { GeneralSettingsCard } from "@/components/settings/general-settings-card";
import { ResumeVersionsManager } from "@/components/settings/resume-versions-manager";
import { DataPortabilityCard } from "@/components/settings/data-portability-card";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";
import { getResumeVersionsAction } from "@/server/actions/resume.actions";

export default async function SettingsPage() {
  const [user, resumes] = await Promise.all([
    requireUser(),
    getResumeVersionsAction(),
  ]);
  const isDemo = isDemoMode();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Settings &amp; Preferences
            </h1>
            {isDemo ? (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs"
              >
                Demo Mode
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs"
              >
                Personal Mode
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your display preferences, timezones, data exports, and account settings.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile & Display Settings */}
        <GeneralSettingsCard user={user} />

        {/* Resume Versions Management */}
        <ResumeVersionsManager initialResumes={resumes} />

        {/* Data Portability (CSV Export/Import Wizard & JSON Backup) */}
        <DataPortabilityCard user={user} />

        {/* Danger Zone (Reset Demo & Delete Account) */}
        <DangerZoneCard isDemo={isDemo} />
      </div>
    </div>
  );
}
