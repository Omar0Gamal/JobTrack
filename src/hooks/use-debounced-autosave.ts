"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseDebouncedAutosaveReturn<T> {
  status: AutosaveStatus;
  triggerSave: (val: T) => void;
  flush: () => Promise<void>;
  resetStatus: () => void;
}

/**
 * Custom hook to debounce saves with visible saving/saved/error status.
 *
 * @param onSave Async function returning boolean indicating success
 * @param delayMs Debounce delay in milliseconds (default 600ms)
 */
export function useDebouncedAutosave<T>(
  onSave: (val: T) => Promise<boolean>,
  delayMs: number = 600
): UseDebouncedAutosaveReturn<T> {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<T | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const executeSave = useCallback(async (value: T) => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    setStatus("saving");

    try {
      const success = await onSaveRef.current(value);
      if (success) {
        setStatus("saved");
        resetTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, 2500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  const triggerSave = useCallback(
    (val: T) => {
      pendingValueRef.current = val;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (pendingValueRef.current !== null) {
          const valToSave = pendingValueRef.current;
          pendingValueRef.current = null;
          void executeSave(valToSave);
        }
      }, delayMs);
    },
    [delayMs, executeSave]
  );

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      const valToSave = pendingValueRef.current;
      pendingValueRef.current = null;
      await executeSave(valToSave);
    }
  }, [executeSave]);

  const resetStatus = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    pendingValueRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    triggerSave,
    flush,
    resetStatus,
  };
}
