"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log unexpected runtime errors for observability
    console.error("JobTrack Application Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Something went wrong
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            An unexpected error occurred while rendering this page.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {error.message && (
            <div className="rounded-md bg-muted/60 p-3 font-mono text-xs text-muted-foreground break-all border border-border">
              {error.message}
            </div>
          )}
          {error.digest && (
            <p className="mt-2 text-[10px] text-muted-foreground font-mono text-center">
              Error Digest: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 justify-center pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => reset()}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/board">
              <Home className="h-4 w-4" />
              Return to Board
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
