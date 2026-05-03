import type { MonitoringDailyReport } from "../types.ts";

import { evaluateMonitoringAlerts } from "./alerts.ts";
import { getLocalDayRange, getMonitoringMetricsSnapshot } from "./metrics.ts";

function buildActionItems(report: {
  avgLatencyMs: number;
  lowConfidenceRate: number;
  underblockingCount: number;
  reevalMismatchRate: number;
  blockRate: number;
  firedAlertTitles: string[];
}): string[] {
  const items: string[] = [];

  if (report.underblockingCount > 0) {
    items.push(
      "금일 underblocking 케이스를 우선 검토하고 threshold 또는 escalation 로직을 재평가하라.",
    );
  }

  if (report.reevalMismatchRate > 0.2) {
    items.push(
      "re-eval mismatch가 높으므로 online decision과 재평가 결과 차이를 샘플링해 원인을 분류하라.",
    );
  }

  if (report.lowConfidenceRate > 0.25) {
    items.push(
      "low confidence 비율이 높으므로 입력 정보 부족, prompt ambiguity, state loader completeness를 점검하라.",
    );
  }

  if (report.blockRate > 0.2) {
    items.push(
      "block rate가 높으므로 overblocking 가능성을 검토하고 실제 high-risk 분포와 비교하라.",
    );
  }

  if (report.avgLatencyMs > 4000) {
    items.push(
      "평균 latency가 높으므로 chain 단계별 토큰 사용량과 slow step을 확인하라.",
    );
  }

  if (report.firedAlertTitles.length > 0) {
    items.push(
      `발화된 alert를 우선순위대로 처리하라: ${report.firedAlertTitles.join(", ")}`,
    );
  }

  if (items.length === 0) {
    items.push("즉시 대응이 필요한 이상 징후는 없다. 현재 추세를 유지하며 일일 모니터링을 지속하라.");
  }

  return items;
}

function formatReportDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function generateDailyMonitoringReport(
  day?: string | Date,
): Promise<MonitoringDailyReport> {
  const range = getLocalDayRange(day);
  const [snapshot, alerts] = await Promise.all([
    getMonitoringMetricsSnapshot({
      from: range.start,
      to: range.end,
      bucketMinutes: 60,
      criticalCaseLimit: 10,
    }),
    evaluateMonitoringAlerts({
      now: range.end,
    }),
  ]);
  const firedAlertTitles = alerts.alerts
    .filter((alert) => alert.status === "fired")
    .map((alert) => alert.title);

  return {
    generated_at: new Date().toISOString(),
    report_date: formatReportDate(range.start),
    traffic_summary: {
      total_requests: snapshot.totals.total_requests,
      success_rate: snapshot.totals.success_rate,
      avg_latency_ms: snapshot.totals.avg_latency_ms,
    },
    guardrail_summary: {
      allow_count: snapshot.totals.allow_count,
      review_count: snapshot.totals.review_count,
      block_count: snapshot.totals.block_count,
      block_rate: snapshot.totals.block_rate,
      review_rate: snapshot.totals.review_rate,
      low_confidence_rate: snapshot.totals.low_confidence_rate,
    },
    anomaly_summary: {
      anomaly_count: snapshot.totals.anomaly_count,
      anomaly_rate: snapshot.totals.anomaly_rate,
      underblocking_count: snapshot.totals.underblocking_count,
      overblocking_count: snapshot.totals.overblocking_count,
      conflict_count: snapshot.totals.conflict_count,
      low_confidence_anomaly_count:
        snapshot.totals.low_confidence_anomaly_count,
      raw_based: snapshot.anomaly_breakdown.raw_based,
      derived_based: snapshot.anomaly_breakdown.derived_based,
    },
    reeval_summary: {
      reeval_count: snapshot.totals.reeval_count,
      reeval_mismatch_count: snapshot.totals.reeval_mismatch_count,
      reeval_mismatch_rate: snapshot.totals.reeval_mismatch_rate,
    },
    action_items: buildActionItems({
      avgLatencyMs: snapshot.totals.avg_latency_ms,
      lowConfidenceRate: snapshot.totals.low_confidence_rate,
      underblockingCount: snapshot.totals.underblocking_count,
      reevalMismatchRate: snapshot.totals.reeval_mismatch_rate,
      blockRate: snapshot.totals.block_rate,
      firedAlertTitles,
    }),
    recent_critical_cases: snapshot.recent_critical_cases,
  };
}
