import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { getTemplateById, updateTemplate, deleteTemplate } from "@/lib/templates/repository";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const template = await getTemplateById(id, userId);
    if (!template) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json(template);
  } catch (error) {
    console.error("Get template error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, subject, htmlBody, placeholders, variableDefinitions } = body;

    const result = await updateTemplate(id, userId, { name, subject, htmlBody, placeholders: placeholders || [], variableDefinitions: variableDefinitions || undefined });
    if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Update template error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await deleteTemplate(id, userId);
    if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
