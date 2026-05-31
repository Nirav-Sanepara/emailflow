import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    if (!userId || !email) {
      return Response.json({ error: "Missing userId or email" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }
    await prisma.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email },
    });

    await prisma.userProfile.upsert({
      where: { userId },
      update: { email },
      create: { userId, email, planId: "free" },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("User init error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
