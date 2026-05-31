function extractPlaceholders(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

function extractVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [...content.matchAll(regex)];
  return [...new Set(matches.map((m) => m[1].trim()))];
}

interface VariableDefinition {
  label: string;
  type: "string" | "number" | "email" | "boolean";
  fallback?: string | number | boolean;
  required: boolean;
}

function syncVariableDefinitions(
  existingDefs: Record<string, VariableDefinition>,
  currentVariables: string[]
): Record<string, VariableDefinition> {
  const newDefs = { ...existingDefs };

  currentVariables.forEach((variable) => {
    if (!newDefs[variable]) {
      newDefs[variable] = {
        label: variable
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        type: "string",
        fallback: "",
        required: false,
      };
    }
  });

  Object.keys(newDefs).forEach((variable) => {
    if (!currentVariables.includes(variable)) {
      delete newDefs[variable];
    }
  });

  return newDefs;
}

export { extractPlaceholders, extractVariables, syncVariableDefinitions };
export type { VariableDefinition };
