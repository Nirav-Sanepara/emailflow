"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Activity, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Event {
  id: string
  eventType: string
  userId: string
  processed: boolean
  idempotencyKey: string
  createdAt: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events", { method: "GET" })
        if (res.ok) {
          setEvents(await res.json())
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

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
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Track incoming events</p>
      </div>

      <Card className="card-hover">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Idempotency Key</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium mb-1">No events yet</h3>
                      <p className="text-sm text-muted-foreground">Events will appear here when triggered by your rules.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell><span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium font-mono">{event.eventType}</span></TableCell>
                    <TableCell className="font-mono text-sm">{event.userId.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant={event.processed ? "success" : "warning"}>
                        {event.processed ? "Processed" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{event.idempotencyKey}</TableCell>
                    <TableCell className="text-sm">{new Date(event.createdAt).toLocaleString()}</TableCell>
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
