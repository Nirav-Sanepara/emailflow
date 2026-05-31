"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Activity,
  ScrollText,
  User,
  FlaskConical,
  LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/rules", label: "Rules", icon: GitBranch },
    ],
  },
  {
    label: "Monitor",
    items: [
      { href: "/events", label: "Events", icon: Activity },
      { href: "/logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    label: "Testing",
    items: [
      { href: "/test", label: "Event Simulator", icon: FlaskConical },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r bg-sidebar-background">
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">E</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">EmailFlow</h1>
          </div>
          <p className="text-xs text-muted-foreground pl-9">Email Automation</p>
        </div>
        <nav className="flex-1 px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                      {item.label}
                      {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  )
}
