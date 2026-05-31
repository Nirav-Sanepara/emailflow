import { getCurrentUserId } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

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

  return (
    <DashboardClient
      templateCount={templateCount}
      ruleCount={ruleCount}
      eventCount={eventCount}
      emailCount={emailCount}
      recentEvents={recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        userId: e.userId,
        createdAt: e.createdAt.toISOString(),
      }))}
    />
  );
}
