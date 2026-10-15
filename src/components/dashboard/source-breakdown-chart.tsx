import * as React from "react";
import { Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SourceBreakdownItem } from "@/lib/analytics/calculations";

export interface SourceBreakdownChartProps {
  sources: SourceBreakdownItem[];
}

export function SourceBreakdownChart({ sources }: SourceBreakdownChartProps) {
  const maxCount = Math.max(1, ...sources.map((s) => s.count));

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Source &amp; Channel Performance
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Volume and callback rate across application channels
            </CardDescription>
          </div>
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3">
        {sources.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No application sources recorded yet.
          </div>
        ) : (
          <div className="space-y-3.5">
            {sources.map((item) => {
              const barWidthPercent = Math.max(
                6,
                Math.round((item.count / maxCount) * 100)
              );

              return (
                <div key={item.source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {item.label}
                      </span>
                      <span className="text-muted-foreground text-[11px] tabular-nums">
                        ({item.percentage}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 tabular-nums font-normal"
                      >
                        <span className="font-semibold mr-1">{item.responseRate}%</span>{" "}
                        response rate
                      </Badge>
                      <span className="tabular-nums font-bold text-foreground">
                        {item.count}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/80 transition-all duration-500"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
