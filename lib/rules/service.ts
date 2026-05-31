import { prisma } from "@/lib/prisma";

export async function incrementProjectCount(userId: string): Promise<number> {
  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: { projectCount: { increment: 1 } },
    create: {
      userId,
      email: "",
      planId: "free",
      projectCount: 1,
    },
  });

  const newCount = profile.projectCount;

  if (newCount === 10) {
    setImmediate(async () => {
      try {
        const { evaluateEventAgainstRules } = await import("./engine");
        const { prisma: db } = await import("@/lib/prisma");

        const event = await db.event.create({
          data: {
            eventType: "user_reached_10_projects",
            userId,
            payload: { projectCount: 10 },
            idempotencyKey: `milestone_10_${userId}`,
          },
        });

        await evaluateEventAgainstRules(
          event.id,
          "user_reached_10_projects",
          userId,
          { projectCount: 10 }
        );
      } catch (e) {
        console.error("Failed to process milestone event:", e);
      }
    });
  }

  return newCount;
}
