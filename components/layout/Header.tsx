"use client"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Activity,
  ScrollText,
  User,
  FlaskConical,
} from "lucide-react"

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

export function Header() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="md:hidden flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar-background">
            <div className="px-6 pt-6 pb-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">E</span>
                </div>
                <h1 className="text-lg font-bold tracking-tight">EmailFlow</h1>
              </div>
              <p className="text-xs text-muted-foreground pl-9">Email Automation</p>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-6">
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
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold">EmailFlow</h1>
      </div>
      <Button variant="ghost" size="icon" onClick={handleSignOut}>
        <LogOut className="h-5 w-5" />
      </Button>
    </header>
  )
}
