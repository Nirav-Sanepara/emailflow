import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId: callerUserId } = body;

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          include: { plan: true },
        },
      },
    });

    if (!user || !user.profile) {
      return Response.json({ profile: null });
    }

    return Response.json({
      profile: {
        userId: user.id,
        email: user.profile.email,
        planId: user.profile.planId,
        planName: user.profile.plan?.name || user.profile.planId,
        subscriptionStatus: user.profile.subscriptionStatus,
        projectCount: user.profile.projectCount,
        unsubscribed: user.profile.unsubscribed,
        createdAt: user.profile.createdAt,
      },
    });
  } catch (error) {
    console.error("User lookup error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
