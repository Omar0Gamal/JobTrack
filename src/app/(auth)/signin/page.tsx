import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { BriefcaseBusiness, ShieldAlert, AlertCircle, ArrowLeft } from "lucide-react";
import { getAppMode } from "@/lib/env";
import { getCurrentUserOrNull } from "@/server/auth/require-user";
import { signInWithProviderAction } from "@/server/actions/auth.actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface SignInPageProps {
  searchParams?: Promise<{
    error?: string;
    callbackUrl?: string;
    mode?: string;
  }>;
}

export default async function SignInPage(props: SignInPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const error = searchParams?.error;
  const queryMode = searchParams?.mode;

  let mode = getAppMode();

  if (process.env.NODE_ENV !== "production") {
    if (queryMode === "personal" || queryMode === "demo") {
      mode = queryMode;
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

  // If in demo mode, sign-in is disabled; redirect to demo landing page
  if (mode === "demo") {
    redirect("/");
  }

  // If already authenticated, redirect to /board
  const user = await getCurrentUserOrNull();
  if (user) {
    redirect("/board");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/20">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            <h1>Sign in to JobTrack</h1>
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Personal Mode is restricted to authorized email addresses.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive dark:text-red-400 flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold leading-none">Access Denied</p>
                <p className="leading-relaxed">
                  Access Denied: Your email address is not on the ALLOWED_EMAILS allowlist for this personal tracker.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="leading-relaxed">
                This deployment is configured in <strong>Personal Mode</strong>. Only emails listed
                in <code className="font-mono font-semibold">ALLOWED_EMAILS</code> are granted
                access.
              </p>
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            {/* GitHub Sign-In Button */}
            <form action={signInWithProviderAction.bind(null, "github")}>
              <Button
                type="submit"
                variant="outline"
                className="w-full h-11 justify-center gap-2.5 border-border font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Continue with GitHub"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>Continue with GitHub</span>
              </Button>
            </form>

            {/* Google Sign-In Button */}
            <form action={signInWithProviderAction.bind(null, "google")}>
              <Button
                type="submit"
                variant="outline"
                className="w-full h-11 justify-center gap-2.5 border-border font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Continue with Google"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>
            </form>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border pt-4">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-xs text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to home</span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
