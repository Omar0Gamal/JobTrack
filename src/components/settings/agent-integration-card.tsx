"use client";

import * as React from "react";
import {
  Bot,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  Activity,
  FileText,
  Briefcase,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AgentIntegrationCardProps {
  isConfigured: boolean;
}

const AGENT_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/agent/stats",
    description: "Pipeline KPIs, daily/weekly activity, overdue follow-ups, and resume metrics",
    icon: Activity,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    method: "GET",
    path: "/api/agent/applications",
    description: "Search, filter, and detect duplicates (?company=...&jobUrl=...)",
    icon: Briefcase,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    method: "POST",
    path: "/api/agent/applications",
    description: "Create application with auto 4d follow-up, notes, contacts, and resume selection",
    icon: Briefcase,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    method: "GET / PATCH",
    path: "/api/agent/applications/[id]",
    description: "Retrieve full details or update status, add interviews, notes, and contacts",
    icon: Layers,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    method: "GET / POST",
    path: "/api/agent/resumes",
    description: "List active resume versions or batch sync/upsert tailored resume names",
    icon: FileText,
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
];

export function AgentIntegrationCard({ isConfigured }: AgentIntegrationCardProps) {
  const [copiedSnippet, setCopiedSnippet] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const sampleEnv = `AGENT_API_KEY="your-secure-agent-secret-token"\nAGENT_USER_EMAIL="omargamal.dev@outlook.com"`;

  const sampleCurl = `curl -X GET "http://localhost:3000/api/agent/stats" \\\n  -H "Authorization: Bearer your-secure-agent-secret-token"`;

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Autonomous Agent &amp; MCP Integration
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Connect external agents (like the JobHunter MCP server) to manage your pipeline programmatically.
              </CardDescription>
            </div>
          </div>
          <div>
            {isConfigured ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                AGENT_API_KEY Configured
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                AGENT_API_KEY Not Configured
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overview explanation */}
        <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3.5 rounded-lg border border-border/50">
          <p>
            The JobTrack Agent API enables AI agents and the JobHunter Model Context Protocol (MCP) server
            to inspect current applications, perform duplicate checks before applying, log new submissions,
            record scheduled interviews, and query pipeline statistics.
          </p>
          <p className="mt-2">
            Every incoming agent request is authenticated via constant-time token comparison against{" "}
            <code className="text-foreground font-mono font-medium">AGENT_API_KEY</code> passed in the{" "}
            <code className="text-foreground font-mono font-medium">Authorization: Bearer &lt;TOKEN&gt;</code> header.
          </p>
        </div>

        {/* Endpoints overview */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            Agent API Endpoints
          </h4>
          <div className="grid gap-2">
            {AGENT_ENDPOINTS.map((endpoint) => {
              const Icon = endpoint.icon;
              return (
                <div
                  key={endpoint.path + endpoint.method}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-md border border-border/60 bg-card/60 hover:bg-muted/40 transition-colors gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono font-medium text-foreground">{endpoint.path}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px] hidden md:inline">
                      {endpoint.description}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${endpoint.badgeColor}`}>
                      {endpoint.method}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuration snippet */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              Environment Configuration
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(sampleEnv, "Environment Variables")}
            >
              {copiedSnippet === "Environment Variables" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
          <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800">
            {sampleEnv}
          </pre>
        </div>

        {/* Authentication snippet */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              Example Curl Request
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(sampleCurl, "cURL Request")}
            >
              {copiedSnippet === "cURL Request" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
          <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800">
            {sampleCurl}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
