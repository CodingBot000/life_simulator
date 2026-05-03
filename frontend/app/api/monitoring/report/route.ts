import { generateDailyMonitoringReport } from "@/lib/monitoring/report";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = searchParams.get("day") ?? undefined;
  const report = await generateDailyMonitoringReport(day);

  return Response.json(report);
}
