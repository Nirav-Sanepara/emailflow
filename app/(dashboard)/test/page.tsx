"use client"
import { useState, useEffect, useRef } from "react"
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
} from "lucide-react"

interface PayloadField {
  key: string
  value: string
}

interface SavedScenario {
  id: string
  name: string
  eventType: string
  payloadFields: PayloadField[]
  createdAt: string
}

const COMMON_PAYLOAD_FIELDS = [
  { value: "plan_name", label: "Plan Name", type: "enum", options: ["free", "pro", "enterprise"] },
  { value: "first_name", label: "First Name", type: "string" },
  { value: "last_name", label: "Last Name", type: "string" },
  { value: "email", label: "Email Address", type: "email" },
  { value: "amount", label: "Amount", type: "number" },
  { value: "project_name", label: "Project Name", type: "string" },
  { value: "tier", label: "Tier", type: "string" },
  { value: "user_id", label: "User ID", type: "string" },
  { value: "subscription_id", label: "Subscription ID", type: "string" },
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
}

function getFieldDef(key: string) {
  return COMMON_PAYLOAD_FIELDS.find((f) => f.value === key)
}

function getSmartDefault(key: string): string {
  return SMART_DEFAULTS[key] || ""
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
    { key: "plan_name", value: "pro" },
    { key: "email", value: "" },
  ])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [scenarioName, setScenarioName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [recentResults, setRecentResults] = useState<any[]>([])
  
  const resultRef = useRef<HTMLDivElement>(null)

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
            ? { ...f, value: session?.user?.email || "test@example.com" }
            : f
        )
      )
    }
    init()
    setScenarios(loadScenarios())
  }, [])

  const addField = () => {
    const firstField = COMMON_PAYLOAD_FIELDS[0]
    setPayloadFields([...payloadFields, { key: firstField.value, value: getSmartDefault(firstField.value) }])
  }

  const removeField = (index: number) => {
    setPayloadFields(payloadFields.filter((_, i) => i !== index))
  }

  const updateFieldKey = (index: number, key: string) => {
    setPayloadFields((prev) =>
      prev.map((f, i) => (i === index ? { key, value: getSmartDefault(key) } : f))
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

  const handleSend = async () => {
    if (!eventType.trim()) {
      toast.error("Event type is required")
      return
    }

    setSending(true)
    setResult(null)

    try {
      const idempotencyKey = `sim_${Date.now()}`
      const payload = buildPayload()

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
    setPayloadFields(scenario.payloadFields)
    toast.success(`Loaded: ${scenario.name}`)
  }

  const deleteScenario = (id: string) => {
    const updated = scenarios.filter((s) => s.id !== id)
    setScenarios(updated)
    saveScenarios(updated)
    toast.success("Scenario deleted")
  }

  const isEnum = (key: string) => getFieldDef(key)?.type === "enum"
  const isNumber = (key: string) => getFieldDef(key)?.type === "number"
  const enumOptions = (key: string): string[] => getFieldDef(key)?.options || []

  const canSend = !!eventType.trim()

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
              <Select
                value={eventType}
                onValueChange={setEventType}
              >
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
              {payloadFields.map((field, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Select value={field.key} onValueChange={(v) => updateFieldKey(index, v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_PAYLOAD_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isEnum(field.key) ? (
                    <Select value={field.value} onValueChange={(v) => updateFieldValue(index, v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {enumOptions(field.key).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={isNumber(field.key) ? "number" : "text"}
                      step={isNumber(field.key) ? "0.01" : undefined}
                      placeholder={getFieldDef(field.key)?.type === "email" ? "user@example.com" : "Enter value"}
                      value={field.value}
                      onChange={(e) => updateFieldValue(index, e.target.value)}
                      className="flex-1"
                    />
                  )}

                  <Button type="button" variant="ghost" size="icon" onClick={() => removeField(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSend}
                className="flex-1 gap-2"
                disabled={sending || !canSend}
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
          {scenarios.length > 0 && (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Saved Test Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
