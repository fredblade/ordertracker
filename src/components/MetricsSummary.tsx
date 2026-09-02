import React from 'react';
import { CreditCard, Package, Truck, Award } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

interface MetricsSummaryProps {
  orders: any[];
  inventory: any[];
}

export default function MetricsSummary({ orders, inventory }: MetricsSummaryProps) {
  // 1. Total Spending
  const totalSpend = orders.reduce((acc, order) => acc + (order.total || 0), 0);

  // 2. Active Shipments (shipped, pending, action_required)
  const activePackages = orders.filter(
    (o) => ['shipped', 'pending', 'action_required'].includes(o.status?.toLowerCase())
  ).length;

  // 3. Delivered Count
  const deliveredCount = orders.filter((o) => o.status?.toLowerCase() === 'delivered').length;

  // 4. Inventory P&L Calculations
  // Cost of all inventory units
  const totalCost = inventory.reduce((acc, item) => acc + (Number(item.unit_cost) * Number(item.quantity)), 0);
  // Revenue from sold units
  const soldUnits = inventory.filter((item) => item.status === 'sold');
  const totalRevenue = soldUnits.reduce((acc, item) => acc + (Number(item.sale_price || 0) * Number(item.quantity)), 0);
  const totalShipping = soldUnits.reduce((acc, item) => acc + (Number(item.shipping_cost || 0)), 0);
  const netProfit = totalRevenue - (soldUnits.reduce((acc, item) => acc + (Number(item.unit_cost) * Number(item.quantity)), 0) + totalShipping);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* Metric 1 */}
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-5 p-6">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Spent</span>
            <h2 className="text-2xl font-extrabold mt-1 font-mono">
              ${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Metric 2 */}
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-5 p-6">
          <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Shipments</span>
            <h2 className="text-2xl font-extrabold mt-1 font-mono">
              {activePackages}
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Metric 3 */}
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-5 p-6">
          <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Delivered Packages</span>
            <h2 className="text-2xl font-extrabold mt-1 font-mono">
              {deliveredCount}
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Metric 4 */}
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-5 p-6">
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center",
            netProfit >= 0 ? "bg-green-500/10 text-green-500" : "bg-destructive/15 text-destructive"
          )}>
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Net Profit (P&L)</span>
            <h2 className={cn(
              "text-2xl font-extrabold mt-1 font-mono",
              netProfit >= 0 ? "text-green-400" : "text-destructive"
            )}>
              {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
