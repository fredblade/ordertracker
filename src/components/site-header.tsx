"use client"

import * as React from "react"
import { RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const [isSyncing, setIsSyncing] = React.useState(false)

  async function handleSync() {
    setIsSyncing(true)
    try {
      await fetch("/api/sync/cron", { method: "GET" })
    } finally {
      setTimeout(() => setIsSyncing(false), 2000)
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">Order Tracker</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-1.5 text-xs"
          >
            <RefreshCwIcon className={cn("size-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>
      </div>
    </header>
  )
}
