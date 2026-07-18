"use client"

import * as React from "react"
import { BookOpen, Settings2, Calendar, CalendarClock, BarChart, Users, FileText, Activity, ScrollText, Home, Wrench, ClipboardList, FileCheck } from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"

import { authClient } from "@/lib/auth-client"
import { getRoleFromUser } from "@/features/auth/services/authService"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AppIdentity } from "./app-identity"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = authClient.useSession()
  const [mounted, setMounted] = React.useState(false)

  const role = getRoleFromUser(session?.user)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])


  // Prevent hydration mismatch by not rendering on server
  if (!mounted) {
    return null
  }

  if (isPending) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <AppIdentity />
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-sidebar-accent" />
            <div className="h-4 w-32 animate-pulse rounded bg-sidebar-accent" />
            <div className="h-4 w-20 animate-pulse rounded bg-sidebar-accent" />
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="h-12 w-full animate-pulse rounded bg-sidebar-accent" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    )
  }

  const navMain =
    role === "admin"
      ? [
        {
          title: "Inicio",
          url: "/dashboard",
          icon: Home,
          isActive: false,
        },
        {
          title: "Usuarios",
          url: "/dashboard/admin/users",
          icon: Users,
          isActive: false,
        },
        {
          title: "Cursos",
          url: "/dashboard/admin/courses",
          icon: BookOpen,
          isActive: false,
        },


        {
          title: "Documentación",
          url: "/dashboard/admin/docs",
          icon: FileText,
          isActive: false,
        },
        {
          title: "Configuración",
          url: "/dashboard/admin/settings",
          icon: Settings2,
          isActive: false,
        },
      ]
      : role === "teacher"
        ? [
          {
            title: "Inicio",
            url: "/dashboard",
            icon: Home,
            isActive: false,
          },
          {
            title: "Cursos",
            url: "/dashboard/teacher",
            icon: BookOpen,
            isActive: false,
          },
          {
            title: "Documentación",
            url: "/dashboard/teacher/docs",
            icon: FileText,
            isActive: false,
          },
          {
            title: "Evaluaciones",
            url: "/dashboard/teacher/evaluations",
            icon: FileCheck,
            isActive: false,
          },
          {
            title: "Configuración",
            url: "/dashboard/teacher/settings",
            icon: Settings2,
            isActive: false,
          },
        ]
        : role === "student"
          ? [
            {
              title: "Inicio",
              url: "/dashboard",
              icon: Home,
              isActive: false,
            },
            {
              title: "Cursos",
              url: "/dashboard/student",
              icon: BookOpen,
              isActive: false,
            },
          ]
          : []

  const user = {
    name: (session?.user as { name?: string } | null | undefined)?.name || "Usuario",
    email: (session?.user as { email?: string } | null | undefined)?.email || "m@example.com",
    avatar:
      (session?.user as { image?: string } | null | undefined)?.image || "/avatars/shadcn.jpg",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-0">
        <AppIdentity />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
