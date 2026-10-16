"use client";

import * as React from "react";
import { RotateCcw, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { resetDemoDataAction } from "@/server/actions/demo.actions";
import { toast } from "sonner";

export function ResetDemoCard() {
  const [isResetting, setIsResetting] = React.useState(false);

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetDemoDataAction();
      toast.success("Demo data reset to fresh 30 seeded applications!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset demo data"
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Sparkles className="h-5 w-5" />
          <CardTitle className="text-base">Demo Sandbox Environment</CardTitle>
        </div>
        <CardDescription className="text-xs">
          You are currently operating in an isolated 7-day demo session. You can reset your sandbox
          to the original 30 realistic seeded applications at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            Resetting will wipe all custom applications, notes, and interviews you created during this
            session and restore the initial 30 applications and 3 resume versions.
          </p>
        </div>
      </CardContent>
      <CardFooter className="border-t border-amber-500/20 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          className="gap-2 border-amber-500/40 text-amber-700 hover:text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          ) : (
            <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <span>{isResetting ? "Resetting Sandbox..." : "Reset Demo Data"}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
