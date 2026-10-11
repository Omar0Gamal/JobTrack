"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Mail,
  Linkedin,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createContactAction,
  updateContactAction,
  deleteContactAction,
} from "@/server/actions/contact.actions";

export interface ContactItem {
  id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  applicationId: string;
}

interface DrawerContactsTabProps {
  applicationId: string;
  contacts: ContactItem[];
}

export function DrawerContactsTab({
  applicationId,
  contacts,
}: DrawerContactsTabProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = React.useState<boolean>(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Add form fields
  const [name, setName] = React.useState<string>("");
  const [title, setTitle] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [linkedinUrl, setLinkedinUrl] = React.useState<string>("");

  // Edit form fields
  const [editName, setEditName] = React.useState<string>("");
  const [editTitle, setEditTitle] = React.useState<string>("");
  const [editEmail, setEditEmail] = React.useState<string>("");
  const [editLinkedinUrl, setEditLinkedinUrl] = React.useState<string>("");

  const startEdit = (contact: ContactItem) => {
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditTitle(contact.title || "");
    setEditEmail(contact.email || "");
    setEditLinkedinUrl(contact.linkedinUrl || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Contact name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createContactAction({
        applicationId,
        name: name.trim(),
        title: title.trim() || null,
        email: email.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
      });

      if (res.ok) {
        setName("");
        setTitle("");
        setEmail("");
        setLinkedinUrl("");
        setShowAddForm(false);
        toast.success("Contact added");
        void queryClient.invalidateQueries({
          queryKey: ["application", applicationId],
        });
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
      } else {
        toast.error(res.error || "Failed to add contact");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateContact = async (contactId: string) => {
    if (!editName.trim()) {
      toast.error("Contact name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateContactAction({
        contactId,
        name: editName.trim(),
        title: editTitle.trim() || null,
        email: editEmail.trim() || null,
        linkedinUrl: editLinkedinUrl.trim() || null,
      });

      if (res.ok) {
        setEditingId(null);
        toast.success("Contact updated");
        void queryClient.invalidateQueries({
          queryKey: ["application", applicationId],
        });
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
      } else {
        toast.error(res.error || "Failed to update contact");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setDeletingId(contactId);
    try {
      const res = await deleteContactAction(contactId);
      if (res.ok) {
        toast.success("Contact deleted");
        void queryClient.invalidateQueries({
          queryKey: ["application", applicationId],
        });
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
      } else {
        toast.error(res.error || "Failed to delete contact");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="py-2 space-y-4">
      {/* Header and Toggle Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Company Contacts
          </h3>
          <Badge variant="secondary" className="text-[10px]">
            {contacts.length}
          </Badge>
        </div>

        {!showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
          </Button>
        )}
      </div>

      {/* Add Contact Collapsible Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateContact}
          className="bg-muted/30 border border-border rounded-lg p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground">New Contact</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowAddForm(false)}
              aria-label="Close new contact form"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Name *</Label>
              <Input
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Title / Role</Label>
              <Input
                placeholder="e.g. Hiring Manager, Recruiter"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Email</Label>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">LinkedIn Profile URL</Label>
              <Input
                type="url"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="h-7 text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Save Contact</span>
            </Button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-lg p-4">
          <Users className="h-7 w-7 text-muted-foreground/60 mb-1.5" />
          <p className="text-xs text-muted-foreground">No contacts saved for this company</p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
            Add recruiters, interviewers, or referrers to keep all correspondence in one place.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {contacts.map((contact) => {
            const isEditing = editingId === contact.id;
            const isDeleting = deletingId === contact.id;

            if (isEditing) {
              return (
                <Card key={contact.id} className="border-primary/50 shadow-2xs">
                  <CardContent className="p-3 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Name *</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Title</Label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Email</Label>
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">LinkedIn URL</Label>
                        <Input
                          type="url"
                          value={editLinkedinUrl}
                          onChange={(e) => setEditLinkedinUrl(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdateContact(contact.id)}
                        disabled={isSubmitting || !editName.trim()}
                        className="h-7 text-xs gap-1 font-semibold"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        <span>Update</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={contact.id} className="border-border shadow-2xs group">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        {contact.name}
                      </h4>
                      {contact.title && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {contact.title}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(contact)}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Edit contact"
                        aria-label={`Edit contact ${contact.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteContact(contact.id)}
                        disabled={isDeleting}
                        className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                        title="Delete contact"
                        aria-label={`Delete contact ${contact.name}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Links: Email & LinkedIn */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs"
                      >
                        <Mail className="h-3 w-3" />
                        <span>{contact.email}</span>
                      </a>
                    )}

                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline text-xs"
                      >
                        <Linkedin className="h-3 w-3" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
