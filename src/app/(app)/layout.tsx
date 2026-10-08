import { redirect } from "next/navigation";
import { getCurrentUserOrNull } from "@/server/auth/require-user";
import { isDemoMode } from "@/lib/env";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ApplicationDrawer } from "@/components/applications/application-drawer";
import { BackupReminderBanner } from "@/components/layout/backup-reminder-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShortcutsController } from "@/components/layout/shortcuts-controller";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserOrNull();
  const isDemo = isDemoMode();

  if (!user) {
    if (isDemo) {
      redirect("/");
    } else {
      redirect("/signin");
    }
  }

  return (
    <div className="flex min-h-screen bg-muted/10 text-foreground overflow-x-hidden">
      {/* Desktop Persistent Sidebar */}
      <AppSidebar isDemo={isDemo} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0 max-w-full">
        {/* Sticky App Header */}
        <AppHeader user={user} isDemo={isDemo} />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <BackupReminderBanner user={user} />
          {children}
        </main>
      </div>

      {/* Global Application Detail Drawer synced with ?app=ID */}
      <ApplicationDrawer />

      {/* Global Command Palette */}
      <CommandPalette isDemo={isDemo} />

      {/* Global Shortcuts Controller */}
      <ShortcutsController />
    </div>
  );
}
