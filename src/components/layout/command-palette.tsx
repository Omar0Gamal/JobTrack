"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Kanban,
  Table as TableIcon,
  Calendar,
  BarChart2,
  CalendarDays,
  Settings,
  SunMoon,
  Plus,
  Sparkles,
  Building2,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useApplicationsQuery } from "@/hooks/use-applications";
import { useDrawerUrl } from "@/hooks/use-drawer-url";
import {
  exportApplicationsCsvAction,
  exportFullJsonBackupAction,
} from "@/server/actions/import-export.actions";
import { resetDemoDataAction } from "@/server/actions/demo.actions";
import { toast } from "sonner";

interface CommandPaletteProps {
  isDemo?: boolean;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CommandPalette({ isDemo = false }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { openDrawer } = useDrawerUrl();
  const { data: applications = [] } = useApplicationsQuery({
    includeArchived: true,
  });

  // Global Cmd+K / Ctrl+K listener and custom event listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleOpenCustomEvent = () => {
      setOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(
      "jobtrack:open-command-palette",
      handleOpenCustomEvent
    );

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(
        "jobtrack:open-command-palette",
        handleOpenCustomEvent
      );
    };
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    toast.info(`Switched theme to ${theme === "dark" ? "Light" : "Dark"}`);
  };

  const handleExportCsv = async () => {
    try {
      const res = await exportApplicationsCsvAction();
      if (res.ok) {
        triggerDownload(
          res.data.csv,
          res.data.filename,
          "text/csv;charset=utf-8;"
        );
        toast.success(`Exported ${res.data.count} applications to CSV!`);
      } else {
        toast.error(res.error || "Failed to export CSV");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error exporting CSV"
      );
    }
  };

  const handleExportJson = async () => {
    try {
      const res = await exportFullJsonBackupAction();
      if (res.ok) {
        triggerDownload(
          res.data.json,
          res.data.filename,
          "application/json;charset=utf-8;"
        );
        toast.success("Full JSON backup exported successfully!");
      } else {
        toast.error(res.error || "Failed to export JSON backup");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error exporting JSON backup"
      );
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetDemoDataAction();
      toast.success("Demo data reset to fresh 30 seeded applications!");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset demo data"
      );
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search applications..." />
      <CommandList>
        <CommandEmpty>No matching applications or actions found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                window.dispatchEvent(
                  new CustomEvent("jobtrack:open-new-application")
                );
              })
            }
          >
            <Plus className="mr-2 h-4 w-4 text-primary" />
            <span>New Application</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Applications Search */}
        {applications.length > 0 && (
          <CommandGroup heading="Applications">
            {applications.slice(0, 15).map((app) => (
              <CommandItem
                key={app.id}
                value={`${app.company} ${app.role}`}
                onSelect={() =>
                  runCommand(() => {
                    openDrawer(app.id);
                  })
                }
              >
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-foreground">
                    {app.company}
                  </span>
                  <span className="text-muted-foreground text-xs truncate">
                    {app.role}
                  </span>
                </div>
                <CommandShortcut className="text-[10px] uppercase font-mono">
                  {app.status}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Navigation Shortcuts */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/board"))}>
            <Kanban className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Kanban Board</span>
            <CommandShortcut>G B</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/board?view=table"))}
          >
            <TableIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Applications Table</span>
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/interviews"))}
          >
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Interviews</span>
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/calendar"))}
          >
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Calendar</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
          >
            <BarChart2 className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Analytics Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Settings</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* System & Data Tools */}
        <CommandGroup heading="Preferences & Data">
          <CommandItem onSelect={() => runCommand(handleToggleTheme)}>
            <SunMoon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Toggle Light / Dark Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleExportCsv)}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Export Applications to CSV</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleExportJson)}>
            <FileCode className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Export Full JSON Backup</span>
          </CommandItem>
          {isDemo && (
            <CommandItem
              onSelect={() => runCommand(handleResetDemo)}
              className="text-amber-600 dark:text-amber-400 focus:text-amber-600"
            >
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              <span>Reset Demo Sandbox Data</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
