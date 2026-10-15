"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WeeklyVolumePoint } from "@/lib/analytics/calculations";

export interface ApplicationsTimeChartProps {
  data: WeeklyVolumePoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0 && payload[0]?.value !== undefined) {
    const value = payload[0].value;
    return (
      <div className="rounded-lg border border-border bg-background p-2.5 shadow-md text-xs">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-primary mt-1 font-semibold">
          <span className="tabular-nums">{value}</span>{" "}
          {value === 1 ? "application" : "applications"}
        </p>
      </div>
    );
  }
  return null;
}

export function ApplicationsTimeChart({ data }: ApplicationsTimeChartProps) {
  const [mounted, setMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const totalApplications = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Weekly Application Volume
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Submissions across the last 12 rolling weeks
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Period Total</span>
            <div className="text-base font-bold tabular-nums text-foreground">
              {totalApplications}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4">
        <div className="h-[220px] w-full">
          {!mounted ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
              Loading chart...
            </div>
          ) : data.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              No application history to display.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="applicationVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-[11px] fill-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  className="text-[11px] fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#applicationVolumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
