import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { sendTestEmail } from "@/lib/email/service";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { to, subject, htmlBody, placeholderValues } = body;

    if (!to || !subject || !htmlBody) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sendTestEmail(to, subject, htmlBody, placeholderValues || {});
    if (!result.success) {
      return Response.json({ error: result.error || "Failed to send" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Test send error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
