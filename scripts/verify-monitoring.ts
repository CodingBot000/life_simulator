import { readJsonArtifacts } from "../src/lib/logger/logStore.ts";
import type {
  AnomalyQueueEntry,
  MonitoringAlertsSnapshot,
  MonitoringDailyReport,
  MonitoringMetricsSnapshot,
  ReEvaluationResult,
  RequestLog,
} from "../src/lib/types.ts";
import { DEFAULT_BASE_URL, fetchJson } from "./monitoringScriptUtils.ts";

async function main() {
  const baseUrl = process.env.SIMULATE_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const [requestLogs, anomalyQueue, reevalResults] = await Promise.all([
    readJsonArtifacts<RequestLog>("request_logs"),
    readJsonArtifacts<AnomalyQueueEntry>("anomaly_queue"),
    readJsonArtifacts<ReEvaluationResult>("re_eval_results"),
  ]);

  console.log(`[verify-monitoring] request_logs count=${requestLogs.length}`);
  console.log(`[verify-monitoring] anomaly_queue count=${anomalyQueue.length}`);
  console.log(`[verify-monitoring] re_eval_results count=${reevalResults.length}`);

  const [metrics, report, alerts] = await Promise.all([
    fetchJson<MonitoringMetricsSnapshot>("/api/monitoring/metrics", baseUrl),
    fetchJson<MonitoringDailyReport>("/api/monitoring/report", baseUrl),
    fetchJson<MonitoringAlertsSnapshot>("/api/monitoring/alerts", baseUrl),
  ]);

  console.log(
    `[verify-monitoring] metrics total_requests=${metrics.totals.total_requests} anomaly_count=${metrics.totals.anomaly_count} reeval_count=${metrics.totals.reeval_count}`,
  );
  console.log(
    `[verify-monitoring] report date=${report.report_date} action_items=${report.action_items.length} critical_cases=${report.recent_critical_cases.length}`,
  );
  console.log(
    `[verify-monitoring] alerts fired=${alerts.fired_count} titles=${alerts.alerts
      .filter((alert) => alert.status === "fired")
      .map((alert) => alert.title)
      .join(" | ") || "none"}`,
  );

  if (requestLogs.length < 20) {
    console.error("[verify-monitoring] request_logs count is below target 20.");
    process.exitCode = 1;
  }

  if (anomalyQueue.length < 5) {
    console.error("[verify-monitoring] anomaly_queue count is below target 5.");
    process.exitCode = 1;
  }

  if (reevalResults.length < 5) {
    console.error("[verify-monitoring] re_eval_results count is below target 5.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[verify-monitoring] fatal: ${message}`);
  process.exitCode = 1;
});
