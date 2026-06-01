"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  History,
  Save,
  Upload,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react"

interface PayloadField {
  key: string
  value: string
  type: "string" | "email" | "number" | "boolean" | "date" | "enum"
}

interface SavedScenario {
  id: string
  name: string
  eventType: string
  payloadFields: PayloadField[]
  createdAt: string
}

interface TemplateInfo {
  id: string
  name: string
  subject: string
  htmlBody: string
}

const COMMON_PAYLOAD_FIELDS: {
  value: string
  label: string
  type: PayloadField["type"]
  options?: string[]
}[] = [
  { value: "plan_name", label: "Plan Name", type: "enum", options: ["free", "pro", "enterprise"] },
  { value: "first_name", label: "First Name", type: "string" },
  { value: "last_name", label: "Last Name", type: "string" },
  { value: "email", label: "Email Address", type: "email" },
  { value: "amount", label: "Amount", type: "number" },
  { value: "project_name", label: "Project Name", type: "string" },
  { value: "tier", label: "Tier", type: "string" },
  { value: "user_id", label: "User ID", type: "string" },
  { value: "subscription_id", label: "Subscription ID", type: "string" },
  { value: "is_active", label: "Is Active", type: "boolean" },
  { value: "trial_end_date", label: "Trial End Date", type: "date" },
]

const EVENT_TYPES = [
  { value: "plan_upgraded", label: "Plan Upgraded", description: "User upgrades their plan" },
  { value: "user_signed_up", label: "User Signed Up", description: "New user registration" },
  { value: "project_created", label: "Project Created", description: "User creates a new project" },
  { value: "payment_succeeded", label: "Payment Succeeded", description: "Successful payment" },
  { value: "trial_ended", label: "Trial Ended", description: "Free trial expired" },
  { value: "user_reached_10_projects", label: "10 Projects Milestone", description: "Milestone event" },
  { value: "email_opened", label: "Email Opened", description: "User opened an email" },
]

const SMART_DEFAULTS: Record<string, string> = {
  plan_name: "pro",
  first_name: "Test User",
  last_name: "Tester",
  email: "test@example.com",
  amount: "29.99",
  project_name: "My Project",
  tier: "premium",
  user_id: "user_123",
  subscription_id: "sub_abc456",
  is_active: "true",
  trial_end_date: "",
}

function getFieldDef(key: string) {
  return COMMON_PAYLOAD_FIELDS.find((f) => f.value === key)
}

function fuzzyFindFieldKey(name: string): string {
  const exact = COMMON_PAYLOAD_FIELDS.find((f) => f.value === name)
  if (exact) return exact.value
  const normalized = name.toLowerCase().replace(/[_\s-]+/g, " ").trim()
  const fuzzy = COMMON_PAYLOAD_FIELDS.find((f) => {
    const fn = f.value.toLowerCase().replace(/[_\s-]+/g, " ").trim()
    return fn === normalized || fn.includes(normalized) || normalized.includes(fn)
  })
  return fuzzy?.value || name
}

function getFieldType(key: string): PayloadField["type"] {
  return getFieldDef(key)?.type || "string"
}

function getSmartDefault(key: string): string {
  return SMART_DEFAULTS[key] || ""
}

function renderTemplatePreview(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const val = values[name]
    if (val && val.trim()) return val.trim()
    return `<span class="text-red-500 font-medium">[MISSING: ${name}]</span>`
  })
}

function extractTemplateVars(templates: TemplateInfo[]): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const vars = new Set<string>()
  for (const t of templates) {
    const combined = `${t.subject} ${t.htmlBody}`
    let match
    while ((match = regex.exec(combined)) !== null) {
      vars.add(match[1])
    }
  }
  return Array.from(vars)
}

const STORAGE_KEY = "event_simulator_scenarios"

function loadScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveScenarios(scenarios: SavedScenario[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

export default function EventSimulatorPage() {
  const [eventType, setEventType] = useState("plan_upgraded")
  const [internalUserId, setInternalUserId] = useState<string | null>(null)
  const [payloadFields, setPayloadFields] = useState<PayloadField[]>([
    { key: "plan_name", value: "pro", type: "enum" },
    { key: "email", value: "", type: "email" },
  ])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [scenarioName, setScenarioName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [recentResults, setRecentResults] = useState<any[]>([])
  const [detectedTemplateVars, setDetectedTemplateVars] = useState<string[]>([])
  const [matchingTemplates, setMatchingTemplates] = useState<TemplateInfo[]>([])
  const [showPreview, setShowPreview] = useState(true)
  const [missingVars, setMissingVars] = useState<string[]>([])

  const resultRef = useRef<HTMLDivElement>(null)

  const payloadValues = useMemo(() => {
    const map: Record<string, string> = {}
    for (const f of payloadFields) {
      if (f.key) map[f.key] = f.value
    }
    return map
  }, [payloadFields])

  const unmatchedVars = useMemo(() => {
    return detectedTemplateVars.filter((v) => {
      const field = payloadFields.find((f) => f.key === v)
      return !field || !field.value.trim()
    })
  }, [detectedTemplateVars, payloadFields])

  const emptyDetectedFields = useMemo(() => {
    return payloadFields.filter(
      (f) => detectedTemplateVars.includes(f.key) && !f.value.trim()
    )
  }, [payloadFields, detectedTemplateVars])

  const templateMissingVars = useMemo(() => {
    return matchingTemplates.map((t) => {
      const combined = `${t.subject} ${t.htmlBody}`
      const regex = /\{\{(\w+)\}\}/g
      const tplVars = new Set<string>()
      let match
      while ((match = regex.exec(combined)) !== null) {
        tplVars.add(match[1])
      }
      const missing = Array.from(tplVars).filter((v) => {
        const field = payloadFields.find((f) => f.key === fuzzyFindFieldKey(v))
        return !field || !field.value.trim()
      })
      return { templateId: t.id, templateName: t.name, missing }
    })
  }, [matchingTemplates, payloadFields])

  const customPayloadKeys = useMemo(() => {
    const commonKeys = new Set(COMMON_PAYLOAD_FIELDS.map((f) => f.value))
    return payloadFields.filter((f) => !commonKeys.has(f.key)).map((f) => f.key)
  }, [payloadFields])

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setInternalUserId(session.user.id)
      }
      setPayloadFields((prev) =>
        prev.map((f) =>
          f.key === "email"
            ? { ...f, value: session?.user?.email || "test@example.com", type: "email" }
            : f
        )
      )
    }
    init()
    setScenarios(loadScenarios())
  }, [])

  useEffect(() => {
    setDetectedTemplateVars([])
    setMatchingTemplates([])
    setMissingVars([])
    const detectVariables = async () => {
      if (!eventType) return
      try {
        const [rulesRes, templatesRes] = await Promise.all([
          fetch("/api/rules"),
          fetch("/api/templates"),
        ])
        if (!rulesRes.ok || !templatesRes.ok) return

        const allRules = await rulesRes.json()
        const allTemplates = await templatesRes.json()

        const matchingRules = allRules.filter((r: any) => r.eventType === eventType)
        if (matchingRules.length === 0) return

        const templateIds = new Set(
          matchingRules.map((r: any) => r.template?.id).filter(Boolean)
        )
        const matchingTpls: TemplateInfo[] = allTemplates.filter((t: any) =>
          templateIds.has(t.id)
        )
        if (matchingTpls.length === 0) return

        setMatchingTemplates(matchingTpls)

        const vars = extractTemplateVars(matchingTpls)
        setDetectedTemplateVars(vars)

        setPayloadFields((prev) => {
          const existingKeys = new Set(prev.map((f) => f.key))
          const newFields = [...prev]
          for (const v of vars) {
            if (!existingKeys.has(v)) {
              newFields.push({
                key: v,
                value: getSmartDefault(v),
                type: getFieldType(v),
              })
            }
          }
          return newFields
        })
      } catch {
        // silent
      }
    }
    detectVariables()
  }, [eventType])

  useEffect(() => {
    const vars = detectedTemplateVars.filter((v) => {
      const resolvedKey = fuzzyFindFieldKey(v)
      const field = payloadFields.find((f) => f.key === resolvedKey)
      return !field || !field.value.trim()
    })
    setMissingVars(vars)
  }, [detectedTemplateVars, payloadFields])

  const addField = () => {
    const firstField = COMMON_PAYLOAD_FIELDS[0]
    setPayloadFields([
      ...payloadFields,
      { key: firstField.value, value: getSmartDefault(firstField.value), type: firstField.type },
    ])
  }

  const removeField = (index: number) => {
    setPayloadFields(payloadFields.filter((_, i) => i !== index))
  }

  const updateFieldKey = (index: number, key: string) => {
    setPayloadFields((prev) =>
      prev.map((f, i) =>
        i === index ? { key, value: getSmartDefault(key), type: getFieldType(key) } : f
      )
    )
  }

  const updateFieldValue = (index: number, value: string) => {
    setPayloadFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, value } : f))
    )
  }

  const buildPayload = () => {
    const payload: Record<string, string> = {}
    for (const field of payloadFields) {
      if (field.key) payload[field.key] = field.value
    }
    return payload
  }

  const validate = (): boolean => {
    if (!eventType.trim()) {
      toast.error("Event type is required")
      return false
    }
    if (emptyDetectedFields.length > 0) {
      toast.error(
        `Fill in required template variables: ${emptyDetectedFields.map((f) => f.key).join(", ")}`
      )
      return false
    }
    if (missingVars.length > 0) {
      toast.error(
        `Add missing fields first: ${missingVars.join(", ")}`
      )
      return false
    }
    return true
  }

  const handleSend = async () => {
    if (!validate()) return

    setSending(true)
    setResult(null)

    try {
      const idempotencyKey = `sim_${Date.now()}`
      const payload = buildPayload()

      const renderedPreviews = matchingTemplates.map((t) => ({
        templateName: t.name,
        subject: renderTemplatePreview(t.subject, payload),
        body: renderTemplatePreview(t.htmlBody, payload),
      }))

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          user_id: internalUserId || `test_${Date.now()}`,
          payload,
          idempotency_key: idempotencyKey,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to send event")
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))

      const [evalRes, emailRes] = await Promise.all([
        fetch("/api/logs?type=evaluation"),
        fetch("/api/logs?type=email"),
      ])

      const evalLogs = evalRes.ok ? await evalRes.json() : []
      const emailLogs = emailRes.ok ? await emailRes.json() : []

      const matchedEval =
        evalLogs.find((log: any) => {
          const conditions: any[] = log.details?.conditions || []
          return conditions.length === 0 || conditions.some((c: any) => c.actualValue !== undefined)
        }) || null

      const matchedEmail = emailLogs.find((log: any) => log.ruleId === matchedEval?.ruleId) || null

      const resultData = {
        evalLog: matchedEval,
        emailLog: matchedEmail,
        sentTo: payload.email || "test@example.com",
        eventId: idempotencyKey,
        timestamp: new Date().toISOString(),
        eventType,
        renderedPreviews,
        payload,
      }
      setResult(resultData)
      setRecentResults((prev) => [resultData, ...prev].slice(0, 10))

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed")
    } finally {
      setSending(false)
    }
  }

  const handleSendAgain = () => {
    setResult(null)
  }

  const saveCurrentScenario = () => {
    if (!scenarioName.trim()) {
      toast.error("Enter a scenario name")
      return
    }
    const newScenario: SavedScenario = {
      id: `scenario_${Date.now()}`,
      name: scenarioName,
      eventType,
      payloadFields,
      createdAt: new Date().toISOString(),
    }
    const updated = [...scenarios, newScenario]
    setScenarios(updated)
    saveScenarios(updated)
    setShowSaveDialog(false)
    setScenarioName("")
    toast.success("Scenario saved")
  }

  const loadScenario = (scenario: SavedScenario) => {
    setEventType(scenario.eventType)
    const typed = scenario.payloadFields.map((f) => ({
      ...f,
      type: (f as PayloadField).type || getFieldType(f.key),
    }))
    setPayloadFields(typed)
    toast.success(`Loaded: ${scenario.name}`)
  }

  const deleteScenario = (id: string) => {
    const updated = scenarios.filter((s) => s.id !== id)
    setScenarios(updated)
    saveScenarios(updated)
    toast.success("Scenario deleted")
  }

  const isEnum = (key: string) => getFieldDef(key)?.type === "enum"
  const enumOptions = (key: string): string[] => getFieldDef(key)?.options || []

  const fieldType = (key: string): PayloadField["type"] => {
    const existing = payloadFields.find((f) => f.key === key)
    if (existing) return existing.type
    return getFieldType(key)
  }

  const addMissingField = (name: string) => {
    const resolvedKey = fuzzyFindFieldKey(name)
    setPayloadFields((prev) => {
      if (prev.find((f) => f.key === resolvedKey)) return prev
      return [...prev, { key: resolvedKey, value: "", type: getFieldType(resolvedKey) }]
    })
  }

  const addAllMissingFields = () => {
    setPayloadFields((prev) => {
      const existingKeys = new Set(prev.map((f) => f.key))
      const newFields = [...prev]
      for (const v of missingVars) {
        const resolvedKey = fuzzyFindFieldKey(v)
        if (!existingKeys.has(resolvedKey)) {
          existingKeys.add(resolvedKey)
          newFields.push({ key: resolvedKey, value: "", type: getFieldType(resolvedKey) })
        }
      }
      return newFields
    })
  }

  const canSend = !!eventType.trim() && emptyDetectedFields.length === 0 && missingVars.length === 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Event Simulator</h1>
        <p className="text-sm text-muted-foreground mt-1">Test your rules by simulating real events</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      <div className="flex flex-col">
                        <span>{et.value}</span>
                        <span className="text-xs text-muted-foreground">{et.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {matchingTemplates.length > 0 && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {matchingTemplates.length} rule{matchingTemplates.length > 1 ? "s" : ""} match this event type
                </p>
                {matchingTemplates.map((t) => (
                  <p key={t.id} className="text-xs text-blue-600 dark:text-blue-300 pl-5">
                    Uses template: <span className="font-medium">{t.name}</span>
                  </p>
                ))}
                {detectedTemplateVars.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-300 pl-5">
                    Template variables: {detectedTemplateVars.join(", ")}
                  </p>
                )}
                {missingVars.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 pl-5 pt-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    Missing fields: {missingVars.join(", ")}
                  </div>
                )}
              </div>
            )}

            {matchingTemplates.length === 0 && eventType && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No rules configured for "{eventType}"
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                  Create a rule with this event type to see template variable detection.
                </p>
              </div>
            )}

            {missingVars.length > 0 && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {missingVars.length} required field{missingVars.length > 1 ? "s" : ""} missing from your payload
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                      {missingVars.join(", ")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAllMissingFields}
                  className="w-full border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add All Missing Fields
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Payload</Label>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />Add Field
                </Button>
              </div>
              {payloadFields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No payload fields - empty payload will be sent</p>
              )}
              {payloadFields.map((field, index) => {
                const isDetected = detectedTemplateVars.includes(field.key)
                const isEmptyDetected = isDetected && !field.value.trim()
                const ft = fieldType(field.key)
                const def = getFieldDef(field.key)

                return (
                  <div key={index} className="flex items-start gap-2">
                    <Select value={field.key} onValueChange={(v) => updateFieldKey(index, v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {missingVars.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-medium text-red-500 uppercase tracking-wider">
                              Missing Required
                            </div>
                            {missingVars.map((mv) => {
                              const def = getFieldDef(mv)
                              return (
                                <SelectItem key={`missing-${mv}`} value={mv}>
                                  <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    {def?.label || mv}
                                    <span className="text-[10px] text-muted-foreground">({getFieldType(mv)})</span>
                                  </span>
                                </SelectItem>
                              )
                            })}
                            <div className="border-t my-1" />
                          </>
                        )}
                        {COMMON_PAYLOAD_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            <span className="flex items-center gap-2">
                              {f.label}
                              <span className="text-[10px] text-muted-foreground">({f.type})</span>
                            </span>
                          </SelectItem>
                        ))}
                        {customPayloadKeys.length > 0 && (
                          <>
                            <div className="border-t my-1" />
                            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              Custom
                            </div>
                            {customPayloadKeys.map((ck) => (
                              <SelectItem key={`custom-${ck}`} value={ck}>
                                <span className="flex items-center gap-2">
                                  {ck.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                  <span className="text-[10px] text-muted-foreground">(custom)</span>
                                </span>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    {ft === "boolean" ? (
                      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md border border-input bg-background">
                        <Switch
                          checked={field.value === "true"}
                          onCheckedChange={(checked) => updateFieldValue(index, checked ? "true" : "false")}
                        />
                        <span className="text-xs text-muted-foreground">
                          {field.value === "true" ? "Yes" : "No"}
                        </span>
                      </div>
                    ) : ft === "enum" || isEnum(field.key) ? (
                      <Select value={field.value} onValueChange={(v) => updateFieldValue(index, v)}>
                        <SelectTrigger className={`flex-1 ${isEmptyDetected ? "border-red-500 ring-red-500/30" : ""}`}>
                          <SelectValue placeholder="Select value" />
                        </SelectTrigger>
                        <SelectContent>
                          {(def?.options || enumOptions(field.key)).map((opt: string) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex-1 relative">
                        <Input
                          type={
                            ft === "number" ? "number"
                            : ft === "email" ? "email"
                            : ft === "date" ? "date"
                            : "text"
                          }
                          step={ft === "number" ? "0.01" : undefined}
                          placeholder={def?.type === "email" ? "user@example.com" : `Enter ${field.key}`}
                          value={field.value}
                          onChange={(e) => updateFieldValue(index, e.target.value)}
                          className={`flex-1 ${isEmptyDetected ? "border-red-500 ring-red-500/30" : ""}`}
                        />
                        {isDetected && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 font-medium">
                            auto
                          </span>
                        )}
                      </div>
                    )}

                    <Button type="button" variant="ghost" size="icon" onClick={() => removeField(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSend}
                className="flex-1 gap-2"
                disabled={sending || !canSend}
                title={!canSend && missingVars.length > 0 ? "Fill in all missing template variables before sending" : undefined}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {sending ? "Processing..." : "Send Test Event"}
              </Button>
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Test Scenario</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Input
                      placeholder="Scenario name (e.g. Pro Upgrade Test)"
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveCurrentScenario()
                      }}
                    />
                    <Button onClick={saveCurrentScenario} className="w-full">
                      Save Scenario
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {matchingTemplates.length > 0 && (
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Live Preview
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-7 text-xs"
                >
                  {showPreview ? "Hide" : "Show"}
                </Button>
              </CardHeader>
              {showPreview && (
                <CardContent className="space-y-4 pt-0">
                  {matchingTemplates.map((t, i) => {
                    const renderedSubject = renderTemplatePreview(t.subject, payloadValues)
                    const renderedBody = renderTemplatePreview(t.htmlBody, payloadValues)
                    const tplMissing = templateMissingVars.find((tm) => tm.templateId === t.id)?.missing || []
                    return (
                      <div key={t.id} className={i > 0 ? "border-t pt-4" : ""}>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {t.name}
                        </p>
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              Subject
                            </span>
                            <p
                              className="text-sm bg-muted/50 rounded px-2 py-1 mt-0.5"
                              dangerouslySetInnerHTML={{ __html: renderedSubject }}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              Body
                            </span>
                            <div
                              className="text-sm bg-muted/50 rounded px-2 py-1 mt-0.5 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: renderedBody }}
                            />
                          </div>
                        </div>
                        {tplMissing.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-dashed">
                            {tplMissing.map((mv) => (
                              <Button
                                key={mv}
                                variant="outline"
                                size="sm"
                                onClick={() => addMissingField(mv)}
                                className="h-6 text-[11px] gap-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                              >
                                <Plus className="h-3 w-3" />
                                {mv}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              )}
            </Card>
          )}

          {scenarios.length > 0 && (
            <Card className="card-hover">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Saved Test Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {scenarios.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md border p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.eventType} &middot; {s.payloadFields.length} fields
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadScenario(s)}>
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteScenario(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div ref={resultRef}>
            {result && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {result.error ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {result.error ? "Error" : "Event Sent Successfully"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.error ? (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <p className="text-sm text-destructive font-medium">{result.error}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">Event ID:</span>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{result.eventId}</code>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Rule Evaluation
                        </p>
                        {result.evalLog ? (
                          <div className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={result.evalLog.matched ? "success" : "secondary"}>
                                {result.evalLog.matched ? "Matched" : "No Match"}
                              </Badge>
                              <span className="text-sm font-medium">{result.evalLog.ruleName}</span>
                            </div>
                            {result.evalLog.details?.conditions?.map((c: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-sm pl-1">
                                {c.passed ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {c.field} {c.operator} {String(c.expectedValue)}
                                </span>
                                <span className={c.passed ? "text-xs text-green-600" : "text-xs text-red-600"}>
                                  {c.passed ? "Matched" : "No match"}
                                </span>
                              </div>
                            ))}
                            {(!result.evalLog.details?.conditions || result.evalLog.details?.conditions?.length === 0) && (
                              <p className="text-xs text-muted-foreground">
                                No conditions - rule matches all events of this type
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No matching rules found for this event type
                          </p>
                        )}
                      </div>

                      {result.emailLog && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>
                            Email {result.emailLog.status === "sent" ? "sent" : "failed"} to{" "}
                            <span className="font-medium">{result.sentTo}</span>
                          </span>
                        </div>
                      )}

                      {!result.emailLog && result.evalLog?.matched && (
                        <p className="text-xs text-muted-foreground italic">
                          No email log found. Email may not have been sent.
                        </p>
                      )}

                      {result.renderedPreviews && result.renderedPreviews.length > 0 && (
                        <div className="space-y-2 border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            Rendered Email Preview
                          </p>
                          {result.renderedPreviews.map((rp: any, i: number) => (
                            <div key={i} className="rounded-lg border p-3 space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">{rp.templateName}</p>
                              <div>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">Subject</span>
                                <p className="text-sm bg-muted/50 rounded px-2 py-1 mt-0.5">{rp.subject}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">Body</span>
                                <div
                                  className="text-sm bg-muted/50 rounded px-2 py-1 mt-0.5 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: rp.body }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button onClick={handleSendAgain} variant="outline" className="flex-1">
                          Test Another Event
                        </Button>
                        <Button variant="outline" className="flex-1 gap-1" onClick={() => window.open("/logs", "_blank")}>
                          <History className="h-4 w-4" />
                          View Full Logs
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {recentResults.length > 1 && (
            <Card className="card-hover">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {recentResults.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.evalLog?.matched ? "success" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {r.evalLog?.matched ? "Match" : "No match"}
                      </Badge>
                      <span className="font-mono text-xs">{r.eventType}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
