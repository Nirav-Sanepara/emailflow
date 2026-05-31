import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { improveEmail, generateSubjectVariants, generateFromPrompt } from "@/lib/ai/openai";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, subject, emailBody, prompt } = body;

    if (!action) {
      return Response.json({ error: "Missing required field: action" }, { status: 400 });
    }

    if (action === "generate") {
      if (!prompt) {
        return Response.json({ error: "Missing required field: prompt" }, { status: 400 });
      }
      const result = await generateFromPrompt(prompt);
      return Response.json({ variants: null, subject: result.subject, body: result.body });
    }

    if (!subject || !emailBody) {
      return Response.json(
        { error: "Missing required fields: subject, emailBody" },
        { status: 400 }
      );
    }

    if (action === "subject_variants") {
      const variants = await generateSubjectVariants(subject, emailBody);
      return Response.json({ variants, subject: null, body: null });
    }

    const result = await improveEmail(action, subject, emailBody);
    return Response.json({
      variants: null,
      subject: result.subject,
      body: result.body,
    });
  } catch (error) {
    console.error("AI improve error:", error);
    return Response.json({ error: "AI processing failed" }, { status: 500 });
  }
}
