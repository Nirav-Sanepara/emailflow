import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { getRuleById, updateRule, deleteRule } from "@/lib/rules/repository";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const rule = await getRuleById(id, userId);
    if (!rule) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json(rule);
  } catch (error) {
    console.error("Get rule error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, eventType, templateId, active, conditions } = body;

    const result = await updateRule(id, userId, {
      name,
      eventType,
      templateId,
      active,
      conditions: conditions || [],
    });

    if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Update rule error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await deleteRule(id, userId);
    if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete rule error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
