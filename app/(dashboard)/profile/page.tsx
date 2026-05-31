import { getSession } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    include: { plan: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect("/login");

  return (
    <ProfileClient
      email={session.user.email || profile?.email || ""}
      userId={session.user.id}
      createdAt={user.createdAt.toISOString()}
      planId={profile?.planId || "free"}
      planName={profile?.plan?.name || "Free"}
      planFeatures={profile?.plan?.features as Record<string, unknown> | undefined}
      subscriptionStatus={profile?.subscriptionStatus || "active"}
      subscriptionEndsAt={profile?.subscriptionEndsAt?.toISOString() || null}
    />
  );
}
