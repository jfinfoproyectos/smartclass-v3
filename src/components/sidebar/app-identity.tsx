"use client"

import * as React from "react"
import { Shield, GraduationCap, BookOpen } from "lucide-react"

import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { getRoleFromUser } from "@/features/auth/services/authService"
import { cn } from "@/lib/utils"

export function AppIdentity() {
  const { data: session, isPending } = authClient.useSession()

  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const role = getRoleFromUser(session?.user)

  const getRoleIcon = () => {
    switch (role) {
      case "admin":
        return Shield
      case "teacher":
        return GraduationCap
      case "student":
        return BookOpen
      default:
        return BookOpen // Or a neutral icon like 'Layout' or 'Command'
    }
  }

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return "Admin Panel"
      case "teacher":
        return "Panel Profesor"
      case "student":
        return "Panel Estudiante"
      default:
        return "SmartClass"
    }
  }

  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const RoleIcon = getRoleIcon()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className={cn(
            "flex items-center justify-center transition-all duration-200 ease-in-out",
            isCollapsed ? "h-12 py-2" : "h-16 flex-col border-b bg-sidebar px-6"
          )}
        >
          <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
            {isMounted && !isPending ? (
              <RoleIcon className={cn("text-primary transition-all", isCollapsed ? "h-6 w-6" : "h-6 w-6")} />
            ) : (
              <BookOpen className={cn("text-primary transition-all", isCollapsed ? "h-6 w-6" : "h-6 w-6")} />
            )}

            {!isCollapsed && (
              isMounted && !isPending ? (
                <span className="text-lg font-bold whitespace-nowrap">{getRoleLabel()}</span>
              ) : (
                <span className="h-6 w-24 animate-pulse rounded bg-sidebar-accent" />
              )
            )}
          </div>
          {!isCollapsed && (
            isMounted && !isPending ? (
              <div className="mt-0.5 text-xs text-muted-foreground whitespace-nowrap">SmartClass</div>
            ) : (
              <span className="mt-1 h-3 w-20 animate-pulse rounded bg-sidebar-accent" />
            )
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
