import { prisma, ensureUserExists } from "@/lib/prisma";

export async function createEvent(data: {
  eventType: string;
  userId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}) {
  await ensureUserExists(data.userId);
  return prisma.event.create({
    data: {
      eventType: data.eventType,
      userId: data.userId,
      payload: data.payload as any,
      idempotencyKey: data.idempotencyKey,
    },
  });
}

export async function findEventByIdempotencyKey(key: string) {
  return prisma.event.findUnique({
    where: { idempotencyKey: key },
  });
}

export async function listEvents(userId: string, limit = 50) {
  return prisma.event.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getEventCount(userId: string) {
  return prisma.event.count({ where: { userId } });
}
