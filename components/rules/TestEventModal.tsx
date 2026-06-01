"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Zap, CheckCircle2, XCircle, History } from "lucide-react"
import { getFieldByPath, resolvePath } from "@/lib/rules/fieldDefinitions"

interface Condition {
  field: string
  operator: string
  value: string
}

interface ConditionDetail {
  field: string
  operator: string
  expectedValue: string
  actualValue: string
  passed: boolean
}

interface Template {
  id: string
  name: string
  subject: string
  htmlBody: string
}

interface TestEventModalProps {
  ruleId: string
  ruleName: string
  eventType: string
  templateId: string
  conditions: Condition[]
}

const SMART_DEFAULTS: Record<string, string> = {
  plan_name: "pro",
  plan: "pro",
  planId: "pro",
  "plan.name": "Pro",
  "plan.features.max_projects": "50",
  "plan.features.storage_gb": "50",
  "plan.features.supports_ai": "true",
}

function extractPayloadFields(conditions: Condition[]): string[] {
  const fields = new Set<string>()
  for (const c of conditions) {
    if (c.field.startsWith("payload.")) {
      fields.add(c.field.replace("payload.", ""))
    }
  }
  return Array.from(fields)
}

function extractUserFields(conditions: Condition[]): string[] {
  const fields = new Set<string>()
  for (const c of conditions) {
    if (c.field.startsWith("user.")) {
      fields.add(c.field.replace("user.", ""))
    }
  }
  return Array.from(fields)
}

function prettyField(field: string): string {
  return field.replace(/^payload\./, "").replace(/^user\./, "")
}

function operatorLabel(op: string): string {
  const map: Record<string, string> = { eq: "=", neq: "!=", gt: ">", lt: "<", gte: ">=", lte: "<=", contains: "contains" }
  return map[op] || op
}

function getFieldDef(formField: string, conditions: Condition[]): ReturnType<typeof getFieldByPath> {
  const condition = conditions.find((c) => prettyField(c.field) === formField)
  if (!condition) return undefined
  return getFieldByPath(resolvePath(condition.field))
}

function evaluateCondition(actual: string, operator: string, expected: string): boolean {
  switch (operator) {
    case "eq":
      return actual === expected
    case "neq":
      return actual !== expected
    case "gt":
      return Number(actual) > Number(expected)
    case "lt":
      return Number(actual) < Number(expected)
    case "gte":
      return Number(actual) >= Number(expected)
    case "lte":
      return Number(actual) <= Number(expected)
    case "contains":
      return actual.includes(expected)
    default:
      return actual === expected
  }
}

