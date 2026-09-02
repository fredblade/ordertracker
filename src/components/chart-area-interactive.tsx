"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

interface Order {
  created_at: string
  status: string
}

interface ChartAreaInteractiveProps {
  orders: Order[]
}

const chartConfig = {
  pending: {
    label: "Pending",
    color: "var(--chart-1)",
  },
  shipped: {
    label: "Shipped",
    color: "var(--chart-2)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

function buildChartData(orders: Order[], days: number) {
  const now = new Date()
  const map: Record<string, { date: string; pending: number; shipped: number; delivered: number }> = {}

  // Pre-fill all days in range with zeros
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    map[key] = { date: key, pending: 0, shipped: 0, delivered: 0 }
  }

  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - days)

  for (const order of orders) {
    const d = new Date(order.created_at)
    if (d < cutoff) continue
    const key = d.toISOString().split("T")[0]
    if (!map[key]) continue
    const status = order.status?.toLowerCase()
    if (status === "shipped") map[key].shipped++
    else if (status === "delivered") map[key].delivered++
    else map[key].pending++
  }

  return Object.values(map)
}

export function ChartAreaInteractive({ orders }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  const days = timeRange === "90d" ? 90 : timeRange === "7d" ? 7 : 30
  const chartData = React.useMemo(() => buildChartData(orders, days), [orders, days])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Orders Over Time</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Orders by status for the selected period
          </span>
          <span className="@[540px]/card:hidden">Orders by status</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillPending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-pending)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-pending)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillShipped" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-shipped)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-shipped)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillDelivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-delivered)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-delivered)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                  indicator="dot"
                />
              }
            />
            <Area dataKey="pending"   type="natural" fill="url(#fillPending)"   stroke="var(--color-pending)"   stackId="a" />
            <Area dataKey="shipped"   type="natural" fill="url(#fillShipped)"   stroke="var(--color-shipped)"   stackId="a" />
            <Area dataKey="delivered" type="natural" fill="url(#fillDelivered)" stroke="var(--color-delivered)" stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
