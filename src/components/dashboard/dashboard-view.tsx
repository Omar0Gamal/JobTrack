"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApplicationsQuery } from "@/hooks/use-applications";
import {
  filterApplicationsByDateRange,
  calculateKpiStats,
  calculateWeeklyApplicationVolume,
  calculatePipelineFunnel,
  calculateSourceBreakdown,
  calculateAverageDaysInStage,
  calculateResumePerformance,
  calculateNeedsAttention,
  type AnalyticsDateRange,
} from "@/lib/analytics/calculations";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import type { ResumeVersionWithCount } from "@/server/actions/resume.actions";
import { StatCards } from "@/components/dashboard/stat-cards";
import { NeedsAttentionPanel } from "@/components/dashboard/needs-attention-panel";
import { ApplicationsTimeChart } from "@/components/dashboard/applications-time-chart";
import { PipelineFunnelChart } from "@/components/dashboard/pipeline-funnel-chart";
import { SourceBreakdownChart } from "@/components/dashboard/source-breakdown-chart";
import { StageDurationCard } from "@/components/dashboard/stage-duration-card";
import { ResumePerformanceCard } from "@/components/dashboard/resume-performance-card";

export interface DashboardViewProps {
  initialApplications: ApplicationWithRelations[];
  resumeVersions: ResumeVersionWithCount[];
  userTimezone?: string | null;
}

export function DashboardView({
  initialApplications,
  resumeVersions,
  userTimezone,
}: DashboardViewProps) {
  const [dateRange, setDateRange] = React.useState<AnalyticsDateRange>("90d");

  const { data: applications = initialApplications } = useApplicationsQuery(
    { includeArchived: true },
    initialApplications
  );

  const filteredApps = React.useMemo(() => {
    return filterApplicationsByDateRange(applications, dateRange);
  }, [applications, dateRange]);

  const kpiStats = React.useMemo(() => {
    return calculateKpiStats(filteredApps);
  }, [filteredApps]);

  const weeklyVolume = React.useMemo(() => {
    return calculateWeeklyApplicationVolume(filteredApps);
  }, [filteredApps]);

  const funnel = React.useMemo(() => {
    return calculatePipelineFunnel(filteredApps);
  }, [filteredApps]);

  const sources = React.useMemo(() => {
    return calculateSourceBreakdown(filteredApps);
  }, [filteredApps]);

  const stageDurations = React.useMemo(() => {
    return calculateAverageDaysInStage(filteredApps);
  }, [filteredApps]);

  const resumePerformance = React.useMemo(() => {
    return calculateResumePerformance(filteredApps, resumeVersions);
  }, [filteredApps, resumeVersions]);

  const needsAttention = React.useMemo(() => {
    return calculateNeedsAttention(applications, userTimezone);
  }, [applications, userTimezone]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with Title and Date Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics &amp; Pipeline Funnel
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key conversion metrics, stage durations, channel breakdown, and resume A/B performance.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border self-start sm:self-auto">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
          <Button
            variant={dateRange === "30d" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateRange("30d")}
            className="h-7 text-xs px-2.5"
          >
            Last 30 Days
          </Button>
          <Button
            variant={dateRange === "90d" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateRange("90d")}
            className="h-7 text-xs px-2.5"
          >
            Last 90 Days
          </Button>
          <Button
            variant={dateRange === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateRange("all")}
            className="h-7 text-xs px-2.5"
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Needs Attention Panel */}
      <NeedsAttentionPanel
        needsAttention={needsAttention}
        userTimezone={userTimezone}
      />

      {/* KPI Stat Cards */}
      <StatCards stats={kpiStats} />

      {/* Weekly Application Volume + Pipeline Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ApplicationsTimeChart data={weeklyVolume} />
        <PipelineFunnelChart funnel={funnel} />
      </div>

      {/* Source Breakdown + Stage Durations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SourceBreakdownChart sources={sources} />
        <StageDurationCard stageDurations={stageDurations} />
      </div>

      {/* Resume A/B Performance Table */}
      <ResumePerformanceCard performance={resumePerformance} />
    </div>
  );
}
