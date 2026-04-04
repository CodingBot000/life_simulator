import { detectDriftSnapshots } from "../../src/server/drift/drift-detector.ts";
import { persistDriftSnapshot } from "../../src/server/logging/service.ts";

async function main() {
  const snapshots = await detectDriftSnapshots({
    bucketHours: Number.parseInt(process.env.DRIFT_BUCKET_HOURS ?? "24", 10),
  });

  for (const snapshot of snapshots) {
    await persistDriftSnapshot(snapshot);
  }

  console.info(
    "[drift-worker] completed",
    snapshots.map((snapshot) => ({
      bucket: snapshot.bucket_label,
      anomalies: snapshot.anomalies.length,
      request_count: snapshot.request_count,
    })),
  );
}

main().catch((error) => {
  console.error("[drift-worker] failed", error);
  process.exitCode = 1;
});
