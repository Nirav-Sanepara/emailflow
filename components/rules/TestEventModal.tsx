"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Zap, ExternalLink, CheckCircle2, XCircle } from "lucide-react"

interface Condition {
  field: string
  operator: string
  value: string
}

interface TestEventModalProps {
  ruleId: string
  ruleName: string
  eventType: string
  templateId: string
  conditions: Condition[]
}

const SMART_DEFAULTS: Record<string, string> = {
  first_name: "Test User",
  last_name: "Tester",
  email: "test@example.com",
  plan_name: "pro",
  plan: "pro",
  planId: "pro",
  "plan.name": "Pro",
  "plan.features.max_projects": "50",
  "plan.features.storage_gb": "50",
  "plan.features.supports_ai": "true",
  name: "Test",
  amount: "29.99",
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

function extractPlaceholders(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const placeholders = new Set<string>()
  let match
  while ((match = regex.exec(text)) !== null) {
    placeholders.add(match[1])
  }
  return Array.from(placeholders)
}

export function TestEventModal({ ruleId, ruleName, eventType, templateId, conditions }: TestEventModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [templateBody, setTemplateBody] = useState("")
  const [templateSubject, setTemplateSubject] = useState("")
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState("")
  const [userEmail, setUserEmail] = useState("")

  const payloadFields = extractPayloadFields(conditions)
  const userFields = extractUserFields(conditions)
  const allFormFields = Array.from(new Set([...placeholders, ...payloadFields, ...userFields]))

  useEffect(() => {
    if (!open) return
    setResult(null)
    setSending(false)

    const initUser = async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id || `test_user_${Date.now()}`
      const email = session?.user?.email || "test@example.com"
      setUserId(uid)
      setUserEmail(email)
    }
    initUser()

    const fetchTemplate = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/templates/${templateId}`)
        if (res.ok) {
          const data = await res.json()
          const body = data.htmlBody || ""
          const subject = data.subject || ""
          setTemplateBody(body)
          setTemplateSubject(subject)
          const extracted = data.placeholders?.length
            ? data.placeholders
            : extractPlaceholders(subject + " " + body)
          setPlaceholders(extracted)

          const defaults: Record<string, string> = {}
          for (const field of extracted) {
            defaults[field] = field === "email" ? userEmail : SMART_DEFAULTS[field] || "test_value"
          }
          for (const field of payloadFields) {
            if (!defaults[field]) {
              defaults[field] = field === "email" ? userEmail : SMART_DEFAULTS[field] || "test_value"
            }
          }
          for (const field of userFields) {
            if (!defaults[field]) {
              defaults[field] = field === "email" ? userEmail : SMART_DEFAULTS[field] || "test_value"
            }
          }
          setFormValues(defaults)
        }
      } catch {
        toast.error("Failed to load template data")
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [open, templateId, conditions])

  const updateFormValue = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayload = () => {
    const payload: Record<string, string> = {}
    for (const [key, value] of Object.entries(formValues)) {
      if (placeholders.includes(key) || payloadFields.includes(key)) {
        payload[key] = value
      }
    }
    return payload
  }

  const handleSend = async () => {
    setSending(true)
    setResult(null)

    try {
      const idempotencyKey = `test_${ruleId}_${Date.now()}`
      const payload = buildPayload()

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          user_id: userId,
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
        fetch(`/api/logs?type=evaluation&ruleId=${ruleId}`),
        fetch(`/api/logs?type=email&ruleId=${ruleId}`),
      ])

      const evalLogs = evalRes.ok ? await evalRes.json() : []
      const emailLogs = emailRes.ok ? await emailRes.json() : []

      const latestEval = evalLogs[0] || null
      const latestEmail = emailLogs[0] || null

      setResult({
        evalLog: latestEval,
        emailLog: latestEmail,
        sentTo: payload.email || "test@example.com",
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed")
      setResult({ error: err instanceof Error ? err.message : "Test failed" })
    } finally {
      setSending(false)
    }
  }

  const handleSendAgain = () => {
    setResult(null)
    setUserId(userId || `test_user_${Date.now()}`)
  }

  const operatorLabel = (op: string) => {
    const map: Record<string, string> = { eq: "=", neq: "!=", gt: ">", lt: "<", gte: ">=", lte: "<=", contains: "contains" }
    return map[op] || op
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : result ? (
          result.error ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <XCircle className="h-5 w-5" />
                  Error
                </div>
                <p className="text-sm mt-1">{result.error}</p>
              </div>
              <Button onClick={handleSendAgain} variant="outline" className="w-full">
                Send Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-950 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  Event received
                </div>

                {result.evalLog && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Rule Evaluation: {result.evalLog.ruleName}
                    </p>
                    {result.evalLog.details?.conditions?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {c.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span>
                          {c.field} {operatorLabel(c.operator)} {String(c.expectedValue)}
                          {" → "}
                          <span className={c.passed ? "text-green-600" : "text-red-600"}>
                            {c.passed ? "Matched" : "No match"}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}(actual: {String(c.actualValue ?? "null")})
                          </span>
                        </span>
                      </div>
                    ))}
                    {(!result.evalLog.details?.conditions || result.evalLog.details?.conditions?.length === 0) && (
                      <p className="text-sm text-muted-foreground">No conditions - rule matches all events of this type</p>
                    )}
                  </div>
                )}

                {result.emailLog && (
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Email {result.emailLog.status === "sent" ? "sent" : "failed"} to {result.sentTo}
                  </div>
                )}

                {!result.emailLog && result.evalLog?.matched !== false && (
                  <p className="text-sm text-muted-foreground">No email logs found for this test event.</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSendAgain} variant="outline" className="flex-1">
                  Send Again
                </Button>
                <Button variant="outline" className="flex-1 gap-1" onClick={() => window.open("/logs", "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                  View Full Logs
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
              <Label>User ID</Label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="test_user_xxx" />
            </div>

            {allFormFields.length > 0 && (
              <div className="space-y-3">
                <Label>Payload Fields</Label>
                {allFormFields.map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field}</Label>
                    <Input
                      value={formValues[field] || ""}
                      onChange={(e) => updateFormValue(field, e.target.value)}
                      placeholder={SMART_DEFAULTS[field] || "Enter value"}
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Emails will be sent to the email in the payload (must match your Resend verified email).
            </p>
            <Button onClick={handleSend} className="w-full gap-2" disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {sending ? "Processing..." : "Send Test Event"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
