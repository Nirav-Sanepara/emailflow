import { findEventByIdempotencyKey, createEvent } from "./repository";
import { evaluateEventAgainstRules } from "@/lib/rules/engine";

export async function ingestEvent(data: {
  eventType: string;
  userId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<{ received: true; alreadyProcessed?: boolean }> {
  const existing = await findEventByIdempotencyKey(data.idempotencyKey);
  if (existing) {
    return { received: true, alreadyProcessed: true };
  }

  const event = await createEvent(data);

  setImmediate(() => {
    evaluateEventAgainstRules(
      event.id,
      data.eventType,
      data.userId,
      data.payload
    ).catch((e) => console.error("Background rule evaluation failed:", e));
  });

  return { received: true };
}
