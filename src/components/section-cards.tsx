"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  PackageIcon,
  TruckIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  TrendingUpIcon,
} from "lucide-react"

interface Order {
  id: string
  status: string
  total?: number
  currency?: string
}

interface SectionCardsProps {
  orders: Order[]
}

export function SectionCards({ orders }: SectionCardsProps) {
  const total = orders.length
  const shipped = orders.filter((o) => o.status?.toLowerCase() === "shipped").length
  const delivered = orders.filter((o) => o.status?.toLowerCase() === "delivered").length
  const actionRequired = orders.filter((o) => o.status?.toLowerCase() === "action_required").length
  const pending = orders.filter((o) => o.status?.toLowerCase() === "pending").length
  const totalValue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  const activeShipments = shipped + pending

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {/* Total Orders */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <PackageIcon className="size-3.5" /> Total Orders
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {total}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              All time
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {delivered} delivered · {shipped} in transit
          </div>
          <div className="text-muted-foreground">{pending} awaiting shipment</div>
        </CardFooter>
      </Card>

      {/* Active Shipments */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <TruckIcon className="size-3.5" /> Active Shipments
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeShipments}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TruckIcon />
              In transit
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {shipped} shipped · {pending} pending
          </div>
          <div className="text-muted-foreground">{delivered} successfully delivered</div>
        </CardFooter>
      </Card>

      {/* Action Required */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <AlertTriangleIcon className="size-3.5" /> Action Required
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {actionRequired}
          </CardTitle>
          <CardAction>
            <Badge variant={actionRequired > 0 ? "destructive" : "outline"}>
              {actionRequired > 0 ? "Needs attention" : "All clear"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {actionRequired > 0
              ? `${actionRequired} order${actionRequired > 1 ? "s" : ""} require attention`
              : "No issues detected"}
          </div>
          <div className="text-muted-foreground">Check payments or preorder updates</div>
        </CardFooter>
      </Card>

      {/* Total Value */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <DollarSignIcon className="size-3.5" /> Total Value
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              All orders
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Across {total} order{total !== 1 ? "s" : ""}
          </div>
          <div className="text-muted-foreground">Combined spend from all tracked orders</div>
        </CardFooter>
      </Card>
    </div>
  )
}
