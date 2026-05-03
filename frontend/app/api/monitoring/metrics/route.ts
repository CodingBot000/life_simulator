import { getMonitoringMetricsSnapshot } from "@/lib/monitoring/metrics";

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
  const minutes = readPositiveInt(searchParams.get("minutes"), 24 * 60);
  const bucketMinutes = readPositiveInt(searchParams.get("bucket_minutes"), 60);
  const criticalLimit = readPositiveInt(searchParams.get("critical_limit"), 10);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const metrics = await getMonitoringMetricsSnapshot({
    from,
    to,
    windowMinutes: minutes,
    bucketMinutes,
    criticalCaseLimit: criticalLimit,
  });

  return Response.json(metrics);
}
