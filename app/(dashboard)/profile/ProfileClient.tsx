"use client"
import { Copy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal"
import { Crown, Sparkles, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface ProfileClientProps {
  email: string
  userId: string
  createdAt: string
  planId: string
  planName: string
  planFeatures?: Record<string, unknown>
  subscriptionStatus: string
  subscriptionEndsAt: string | null
}

export function ProfileClient({ email, userId, createdAt, planId, planName, planFeatures, subscriptionStatus, subscriptionEndsAt }: ProfileClientProps) {
  const handleUpgrade = () => {
    toast.success("Coming soon!")
  }

  const copyUserId = () => {
    navigator.clipboard.writeText(userId)
    toast.success("User ID copied to clipboard")
  }

  const featureList = planFeatures
    ? Object.entries(planFeatures).map(([key, value]) => ({
        key,
        value,
        label: key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      }))
    : []

  const isCancelled = subscriptionStatus === "cancelled"
  const isPastDue = subscriptionStatus === "past_due"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Created</p>
              <p className="font-medium">{new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID (for support)</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-muted-foreground break-all">{userId}</p>
                <Button variant="ghost" size="sm" onClick={copyUserId} className="shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-semibold">{planName} plan</span>
              <Badge variant={isCancelled || isPastDue ? "destructive" : "secondary"} className="ml-2">
                {subscriptionStatus}
              </Badge>
            </div>
            {isCancelled && subscriptionEndsAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Access until {new Date(subscriptionEndsAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            )}
            {featureList.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Plan Features</p>
                <ul className="space-y-1">
                  {featureList.map((feature) => (
                    <li key={feature.key} className="flex items-center gap-2 text-sm">
                      {feature.value ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span>{feature.label}: <span className="font-medium">{String(feature.value)}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {planId !== "enterprise" && (
              <Button onClick={handleUpgrade} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordModal />
        </CardContent>
      </Card>
    </div>
  )
}
