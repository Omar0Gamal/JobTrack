"use client";

import { useFormStatus } from "react-dom";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoCtaButton({
  label = "Try the Live Demo",
  size = "lg",
}: {
  label?: string;
  size?: "default" | "sm" | "lg";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size={size}
      disabled={pending}
      className="gap-2 text-base font-semibold px-6 shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all"
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Generating Sandbox...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-5 w-5 text-amber-300" />
          <span>{label}</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}
