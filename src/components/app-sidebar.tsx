"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboardIcon,
  CalendarIcon,
  BarChart3Icon,
  BoxesIcon,
  SettingsIcon,
  HelpCircleIcon,
  PackageCheckIcon,
  RefreshCwIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/client"

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Analytics",  url: "/analytics",  icon: BarChart3Icon },
  { title: "Calendar",   url: "/calendar",   icon: CalendarIcon },
  { title: "Inventory",  url: "/inventory",  icon: BoxesIcon },
]

const navSecondary = [
  { title: "Settings", url: "/settings", icon: SettingsIcon },
  { title: "Help",     url: "#",         icon: HelpCircleIcon },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<{ name: string; email: string; avatar: string }>({
    name: "User",
    email: "",
    avatar: "",
  })

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email ?? ""
        setUser({
          name: data.user.user_metadata?.full_name ?? email.split("@")[0] ?? "User",
          email,
          avatar: data.user.user_metadata?.avatar_url ?? "",
        })
      }
    })
  }, [])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/dashboard">
                <PackageCheckIcon className="size-5!" />
                <span className="text-base font-semibold">Order Tracker</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
