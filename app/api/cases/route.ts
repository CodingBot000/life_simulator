import { listCasePresets } from "@/server/cases/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cases = await listCasePresets();

    return Response.json({ cases });
  } catch (error) {
    console.error("[cases] error", error);

    return Response.json(
      {
        error: "케이스 목록을 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
