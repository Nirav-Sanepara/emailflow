import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "email";
    const ruleId = searchParams.get("ruleId");

    if (type === "email") {
      const where: any = { userId };
      if (ruleId) where.ruleId = ruleId;
      const logs = await prisma.emailLog.findMany({
        where,
        include: { rule: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return Response.json(logs);
    }

    const evalWhere: any = { rule: { userId } };
    if (ruleId) evalWhere.ruleId = ruleId;
    const logs = await prisma.evaluationLog.findMany({
      where: evalWhere,
      include: { rule: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json(logs);
  } catch (error) {
    console.error("List logs error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
