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
import { Switch } from "@/components/ui/switch"
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
  Download,
  Upload,
  FileText,
  User,
  Edit3,
  AlertTriangle,
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
  testEmail: string
  emailTo: string
  createdAt: string
}

interface Template {
  id: string
  name: string
  placeholders: string[]
  subject: string
}

interface Rule {
  id: string
  name: string
  eventType: string
  templateId: string
}

interface LoadedProfile {
  userId: string
  email: string
  planId: string
  planName: string
  subscriptionStatus: string
  projectCount: number
  unsubscribed: boolean
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
  const [testEmail, setTestEmail] = useState("")
  const [profile, setProfile] = useState<LoadedProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileNotFound, setProfileNotFound] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editPlanId, setEditPlanId] = useState("free")
  const [editProjectCount, setEditProjectCount] = useState(0)
  const [editUnsubscribed, setEditUnsubscribed] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [useProfileEmail, setUseProfileEmail] = useState(true)
  const [payloadFields, setPayloadFields] = useState<PayloadField[]>([
    { key: "plan_name", value: "pro" },
    { key: "email", value: "" },
  ])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [scenarioName, setScenarioName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [recentResults, setRecentResults] = useState<any[]>([])
  const [showCustomEvent, setShowCustomEvent] = useState(false)
  const [internalUserId, setInternalUserId] = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setTestEmail(session.user.email)
        loadProfileByEmail(session.user.email)
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
    fetchTemplates()
    fetchRules()
    setScenarios(loadScenarios())
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates")
      if (res.ok) setTemplates(await res.json())
    } catch { /* ignore */ }
  }

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules")
      if (res.ok) setRules(await res.json())
    } catch { /* ignore */ }
  }

  const loadProfileByEmail = async (email: string) => {
    if (!email.trim() || !email.includes("@")) return
    setProfileLoading(true)
    setProfileNotFound(false)
    setProfile(null)
    setInternalUserId(null)
    try {
      const res = await fetch("/api/user/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.profile) {
          setProfile(data.profile)
          setInternalUserId(data.profile.userId)
          setProfileNotFound(false)
          setEmailTo(data.profile.email)
          toast.success("Profile loaded")
        } else {
          setProfile(null)
          setProfileNotFound(true)
          setInternalUserId(null)
        }
      }
    } catch {
      toast.error("Failed to look up user")
    } finally {
      setProfileLoading(false)
    }
  }

  const handleLoadProfile = () => {
    if (!testEmail.trim() || !testEmail.includes("@")) {
      toast.error("Enter a valid email address")
      return
    }
    loadProfileByEmail(testEmail)
  }

  const handleCreateTestUser = async () => {
    if (!testEmail.trim()) return
    setCreatingUser(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch("/api/user/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id || `test_${Date.now()}`,
          email: testEmail.trim(),
        }),
      })
      if (res.ok) {
        toast.success("Test user created")
        await loadProfileByEmail(testEmail)
      } else {
        toast.error("Failed to create test user")
      }
    } catch {
      toast.error("Failed to create test user")
    } finally {
      setCreatingUser(false)
    }
  }

  const handleSaveEditedProfile = async () => {
    if (!internalUserId) return
    try {
      const { prisma } = await import("@/lib/prisma")
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              planId: editPlanId,
              projectCount: editProjectCount,
              unsubscribed: editUnsubscribed,
            }
          : prev
      )
      setEditProfileOpen(false)
      toast.success("Profile updated (UI only)")
    } catch {
      toast.error("Failed to update profile")
    }
  }

  const openEditProfile = () => {
    if (!profile) return
    setEditPlanId(profile.planId)
    setEditProjectCount(profile.projectCount)
    setEditUnsubscribed(profile.unsubscribed)
    setEditProfileOpen(true)
  }

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

  const loadFromTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error("Select a template first")
      return
    }
    try {
      const res = await fetch(`/api/templates/${selectedTemplateId}`)
      if (res.ok) {
        const template = await res.json()
        const placeholders: string[] = template.placeholders || []
        if (placeholders.length === 0) {
          toast.error("This template has no placeholders")
          return
        }
        setPayloadFields(
          placeholders.map((p: string) => ({ key: p, value: getSmartDefault(p) }))
        )
        toast.success(`Loaded ${placeholders.length} fields from template`)
      }
    } catch {
      toast.error("Failed to load template")
    }
  }

  const loadFromRule = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId)
    if (!rule) return
    setEventType(rule.eventType)
    setSelectedTemplateId(rule.templateId)
    if (rule.templateId) setTimeout(() => loadFromTemplate(), 100)
    toast.success("Rule config loaded")
  }

  const handleSend = async () => {
    if (!eventType.trim()) {
      toast.error("Event type is required")
      return
    }
    if (!internalUserId) {
      toast.error("Load a user profile first")
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
          user_id: internalUserId,
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

      const targetEmail = useProfileEmail ? emailTo : emailTo
      const resultData = {
        evalLog: matchedEval,
        emailLog: matchedEmail,
        sentTo: targetEmail || payload.email || profile?.email || testEmail,
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
      testEmail,
      emailTo,
      createdAt: new Date().toISOString(),
    }
    const updated = [...scenarios, newScenario]
    setScenarios(updated)
    saveScenarios(updated)
    setShowSaveDialog(false)
    setScenarioName("")
    toast.success("Scenario saved")
  }

  const loadScenario = async (scenario: SavedScenario) => {
    setEventType(scenario.eventType)
    setTestEmail(scenario.testEmail)
    setEmailTo(scenario.emailTo || "")
    setPayloadFields(scenario.payloadFields)
    setUseProfileEmail(!!scenario.emailTo)
    if (scenario.testEmail) {
      await loadProfileByEmail(scenario.testEmail)
    }
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

  const canSend = !!internalUserId && !!eventType.trim()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Event Simulator</h1>
        <p className="text-sm text-muted-foreground mt-1">Test your rules by simulating real events</p>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            Quick Load
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-xs">Load from template</Label>
            <div className="flex gap-2">
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
              <Button type="button" variant="outline" size="sm" onClick={loadFromTemplate}>
                <FileText className="h-4 w-4 mr-1" />
                Load
              </Button>
            </div>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-xs">Load from rule</Label>
            <Select onValueChange={loadFromRule}>
              <SelectTrigger>
                <SelectValue placeholder="Select rule" />
              </SelectTrigger>
              <SelectContent>
                {rules.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Test User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="flex gap-2">
                <Input
                  ref={emailInputRef}
                  type="email"
                  placeholder="Enter email address (e.g., test@example.com)"
                  value={testEmail}
                  onChange={(e) => {
                    setTestEmail(e.target.value)
                    setProfile(null)
                    setProfileNotFound(false)
                    setInternalUserId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLoadProfile()
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLoadProfile}
                  disabled={profileLoading || !testEmail.includes("@")}
                >
                  {profileLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Load Profile"
                  )}
                </Button>
              </div>
            </div>

            {profileLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Looking up user...</span>
              </div>
            )}

            {profile && !profileLoading && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Profile Loaded
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto"
                    onClick={openEditProfile}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{profile.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <Badge variant="outline" className="font-medium">
                      {profile.planName}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projects Created</span>
                    <span className="font-medium">{profile.projectCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email Unsubscribed</span>
                    <span className="font-medium">{profile.unsubscribed ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            )}

            {profileNotFound && !profileLoading && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    User not found
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  No profile exists for <span className="font-medium">{testEmail}</span>
                </p>
                <div className="bg-background/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                  <p>Default values will be used:</p>
                  <p>&bull; Plan: Free</p>
                  <p>&bull; Projects: 0</p>
                  <p>&bull; Unsubscribed: No</p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleCreateTestUser}
                  disabled={creatingUser}
                  className="w-full"
                >
                  {creatingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  Create Test User with Default Values
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              {showCustomEvent ? (
                <div className="space-y-2">
                  <Input
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    placeholder="custom_event_name"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomEvent(false)
                      setEventType(EVENT_TYPES[0].value)
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Choose from predefined events
                  </button>
                </div>
              ) : (
                <Select
                  value={eventType}
                  onValueChange={(v) => {
                    if (v === "__custom__") {
                      setShowCustomEvent(true)
                      setEventType("")
                    } else {
                      setEventType(v)
                    }
                  }}
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
                    <SelectItem value="__custom__">Custom event...</SelectItem>
                  </SelectContent>
                </Select>
              )}
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

            <div className="pt-2 border-t space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                Send Test Email To
              </Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch
                    checked={useProfileEmail}
                    onCheckedChange={setUseProfileEmail}
                  />
                  Use user&apos;s email
                </label>
                {profile && (
                  <span className="text-xs text-muted-foreground">({profile.email})</span>
                )}
              </div>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                disabled={useProfileEmail}
              />
              <p className="text-xs text-muted-foreground">
                Email must be verified in your email provider dashboard
              </p>
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
                        {s.eventType} &middot; {s.payloadFields.length} fields &middot; {s.testEmail}
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

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Test User Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={editPlanId} onValueChange={setEditPlanId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projects Created</Label>
              <Input
                type="number"
                min={0}
                value={editProjectCount}
                onChange={(e) => setEditProjectCount(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-unsubscribed"
                checked={editUnsubscribed}
                onChange={(e) => setEditUnsubscribed(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="edit-unsubscribed">Unsubscribed</Label>
            </div>
            <Button onClick={handleSaveEditedProfile} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
