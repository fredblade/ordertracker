"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardPage() {
  const [orders, setOrders] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders")
      if (res.ok) {
        const json = await res.json()
        setOrders(json.orders ?? [])
      }
    } catch {
      // silently fail - table shows empty state
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [loadData])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {isLoading ? (
                <div className="px-4 lg:px-6 text-sm text-muted-foreground animate-pulse">
                  Loading dashboard data…
                </div>
              ) : (
                <>
                  <SectionCards orders={orders} />
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive orders={orders} />
                  </div>
                  <DataTable data={orders} />
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
