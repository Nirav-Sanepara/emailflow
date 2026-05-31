import { prisma, ensureUserExists } from "@/lib/prisma";

export async function listRules(userId: string) {
  return prisma.rule.findMany({
    where: { userId },
    include: {
      template: { select: { id: true, name: true } },
      conditions: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRuleById(id: string, userId: string) {
  return prisma.rule.findFirst({
    where: { id, userId },
    include: {
      template: { select: { id: true, name: true } },
      conditions: true,
    },
  });
}

export async function createRule(data: {
  name: string;
  eventType: string;
  templateId: string;
  active: boolean;
  userId: string;
  conditions: { field: string; operator: string; value: unknown }[];
}) {
  await ensureUserExists(data.userId);
  return prisma.rule.create({
    data: {
      name: data.name,
      eventType: data.eventType,
      templateId: data.templateId,
      active: data.active,
      userId: data.userId,
      conditions: {
        create: data.conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value as any,
        })),
      },
    },
    include: { conditions: true },
  });
}

export async function updateRule(
  id: string,
  userId: string,
  data: {
    name: string;
    eventType: string;
    templateId: string;
    active: boolean;
    conditions: { field: string; operator: string; value: unknown }[];
  }
) {
  const rule = await prisma.rule.findFirst({ where: { id, userId } });
  if (!rule) return { count: 0 };

  await prisma.ruleCondition.deleteMany({ where: { ruleId: id } });

  await prisma.rule.update({
    where: { id },
    data: {
      name: data.name,
      eventType: data.eventType,
      templateId: data.templateId,
      active: data.active,
      conditions: {
        create: data.conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value as any,
        })),
      },
    },
  });

  return { count: 1 };
}

export async function deleteRule(id: string, userId: string) {
  return prisma.rule.deleteMany({
    where: { id, userId },
  });
}