export function TestEventModal({ ruleId, ruleName, eventType, templateId, conditions }: TestEventModalProps) {
  const [open, setOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [testEmail, setTestEmail] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateVariables, setTemplateVariables] = useState<string[]>([])
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  const allFormFields = Array.from(new Set([...extractPayloadFields(conditions), ...extractUserFields(conditions)]))

  useEffect(() => {
    if (!open) return
    setResult(null)
    setSelectedTemplateId(templateId)

    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates")
        if (res.ok) setTemplates(await res.json())
      } catch { /* ignore */ }
    }
    fetchTemplates()

    const init = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setTestEmail(session.user.email)
      }
    }
    init()

    const defaults: Record<string, string> = {}
    for (const field of allFormFields) {
      defaults[field] = SMART_DEFAULTS[field] || ""
    }
    setFormValues(defaults)
  }, [open])

  useEffect(() => {
    setVariableValues({})
    setTemplateVariables([])
    const selected = templates.find((t) => t.id === selectedTemplateId)
    if (!selected) return

    const combined = `${selected.subject} ${selected.htmlBody}`
    const regex = /\{\{(\w+)\}\}/g
    const vars = new Set<string>()
    let match
    while ((match = regex.exec(combined)) !== null) {
      vars.add(match[1])
    }
    const detected = Array.from(vars)
    setTemplateVariables(detected)

    const defaults: Record<string, string> = {}
    for (const v of detected) {
      defaults[v] = ""
    }
    setVariableValues(defaults)
  }, [selectedTemplateId, templates])

  const updateFormValue = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleRunTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Enter an email address")
      return
    }

    setTesting(true)
    setResult(null)

    try {
      const details: ConditionDetail[] = conditions.map((c) => {
        const fieldName = prettyField(c.field)
        const actualValue = formValues[fieldName] || ""
        const passed = evaluateCondition(actualValue, c.operator, c.value)
        return {
          field: c.field,
          operator: c.operator,
          expectedValue: c.value,
          actualValue,
          passed,
        }
      })

      const matched = details.every((d) => d.passed)

      let emailResult = null
      if (matched) {
        const placeholderValues: Record<string, string> = {}
        for (const [key, value] of Object.entries(formValues)) {
          placeholderValues[key] = value
        }
        for (const [key, value] of Object.entries(variableValues)) {
          if (value.trim()) {
            placeholderValues[key] = value.trim()
          }
        }
        placeholderValues.email = testEmail.trim()

        const res = await fetch("/api/rules/test-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: testEmail.trim(),
            templateId: selectedTemplateId,
            placeholderValues,
            ruleId,
            ruleName,
          }),
        })

        const data = await res.json()
        emailResult = {
          status: data.success ? "sent" : "failed",
          error: data.error || null,
        }
      }

      setResult({
        matched,
        details,
        emailResult,
        sentTo: testEmail.trim(),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed")
      setResult({
        error: err instanceof Error ? err.message : "Test failed",
        details: [],
        matched: false,
        emailResult: null,
      })
    } finally {
      setTesting(false)
    }
  }

  const handleRunAgain = () => {
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Zap className="h-3.5 w-3.5" />
          Test Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Rule: {ruleName}</DialogTitle>
        </DialogHeader>

        {result ? (
          result.error ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <XCircle className="h-5 w-5" />
                  Error
                </div>
                <p className="text-sm mt-1">{result.error}</p>
              </div>
              <Button onClick={handleRunAgain} variant="outline" className="w-full">
                Run Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-lg border p-4 space-y-3 ${
                result.matched
                  ? "border-green-500/50 bg-green-50 dark:bg-green-950"
                  : "border-amber-500/50 bg-amber-50 dark:bg-amber-950"
              }`}>
                <div className={`flex items-center gap-2 font-medium ${
                  result.matched
                    ? "text-green-700 dark:text-green-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}>
                  {result.matched ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  Rule {result.matched ? "matched" : "did not match"}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Rule Evaluation: {ruleName}
                  </p>
                  {result.details.length > 0 ? (
                    result.details.map((d: ConditionDetail, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {d.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span>
                          {d.field} {operatorLabel(d.operator)} {d.expectedValue}
                          {" → "}
                          <span className={d.passed ? "text-green-600" : "text-red-600"}>
                            {d.passed ? "Matched" : "No match"}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}(actual: {d.actualValue || "null"})
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No conditions - rule matches all events of this type</p>
                  )}
                </div>

                {result.emailResult && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {result.emailResult.status === "sent" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      Email {result.emailResult.status === "sent" ? "sent" : "failed"} to {result.sentTo}
                    </div>
                    {result.emailResult.error && (
                      <p className="text-xs text-red-600 pl-6">{result.emailResult.error}</p>
                    )}
                  </div>
                )}

                {result.matched && !result.emailResult && (
                  <p className="text-sm text-muted-foreground">Sending email...</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleRunAgain} variant="outline" className="flex-1">
                  Run Again
                </Button>
                <Button variant="outline" className="flex-1 gap-1" onClick={() => window.open("/logs", "_blank")}>
                  <History className="h-4 w-4" />
                  View Logs
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Input value={eventType} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The template used when sending the test email
              </p>
            </div>

            {templateVariables.length > 0 && (
              <div className="space-y-3">
                <Label>Template Variables</Label>
                {templateVariables.map((v) => (
                  <div key={v} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{v}</Label>
                    <Input
                      value={variableValues[v] || ""}
                      onChange={(e) => setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))}
                      placeholder={`Enter ${v}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {conditions.length > 0 && (
              <div className="space-y-2">
                <Label>Conditions</Label>
                <div className="space-y-1.5">
                  {conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        {prettyField(c.field)}
                      </Badge>
                      <span className="text-muted-foreground">{operatorLabel(c.operator)}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {c.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allFormFields.length > 0 && (
              <div className="space-y-3">
                <Label>Test Values</Label>
                {allFormFields.map((field) => {
                  const def = getFieldDef(field, conditions)
                  const fieldType = def?.type ?? "string"
                  const useSelect = fieldType === "boolean" || (def?.options && def.options.length > 0)

                  return (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{field}</Label>
                      {useSelect ? (
                        <Select value={formValues[field] || ""} onValueChange={(v) => updateFormValue(field, v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldType === "boolean" ? (
                              <>
                                <SelectItem value="true">Yes / True</SelectItem>
                                <SelectItem value="false">No / False</SelectItem>
                              </>
                            ) : (
                              def?.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={fieldType === "number" ? "number" : "text"}
                          step={fieldType === "number" ? "1" : undefined}
                          min={fieldType === "number" ? "0" : undefined}
                          value={formValues[field] || ""}
                          onChange={(e) => updateFormValue(field, e.target.value)}
                          placeholder={SMART_DEFAULTS[field] || "Enter value"}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <Button onClick={handleRunTest} className="w-full gap-2" disabled={testing}>
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {testing ? "Testing..." : "Run Test"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
