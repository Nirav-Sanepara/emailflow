"use client"
import { useState } from "react"
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
import { renderTemplate } from "@/lib/email/renderer"
import { Eye } from "lucide-react"

interface TemplatePreviewProps {
  subject: string
  htmlBody: string
  placeholders: string[]
}

export function TemplatePreview({ subject, htmlBody, placeholders }: TemplatePreviewProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [open, setOpen] = useState(false)

  const handlePreview = () => {
    const result = renderTemplate(subject, htmlBody, values)
    setPreview(result)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {placeholders.length > 0 ? (
            <div className="space-y-3">
              <Label>Placeholder Values</Label>
              {placeholders.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-32">{p}</span>
                  <Input
                    value={values[p] || ""}
                    onChange={(e) => setValues({ ...values, [p]: e.target.value })}
                    placeholder={`Enter ${p}`}
                  />
                </div>
              ))}
              <Button onClick={handlePreview} type="button">Render Preview</Button>
            </div>
          ) : (
            <Button onClick={handlePreview} type="button">Render Preview</Button>
          )}

          {preview && (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <Label>Subject:</Label>
                <p className="text-sm font-medium">{preview.subject}</p>
              </div>
              <div>
                <Label>Body:</Label>
                <div
                  className="border rounded p-3 bg-muted/30 text-sm"
                  dangerouslySetInnerHTML={{ __html: preview.html }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
