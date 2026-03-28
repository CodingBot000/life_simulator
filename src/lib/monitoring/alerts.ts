import type {
  MonitoringAlert,
  MonitoringAlertsSnapshot,
  MonitoringMetricsSnapshot,
} from "../types.ts";

import {
  createEmptyMetricsSnapshot,
  getLocalDayRange,
  getMonitoringMetricsSnapshot,
} from "./metrics.ts";

export interface MonitoringAlertOptions {
  now?: Date | string;
}

const RATE_SPIKE_MIN_REQUESTS = 5;
const ANOMALY_RATE_SPIKE_THRESHOLD = 0.15;
const BLOCK_RATE_SPIKE_THRESHOLD = 0.2;
const LOW_CONFIDENCE_RATE_SPIKE_THRESHOLD = 0.25;
const LATENCY_THRESHOLD_MS = 4000;
const REEVAL_MISMATCH_THRESHOLD = 0.2;

function buildAlert(params: {
  ruleId: string;
  title: string;
  status: "ok" | "fired";
  severity: "info" | "warning" | "critical";
  window: "recent_30m" | "previous_30m" | "today";
  message: string;
  currentValue: number;
  threshold: number;
}): MonitoringAlert {
  return {
    rule_id: params.ruleId,
    title: params.title,
    status: params.status,
    severity: params.severity,
    window: params.window,
    message: params.message,
    current_value: params.currentValue,
    threshold: params.threshold,
  };
}

function hasSpike(
  current: number,
  previous: number,
  requestCount: number,
  minCurrent: number,
): boolean {
  if (requestCount < RATE_SPIKE_MIN_REQUESTS) {
    return false;
  }

  if (current < minCurrent) {
    return false;
  }

  if (previous === 0) {
    return current >= minCurrent;
  }

  return current >= previous * 1.8 && current - previous >= 0.05;
}

function emptyAlertsSnapshot(): MonitoringAlertsSnapshot {
  const empty = createEmptyMetricsSnapshot();

  return {
    generated_at: new Date().toISOString(),
    recent_30m: empty,
    previous_30m: empty,
    today: empty,
    alerts: [],
    fired_count: 0,
  };
}

export async function evaluateMonitoringAlerts(
  options: MonitoringAlertOptions = {},
): Promise<MonitoringAlertsSnapshot> {
  const now = options.now ? new Date(options.now) : new Date();

  if (Number.isNaN(now.getTime())) {
    return emptyAlertsSnapshot();
  }

  const recentTo = now;
  const recentFrom = new Date(now.getTime() - 30 * 60_000);
  const previousTo = new Date(recentFrom.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - 30 * 60_000);
  const todayRange = getLocalDayRange(now);
  const [recent30m, previous30m, today] = await Promise.all([
    getMonitoringMetricsSnapshot({
      from: recentFrom,
      to: recentTo,
      bucketMinutes: 5,
      criticalCaseLimit: 5,
    }),
    getMonitoringMetricsSnapshot({
      from: previousFrom,
      to: previousTo,
      bucketMinutes: 5,
      criticalCaseLimit: 5,
    }),
    getMonitoringMetricsSnapshot({
      from: todayRange.start,
      to: now,
      bucketMinutes: 60,
      criticalCaseLimit: 10,
    }),
  ]);

  const alerts: MonitoringAlert[] = [];
  const recentRequestCount = recent30m.totals.total_requests;

  alerts.push(
    buildAlert({
      ruleId: "anomaly_rate_spike_30m",
      title: "최근 30분 anomaly_rate 급증",
      status: hasSpike(
        recent30m.totals.anomaly_rate,
        previous30m.totals.anomaly_rate,
        recentRequestCount,
        ANOMALY_RATE_SPIKE_THRESHOLD,
      )
        ? "fired"
        : "ok",
      severity: "warning",
      window: "recent_30m",
      message:
        "최근 30분 anomaly_rate가 이전 30분 대비 급증했는지 검사한다.",
      currentValue: recent30m.totals.anomaly_rate,
      threshold: Math.max(
        previous30m.totals.anomaly_rate * 1.8,
        ANOMALY_RATE_SPIKE_THRESHOLD,
      ),
    }),
  );
  alerts.push(
    buildAlert({
      ruleId: "block_rate_spike_30m",
      title: "최근 30분 block_rate 급증",
      status: hasSpike(
        recent30m.totals.block_rate,
        previous30m.totals.block_rate,
        recentRequestCount,
        BLOCK_RATE_SPIKE_THRESHOLD,
      )
        ? "fired"
        : "ok",
      severity: "warning",
      window: "recent_30m",
      message:
        "최근 30분 block_rate가 이전 30분 대비 급증했는지 검사한다.",
      currentValue: recent30m.totals.block_rate,
      threshold: Math.max(
        previous30m.totals.block_rate * 1.8,
        BLOCK_RATE_SPIKE_THRESHOLD,
      ),
    }),
  );
  alerts.push(
    buildAlert({
      ruleId: "low_confidence_rate_spike_30m",
      title: "최근 30분 low_confidence_rate 급증",
      status: hasSpike(
        recent30m.totals.low_confidence_rate,
        previous30m.totals.low_confidence_rate,
        recentRequestCount,
        LOW_CONFIDENCE_RATE_SPIKE_THRESHOLD,
      )
        ? "fired"
        : "ok",
      severity: "warning",
      window: "recent_30m",
      message:
        "최근 30분 low_confidence_rate가 이전 30분 대비 급증했는지 검사한다.",
      currentValue: recent30m.totals.low_confidence_rate,
      threshold: Math.max(
        previous30m.totals.low_confidence_rate * 1.8,
        LOW_CONFIDENCE_RATE_SPIKE_THRESHOLD,
      ),
    }),
  );
  alerts.push(
    buildAlert({
      ruleId: "avg_latency_ms_high",
      title: "avg_latency_ms 임계치 초과",
      status:
        recent30m.totals.avg_latency_ms > LATENCY_THRESHOLD_MS ? "fired" : "ok",
      severity: "critical",
      window: "recent_30m",
      message: "최근 30분 평균 latency가 임계치를 넘는지 검사한다.",
      currentValue: recent30m.totals.avg_latency_ms,
      threshold: LATENCY_THRESHOLD_MS,
    }),
  );
  alerts.push(
    buildAlert({
      ruleId: "underblocking_detected_today",
      title: "금일 underblocking_count > 0",
      status: today.totals.underblocking_count > 0 ? "fired" : "ok",
      severity: "critical",
      window: "today",
      message: "금일 underblocking이 한 건이라도 발생했는지 검사한다.",
      currentValue: today.totals.underblocking_count,
      threshold: 0,
    }),
  );
  alerts.push(
    buildAlert({
      ruleId: "reeval_mismatch_rate_today",
      title: "금일 reeval_mismatch_rate 초과",
      status:
        today.totals.reeval_count > 0 &&
        today.totals.reeval_mismatch_rate > REEVAL_MISMATCH_THRESHOLD
          ? "fired"
          : "ok",
      severity: "warning",
      window: "today",
      message:
        "금일 re-eval mismatch rate가 기준치를 초과했는지 검사한다.",
      currentValue: today.totals.reeval_mismatch_rate,
      threshold: REEVAL_MISMATCH_THRESHOLD,
    }),
  );

  return {
    generated_at: new Date().toISOString(),
    recent_30m: recent30m,
    previous_30m: previous30m,
    today,
    alerts,
    fired_count: alerts.filter((alert) => alert.status === "fired").length,
  };
}
