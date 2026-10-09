"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/require-user";
import {
  CreateContactSchema,
  UpdateContactSchema,
  type CreateContactInput,
  type UpdateContactInput,
} from "@/schemas/contact.schema";
import type { ActionResult } from "@/server/actions/application.actions";

function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when executed outside a Next.js server request context
  }
}

/**
 * Creates a contact associated with an application owned by the authenticated user.
 */
export async function createContactAction(
  input: CreateContactInput
): Promise<
  ActionResult<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    linkedinUrl: string | null;
    applicationId: string;
  }>
> {
  try {
    const user = await requireUser();

    const parsed = CreateContactSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid contact input",
      };
    }
    const { applicationId, name, title, email, linkedinUrl } = parsed.data;

    const ownsApp = await prisma.application.count({
      where: {
        id: applicationId,
        userId: user.id,
      },
    });

    if (ownsApp === 0) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    const contact = await prisma.contact.create({
      data: {
        applicationId,
        name,
        title: title?.trim() || null,
        email: email?.trim() || null,
        linkedinUrl: linkedinUrl?.trim() || null,
      },
    });

    safeRevalidate("/board");

    return {
      ok: true,
      data: {
        id: contact.id,
        name: contact.name,
        title: contact.title,
        email: contact.email,
        linkedinUrl: contact.linkedinUrl,
        applicationId: contact.applicationId,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

/**
 * Updates a contact's fields after verifying ownership.
 */
export async function updateContactAction(
  input: UpdateContactInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const parsed = UpdateContactSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid contact update input",
      };
    }
    const valid = parsed.data;

    const contact = await prisma.contact.findFirst({
      where: {
        id: valid.contactId,
        application: {
          userId: user.id,
        },
      },
    });

    if (!contact) {
      return { ok: false, error: "Contact not found or access denied" };
    }

    const updateData: Prisma.ContactUpdateInput = {};
    if (valid.name !== undefined) updateData.name = valid.name;
    if (valid.title !== undefined) updateData.title = valid.title?.trim() || null;
    if (valid.email !== undefined) updateData.email = valid.email?.trim() || null;
    if (valid.linkedinUrl !== undefined) updateData.linkedinUrl = valid.linkedinUrl?.trim() || null;

    await prisma.contact.update({
      where: { id: valid.contactId },
      data: updateData,
    });

    safeRevalidate("/board");

    return { ok: true, data: { id: valid.contactId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}

/**
 * Deletes a contact verifying parent application ownership by authenticated user.
 */
export async function deleteContactAction(
  contactId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    if (!contactId || typeof contactId !== "string") {
      return { ok: false, error: "Contact ID is required" };
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        application: {
          userId: user.id,
        },
      },
    });

    if (!contact) {
      return { ok: false, error: "Contact not found or access denied" };
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    safeRevalidate("/board");

    return { ok: true, data: { id: contactId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete contact",
    };
  }
}
