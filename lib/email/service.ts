import { prisma } from "@/lib/prisma";
import { renderTemplate } from "./renderer";
import { sendEmailViaProvider } from "./provider";
import type { Rule } from "@prisma/client";

export async function sendEmailForRule(
  rule: Rule & { template?: { id: string; subject: string; htmlBody: string; name: string } },
  eventId: string,
  userId: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const template = rule.template;
    if (!template) {
      throw new Error("Template not found for rule");
    }

    let profileEmail: string | null = null;
    let userData: Record<string, unknown> = {};
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: { plan: true },
      });
      if (profile) {
        profileEmail = profile.email;
        userData = {
          user: {
            email: profile.email,
            planId: profile.planId,
            planName: profile.plan?.name || profile.planId,
            plan: {
              id: profile.plan?.id,
              name: profile.plan?.name,
              features: profile.plan?.features,
              priceMonthly: profile.plan?.priceMonthly,
              priceYearly: profile.plan?.priceYearly,
            },
            unsubscribed: profile.unsubscribed,
            projectCount: profile.projectCount,
          },
        };
      }
    } catch {
      console.warn("Could not fetch user profile, using payload data only");
    }

    const renderData = { ...payload, ...userData };

    const { subject, html } = renderTemplate(
      template.subject,
      template.htmlBody,
      renderData
    );

    const toEmail = profileEmail || (payload.email as string) || "nirav.workspace@gmail.com";

    const result = await sendEmailViaProvider(toEmail, subject, html);

    await prisma.emailLog.create({
      data: {
        eventId,
        ruleId: rule.id,
        templateId: template.id,
        userId,
        status: result.success ? "sent" : "failed",
        error: result.error || null,
        providerResponse: result.response || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("sendEmailForRule failed:", message);

    try {
      await prisma.emailLog.create({
        data: {
          eventId,
          ruleId: rule.id,
          templateId: rule.template?.id || "",
          userId,
          status: "failed",
          error: message,
        },
      });
    } catch (logError) {
      console.error("Failed to log email error:", logError);
    }
  }
}

export async function sendTestEmail(
  to: string,
  subject: string,
  htmlBody: string,
  placeholderValues: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { renderTemplate } = await import("./renderer");
    const { sendEmailViaProvider } = await import("./provider");

    const { subject: renderedSubject, html } = renderTemplate(subject, htmlBody, placeholderValues);
    return await sendEmailViaProvider(to, renderedSubject, html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
