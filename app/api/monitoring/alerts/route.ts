import { evaluateMonitoringAlerts } from "@/lib/monitoring/alerts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = searchParams.get("now") ?? undefined;
  const alerts = await evaluateMonitoringAlerts({ now });

  return Response.json(alerts);
}
