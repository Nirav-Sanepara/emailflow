"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { RuleForm } from "@/components/rules/RuleForm"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function EditRulePage() {
  const params = useParams()
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [rule, setRule] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, ruleRes] = await Promise.all([
          fetch("/api/templates"),
          fetch(`/api/rules/${params.id}`),
        ])

        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setTemplates(data.map((t: any) => ({ id: t.id, name: t.name })))
        }
        if (ruleRes.ok) {
          const data = await ruleRes.json()
          setRule({
            id: data.id,
            name: data.name,
            eventType: data.eventType,
            templateId: data.templateId,
            active: data.active,
            conditions: data.conditions.map((c: any) => ({
              field: c.field,
              operator: c.operator,
              value: String(c.value),
            })),
          })
        }
      } catch {
        toast.error("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!rule) {
    return <div className="text-center text-muted-foreground py-8">Rule not found</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Edit Rule</h1>
        <p className="text-sm text-muted-foreground mt-1">{rule.name}</p>
      </div>
      <RuleForm templates={templates} initialData={rule} isEditing />
    </div>
  )
}
