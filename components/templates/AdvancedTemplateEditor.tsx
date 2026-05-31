"use client"
import { useState, useRef, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Node as TipTapNode, mergeAttributes } from "@tiptap/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { VariableEditModal } from "./VariableEditModal"
import { VariableSidebar } from "./VariableSidebar"
import { LivePreview } from "./LivePreview"
import { Search, Plus, Loader2, Variable } from "lucide-react"
import type { VariableDefinition } from "@/lib/templates/service"

function stripVariableSpans(html: string): string {
  return html.replace(/<span[^>]*data-variable="([^"]*)"[^>]*>\{\{\1\}\}<\/span>/g, "{{$1}}")
}

function wrapVariables(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, '<span data-variable="$1">{{$1}}</span>')
}

const VariableNode = TipTapNode.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-variable"),
        renderHTML: (attrs) => {
          if (!attrs.name) return {}
          return { "data-variable": attrs.name }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-variable]" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable": node.attrs.name,
        class:
          "variable-chip inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary cursor-pointer hover:bg-primary/20 transition-colors",
      }),
      `{{${node.attrs.name}}}`,
    ]
  },
})

interface Props {
  initialSubject: string
  initialBody: string
  initialVariables?: Record<string, VariableDefinition>
  saving?: boolean
  onSave: (data: {
    subject: string
    body: string
    variables: Record<string, VariableDefinition>
  }) => void
}

