import * as React from "react";
import { Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StageDurationStat } from "@/lib/analytics/calculations";

export interface StageDurationCardProps {
  stageDurations: StageDurationStat[];
}

export function StageDurationCard({ stageDurations }: StageDurationCardProps) {
  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Average Time in Stage
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Historical duration spent in each stage before progressing
            </CardDescription>
          </div>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stageDurations.map((item) => (
            <div
              key={item.status}
              className="p-3 rounded-md border border-border bg-muted/20 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground truncate">
                  {item.label}
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1 tabular-nums font-normal">
                  {item.sampleCount} {item.sampleCount === 1 ? "app" : "apps"}
                </Badge>
              </div>

              <div className="text-lg font-bold text-foreground tabular-nums">
                {item.averageDays}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {item.averageDays === 1 ? "day" : "days"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
