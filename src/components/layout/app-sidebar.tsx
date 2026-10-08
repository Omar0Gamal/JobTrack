"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Kanban,
  Table2,
  CalendarClock,
  Calendar,
  BarChart3,
  Trash2,
  Settings,
  RotateCcw,
  BriefcaseBusiness,
  Loader2,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { resetDemoDataAction } from "@/server/actions/demo.actions";
import { toast } from "sonner";

interface AppSidebarProps {
  isDemo?: boolean;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  isActive: (pathname: string, searchParams: URLSearchParams) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Board",
    href: "/board",
    icon: Kanban,
    shortcut: "G B",
    isActive: (pathname, searchParams) =>
      pathname === "/board" && searchParams.get("view") !== "table",
  },
  {
    title: "Table",
    href: "/board?view=table",
    icon: Table2,
    shortcut: "G T",
    isActive: (pathname, searchParams) =>
      pathname === "/board" && searchParams.get("view") === "table",
  },
  {
    title: "Interviews",
    href: "/interviews",
    icon: CalendarClock,
    isActive: (pathname) => pathname.startsWith("/interviews"),
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
    shortcut: "G C",
    isActive: (pathname) => pathname.startsWith("/calendar"),
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    shortcut: "G D",
    isActive: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    title: "Recently Deleted",
    href: "/trash",
    icon: Trash2,
    isActive: (pathname) => pathname.startsWith("/trash"),
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    isActive: (pathname) => pathname.startsWith("/settings"),
  },
];

export function SidebarNavContent({
  isDemo = true,
  onNavigate,
}: {
  isDemo?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isResetting, setIsResetting] = React.useState(false);

  const handleResetDemoData = async () => {
    try {
      setIsResetting(true);
      await resetDemoDataAction();
      toast.success("Demo data reset to 30 sample applications");
      if (onNavigate) {
        onNavigate();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset demo data"
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between py-4">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-4">
          <Link
            href="/board"
            onClick={onNavigate}
            className="flex items-center gap-2.5 font-semibold text-foreground tracking-tight"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight">JobTrack</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Career Command Center
              </span>
            </div>
          </Link>

          <div className="mt-3">
            {isDemo ? (
              <Badge
                variant="outline"
                className="w-full justify-center border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-medium"
              >
                Demo Portfolio Mode
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="w-full justify-center border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium"
              >
                Personal Tracker
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 px-2" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname, searchParams);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.title}</span>
                {item.shortcut && (
                  <kbd
                    className={cn(
                      "ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium",
                      active
                        ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {item.shortcut}
                  </kbd>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Reset Demo */}
      <div className="space-y-3 px-3 pt-4 border-t border-border">
        {isDemo && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDemoData}
            disabled={isResetting}
            className="w-full justify-start gap-2 border-border text-xs text-muted-foreground hover:text-foreground"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>{isResetting ? "Resetting Data..." : "Reset Demo Data"}</span>
          </Button>
        )}

        <div className="px-1 text-[11px] text-muted-foreground">
          <p>© 2026 JobTrack. Open Source.</p>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ isDemo = true }: AppSidebarProps) {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-border bg-card">
      <SidebarNavContent isDemo={isDemo} />
    </aside>
  );
}

export function MobileSidebarDrawer({
  isDemo = true,
  open,
  onOpenChange,
}: {
  isDemo?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>
        <SidebarNavContent isDemo={isDemo} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileSidebarTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      aria-label="Open sidebar navigation"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
