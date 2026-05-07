import { useEffect, useState } from "react";

import { fetchPriorityCatalog } from "@/lib/api/priorities";
import type { PriorityCatalog } from "@/lib/priorities";

export function usePriorityCatalog() {
  const [catalog, setCatalog] = useState<PriorityCatalog | null>(null);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [isPriorityLoading, setIsPriorityLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPriorityCatalog() {
      try {
        setIsPriorityLoading(true);
        setPriorityError(null);
        setCatalog(await fetchPriorityCatalog(controller.signal));
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setPriorityError(
          loadError instanceof Error
            ? loadError.message
            : "우선순위 목록을 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsPriorityLoading(false);
        }
      }
    }

    void loadPriorityCatalog();

    return () => {
      controller.abort();
    };
  }, []);

  return {
    catalog,
    priorityError,
    isPriorityLoading,
  };
}
