"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toUpperCase();
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }
  return target.isContentEditable;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Applications",
    shortcuts: [
      { keys: ["N", "or", "C"], description: "Create new application" },
      { keys: ["⌘", "K"], description: "Open Command Palette" },
      { keys: ["/"], description: "Focus search bar" },
      { keys: ["Esc"], description: "Close drawer or active dialog" },
    ],
  },
  {
    title: "Navigation (press G, then key)",
    shortcuts: [
      { keys: ["G", "B"], description: "Go to Kanban Board" },
      { keys: ["G", "T"], description: "Go to Applications Table" },
      { keys: ["G", "I"], description: "Go to Interviews" },
      { keys: ["G", "C"], description: "Go to Calendar" },
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ],
  },
  {
    title: "Help",
    shortcuts: [{ keys: ["?"], description: "Show this shortcuts help dialog" }],
  },
];

export function ShortcutsController() {
  const router = useRouter();
  const [helpDialogOpen, setHelpDialogOpen] = React.useState(false);
  const pendingGRef = React.useRef(false);
  const gTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside form inputs or editable content
      if (isEditableTarget(e.target)) {
        return;
      }

      // Ignore when modifier keys (except Shift for '?') are pressed
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // Help dialog: ? (Shift + /)
      if (e.key === "?") {
        e.preventDefault();
        setHelpDialogOpen((prev) => !prev);
        return;
      }

      // Two-key sequence: G then [B, T, I, C, D, S]
      if (pendingGRef.current) {
        pendingGRef.current = false;
        if (gTimerRef.current) {
          clearTimeout(gTimerRef.current);
          gTimerRef.current = null;
        }

        switch (key) {
          case "b":
            e.preventDefault();
            router.push("/board");
            return;
          case "t":
            e.preventDefault();
            router.push("/board?view=table");
            return;
          case "i":
            e.preventDefault();
            router.push("/interviews");
            return;
          case "c":
            e.preventDefault();
            router.push("/calendar");
            return;
          case "d":
            e.preventDefault();
            router.push("/dashboard");
            return;
          case "s":
            e.preventDefault();
            router.push("/settings");
            return;
          default:
            // Non-matching second key, continue processing single key
            break;
        }
      }

      // Check for first key of sequence 'G'
      if (key === "g") {
        pendingGRef.current = true;
        if (gTimerRef.current) {
          clearTimeout(gTimerRef.current);
        }
        gTimerRef.current = setTimeout(() => {
          pendingGRef.current = false;
        }, 1200);
        return;
      }

      // Single-key shortcuts
      if (key === "n" || key === "c") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("jobtrack:open-new-application"));
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Search"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          window.dispatchEvent(
            new CustomEvent("jobtrack:open-command-palette")
          );
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gTimerRef.current) {
        clearTimeout(gTimerRef.current);
      }
    };
  }, [router]);

  return (
    <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
      <DialogContent role="dialog" className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Keyboard className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Quickly navigate and perform common actions anywhere in JobTrack.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-2">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h4>
              <div className="space-y-1.5 rounded-lg border border-border p-2 bg-muted/20">
                {section.shortcuts.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-0.5"
                  >
                    <span className="text-foreground">{item.description}</span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      {item.keys.map((k, kIdx) =>
                        k === "or" ? (
                          <span
                            key={kIdx}
                            className="text-[10px] text-muted-foreground font-sans px-0.5"
                          >
                            or
                          </span>
                        ) : (
                          <kbd
                            key={kIdx}
                            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs"
                          >
                            {k}
                          </kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
