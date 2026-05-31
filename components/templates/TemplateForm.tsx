"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { AdvancedTemplateEditor } from "./AdvancedTemplateEditor"
import { AIAssistant } from "./AIAssistant"
import type { VariableDefinition } from "@/lib/templates/service"

interface TemplateFormProps {
  initialData?: {
    id: string
    name: string
    subject: string
    htmlBody: string
    placeholders: string[]
    variableDefinitions?: Record<string, VariableDefinition>
  }
  isEditing?: boolean
}

export function TemplateForm({ initialData, isEditing }: TemplateFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || "")
  const [saving, setSaving] = useState(false)
  const [editKey, setEditKey] = useState(0)
  const [currentSubject, setCurrentSubject] = useState(initialData?.subject || "")
  const [currentBody, setCurrentBody] = useState(initialData?.htmlBody || "")

  const handleAIApply = useCallback((newSubject: string, newBody: string) => {
    setCurrentSubject(newSubject)
    setCurrentBody(newBody)
    setEditKey((k) => k + 1)
    toast.success("AI changes applied")
  }, [])

  const handleSave = useCallback(async (data: {
    subject: string
    body: string
    variables: Record<string, VariableDefinition>
  }) => {
    if (!name) {
      toast.error("Please enter a template name")
      return
    }

    setSaving(true)

    try {
      const url = isEditing ? `/api/templates/${initialData!.id}` : "/api/templates"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject: data.subject,
          htmlBody: data.body,
          placeholders: Object.keys(data.variables),
          variableDefinitions: data.variables,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save template")
      }

      toast.success(isEditing ? "Template updated" : "Template created")
      router.push("/templates")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setSaving(false)
    }
  }, [name, initialData, isEditing, router])

  return (
    <div className="space-y-8">
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Template" : "Create Template"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro Welcome" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <AIAssistant
          subject={currentSubject}
          body={currentBody}
          onApply={handleAIApply}
        />
      </div>

      <AdvancedTemplateEditor
        key={editKey}
        initialSubject={currentSubject}
        initialBody={currentBody}
        initialVariables={initialData?.variableDefinitions || {}}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  )
}
