import { useCallback, useMemo, useState } from "react";

import {
  clearSessionMemory,
  deleteSessionMemoryDecision,
  listSessionMemoryDecisions,
  saveSessionMemoryDecision,
  toRecentDecisionRecords,
  type SessionMemoryDecision,
  type SessionMemoryDecisionInput,
} from "@/lib/session-memory";
import type { MemoryState } from "@/lib/types";

export function useSessionMemory() {
  const [decisions, setDecisions] = useState<SessionMemoryDecision[]>(() =>
    listSessionMemoryDecisions(),
  );

  const refresh = useCallback(() => {
    setDecisions(listSessionMemoryDecisions());
  }, []);

  const saveDecision = useCallback(
    (input: SessionMemoryDecisionInput) => {
      const saved = saveSessionMemoryDecision(input);
      refresh();
      return saved;
    },
    [refresh],
  );

  const deleteDecision = useCallback(
    (id: string) => {
      deleteSessionMemoryDecision(id);
      refresh();
    },
    [refresh],
  );

  const clearDecisions = useCallback(() => {
    clearSessionMemory();
    refresh();
  }, [refresh]);

  const recentDecisionRecords = useMemo(
    () => toRecentDecisionRecords(decisions),
    [decisions],
  );

  const priorMemory = useMemo<Partial<MemoryState> | undefined>(() => {
    if (recentDecisionRecords.length === 0) {
      return undefined;
    }

    return {
      recent_similar_decisions: recentDecisionRecords,
    };
  }, [recentDecisionRecords]);

  return {
    decisions,
    recentDecisionRecords,
    priorMemory,
    saveDecision,
    deleteDecision,
    clearDecisions,
    refresh,
  };
}
