import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { renderTemplate } from "@/lib/email/renderer";
import { sendEmailViaProvider } from "@/lib/email/provider";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { to, templateId, placeholderValues, ruleId, ruleName } = body;

    if (!to || !templateId) {
      return Response.json({ error: "Missing required fields: to, templateId" }, { status: 400 });
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    const { subject, html } = renderTemplate(
      template.subject,
      template.htmlBody,
      (placeholderValues || {}) as Record<string, unknown>
    );

    const result = await sendEmailViaProvider(to, subject, html);

    await prisma.emailLog.create({
      data: {
        eventId: `test_${Date.now()}`,
        ruleId: ruleId || "unknown",
        templateId,
        userId,
        status: result.success ? "sent" : "failed",
        error: result.error || null,
        providerResponse: result.response || null,
      },
    });

    return Response.json({
      success: result.success,
      error: result.error || null,
      status: result.success ? "sent" : "failed",
      to,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
