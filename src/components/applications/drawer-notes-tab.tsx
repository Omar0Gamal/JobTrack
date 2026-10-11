"use client";

import * as React from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, StickyNote, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createNoteAction,
  deleteNoteAction,
} from "@/server/actions/note.actions";

export interface NoteItem {
  id: string;
  content: string;
  createdAt: Date | string;
  applicationId: string;
}

interface DrawerNotesTabProps {
  applicationId: string;
  notes: NoteItem[];
}

export function DrawerNotesTab({ applicationId, notes }: DrawerNotesTabProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Note content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createNoteAction({
        applicationId,
        content: trimmed,
      });

      if (res.ok) {
        setContent("");
        toast.success("Note added");
        void queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
      } else {
        toast.error(res.error || "Failed to add note");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      const res = await deleteNoteAction(noteId);
      if (res.ok) {
        toast.success("Note deleted");
        void queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
      } else {
        toast.error(res.error || "Failed to delete note");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="py-2 space-y-4">
      {/* Form: Add Note */}
      <form onSubmit={handleAddNote} className="space-y-2 bg-muted/30 border border-border rounded-lg p-3">
        <label htmlFor="note-content" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-primary" />
          Add a Note
        </label>
        <Textarea
          id="note-content"
          placeholder="Log interview prep, company insights, recruiter feedback, salary negotiations..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="text-xs bg-background resize-y min-h-[75px]"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !content.trim()}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>Add Note</span>
          </Button>
        </div>
      </form>

      {/* Header & Count */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Application Notes
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </Badge>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-lg p-4">
          <StickyNote className="h-7 w-7 text-muted-foreground/60 mb-1.5" />
          <p className="text-xs text-muted-foreground">No notes recorded yet</p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
            Use the form above to record notes about this opportunity.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notes.map((note) => {
            const dateStr = format(new Date(note.createdAt), "MMM d, yyyy · h:mm a");
            const isDeleting = deletingId === note.id;

            return (
              <Card key={note.id} className="border-border shadow-2xs group relative">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{dateStr}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={isDeleting}
                      className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-70 group-hover:opacity-100 transition-opacity"
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
