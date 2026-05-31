"use client"
import { useState, useMemo, useCallback } from "react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, X } from "lucide-react"
import {
  type FieldGroup,
  type FieldType,
  GROUPS,
  getFieldsByGroup,
  getFieldByPath,
  resolvePath,
  getFieldType,
  OPERATORS_BY_TYPE,
  OPERATOR_HUMAN,
} from "@/lib/rules/fieldDefinitions"

export interface Condition {
  field: string
  operator: string
  value: string
}

interface ConditionBuilderProps {
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

function conditionToPath(condition: Condition): string {
  const resolved = resolvePath(condition.field)
  const def = getFieldByPath(resolved)
  return def?.path ?? resolved
}

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    const defaultGroup = GROUPS[0]
    const fields = getFieldsByGroup(defaultGroup)
    const defaultField = fields[0]
    onChange([
      ...conditions,
      {
        field: defaultField?.path ?? "",
        operator: "eq",
        value: "",
      },
    ])
  }

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    onChange(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Conditions</Label>
        <Button type="button" variant="outline" size="sm" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>
      </div>
      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No conditions - rule will match all events of this type
        </p>
      )}
      {conditions.map((condition, index) => (
        <ConditionRow
          key={index}
          condition={condition}
          onUpdate={(updates) => updateCondition(index, updates)}
          onRemove={() => removeCondition(index)}
        />
      ))}
    </div>
  )
}

interface ConditionRowProps {
  condition: Condition
  onUpdate: (updates: Partial<Condition>) => void
  onRemove: () => void
}

function ConditionRow({ condition, onUpdate, onRemove }: ConditionRowProps) {
  const resolvedPath = resolvePath(condition.field)
  const currentDef = getFieldByPath(resolvedPath)
  const resolvedGroup: FieldGroup = currentDef?.group ?? GROUPS[0]

  const [selectedGroup, setSelectedGroup] = useState<FieldGroup>(resolvedGroup)

  const fieldsInGroup = useMemo(
    () => getFieldsByGroup(selectedGroup),
    [selectedGroup]
  )

  const fieldType: FieldType = currentDef
    ? currentDef.type
    : getFieldType(condition.field)

  const availableOperators = OPERATORS_BY_TYPE[fieldType]

  const handleGroupChange = useCallback(
    (group: string) => {
      const g = group as FieldGroup
      setSelectedGroup(g)
      const fields = getFieldsByGroup(g)
      if (fields.length > 0) {
        const first = fields[0]
        const ops = OPERATORS_BY_TYPE[first.type]
        const adjOp = ops.some((o) => o.value === condition.operator)
          ? condition.operator
          : ops[0].value
        onUpdate({ field: first.path, operator: adjOp, value: "" })
      }
    },
    [condition.operator, onUpdate]
  )

  const handleFieldSelect = useCallback(
    (path: string) => {
      const def = getFieldByPath(path)
      if (def) {
        const ops = OPERATORS_BY_TYPE[def.type]
        const adjOp = ops.some((o) => o.value === condition.operator)
          ? condition.operator
          : ops[0].value
        onUpdate({ field: def.path, operator: adjOp, value: "" })
      }
    },
    [condition.operator, onUpdate]
  )

  const handleOperatorChange = useCallback(
    (op: string) => {
      onUpdate({ operator: op })
    },
    [onUpdate]
  )

  const handleValueChange = useCallback(
    (val: string) => {
      onUpdate({ value: val })
    },
    [onUpdate]
  )

  const humanPreview = useMemo(() => {
    if (!currentDef || !condition.operator || !condition.value) return null
    const opLabel = OPERATOR_HUMAN[condition.operator] ?? condition.operator

    let displayValue = condition.value
    if (fieldType === "boolean") {
      displayValue = condition.value === "true" ? "Yes" : "No"
    } else if (fieldType === "string") {
      displayValue = `"${condition.value}"`
    }

    return `${currentDef.label} ${opLabel} ${displayValue}`
  }, [currentDef, condition.operator, condition.value, fieldType])

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Condition</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={selectedGroup} onValueChange={handleGroupChange}>
        <TabsList className="grid w-full grid-cols-3">
          {GROUPS.map((group) => (
            <TabsTrigger key={group} value={group}>
              {group}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {fieldsInGroup.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">
          No fields available in this category
        </p>
      ) : (
        <div className="flex items-start gap-2">
          <Select
            value={currentDef && fieldsInGroup.some((f) => f.path === currentDef.path) ? currentDef.path : ""}
            onValueChange={handleFieldSelect}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {fieldsInGroup.map((f) => (
                <SelectItem key={f.path} value={f.path}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={condition.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOperators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {fieldType === "boolean" ? (
            <Select value={condition.value} onValueChange={handleValueChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes / True</SelectItem>
                <SelectItem value="false">No / False</SelectItem>
              </SelectContent>
            </Select>
          ) : currentDef?.options ? (
            <Select value={condition.value} onValueChange={handleValueChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {currentDef.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={fieldType === "number" ? "number" : "text"}
              step={fieldType === "number" ? "1" : undefined}
              min={fieldType === "number" ? "0" : undefined}
              placeholder={fieldType === "number" ? "Enter number" : "Enter value"}
              value={condition.value}
              onChange={(e) => handleValueChange(e.target.value)}
              className="flex-1"
            />
          )}
        </div>
      )}

      {humanPreview && (
        <p className="text-xs text-muted-foreground italic">
          <span className="font-medium">Preview:</span> {humanPreview}
        </p>
      )}
    </div>
  )
}
