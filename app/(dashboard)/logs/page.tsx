"use client"
import React, { useState, useEffect, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Loader2, ChevronDown, ChevronRight, ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmailLog {
  id: string
  status: string
  error: string | null
  providerResponse: string | null
  createdAt: string
  rule: { name: string }
}

interface EvalLog {
  id: string
  ruleName: string
  matched: boolean
  details: any
  createdAt: string
}

export default function LogsPage() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [evalLogs, setEvalLogs] = useState<EvalLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [emailRes, evalRes] = await Promise.all([
          fetch("/api/logs?type=email"),
          fetch("/api/logs?type=evaluation"),
        ])
        if (emailRes.ok) setEmailLogs(await emailRes.json())
        if (evalRes.ok) setEvalLogs(await evalRes.json())
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedRows(next)
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
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">View email and evaluation logs</p>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">Email Logs</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          {emailLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ScrollText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium mb-1">No logs yet</h3>
              <p className="text-sm text-muted-foreground">Logs will appear here when rules are evaluated.</p>
            </div>
          ) : (
            <Card className="card-hover">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => {
                      const isGreen = log.status === "sent" || log.status === "matched"
                      const isRed = log.status === "failed" || log.status === "no_match"
                      return (
                        <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="text-sm">{new Date(log.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{log.rule?.name || "N/A"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${isGreen ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" : isRed ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-400"}`}>
                              {(isGreen || isRed) && <span className={`w-1.5 h-1.5 rounded-full ${isGreen ? "bg-green-500" : "bg-red-500"}`} />}
                              {log.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.error || "-"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evaluation">
          {evalLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ScrollText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium mb-1">No logs yet</h3>
              <p className="text-sm text-muted-foreground">Logs will appear here when rules are evaluated.</p>
            </div>
          ) : (
            <Card className="card-hover">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Matched</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evalLogs.map((log) => (
                      <Fragment key={log.id}>
                        <TableRow key={log.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleRow(log.id)}>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedRows.has(log.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm">{new Date(log.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{log.ruleName}</TableCell>
                          <TableCell>
                            {log.matched ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-400 px-2.5 py-0.5 text-xs font-medium">
                                No
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(log.id) && log.details?.conditions && (
                          <TableRow key={`${log.id}-details`}>
                            <TableCell colSpan={4} className="bg-muted/30 p-4">
                              <div className="space-y-2">
                                {log.details.conditions.map((c: any, i: number) => (
                                  <div key={i} className="text-sm flex items-center gap-2">
                                    <Badge variant={c.passed ? "success" : "destructive"} className="w-12 justify-center">
                                      {c.passed ? "PASS" : "FAIL"}
                                    </Badge>
                                    <span className="font-mono">{c.field}</span>
                                    <span className="text-muted-foreground">{c.operator}</span>
                                    <span className="font-mono">{String(c.expectedValue)}</span>
                                    <span className="text-muted-foreground">→ actual:</span>
                                    <span className="font-mono">{String(c.actualValue ?? "null")}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
