import { prisma } from "@/lib/prisma";
import { evaluateCondition, type ConditionOperator } from "./conditionEvaluator";
import { sendEmailForRule } from "@/lib/email/service";

interface ConditionDetail {
  field: string;
  operator: string;
  expectedValue: unknown;
  actualValue: unknown;
  passed: boolean;
}

export async function evaluateEventAgainstRules(
  eventId: string,
  eventType: string,
  userId: string,
  payload: Record<string, unknown>,
  overrideTemplateId?: string,
  ruleId?: string
): Promise<void> {
  try {
    const where: any = { active: true, eventType, userId };
    if (ruleId) {
      where.id = ruleId;
    }
    const rules = await prisma.rule.findMany({
      where,
      include: { conditions: true, template: true },
    });

    for (const rule of rules) {
      const details: ConditionDetail[] = [];
      let allPassed = true;

      for (const condition of rule.conditions) {
        let actualValue: unknown = undefined;

        if (condition.field.startsWith("payload.")) {
          const fieldPath = condition.field.replace("payload.", "");
          actualValue = getNestedValue(payload, fieldPath);
        } else if (condition.field.startsWith("user.")) {
          const fieldPath = condition.field.replace("user.", "");
          const profile = await prisma.userProfile.findUnique({
            where: { userId },
            include: { plan: true },
          });
          if (profile) {
            const profileWithPlan = {
              ...profile,
              plan: profile.plan
                ? {
                    id: profile.plan.id,
                    name: profile.plan.name,
                    description: profile.plan.description,
                    features: profile.plan.features,
                    priceMonthly: profile.plan.priceMonthly,
                    priceYearly: profile.plan.priceYearly,
                    sortOrder: profile.plan.sortOrder,
                    isActive: profile.plan.isActive,
                  }
                : undefined,
            };
            actualValue = getNestedValue(profileWithPlan as unknown as Record<string, unknown>, fieldPath);
          }
        }

        const passed = evaluateCondition(
          actualValue,
          condition.operator as ConditionOperator,
          condition.value
        );

        details.push({
          field: condition.field,
          operator: condition.operator,
          expectedValue: condition.value,
          actualValue,
          passed,
        });

        if (!passed) {
          allPassed = false;
        }
      }

      await prisma.evaluationLog.create({
        data: {
          eventId,
          ruleId: rule.id,
          ruleName: rule.name,
          matched: allPassed,
          details: { conditions: details } as any,
        },
      });

      if (allPassed) {
        let resolvedTemplate = rule.template;

        if (overrideTemplateId && overrideTemplateId !== rule.templateId) {
          const override = await prisma.template.findUnique({
            where: { id: overrideTemplateId },
          });
          if (override) {
            resolvedTemplate = override;
          }
        }

        await sendEmailForRule(
          { ...rule, template: resolvedTemplate },
          eventId,
          userId,
          payload
        );
      }
    }

    try {
      await prisma.event.update({
        where: { id: eventId },
        data: { processed: true },
      });
    } catch (e) {
      console.error("Failed to mark event as processed:", e);
    }
  } catch (error) {
    console.error("Rule evaluation failed:", error);
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
