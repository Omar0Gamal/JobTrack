"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface UseDrawerUrlReturn {
  selectedAppId: string | null;
  openDrawer: (appId: string) => void;
  closeDrawer: () => void;
}

/**
 * Custom hook to sync the selected application ID in the drawer with the `?app=ID` URL query parameter.
 * Preserves all existing URL search parameters (view, q, status, source, priority, locationType,
 * resumeVersionId, from, to, archived, sort, page) when opening or closing the drawer.
 */
export function useDrawerUrl(): UseDrawerUrlReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedAppId = useMemo(() => {
    return searchParams ? searchParams.get("app") : null;
  }, [searchParams]);

  const openDrawer = useCallback(
    (appId: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("app", appId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const closeDrawer = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("app");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return {
    selectedAppId,
    openDrawer,
    closeDrawer,
  };
}
