export type FieldType = "string" | "number" | "boolean"
export type FieldGroup = "User Profile" | "Plan Features" | "Event Data"

export interface FieldDefinition {
  path: string
  label: string
  type: FieldType
  group: FieldGroup
  options?: string[]
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    path: "user.planId",
    label: "Current Plan",
    type: "string",
    group: "User Profile",
    options: ["free", "pro", "enterprise"],
  },
  {
    path: "user.unsubscribed",
    label: "Email Unsubscribed Status",
    type: "boolean",
    group: "User Profile",
  },
  {
    path: "user.projectCount",
    label: "Total Projects Created",
    type: "number",
    group: "User Profile",
  },
  {
    path: "user.email",
    label: "Email Address",
    type: "string",
    group: "User Profile",
  },
  {
    path: "user.plan.features.max_projects",
    label: "Maximum Projects Allowed",
    type: "number",
    group: "Plan Features",
  },
  {
    path: "user.plan.features.storage_gb",
    label: "Storage Limit (GB)",
    type: "number",
    group: "Plan Features",
  },
  {
    path: "user.plan.features.supports_ai",
    label: "AI Features Access",
    type: "boolean",
    group: "Plan Features",
  },
  {
    path: "payload.plan_name",
    label: "Plan Name (from event)",
    type: "string",
    group: "Event Data",
    options: ["free", "pro", "enterprise"],
  },
  {
    path: "payload.first_name",
    label: "First Name",
    type: "string",
    group: "Event Data",
  },
  {
    path: "payload.last_name",
    label: "Last Name",
    type: "string",
    group: "Event Data",
  },
  {
    path: "payload.email",
    label: "Email Address",
    type: "string",
    group: "Event Data",
  },
  {
    path: "payload.amount",
    label: "Payment Amount",
    type: "number",
    group: "Event Data",
  },
  {
    path: "payload.project_name",
    label: "Project Name",
    type: "string",
    group: "Event Data",
  },
  {
    path: "payload.tier",
    label: "Subscription Tier",
    type: "string",
    group: "Event Data",
  },
]

export const DEPRECATED_PATH_MAP: Record<string, string> = {
  "user.plan": "user.planId",
  "user.plan.name": "user.planId",
  "payload.plan": "payload.plan_name",
}

export const GROUPS: FieldGroup[] = ["User Profile", "Plan Features", "Event Data"]

export function getFieldByPath(path: string): FieldDefinition | undefined {
  return FIELD_DEFINITIONS.find((f) => f.path === path)
}

export function getFieldsByGroup(group: FieldGroup): FieldDefinition[] {
  return FIELD_DEFINITIONS.filter((f) => f.group === group)
}

export function getFieldType(path: string): FieldType {
  return getFieldByPath(path)?.type ?? "string"
}

export function resolvePath(path: string): string {
  return DEPRECATED_PATH_MAP[path] ?? path
}

export const OPERATORS_BY_TYPE: Record<FieldType, { value: string; label: string }[]> = {
  string: [
    { value: "eq", label: "=" },
    { value: "neq", label: "≠" },
    { value: "contains", label: "contains" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "neq", label: "≠" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "gte", label: "≥" },
    { value: "lte", label: "≤" },
  ],
  boolean: [
    { value: "eq", label: "=" },
    { value: "neq", label: "≠" },
  ],
}

export const OPERATOR_HUMAN: Record<string, string> = {
  eq: "equals",
  neq: "does not equal",
  gt: "is greater than",
  lt: "is less than",
  gte: "is greater than or equal to",
  lte: "is less than or equal to",
  contains: "contains",
}
