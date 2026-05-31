"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Sparkles, Loader2, MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"

interface AIAssistantProps {
  subject: string
  body: string
  onApply: (subject: string, body: string) => void
}

export function AIAssistant({ subject, body, onApply }: AIAssistantProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ subject?: string | null; body?: string | null; variants?: string[] | null } | null>(null)
  const [prompt, setPrompt] = useState("")

  const hasContent = subject.length > 0 || body.length > 0

  const handleAction = async (action: string) => {
    setLoading(action)
    setResult(null)
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, subject, emailBody: body }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "AI request failed")
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI processing failed. Check your API key.")
    } finally {
      setLoading(null)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading("generate")
    setResult(null)
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", prompt: prompt.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "AI request failed")
      }

      const data = await res.json()
      if (data.subject && data.body) {
        setResult(data)
      } else {
        throw new Error("AI returned incomplete content")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed. Check your API key.")
    } finally {
      setLoading(null)
    }
  }

  const handleApply = () => {
    if (result?.subject && result?.body) {
      onApply(result.subject, result.body)
    }
    setOpen(false)
  }

  const handleApplyVariant = (variant: string) => {
    onApply(variant, body)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Improve
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>AI Email Assistant</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Textarea
              placeholder='Describe the email you want to build, e.g. "A welcome email for new Pro users highlighting AI features"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading !== null || !prompt.trim()}
              type="button"
            >
              {loading === "generate" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageSquarePlus className="h-4 w-4 mr-2" />
              )}
              Generate from Prompt
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("subject_variants")}
              disabled={loading !== null || !hasContent}
            >
              {loading === "subject_variants" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Subject variants
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("professional")}
              disabled={loading !== null || !hasContent}
            >
              {loading === "professional" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Professional tone
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("friendly")}
              disabled={loading !== null || !hasContent}
            >
              {loading === "friendly" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Friendly tone
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("grammar")}
              disabled={loading !== null || !hasContent}
            >
              {loading === "grammar" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Fix grammar
            </Button>
          </div>

          {result?.variants && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Subject Variants:</p>
              {result.variants.map((v, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded border">
                  <span className="text-sm">{v}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleApplyVariant(v)}>
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          )}

          {result?.subject && result?.body && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Result:</p>
              <p className="text-sm"><strong>Subject:</strong> {result.subject}</p>
              <div className="text-sm border rounded p-3 bg-white dark:bg-gray-950 max-h-60 overflow-y-auto prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: result.body }} />
              </div>
              <Button onClick={handleApply}>
                Apply to Form
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
