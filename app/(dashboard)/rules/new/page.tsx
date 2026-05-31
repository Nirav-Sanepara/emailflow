"use client"
import { useState, useEffect } from "react"
import { RuleForm } from "@/components/rules/RuleForm"
import { Loader2 } from "lucide-react"

export default function NewRulePage() {
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates")
        if (res.ok) {
          const data = await res.json()
          setTemplates(data.map((t: any) => ({ id: t.id, name: t.name })))
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Create Rule</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new automation rule</p>
      </div>
      <RuleForm templates={templates} />
    </div>
  )
}
