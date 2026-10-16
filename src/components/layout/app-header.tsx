"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Sparkles,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { MobileSidebarDrawer, MobileSidebarTrigger } from "@/components/layout/app-sidebar";
import { ApplicationFormDialog } from "@/components/applications/application-form-dialog";
import type { AuthenticatedUser } from "@/server/auth/require-user";

interface AppHeaderProps {
  user?: AuthenticatedUser | null;
  isDemo?: boolean;
}

export function AppHeader({ user, isDemo = true }: AppHeaderProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [newAppOpen, setNewAppOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpenNewApp = () => {
      setNewAppOpen(true);
    };

    window.addEventListener("jobtrack:open-new-application", handleOpenNewApp);
    return () => {
      window.removeEventListener("jobtrack:open-new-application", handleOpenNewApp);
    };
  }, []);

  const handleCommandPaletteClick = () => {
    window.dispatchEvent(new CustomEvent("jobtrack:open-command-palette"));
  };

  const handleNewApplicationClick = () => {
    setNewAppOpen(true);
  };

  return (
    <>
      <MobileSidebarDrawer
        isDemo={isDemo}
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      />

      <ApplicationFormDialog
        open={newAppOpen}
        onOpenChange={setNewAppOpen}
      />

      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-3 sm:px-6">
        {/* Left: Mobile menu trigger + Search button */}
        <div className="flex items-center gap-2 sm:gap-4">
          <MobileSidebarTrigger onClick={() => setMobileSidebarOpen(true)} />

          <Button
            variant="outline"
            size="sm"
            onClick={handleCommandPaletteClick}
            className="h-9 w-44 sm:w-64 justify-between border-border bg-muted/40 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5" />
              <span>Search applications...</span>
            </span>
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Right: Actions, Notifications, ThemeToggle, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            size="sm"
            onClick={handleNewApplicationClick}
            className="h-9 gap-1.5 font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Application</span>
          </Button>

          {/* Notification Bell */}
          <NotificationBell userTimezone={user?.timezone} />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User/Guest Indicator Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-2 px-2 text-xs font-normal hover:bg-muted"
                aria-label="User profile menu"
              >
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : isDemo ? "DG" : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="font-medium text-foreground leading-none">
                    {user?.name ?? (isDemo ? "Demo Guest" : "Authorized User")}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {user?.timezone ?? "UTC"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name ?? (isDemo ? "Demo Guest Session" : "Personal User")}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email ?? (isDemo ? "Isolated 7-day sandbox" : "Verified Account")}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                {isDemo ? (
                  <Badge
                    variant="secondary"
                    className="w-full justify-center gap-1 text-[11px] font-medium"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Guest Portfolio Session
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="w-full justify-center text-[11px] font-medium"
                  >
                    Personal Account
                  </Badge>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/settings" className="cursor-pointer">
                  Account Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/trash" className="cursor-pointer">
                  Recently Deleted
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOutAction} className="w-full">
                <DropdownMenuItem asChild>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 cursor-pointer text-destructive focus:text-destructive text-xs"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{isDemo ? "Exit Demo" : "Sign Out"}</span>
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
