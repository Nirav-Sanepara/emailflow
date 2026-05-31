import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/supabase/server";
import { ingestEvent } from "@/lib/events/service";
import { listEvents } from "@/lib/events/repository";
export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const events = await listEvents(userId);
    return Response.json(events);
  } catch (error) {
    console.error("List events error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { event_type, user_id, payload, idempotency_key } = body;

    if (!event_type || !user_id || !idempotency_key) {
      return Response.json(
        { error: "Missing required fields: event_type, user_id, idempotency_key" },
        { status: 400 }
      );
    }

    const result = await ingestEvent({
      eventType: event_type,
      userId: user_id,
      payload: payload || {},
      idempotencyKey: idempotency_key,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("Event ingestion error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
