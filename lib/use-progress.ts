"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyProgress, parseProgress, PROGRESS_KEY, type Progress } from "./progress";

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const current = useRef(progress);
  const persistent = useRef(true);

  useEffect(() => {
    try { current.current = parseProgress(localStorage.getItem(PROGRESS_KEY)); }
    catch { persistent.current = false; setStorageAvailable(false); }
    setProgress(current.current);
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === PROGRESS_KEY || event.key === null) {
        current.current = parseProgress(event.newValue);
        setProgress(current.current);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const update = useCallback(async (change: (state: Progress) => Progress) => {
    const apply = () => {
      let latest = current.current;
      if (persistent.current) {
        try { latest = parseProgress(localStorage.getItem(PROGRESS_KEY)); }
        catch { persistent.current = false; setStorageAvailable(false); }
      }
      const next = change(latest);
      current.current = next;
      if (persistent.current) {
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); }
        catch { persistent.current = false; setStorageAvailable(false); }
      }
      setProgress(next);
    };
    // Serialize check-in transactions across tabs where Web Locks is supported.
    if (navigator.locks) await navigator.locks.request(PROGRESS_KEY, apply);
    else apply();
  }, []);

  useEffect(() => {
    if (ready) document.documentElement.dataset.nightMode = String(progress.nightMode);
  }, [ready, progress.nightMode]);

  return { progress, ready, storageAvailable, update };
}
