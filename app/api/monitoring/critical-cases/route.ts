import { getLocalDayRange, getMonitoringMetricsSnapshot } from "@/lib/monitoring/metrics";

export const runtime = "nodejs";

function readPositiveInt(
  value: string | null,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = readPositiveInt(searchParams.get("limit"), 20);
  const minutes = readPositiveInt(searchParams.get("minutes"), 24 * 60);
  const day = searchParams.get("day");
  const range = day
    ? getLocalDayRange(day)
    : undefined;
  const snapshot = await getMonitoringMetricsSnapshot({
    from: range?.start,
    to: range?.end,
    windowMinutes: minutes,
    bucketMinutes: 60,
    criticalCaseLimit: limit,
  });

  return Response.json({
    generated_at: snapshot.generated_at,
    window: snapshot.window,
    recent_critical_cases: snapshot.recent_critical_cases,
  });
}
