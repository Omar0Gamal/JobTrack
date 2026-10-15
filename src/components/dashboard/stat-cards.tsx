import * as React from "react";
import {
  Briefcase,
  TrendingUp,
  CheckCircle2,
  CalendarCheck,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { DashboardKpiStats } from "@/lib/analytics/calculations";

export interface StatCardsProps {
  stats: DashboardKpiStats;
}

export function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      title: "Total Applications",
      value: `${stats.totalApplications}`,
      subtext: (
        <span>
          <span className="tabular-nums font-medium">{stats.wishlistCount}</span> in Wishlist
        </span>
      ),
      icon: Briefcase,
      color: "text-primary",
      valueColor: "text-foreground",
    },
    {
      title: "Active Pipeline",
      value: `${stats.activePipelineCount}`,
      subtext: "Applied, Screen & Interviews",
      icon: TrendingUp,
      color: "text-indigo-500",
      valueColor: "text-foreground",
    },
    {
      title: "Response Rate",
      value: `${stats.responseRate}%`,
      subtext: (
        <span>
          <span className="tabular-nums font-medium">{stats.responseCount}</span> of{" "}
          <span className="tabular-nums font-medium">{stats.submittedCount}</span> submitted
        </span>
      ),
      icon: CheckCircle2,
      color: "text-blue-500",
      valueColor: "text-foreground",
    },
    {
      title: "Interview Rate",
      value: `${stats.interviewRate}%`,
      subtext: (
        <span>
          <span className="tabular-nums font-medium">{stats.interviewCount}</span> reached interview
        </span>
      ),
      icon: CalendarCheck,
      color: "text-violet-500",
      valueColor: "text-foreground",
    },
    {
      title: "Offers Extended",
      value: `${stats.offersCount}`,
      subtext: (
        <span>
          <span className="tabular-nums font-medium">{stats.offerRate}%</span> offer rate (
          <span className="tabular-nums font-medium">{stats.rejectedCount}</span> rejected)
        </span>
      ),
      icon: Award,
      color: "text-emerald-500",
      valueColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border-border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium flex items-center justify-between">
                <span>{card.title}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardDescription>
              <CardTitle className={`text-2xl font-bold tabular-nums ${card.valueColor}`}>
                {card.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {card.subtext}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
