"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActionResult } from "@/lib/validation/common";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface AutosaveOptions<T> {
  delay?: number;
  onSaved?: (data: T) => void;
}

/**
 * Debounced autosave for section forms. Call `schedule()` on change and
 * `saveNow()` on blur/submit; the hook serializes the <form> to FormData and
 * hands it to the server action. Saves never overlap: a change made while a
 * save is in flight triggers one more save afterwards.
 */
export function useAutosave<T>(action: (form: FormData) => Promise<ActionResult<T>>, options: AutosaveOptions<T> = {}) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const inflight = useRef(false);
  const queued = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  });

  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (!formRef.current) return;
    if (inflight.current) {
      queued.current = true;
      return;
    }
    inflight.current = true;
    setState("saving");
    let keepGoing = true;
    while (keepGoing) {
      queued.current = false;
      const result = await action(new FormData(formRef.current));
      if (result.ok) {
        setState("saved");
        setError(null);
        setFieldErrors({});
        optionsRef.current.onSaved?.(result.data);
      } else {
        setState("error");
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
      keepGoing = queued.current && Boolean(formRef.current);
    }
    inflight.current = false;
  }, [action]);

  const schedule = useCallback(() => {
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), optionsRef.current.delay ?? 900);
  }, [saveNow]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { formRef, state, error, fieldErrors, schedule, saveNow };
}

export function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : state === "dirty"
          ? "Unsaved changes"
          : state === "error"
            ? (error ?? "Could not save")
            : "";
  return (
    <span className={`label-tech transition-colors ${state === "error" ? "text-destructive" : state === "saved" ? "text-emerald-400" : ""}`} aria-live="polite">
      {label}
    </span>
  );
}
