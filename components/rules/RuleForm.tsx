"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConditionBuilder, type Condition } from "@/components/rules/ConditionBuilder"
import { toast } from "sonner"

const EVENT_TYPES = [
  { value: "plan_upgraded", label: "Plan Upgraded" },
  { value: "user_signed_up", label: "User Signed Up" },
  { value: "payment_succeeded", label: "Payment Succeeded" },
  { value: "project_created", label: "Project Created" },
  { value: "email_opened", label: "Email Opened" },
  { value: "user_reached_10_projects", label: "User Reached 10 Projects" },
  { value: "trial_ended", label: "Trial Ended" },
]

const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value)

interface RuleFormProps {
  templates: { id: string; name: string }[]
  initialData?: {
    id: string
    name: string
    eventType: string
    templateId: string
    active: boolean
    conditions: Condition[]
  }
  isEditing?: boolean
}

export function RuleForm({ templates, initialData, isEditing }: RuleFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || "")
  const [eventType, setEventType] = useState(initialData?.eventType || "")
  const [customEventType, setCustomEventType] = useState(
    initialData?.eventType && !EVENT_TYPE_VALUES.includes(initialData.eventType) ? initialData.eventType : ""
  )
  const [templateId, setTemplateId] = useState(initialData?.templateId || "")
  const [active, setActive] = useState(initialData?.active ?? true)
  const [conditions, setConditions] = useState<Condition[]>(
    initialData?.conditions || []
  )
  const [saving, setSaving] = useState(false)

  const isCustomEvent = customEventType !== "" || (initialData?.eventType ? !EVENT_TYPE_VALUES.includes(initialData.eventType) : false)

  const handleEventTypeSelect = (value: string) => {
    if (value === "__custom__") {
      setCustomEventType("")
      setEventType("")
    } else {
      setCustomEventType("")
      setEventType(value)
    }
  }

  const handleCustomEventChange = (value: string) => {
    setCustomEventType(value)
    setEventType(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !eventType || !templateId) {
      toast.error("Please fill in all required fields")
      return
    }

    setSaving(true)

    try {
      const url = isEditing ? `/api/rules/${initialData!.id}` : "/api/rules"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, eventType, templateId, active, conditions }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save rule")
      }

      toast.success(isEditing ? "Rule updated" : "Rule created")
      router.push("/rules")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rule")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Rule" : "Create Rule"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro Upgrade" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select
              value={isCustomEvent ? "__custom__" : (EVENT_TYPE_VALUES.includes(eventType) ? eventType : "")}
              onValueChange={handleEventTypeSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    {et.label}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom event...</SelectItem>
              </SelectContent>
            </Select>
            {isCustomEvent && (
              <div className="mt-2">
                <Input
                  placeholder="Enter custom event type"
                  value={customEventType}
                  onChange={(e) => handleCustomEventChange(e.target.value)}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">The event type that triggers this rule</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active">Active</Label>
          </div>

          <ConditionBuilder conditions={conditions} onChange={setConditions} />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Rule" : "Create Rule"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
