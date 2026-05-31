export type ConditionOperator = "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains";

export function evaluateCondition(
  actualValue: unknown,
  operator: ConditionOperator,
  expectedValue: unknown
): boolean {
  if (actualValue === null || actualValue === undefined) {
    return false;
  }

  switch (operator) {
    case "eq": {
      if (typeof actualValue === "number" && !isNaN(Number(expectedValue))) {
        return actualValue === Number(expectedValue);
      }
      return String(actualValue) === String(expectedValue);
    }
    case "neq": {
      if (typeof actualValue === "number" && !isNaN(Number(expectedValue))) {
        return actualValue !== Number(expectedValue);
      }
      return String(actualValue) !== String(expectedValue);
    }
    case "gt": {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      if (!isNaN(numActual) && !isNaN(numExpected)) {
        return numActual > numExpected;
      }
      return false;
    }
    case "lt": {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      if (!isNaN(numActual) && !isNaN(numExpected)) {
        return numActual < numExpected;
      }
      return false;
    }
    case "gte": {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      if (!isNaN(numActual) && !isNaN(numExpected)) {
        return numActual >= numExpected;
      }
      return false;
    }
    case "lte": {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      if (!isNaN(numActual) && !isNaN(numExpected)) {
        return numActual <= numExpected;
      }
      return false;
    }
    case "contains": {
      return String(actualValue).includes(String(expectedValue));
    }
    default:
      return false;
  }
}
