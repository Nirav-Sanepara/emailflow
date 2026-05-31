import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { createRule, listRules } from "@/lib/rules/repository";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rules = await listRules(userId);
    return Response.json(rules);
  } catch (error) {
    console.error("List rules error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, eventType, templateId, active, conditions } = body;

    if (!name || !eventType || !templateId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const rule = await createRule({
      name,
      eventType,
      templateId,
      active: active ?? true,
      userId,
      conditions: conditions || [],
    });

    return Response.json(rule, { status: 201 });
  } catch (error) {
    console.error("Create rule error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
