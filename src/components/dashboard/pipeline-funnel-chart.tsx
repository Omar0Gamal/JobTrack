import * as React from "react";
import { ArrowDown, CheckCircle2, PhoneCall, Users, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FunnelStageStat } from "@/lib/analytics/calculations";

export interface PipelineFunnelChartProps {
  funnel: FunnelStageStat[];
}

const STAGE_ICONS = {
  APPLIED: CheckCircle2,
  PHONE_SCREEN: PhoneCall,
  INTERVIEW: Users,
  OFFER: Award,
};

const STAGE_COLORS = {
  APPLIED: {
    bg: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    badge: "border-blue-500/30 text-blue-600 dark:text-blue-400",
  },
  PHONE_SCREEN: {
    bg: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
    badge: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400",
  },
  INTERVIEW: {
    bg: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    badge: "border-violet-500/30 text-violet-600 dark:text-violet-400",
  },
  OFFER: {
    bg: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  },
};

export function PipelineFunnelChart({ funnel }: PipelineFunnelChartProps) {
  const maxCount = Math.max(1, ...funnel.map((s) => s.count));

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Pipeline Conversion Funnel
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Stage progression and drop-off from submission to offer
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3 space-y-4">
        {funnel.map((stage, idx) => {
          const Icon = STAGE_ICONS[stage.stage] ?? CheckCircle2;
          const colors = STAGE_COLORS[stage.stage] ?? STAGE_COLORS.APPLIED;
          const barWidthPercent = Math.max(
            8,
            Math.round((stage.count / maxCount) * 100)
          );

          return (
            <div key={stage.stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                  <span className="font-semibold text-foreground">
                    {stage.label}
                  </span>
                  {idx > 0 && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 tabular-nums ${colors.badge}`}
                    >
                      {stage.conversionFromPrevious}% from prev
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    <span className="tabular-nums font-medium text-foreground">
                      {stage.conversionFromApplied}%
                    </span>{" "}
                    of applied
                  </span>
                  <span className="tabular-nums font-bold text-sm text-foreground">
                    {stage.count}
                  </span>
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>

              {idx < funnel.length - 1 && (
                <div className="flex justify-center -my-1">
                  <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
