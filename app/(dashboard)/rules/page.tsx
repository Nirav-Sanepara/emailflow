"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Loader2, GitBranch } from "lucide-react"
import { toast } from "sonner"
import { TestEventModal } from "@/components/rules/TestEventModal"

interface RuleCondition {
  id: string
  field: string
  operator: string
  value: string
}

interface Rule {
  id: string
  name: string
  eventType: string
  active: boolean
  template: { id: string; name: string }
  conditions: RuleCondition[]
  createdAt: string
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules")
      if (res.ok) {
        setRules(await res.json())
      }
    } catch {
      toast.error("Failed to load rules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRules() }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/rules/${deleteId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Rule deleted")
        setRules(rules.filter((r) => r.id !== deleteId))
      } else {
        toast.error("Failed to delete rule")
      }
    } catch {
      toast.error("Failed to delete rule")
    }
    setDeleteId(null)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.875rem] font-semibold tracking-tight">Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage automation rules</p>
        </div>
        <Link href="/rules/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-1">No rules yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first rule to automate email sending.</p>
          <Link href="/rules/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </Link>
        </div>
      ) : (
        <Card className="card-hover">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium font-mono">
                        {rule.eventType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{rule.template?.name || "N/A"}</TableCell>
                    <TableCell>
                      {rule.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400 px-2.5 py-0.5 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <TestEventModal
                          ruleId={rule.id}
                          ruleName={rule.name}
                          eventType={rule.eventType}
                          templateId={rule.template?.id || ""}
                          conditions={rule.conditions || []}
                        />
                        <Link href={`/rules/${rule.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{rule.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
