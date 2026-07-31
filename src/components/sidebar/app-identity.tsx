"use client"

import * as React from "react"
import { Shield, GraduationCap, BookOpen, Sparkles } from "lucide-react"

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
        return BookOpen
    }
  }

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return "Administrador"
      case "teacher":
        return "Docente"
      case "student":
        return "Estudiante"
      default:
        return "Portal"
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
            "flex items-center h-16 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-background/80 dark:bg-slate-950/80 backdrop-blur-xl transition-all",
            isCollapsed ? "justify-center px-2" : "px-4"
          )}
        >
          <div className={cn("flex items-center gap-3 w-full", isCollapsed && "justify-center")}>
            {/* Glowing Icon Box */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60 blur-sm group-hover:opacity-100 transition duration-300" />
              <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900 text-emerald-400 border border-emerald-500/30">
                {isMounted && !isPending ? (
                  <RoleIcon className="h-4.5 w-4.5" />
                ) : (
                  <BookOpen className="h-4.5 w-4.5" />
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold tracking-tight text-foreground truncate">
                    SmartClass
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    AI
                  </span>
                </div>
                {isMounted && !isPending ? (
                  <span className="text-[11px] font-medium text-muted-foreground truncate leading-tight">
                    {getRoleLabel()}
                  </span>
                ) : (
                  <span className="h-3 w-16 animate-pulse rounded bg-sidebar-accent mt-0.5" />
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