export function AdvancedTemplateEditor({
  initialSubject,
  initialBody,
  initialVariables,
  saving,
  onSave,
}: Props) {
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [variables, setVariables] = useState<Record<string, VariableDefinition>>(initialVariables || {})
  const [showInsertPopup, setShowInsertPopup] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [popupQuery, setPopupQuery] = useState("")
  const [popupContext, setPopupContext] = useState<"subject" | "body" | null>(null)
  const [editingVariable, setEditingVariable] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const subjectRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popupListRef = useRef<HTMLDivElement>(null)

  const filteredVariables = Object.keys(variables).filter(
    (n) => !popupQuery || n.toLowerCase().includes(popupQuery.toLowerCase())
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Write your email body... Use @ to insert variables",
      }),
      VariableNode,
    ],
    content: wrapVariables(initialBody),
    onUpdate: ({ editor: ed }) => {
      const html = stripVariableSpans(ed.getHTML())
      setBody(html)

      checkTriggerInEditor(ed)
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[300px] rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring caret-foreground",
      },
      handleClick: (view, pos) => {
        const node = view.state.doc.nodeAt(pos)
        if (node?.type.name === "variable") {
          setEditingVariable(node.attrs.name as string)
          setShowEditModal(true)
          return true
        }
        return false
      },
    },
  })

  const checkTriggerInEditor = (ed: typeof editor) => {
    if (!ed) return
    const { from } = ed.state.selection
    const textBefore = ed.state.doc.textBetween(Math.max(0, from - 20), from)
    const lastOpen = textBefore.lastIndexOf("{{")

    if (lastOpen !== -1) {
      const after = textBefore.substring(lastOpen + 2)
      if (!after.includes("}}")) {
        const query = after
        const coords = ed.view.coordsAtPos(from)
        if (coords) {
          setPopupContext("body")
          setPopupQuery(query)
          setPopupPosition({ x: coords.left, y: coords.bottom + 4 })
          setShowInsertPopup(true)
          return
        }
      }
    }

    setShowInsertPopup(false)
  }

  useEffect(() => {
    const el = popupListRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowInsertPopup(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInsertPopup(false)
    }
    if (showInsertPopup) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [showInsertPopup])

  const handlePopupKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredVariables.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const selected = filteredVariables[selectedIndex]
      if (selected) {
        handleInsertVariable(selected)
      }
    }
  }

  const handleSubjectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSubject(value)

    const cursorPos = e.target.selectionStart || 0
    const textBefore = value.substring(0, cursorPos)
    const lastOpen = textBefore.lastIndexOf("{{")

    if (lastOpen !== -1) {
      const afterBraces = textBefore.substring(lastOpen)
      if (!afterBraces.includes("}}")) {
        const query = textBefore.substring(lastOpen + 2)
        const rect = e.target.getBoundingClientRect()
        setPopupContext("subject")
        setPopupQuery(query)
        setPopupPosition({ x: rect.left, y: rect.bottom + 4 })
        setShowInsertPopup(true)
        return
      }
    }

    setShowInsertPopup(false)
  }

  const handleInsertVariable = (name: string) => {
    if (popupContext === "body" && editor) {
      const { from } = editor.state.selection
      const textBefore = editor.state.doc.textBetween(0, from)
      const lastOpen = textBefore.lastIndexOf("{{")
      if (lastOpen !== -1) {
        const node = editor.schema.nodes.variable.create({ name })
        const tr = editor.state.tr
        tr.replaceWith(lastOpen, from, node)
        editor.view.dispatch(tr)
        editor.view.focus()
      }
    } else if (popupContext === "subject") {
      const input = subjectRef.current
      if (input) {
        const cursorPos = input.selectionStart || subject.length
        const textBefore = subject.substring(0, cursorPos)
        const lastOpen = textBefore.lastIndexOf("{{")
        if (lastOpen !== -1) {
          const newValue =
            subject.substring(0, lastOpen) +
            `{{${name}}}` +
            subject.substring(cursorPos)
          setSubject(newValue)
          setTimeout(() => {
            const newCursor = lastOpen + name.length + 4
            input.setSelectionRange(newCursor, newCursor)
            input.focus()
          }, 0)
        }
      }
    }
    setShowInsertPopup(false)
  }

  const handleInsertClick = (e: React.MouseEvent) => {
    const name = (e.currentTarget as HTMLElement).getAttribute("data-variable-insert")
    if (name) handleInsertVariable(name)
  }

  const handleVariableSave = (
    newName: string,
    def: VariableDefinition
  ) => {
    const oldName = editingVariable

    setVariables((prev) => {
      const next = { ...prev }
      if (oldName && oldName !== newName) {
        delete next[oldName]

        const replaceInText = (text: string) =>
          text.replace(new RegExp(`\\{\\{${escapeRegex(oldName)}\\}\\}`, "g"), `{{${newName}}}`)
        setSubject((s) => replaceInText(s))
        setBody((b) => replaceInText(b))
      }
      next[newName] = def
      return next
    })

    setShowEditModal(false)
    setEditingVariable(null)
  }

  const handleVariableDelete = (name: string) => {
    setVariables((prev) => {
      const next = { ...prev }
      const def = next[name]
      delete next[name]

      const fallback = def?.fallback?.toString() || ""
      const replaceInText = (text: string) =>
        text.replace(new RegExp(`\\{\\{${escapeRegex(name)}\\}\\}`, "g"), fallback)
      setSubject((s) => replaceInText(s))
      setBody((b) => replaceInText(b))

      return next
    })

    setShowEditModal(false)
    setEditingVariable(null)
  }

  const handleCreateNew = () => {
    setShowInsertPopup(false)
    setEditingVariable(null)
    setShowEditModal(true)
  }

  const handleSave = () => {
    const cleanBody = body
    onSave({ subject, body: cleanBody, variables })
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="editor-container flex flex-col md:flex-row gap-6">
        <Card className="flex-1">
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                ref={subjectRef}
                value={subject}
                onChange={handleSubjectInput}
                placeholder="Welcome {{first_name}}!"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Type {"{{"} to insert variables
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email Body</Label>
              <EditorContent editor={editor} />
            </div>

            <LivePreview subject={subject} htmlBody={body} variables={variables} />

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:w-[300px] shrink-0">
          <CardContent className="p-0">
            <VariableSidebar
              variables={variables}
              onEdit={(name) => {
                setEditingVariable(name)
                setShowEditModal(true)
              }}
              onDelete={(name) => {
                handleVariableDelete(name)
              }}
              onCreate={() => {
                setEditingVariable(null)
                setShowEditModal(true)
              }}
            />
          </CardContent>
        </Card>
      </div>

      {showInsertPopup && (
        <div
          ref={popupRef}
          className="variable-popup fixed z-50 min-w-[280px] max-w-[320px] rounded-lg border bg-popover shadow-lg"
          style={{
            left: Math.min(popupPosition.x, window.innerWidth - 320),
            top: popupPosition.y,
          }}
        >
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search variables..."
                value={popupQuery}
                onChange={(e) => {
                  setPopupQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                onKeyDown={handlePopupKeyDown}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-1" ref={popupListRef}>
            {filteredVariables.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                {popupQuery
                  ? "No matching variables found"
                  : "No variables created yet"}
              </div>
            ) : (
              filteredVariables.map((name, i) => (
                <button
                  key={name}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left ${i === selectedIndex ? "bg-muted" : "hover:bg-muted"}`}
                  data-variable-insert={name}
                  onClick={handleInsertClick}
                  onMouseEnter={() => setSelectedIndex(i)}
                  type="button"
                >
                  <Variable className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {variables[name]?.label || ""}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {variables[name]?.type || "string"}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t p-1">
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={handleCreateNew}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Create new variable
            </button>
          </div>
        </div>
      )}

      {showEditModal && (
        <VariableEditModal
          key={editingVariable || "new"}
          variableName={editingVariable}
          definition={editingVariable ? variables[editingVariable] : null}
          existingNames={Object.keys(variables).filter(
            (n) => n !== editingVariable
          )}
          onSave={handleVariableSave}
          onDelete={handleVariableDelete}
          onClose={() => {
            setShowEditModal(false)
            setEditingVariable(null)
          }}
        />
      )}
    </div>
  )
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
