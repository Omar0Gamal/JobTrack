import * as React from "react";
import Link from "next/link";
import { FileSpreadsheet, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResumePerformanceStat } from "@/lib/analytics/calculations";

export interface ResumePerformanceCardProps {
  performance: ResumePerformanceStat[];
}

export function ResumePerformanceCard({
  performance,
}: ResumePerformanceCardProps) {
  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Resume A/B Performance
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Callback, interview conversion, and offer rates compared across resume iterations
            </CardDescription>
          </div>
          <Link href="/settings" className="self-start sm:self-auto">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" />
              <span>Manage Resumes</span>
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3">
        {performance.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg p-6">
            <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="font-medium text-foreground">
              No resume versions active or linked
            </p>
            <p className="mt-1 max-w-sm mx-auto text-muted-foreground">
              Tag your applications with specific resume versions to compare interview rates and identify your best-performing resume.
            </p>
            <Link href="/settings" className="inline-block mt-3">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                <span>Configure Resumes in Settings</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2.5 pr-4 font-medium">
                    Resume Version
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium text-right">
                    Applications
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium text-right">
                    Callback Rate
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium text-right">
                    Interview Rate
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium text-right">
                    Offers
                  </th>
                  <th scope="col" className="py-2.5 pl-3 font-medium text-right">
                    Sample Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {performance.map((stat) => (
                  <tr
                    key={stat.resumeVersionId ?? stat.name}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <th
                      scope="row"
                      className="py-3 pr-4 font-normal text-foreground"
                    >
                      <div className="font-semibold text-xs">{stat.name}</div>
                      {stat.fileName && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs font-mono">
                          {stat.fileName}
                        </div>
                      )}
                    </th>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground">
                      {stat.totalApplications}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-foreground">
                      <span className="font-semibold">{stat.callbackRate}%</span>
                      <span className="text-[11px] text-muted-foreground block">
                        {stat.responsesCount} responses
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-foreground">
                      <span className="font-semibold">{stat.interviewRate}%</span>
                      <span className="text-[11px] text-muted-foreground block">
                        {stat.interviewsCount} interviews
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {stat.offersCount}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      {stat.isSmallSample ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] gap-1 inline-flex items-center"
                        >
                          <AlertCircle className="h-3 w-3" />
                          <span>Small sample (&lt;5 apps)</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px] gap-1 inline-flex items-center"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>High confidence</span>
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
