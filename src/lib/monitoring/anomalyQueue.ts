import type { AnomalyQueueEntry, RequestLog } from "../types.ts";

import {
  buildArtifactFileName,
  readJsonArtifacts,
  writeJsonArtifact,
} from "../logger/logStore.ts";
import { getAnomalySources } from "./anomalyDetector.ts";

export async function enqueueAnomaly(
  requestLog: RequestLog,
): Promise<string | null> {
  const source = getAnomalySources(requestLog.guardrail.guardrail_derived.anomaly);

  if (source.length === 0) {
    return null;
  }

  const entry: AnomalyQueueEntry = {
    queue_id: requestLog.request_id,
    detected_at: new Date().toISOString(),
    versions: requestLog.versions,
    source,
    anomaly: requestLog.guardrail.guardrail_derived.anomaly,
    request_log: requestLog,
  };

  return writeJsonArtifact(
    "anomaly_queue",
    buildArtifactFileName("anomaly", requestLog.request_id, entry.detected_at),
    entry,
  );
}

export async function readAnomalyQueue() {
  return readJsonArtifacts<AnomalyQueueEntry>("anomaly_queue");
}
