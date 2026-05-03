import {
  getMetricsContentType,
  getMetricsText,
} from "../../../src/server/monitoring/prometheus.ts";

export const runtime = "nodejs";

export async function GET() {
  return new Response(await getMetricsText(), {
    status: 200,
    headers: {
      "Content-Type": getMetricsContentType(),
      "Cache-Control": "no-store",
    },
  });
}
