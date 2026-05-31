"use client"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Eye, Play, ChevronDown, ChevronRight } from "lucide-react"
import Handlebars from "handlebars"
import type { VariableDefinition } from "@/lib/templates/service"

interface LivePreviewProps {
  subject: string
  htmlBody: string
  variables: Record<string, VariableDefinition>
}

const COLLAPSE_THRESHOLD = 2

export function LivePreview({ subject, htmlBody, variables }: LivePreviewProps) {
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState(false)

  const variableNames = useMemo(() => {
    const pattern = /\{\{(\w+)\}\}/g
    const names = new Set<string>()
    let match
    while ((match = pattern.exec(subject)) !== null) {
      names.add(match[1])
    }
    while ((match = pattern.exec(htmlBody)) !== null) {
      names.add(match[1])
    }
    return Array.from(names)
  }, [subject, htmlBody])

  const showCollapse = variableNames.length > COLLAPSE_THRESHOLD
  const visibleNames = showCollapse && !expanded ? variableNames.slice(0, COLLAPSE_THRESHOLD) : variableNames

  const rendered = useMemo(() => {
    const safeData = new Proxy(testValues, {
      get(target, prop) {
        if (prop in target) return target[prop as string]
        const def = variables[prop as string]
        if (def?.fallback) return def.fallback
        if (def?.required) return `[MISSING: ${String(prop)}]`
        return ""
      },
    })

    try {
      const hb = Handlebars.create();

      const compileOptions = { noEscape: true } as any
      const runtimeOptions = { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true } as any
      const subjectTemplate = hb.compile(subject, compileOptions)
      const renderedSubject = subjectTemplate(safeData, runtimeOptions)

      const bodyTemplate = hb.compile(htmlBody, compileOptions)
      const renderedBody = bodyTemplate(safeData, runtimeOptions)

      return { subject: renderedSubject, body: renderedBody }
    } catch {
      return { subject, body: htmlBody }
    }
  }, [subject, htmlBody, testValues, variables])

  const handleApply = () => {
    const defaults: Record<string, string> = {}
    variableNames.forEach((name) => {
      if (!testValues[name]) {
        const def = variables[name]
        defaults[name] = def?.fallback?.toString() || `test_${name}`
      }
    })
    setTestValues((prev) => ({ ...prev, ...defaults }))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {variableNames.length > 0 && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
            {showCollapse ? (
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                <p className="text-xs font-medium text-muted-foreground">
                  Test Values{" "}
                  <span className="inline-flex items-center justify-center rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] font-medium">
                    {variableNames.length}
                  </span>
                </p>
              </button>
            ) : (
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                Test Values{" "}
                <span className="inline-flex items-center justify-center rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] font-medium">
                  {variableNames.length}
                </span>
              </p>
            )}
            <div className="space-y-1.5">
              {visibleNames.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{name}:</span>
                  <Input
                    className="h-7 text-xs"
                    placeholder={variables[name]?.fallback?.toString() || `Enter ${name}`}
                    value={testValues[name] || ""}
                    onChange={(e) =>
                      setTestValues((prev) => ({ ...prev, [name]: e.target.value }))
                    }
                  />
                </div>
              ))}
              {showCollapse && !expanded && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                  onClick={() => setExpanded(true)}
                >
                  Show all {variableNames.length} variables
                </button>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleApply}>
              <Play className="h-3 w-3 mr-1" />
              Apply Test Values
            </Button>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subject:</Label>
          <div className="text-sm font-medium p-2 bg-muted/20 rounded border">
            {rendered.subject || <span className="text-muted-foreground/50">(empty)</span>}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Body:</Label>
          <div
            className="prose prose-sm max-w-none p-3 bg-white dark:bg-gray-950 rounded border min-h-[100px]"
            dangerouslySetInnerHTML={{ __html: rendered.body }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
