"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    badge?: number
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup className="px-3 py-4">
      <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 mb-2">
        Navegación Principal
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1.5">
        {items.map((item) => {
          const isDashboard = item.url === "/dashboard"
          const active = item.isActive || 
            (isDashboard 
              ? pathname === item.url 
              : pathname === item.url || (pathname.startsWith(item.url + "/") && !items.some(other => other.url.length > item.url.length && pathname.startsWith(other.url))))

          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={active}
                  className={cn(
                    "h-11 rounded-xl transition-all duration-300 px-3 relative overflow-hidden group",
                    active
                      ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-primary font-bold border-l-4 border-primary shadow-sm shadow-primary/10"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Link href={item.url} onClick={handleLinkClick}>
                    {item.icon && (
                      <item.icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", active ? "text-primary" : "text-muted-foreground")} />
                    )}
                    <span className="ml-2 text-sm">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={active}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={active} className="h-11 rounded-xl">
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span className="ml-2 font-medium text-sm">{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="ml-4 border-l border-slate-200 dark:border-slate-800 space-y-1">
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={pathname === subItem.url} className="rounded-lg">
                          <Link href={subItem.url} onClick={handleLinkClick}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
