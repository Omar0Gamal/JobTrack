"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getApplicationsAction,
  getApplicationByIdAction,
  createApplicationAction,
  updateApplicationAction,
  moveApplicationCardAction,
  softDeleteApplicationAction,
  restoreApplicationAction,
  toggleArchiveApplicationAction,
  type ApplicationWithRelations,
} from "@/server/actions/application.actions";
import type {
  QuickAddApplicationInput,
  FullApplicationInput,
  UpdateApplicationInput,
  MoveApplicationCardInput,
} from "@/schemas/application.schema";

export interface ApplicationsFilterOptions {
  includeArchived?: boolean;
  search?: string;
}

/**
 * Hook to fetch applications list scoped to current user.
 */
export function useApplicationsQuery(
  options?: ApplicationsFilterOptions,
  initialData?: ApplicationWithRelations[]
) {
  const includeArchived = options?.includeArchived ?? false;
  const search = options?.search ?? "";

  return useQuery({
    queryKey: ["applications", { includeArchived, search }],
    queryFn: () => getApplicationsAction({ includeArchived, search }),
    initialData,
  });
}

/**
 * Hook to fetch a single application detail with all its relations.
 */
export function useApplicationDetailQuery(
  applicationId: string | null,
  initialData?: ApplicationWithRelations | null
) {
  return useQuery({
    queryKey: ["application", applicationId],
    queryFn: async () => {
      if (!applicationId) return null;
      return getApplicationByIdAction(applicationId);
    },
    enabled: Boolean(applicationId),
    initialData,
  });
}

/**
 * Hook to move a Kanban card with optimistic UI update and automatic rollback.
 */
export function useMoveCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MoveApplicationCardInput) => {
      const result = await moveApplicationCardAction(input);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["applications"] });

      const previousQueries = queryClient.getQueriesData<ApplicationWithRelations[]>({
        queryKey: ["applications"],
      });

      queryClient.setQueriesData<ApplicationWithRelations[]>(
        { queryKey: ["applications"] },
        (old) => {
          if (!old) return [];
          return old.map((app) => {
            if (app.id === variables.applicationId) {
              return {
                ...app,
                status: variables.toStatus,
                position: variables.newPosition,
              };
            }
            return app;
          });
        }
      );

      return { previousQueries };
    },
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, oldData] of context.previousQueries) {
          queryClient.setQueryData(queryKey, oldData);
        }
      }
      toast.error(err instanceof Error ? err.message : "Failed to move card");
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (variables?.applicationId) {
        void queryClient.invalidateQueries({
          queryKey: ["application", variables.applicationId],
        });
      }
    },
  });
}

/**
 * Hook to create an application (Quick-Add or Full Form).
 */
export function useCreateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickAddApplicationInput | FullApplicationInput) => {
      const result = await createApplicationAction(input);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (newApp) => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(`Application for ${newApp.company} created`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create application"
      );
    },
  });
}

/**
 * Hook to update an application.
 */
export function useUpdateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateApplicationInput) => {
      const result = await updateApplicationAction(input);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (updatedApp) => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({
        queryKey: ["application", updatedApp.id],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update application"
      );
    },
  });
}

/**
 * Hook to soft delete an application with an Undo toast.
 */
export function useSoftDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const result = await softDeleteApplicationAction(applicationId);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async (applicationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["applications"] });
      const previousQueries = queryClient.getQueriesData<ApplicationWithRelations[]>({
        queryKey: ["applications"],
      });

      queryClient.setQueriesData<ApplicationWithRelations[]>(
        { queryKey: ["applications"] },
        (old) => {
          if (!old) return old;
          return old.filter((app) => app.id !== applicationId);
        }
      );

      return { previousQueries };
    },
    onSuccess: (_data, applicationId) => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({
        queryKey: ["application", applicationId],
      });

      toast("Application moved to trash", {
        description: "It will be permanently deleted after 30 days.",
        action: {
          label: "Undo",
          onClick: async () => {
            const res = await restoreApplicationAction(applicationId);
            if (res.ok) {
              toast.success("Application restored");
              void queryClient.invalidateQueries({ queryKey: ["applications"] });
              void queryClient.invalidateQueries({
                queryKey: ["application", applicationId],
              });
            } else {
              toast.error(res.error || "Failed to restore application");
            }
          },
        },
      });
    },
    onError: (err, _variables, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, oldData] of context.previousQueries) {
          queryClient.setQueryData(queryKey, oldData);
        }
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to delete application"
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

/**
 * Hook to toggle archive state.
 */
export function useArchiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      archive,
    }: {
      applicationId: string;
      archive: boolean;
    }) => {
      const result = await toggleArchiveApplicationAction(applicationId, archive);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationId],
      });
      toast.success(
        variables.archive ? "Application archived" : "Application unarchived"
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle archive status"
      );
    },
  });
}
