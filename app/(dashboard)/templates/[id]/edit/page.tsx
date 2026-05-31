"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdvancedTemplateEditor } from "@/components/templates/AdvancedTemplateEditor"
import { AIAssistant } from "@/components/templates/AIAssistant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { extractPlaceholders } from "@/lib/templates/service"
import type { VariableDefinition } from "@/lib/templates/service"

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [editKey, setEditKey] = useState(0)
  const [currentSubject, setCurrentSubject] = useState("")
  const [currentBody, setCurrentBody] = useState("")
  const [currentVariables, setCurrentVariables] = useState<Record<string, VariableDefinition>>({})
  const [testEmail, setTestEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [editorSaving, setEditorSaving] = useState(false)

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setName(data.name)
          setCurrentSubject(data.subject)
          setCurrentBody(data.htmlBody)
          setCurrentVariables(data.variableDefinitions || {})
        }
      } catch {
        toast.error("Failed to load template")
      } finally {
        setLoading(false)
      }
    }
    fetchTemplate()
  }, [params.id])

  const handleEditorSave = useCallback(async (data: {
    subject: string
    body: string
    variables: Record<string, VariableDefinition>
  }) => {
    setEditorSaving(true)
    const extracted = extractPlaceholders(data.subject + " " + data.body)
    try {
      const res = await fetch(`/api/templates/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject: data.subject,
          htmlBody: data.body,
          placeholders: extracted,
          variableDefinitions: data.variables,
        }),
      })
      if (res.ok) {
        toast.success("Template updated")
        router.push("/templates")
        router.refresh()
      } else {
        throw new Error("Failed to save")
      }
    } catch {
      toast.error("Failed to update template")
    } finally {
      setEditorSaving(false)
    }
  }, [params.id, name])

  const handleAIApply = (newSubject: string, newBody: string) => {
    setCurrentSubject(newSubject)
    setCurrentBody(newBody)
    setEditKey((k) => k + 1)
    toast.success("AI changes applied")
  }

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Enter an email address")
      return
    }
    setSending(true)
    try {
      const allPlaceholders = extractPlaceholders(currentSubject + " " + currentBody)
      const sampleValues: Record<string, string> = {}
      allPlaceholders.forEach((p) => { sampleValues[p] = `test_${p}` })

      const res = await fetch("/api/templates/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: currentSubject,
          htmlBody: currentBody,
          placeholderValues: sampleValues,
        }),
      })

      if (res.ok) {
        toast.success("Test email sent!")
      } else {
        const err = await res.json()
        throw new Error(err.error || "Failed to send")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test email")
    } finally {
      setSending(false)
    }
  }

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
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Edit Template</h1>
        <p className="text-sm text-muted-foreground mt-1">{name}</p>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
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
        initialVariables={currentVariables}
        saving={editorSaving}
        onSave={handleEditorSave}
      />

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Send Test Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button onClick={handleSendTest} disabled={sending} variant="secondary">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A test email will be sent with sample placeholder values
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
