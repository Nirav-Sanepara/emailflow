import { getCurrentUserId } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [templateCount, ruleCount, eventCount, emailCount, recentEvents] = await Promise.all([
      prisma.template.count({ where: { userId } }),
      prisma.rule.count({ where: { userId } }),
      prisma.event.count({ where: { userId } }),
      prisma.emailLog.count({ where: { userId } }),
      prisma.event.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return Response.json({
      templateCount,
      ruleCount,
      eventCount,
      emailCount,
      recentEvents,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
