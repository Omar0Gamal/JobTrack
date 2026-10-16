"use client";

import * as React from "react";
import { User, Clock, Compass, Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { updateUserSettingsAction } from "@/server/actions/settings.actions";
import type { AuthenticatedUser } from "@/server/auth/require-user";
import { toast } from "sonner";

interface GeneralSettingsCardProps {
  user: AuthenticatedUser;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function GeneralSettingsCard({ user }: GeneralSettingsCardProps) {
  const [name, setName] = React.useState(user.name ?? "");
  const [timezone, setTimezone] = React.useState(user.timezone || "UTC");
  const [isPending, startTransition] = React.useTransition();

  const handleDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezone(detected);
        toast.info(`Detected local timezone: ${detected}`);
      }
    } catch {
      toast.error("Could not detect browser timezone");
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateUserSettingsAction({
        name: name.trim() ? name.trim() : undefined,
        timezone,
      });

      if (res.ok) {
        toast.success("Preferences updated successfully");
      } else {
        toast.error(res.error || "Failed to update preferences");
      }
    });
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Profile &amp; Display Preferences</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Configure your personal display name, time zone, and appearance mode.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display Name */}
        <div className="grid gap-1.5">
          <Label htmlFor="display-name" className="text-xs font-medium">
            Display Name
          </Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            className="h-9 max-w-md text-sm"
          />
        </div>

        {/* Timezone */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between max-w-md">
            <Label htmlFor="timezone-select" className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              IANA Timezone
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDetectTimezone}
              className="h-6 px-2 text-xs text-primary hover:text-primary gap-1"
            >
              <Compass className="h-3 w-3" />
              Detect my timezone
            </Button>
          </div>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone-select" className="h-9 max-w-md text-sm">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectGroup>
                <SelectLabel className="text-xs">Timezones</SelectLabel>
                {/* Include current timezone if not in common list */}
                {!COMMON_TIMEZONES.includes(timezone) && (
                  <SelectItem key={timezone} value={timezone} className="text-xs font-mono">
                    {timezone} (Custom)
                  </SelectItem>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz} className="text-xs font-mono">
                    {tz}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Interview notifications and overdue follow-up dates calculate against this timezone.
          </p>
        </div>

        {/* Appearance Mode */}
        <div className="pt-2 border-t border-border flex items-center justify-between max-w-md">
          <div>
            <Label className="text-xs font-medium block">Theme &amp; Appearance</Label>
            <span className="text-[11px] text-muted-foreground">
              Select your preferred color mode.
            </span>
          </div>
          <ThemeToggle />
        </div>
      </CardContent>
      <CardFooter className="border-t border-border pt-4 flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="gap-2 shadow-xs"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
