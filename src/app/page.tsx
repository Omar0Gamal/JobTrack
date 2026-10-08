import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Kanban,
  CalendarClock,
  BarChart3,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { headers } from "next/headers";
import { getAppMode } from "@/lib/env";
import { getCurrentUserOrNull } from "@/server/auth/require-user";
import { startDemoSessionAction } from "@/server/actions/demo.actions";
import { DemoCtaButton } from "@/components/landing/demo-cta-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  searchParams?: Promise<{
    mode?: string;
  }>;
}

export default async function LandingPage(props: LandingPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  let mode = getAppMode();

  if (process.env.NODE_ENV !== "production") {
    if (searchParams?.mode === "personal" || searchParams?.mode === "demo") {
      mode = searchParams.mode;
    } else {
      try {
        const headerList = await headers();
        const testMode = headerList.get("x-test-app-mode");
        if (testMode === "personal" || testMode === "demo") {
          mode = testMode;
        }
      } catch {
        // Outside request context
      }
    }
  }

  if (mode === "personal") {
    const user = await getCurrentUserOrNull();
    if (user) {
      redirect("/board");
    } else {
      redirect("/signin");
    }
  }

  const existingUser = await getCurrentUserOrNull();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <span className="text-lg">JobTrack</span>
            <Badge variant="outline" className="border-primary/20 text-primary text-[10px] ml-1">
              v1.0
            </Badge>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {existingUser ? (
              <Button asChild size="sm" className="gap-1.5 shadow-xs">
                <Link href="/board">
                  <span>Enter Board</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <form action={startDemoSessionAction}>
                <DemoCtaButton label="Launch Demo" size="sm" />
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary mb-6">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>Zero Sign-Up Required for Interactive Demo</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Master your job search with{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                data &amp; structure
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Production-grade Kanban pipeline, interview round notes, conversion funnel
              analytics, and resume version intelligence. Built for engineers who treat their
              career search like a professional pipeline.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <form action={startDemoSessionAction} className="w-full sm:w-auto">
                <DemoCtaButton label="Try the Interactive Demo (30 Seeded Jobs)" size="lg" />
              </form>

              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto gap-2 border-border text-base"
              >
                <Link
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View GitHub Spec</span>
                </Link>
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Instant 7-day isolated sandbox • 30 realistic jobs • 3 resume versions • No credit card
            </p>

            {/* Live Card Preview Mockup */}
            <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-border bg-card p-4 sm:p-6 shadow-2xl text-left">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    JobTrack Board Preview
                  </span>
                </div>
                <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                  Interview Stage (5 active)
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mock Card 1 */}
                <div className="rounded-lg border border-border bg-background p-4 shadow-xs hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
                        ST
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm leading-tight text-foreground">
                          Stripe
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Staff Infrastructure Engineer
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px]">
                      HIGH
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <DollarSign className="h-3 w-3 text-primary" />
                      $240k – $290k
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Remote (US)
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      <Clock className="h-3 w-3" /> Round 2 (System Design) in 18h
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Backend v3
                    </Badge>
                  </div>
                </div>

                {/* Mock Card 2 */}
                <div className="rounded-lg border border-border bg-background p-4 shadow-xs hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
                        FC
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm leading-tight text-foreground">
                          Figma
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Senior Frontend Engineer
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                      MEDIUM
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <DollarSign className="h-3 w-3 text-primary" />
                      $190k – $230k
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Hybrid (SF)
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Applied 6 days ago</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Frontend v2
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Pillars Feature Grid */}
        <section className="py-16 sm:py-24 border-b border-border">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Engineered for clarity and momentum
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                Everything you need to systematically run your job search, without spreadsheets
                or ad-laden platforms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <Card className="border-border">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Kanban className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Structured Kanban Pipeline</CardTitle>
                  <CardDescription>
                    6 designated application stages from Wishlist to Offer. Drag cards with
                    deterministic fractional rebalancing and full StatusHistory audit trail.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Instant quick-add modal &amp; full drawer editor</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Color-coded salary ranges, locations, and priority badges</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border-border">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Interview Round Intelligence</CardTitle>
                  <CardDescription>
                    Track HR screenings, system designs, coding rounds, and behavioral loops.
                    Includes prep notes, feedback logs, and 48-hour interview alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Automatic prompts to move status when interviews are added</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Dedicated global Interviews calendar and agenda view</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border-border">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Conversion Funnel Analytics</CardTitle>
                  <CardDescription>
                    Real metrics on how your applications perform: Application-to-Screen rate,
                    Screen-to-Interview conversion, and average days spent in each stage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Weekly velocity area chart &amp; source breakdown</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Identifies stale applications and overdue follow-ups</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="border-border">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Resume Version A/B Tracking</CardTitle>
                  <CardDescription>
                    Tag each application with the specific resume variation you submitted.
                    Compare response rates with automatic statistical sample warnings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Track Full-Stack vs Frontend vs Backend variants</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Export all data anytime in standard JSON and CSV formats</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Security & Architecture Highlights */}
        <section className="py-16 sm:py-20 bg-muted/20">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold">Dual-Mode Architecture &amp; Data Safety</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                JobTrack is built from a single codebase supporting two distinct operational
                modes: a public <strong>Demo Mode</strong> with HMAC-signed isolated sandboxes,
                and a private <strong>Personal Tracker Mode</strong> powered by Auth.js v5 and
                restricted to authorized emails.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-border bg-background p-4">
                  <h4 className="font-semibold text-foreground mb-1">Demo Portfolio Mode</h4>
                  <p className="text-muted-foreground">
                    Instant access via tamper-proof cookie. Seeded with 30 realistic jobs across 90
                    days. Auto-cleaned after 7 days.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <h4 className="font-semibold text-foreground mb-1">Personal Production Mode</h4>
                  <p className="text-muted-foreground">
                    Locked to allowed OAuth emails. 30-day secure session. Full CSV &amp; JSON data
                    portability with regular backup reminders.
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <form action={startDemoSessionAction} className="inline-block">
                  <DemoCtaButton label="Launch Demo Sandbox" size="lg" />
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>© 2026 JobTrack. Built with Next.js App Router, Tailwind CSS, shadcn/ui &amp; Prisma.</p>
        </div>
      </footer>
    </div>
  );
}
