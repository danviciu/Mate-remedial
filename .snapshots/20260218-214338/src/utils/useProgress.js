import { useEffect, useState } from "react";
import { loadProgress, PROGRESS_EVENT } from "./progressStore.js";

export function useProgress() {
  const [progress, setProgress] = useState(() => loadProgress());

  useEffect(() => {
    const handler = (event) => {
      setProgress(event.detail ?? loadProgress());
    };
    window.addEventListener(PROGRESS_EVENT, handler);
    return () => window.removeEventListener(PROGRESS_EVENT, handler);
  }, []);

  return progress;
}
