"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  EllipsisVerticalIcon,
  Columns3Icon,
  ChevronDownIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  EyeIcon,
  BellIcon,
  ExternalLinkIcon,
  TruckIcon,
  CircleCheckIcon,
  LoaderIcon,
  AlertTriangleIcon,
  XCircleIcon,
} from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import OrderDetailModal from "@/components/OrderDetailModal"
import { getTrackingUrl } from "@/lib/carrier/status"
import { cn } from "@/lib/utils"

// ─── Schema ──────────────────────────────────────────────────────────────────
export const schema = z.object({
  id: z.string(),
  retailer: z.string(),
  order_number: z.string(),
  status: z.string(),
  tracking_number: z.string().nullable().optional(),
  carrier: z.string().nullable().optional(),
  total: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  items: z.array(z.any()).optional(),
  created_at: z.string(),
  delivered_to: z.string().nullable().optional(),
  original_recipient: z.string().nullable().optional(),
  tracking_history: z.array(z.any()).optional(),
})

type Order = z.infer<typeof schema>

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase()
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    pending:         { label: "Order Created", icon: <LoaderIcon className="size-3" />,         className: "border-yellow-500/40 text-yellow-600 dark:text-yellow-400" },
    shipped:         { label: "Shipped",       icon: <TruckIcon className="size-3" />,          className: "border-blue-500/40 text-blue-600 dark:text-blue-400" },
    delivered:       { label: "Delivered",     icon: <CircleCheckIcon className="size-3 fill-green-500 dark:fill-green-400" />, className: "border-green-500/40 text-green-600 dark:text-green-400" },
    cancelled:       { label: "Cancelled",     icon: <XCircleIcon className="size-3" />,        className: "border-red-500/40 text-red-600 dark:text-red-400" },
    action_required: { label: "Action Req.",   icon: <AlertTriangleIcon className="size-3" />,  className: "border-orange-500/40 text-orange-600 dark:text-orange-400" },
  }
  const cfg = map[s] ?? { label: status, icon: null, className: "" }
  return (
    <Badge variant="outline" className={cn("flex gap-1 px-1.5 text-xs", cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  )
}

// ─── Columns ─────────────────────────────────────────────────────────────────
function buildColumns(onViewOrder: (order: Order) => void): ColumnDef<Order>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "retailer",
      header: "Retailer",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.original.retailer}</span>
          {row.original.delivered_to && (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[130px]">
              📧 {row.original.delivered_to.split("@")[0]}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "order_number",
      header: "Order #",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{row.original.order_number}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "tracking_number",
      header: "Tracking",
      cell: ({ row }) => {
        const { tracking_number, carrier } = row.original
        if (!tracking_number) return <span className="text-xs text-muted-foreground italic">Awaiting</span>
        const url = getTrackingUrl(carrier ?? "", tracking_number)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs">{tracking_number}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{carrier}</span>
              {url && (
                <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  <ExternalLinkIcon className="size-3" />
                </a>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => {
        const items = row.original.items ?? []
        if (items.length === 0) return <span className="text-xs text-muted-foreground italic">—</span>
        const first = items[0]?.name ?? "Item"
        return (
          <span className="text-xs text-muted-foreground truncate max-w-[160px] block" title={first}>
            {first}{items.length > 1 ? ` (+${items.length - 1})` : ""}
          </span>
        )
      },
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-sm">
          ${Number(row.original.total ?? 0).toFixed(2)}
          {row.original.currency && row.original.currency !== "USD" && (
            <span className="text-xs text-muted-foreground ml-1">{row.original.currency}</span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
              size="icon"
            >
              <EllipsisVerticalIcon />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onViewOrder(row.original)}>
              <EyeIcon /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  const res = await fetch(`/api/orders/${row.original.id}/notify`, { method: "POST" })
                  if (!res.ok) throw new Error()
                  toast.success("Discord notification sent!")
                } catch {
                  toast.error("Failed to send Discord notification.")
                }
              }}
            >
              <BellIcon /> Send to Discord
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

// ─── DataTable ────────────────────────────────────────────────────────────────
export function DataTable({ data }: { data: Order[] }) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null)
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns = React.useMemo(() => buildColumns(setSelectedOrder), [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination, globalFilter },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="flex w-full flex-col gap-4 px-4 lg:px-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Search orders, retailers, tracking…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm h-8 text-sm"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3Icon />
                <span className="hidden lg:inline">Columns</span>
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={(e) => {
                    // Don't open modal when clicking checkbox or action button
                    const target = e.target as HTMLElement
                    if (target.closest('[role="checkbox"]') || target.closest('[data-slot="dropdown-menu-trigger"]')) return
                    setSelectedOrder(row.original)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-16" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={`${n}`}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeftIcon />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRightIcon />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  )
}
