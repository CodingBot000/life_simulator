import { useCallback, useEffect, useMemo, useState } from "react";

import {
  clearRemoteSessionMemoryDecisions,
  deleteRemoteSessionMemoryDecision,
  listRemoteSessionMemoryDecisions,
  saveRemoteSessionMemoryDecision,
} from "@/lib/api/session-memory";
import {
  clearSessionMemory,
  deleteSessionMemoryDecision,
  listSessionMemoryDecisions,
  mergeSessionMemoryDecisions,
  replaceSessionMemoryDecisions,
  saveSessionMemoryDecision,
  toRecentDecisionRecords,
  type SessionMemoryDecision,
  type SessionMemoryDecisionInput,
} from "@/lib/session-memory";
import type { MemoryState } from "@/lib/types";

export type SessionMemorySyncStatus = "idle" | "syncing" | "synced" | "local_only";

export function useSessionMemory() {
  const [decisions, setDecisions] = useState<SessionMemoryDecision[]>(() =>
    listSessionMemoryDecisions(),
  );
  const [syncStatus, setSyncStatus] = useState<SessionMemorySyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setDecisions(listSessionMemoryDecisions());
  }, []);

  useEffect(() => {
    let active = true;

    async function sync() {
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        const response = await listRemoteSessionMemoryDecisions();
        const nextDecisions = mergeSessionMemoryDecisions(response.decisions);
        if (!active) {
          return;
        }
        setDecisions(nextDecisions);
        setSyncStatus("synced");
      } catch (error) {
        if (!active) {
          return;
        }
        setSyncStatus("local_only");
        setSyncError(message(error));
      }
    }

    void sync();

    return () => {
      active = false;
    };
  }, []);

  const saveDecision = useCallback(
    async (input: SessionMemoryDecisionInput) => {
      const saved = saveSessionMemoryDecision(input);
      refresh();
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        const remoteSaved = await saveRemoteSessionMemoryDecision({
          ...input,
          id: saved.id,
        });
        setDecisions(mergeSessionMemoryDecisions([remoteSaved]));
        setSyncStatus("synced");
        return remoteSaved;
      } catch (error) {
        setSyncStatus("local_only");
        setSyncError(message(error));
        return saved;
      }
    },
    [refresh],
  );

  const deleteDecision = useCallback(
    async (id: string) => {
      deleteSessionMemoryDecision(id);
      refresh();
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        await deleteRemoteSessionMemoryDecision(id);
        setSyncStatus("synced");
      } catch (error) {
        setSyncStatus("local_only");
        setSyncError(message(error));
      }
    },
    [refresh],
  );

  const clearDecisions = useCallback(async () => {
    clearSessionMemory();
    refresh();
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      await clearRemoteSessionMemoryDecisions();
      replaceSessionMemoryDecisions([]);
      setDecisions([]);
      setSyncStatus("synced");
    } catch (error) {
      setSyncStatus("local_only");
      setSyncError(message(error));
    }
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
    syncStatus,
    syncError,
    refresh,
  };
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "세션 메모리 동기화 실패";
}
