import { prisma, ensureUserExists } from "@/lib/prisma";
import type { VariableDefinition } from "@/lib/templates/service";

export async function listTemplates(userId: string) {
  return prisma.template.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTemplateById(id: string, userId: string) {
  return prisma.template.findFirst({
    where: { id, userId },
  });
}

export async function createTemplate(data: {
  name: string;
  subject: string;
  htmlBody: string;
  placeholders: string[];
  variableDefinitions?: Record<string, VariableDefinition>;
  userId: string;
}) {
  await ensureUserExists(data.userId);
  return prisma.template.create({
    data: {
      name: data.name,
      subject: data.subject,
      htmlBody: data.htmlBody,
      placeholders: data.placeholders,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variableDefinitions: data.variableDefinitions as any,
      userId: data.userId,
    },
  });
}

export async function updateTemplate(
  id: string,
  userId: string,
  data: {
    name: string;
    subject: string;
    htmlBody: string;
    placeholders: string[];
    variableDefinitions?: Record<string, VariableDefinition>;
  }
) {
  return prisma.template.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      subject: data.subject,
      htmlBody: data.htmlBody,
      placeholders: data.placeholders,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variableDefinitions: data.variableDefinitions as any,
    },
  });
}

export async function deleteTemplate(id: string, userId: string) {
  return prisma.template.deleteMany({
    where: { id, userId },
  });
}
