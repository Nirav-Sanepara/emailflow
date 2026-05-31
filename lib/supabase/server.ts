import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma, ensureUserExists } from "@/lib/prisma";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId) return null;

  // Auto-initialize user and userProfile in Prisma if they don't exist
  await ensureUserExists(userId, email);

  return userId;
}
