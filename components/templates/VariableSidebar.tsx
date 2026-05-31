"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, GripVertical, X, PanelRightClose, PanelRightOpen } from "lucide-react"
import type { VariableDefinition } from "@/lib/templates/service"

interface VariableSidebarProps {
  variables: Record<string, VariableDefinition>
  onEdit: (name: string) => void
  onDelete: (name: string) => void
  onCreate: () => void
}

export function VariableSidebar({ variables, onEdit, onDelete, onCreate }: VariableSidebarProps) {
  const [search, setSearch] = useState("")
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const entries = Object.entries(variables).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  )

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">Template Variables</h3>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b p-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Variable
        </Button>
      </div>

      <div className="p-2">
        <Input
          placeholder="Search variables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {search ? "No matching variables" : "No variables yet"}
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {entries.map(([name, def]) => (
              <div
                key={name}
                className="group flex items-center gap-2 rounded-md p-2 hover:bg-muted/50 transition-colors"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {def.type}
                    {def.fallback ? `, Fallback: ${def.fallback}` : ""}
                    {def.required ? ", Required" : ""}
                  </p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(name)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-40 md:hidden shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </Button>

      {/* Desktop sidebar */}
      <div className="hidden md:block border-l bg-background">
        <div className="w-[280px] h-full">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-background rounded-t-xl border shadow-xl animate-slide-up">
            <div className="mx-auto w-10 h-1 bg-muted-foreground/30 rounded-full mt-2" />
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
