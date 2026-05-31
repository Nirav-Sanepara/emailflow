import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { createTemplate, listTemplates } from "@/lib/templates/repository";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const templates = await listTemplates(userId);
    return Response.json(templates);
  } catch (error) {
    console.error("List templates error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, subject, htmlBody, placeholders, variableDefinitions } = body;

    if (!name || !subject || !htmlBody) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const template = await createTemplate({
      name,
      subject,
      htmlBody,
      placeholders: placeholders || [],
      variableDefinitions: variableDefinitions || undefined,
      userId,
    });

    return Response.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
