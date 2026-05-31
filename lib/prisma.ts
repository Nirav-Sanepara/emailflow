import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function ensureUserExists(userId: string, email?: string) {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      const userEmail = email || `user_${userId}@placeholder.com`;
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: userEmail,
            profile: {
              create: {
                email: userEmail,
                planId: "free",
              },
            },
          },
        });
      } catch (err: any) {
        if (err.code !== "P2002") {
          throw err;
        }
      }
    }
  } catch (error) {
    console.error("Error ensuring user exists:", error);
  }
}
