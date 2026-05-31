"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { FileText, GitBranch, Activity, Mail } from "lucide-react"

interface RecentEvent {
  id: string
  eventType: string
  userId: string
  createdAt: string
}

interface DashboardClientProps {
  templateCount: number
  ruleCount: number
  eventCount: number
  emailCount: number
  recentEvents: RecentEvent[]
}

export function DashboardClient({ templateCount, ruleCount, eventCount, emailCount, recentEvents }: DashboardClientProps) {
  const stats = [
    { label: "Templates", value: templateCount, icon: FileText, color: "text-blue-600 dark:text-blue-400", border: "border-t-blue-500/40" },
    { label: "Rules", value: ruleCount, icon: GitBranch, color: "text-violet-600 dark:text-violet-400", border: "border-t-violet-500/40" },
    { label: "Events", value: eventCount, icon: Activity, color: "text-amber-600 dark:text-amber-400", border: "border-t-amber-500/40" },
    { label: "Emails Sent", value: emailCount, icon: Mail, color: "text-green-600 dark:text-green-400", border: "border-t-green-500/40" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your email automation platform</p>
          <div className="h-0.5 w-8 bg-primary/30 rounded-full mt-3" />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className={cn("stat-card border-t-2", stat.border)}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={cn("h-5 w-5", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                    <p className="text-sm">No events yet</p>
                    <p className="text-xs mt-1">Events will appear here when triggered by your rules</p>
                  </TableCell>
                </TableRow>
              ) : (
                recentEvents.map((event) => (
                  <TableRow key={event.id} className="hover:bg-muted/50">
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium font-mono">
                        {event.eventType}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{event.userId.slice(0, 8)}...</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
