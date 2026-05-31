"use client"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { AlertTriangle, Save, Trash2, X } from "lucide-react"
import type { VariableDefinition } from "@/lib/templates/service"

interface VariableEditModalProps {
  variableName: string | null
  definition: VariableDefinition | null
  existingNames: string[]
  onSave: (name: string, def: VariableDefinition) => void
  onDelete: (name: string) => void
  onClose: () => void
}

export function VariableEditModal({
  variableName,
  definition,
  existingNames,
  onSave,
  onDelete,
  onClose,
}: VariableEditModalProps) {
  const isNew = variableName === null
  const [name, setName] = useState(variableName || "")
  const [label, setLabel] = useState(definition?.label || "")
  const [type, setType] = useState<VariableDefinition["type"]>(definition?.type || "string")
  const [fallback, setFallback] = useState(definition?.fallback?.toString() || "")
  const [required, setRequired] = useState(definition?.required || false)
  const [nameError, setNameError] = useState("")

  const handleSave = () => {
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, "_")
    if (!cleanName) {
      setNameError("Variable name is required")
      return
    }
    if (!/^[a-zA-Z_]\w*$/.test(cleanName)) {
      setNameError("Name must start with a letter or underscore and contain only letters, numbers, and underscores")
      return
    }
    if (cleanName !== variableName && existingNames.includes(cleanName)) {
      setNameError("A variable with this name already exists")
      return
    }
    setNameError("")
    onSave(cleanName, {
      label: label || cleanName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      type,
      fallback: type === "boolean" ? fallback === "true" : type === "number" ? (fallback ? Number(fallback) : "") : fallback,
      required,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create Variable" : "Edit Variable"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Variable Name</Label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError("") }}
              placeholder="first_name"
              disabled={!isNew}
              className={nameError ? "border-destructive" : ""}
            />
            {nameError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Display Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="First Name"
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Default Value</p>
            <div className="space-y-2">
              <Label>Fallback if missing</Label>
              <Input
                value={fallback}
                onChange={(e) => setFallback(e.target.value)}
                placeholder={type === "boolean" ? "true or false" : type === "number" ? "0" : "Guest"}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Validation</p>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: VariableDefinition["type"]) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="boolean">Boolean (true/false)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="required" checked={required} onCheckedChange={setRequired} />
              <Label htmlFor="required">This variable must have a value</Label>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Will appear as: <code className="bg-muted px-1 rounded">{`{{${name || "variable_name"}}}`}</code>
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div>
            {!isNew && (
              <Button variant="destructive" size="sm" onClick={() => onDelete(variableName!)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Variable
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
