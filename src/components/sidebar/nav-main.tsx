"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
    <SidebarGroup>
      <SidebarGroupLabel>Navegación</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // Usar la propiedad isActive del item o comparar con el pathname actual
          // Si el item es el dashboard principal (/dashboard), usar coincidencia exacta
          // Para otros, ver si el pathname empieza con el url del item (para rutas anidadas)
          const isDashboard = item.url === "/dashboard"
          const active = item.isActive || 
            (isDashboard 
              ? pathname === item.url 
              : pathname === item.url || (pathname.startsWith(item.url + "/") && !items.some(other => other.url.length > item.url.length && pathname.startsWith(other.url))))

          // Si no hay items anidados, renderizar como enlace directo
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={active}
                  className={cn(
                    "h-11 rounded-xl transition-all duration-300",
                    active
                      ? "bg-primary/10 text-primary font-bold scale-[1.02]"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Link href={item.url} onClick={handleLinkClick}>
                    {item.icon && <item.icon className={cn("h-5 w-5 transition-colors", active ? "text-primary scale-110" : "text-muted-foreground/70")} />}
                    <span className="ml-2 font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // Si hay items anidados, renderizar con Collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={active}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={active}>
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span className="ml-2 font-medium">{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
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
