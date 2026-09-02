'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricsSummary from '@/components/MetricsSummary';
import OrderDetailModal from '@/components/OrderDetailModal';
import SyncActivityLog from '@/components/SyncActivityLog';
import { Search, Filter, AlertCircle, ShoppingBag, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const [ordersRes, inventoryRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/inventory')
      ]);

      if (!ordersRes.ok || !inventoryRes.ok) {
        throw new Error('Failed to load dashboard data. Check Supabase connection.');
      }

      const ordersData = await ordersRes.json();
      const inventoryData = await inventoryRes.json();

      setOrders(ordersData.orders || []);
      setInventory(inventoryData.inventory || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll data updates every 7 seconds
    const interval = setInterval(loadData, 7000);
    return () => clearInterval(interval);
  }, []);

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    const textMatch = 
      order.order_number?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.retailer?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.tracking_number?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.items?.some((i: any) => i.name?.toLowerCase().includes(searchText.toLowerCase()));

    const statusMatch = 
      statusFilter === 'all' || 
      order.status?.toLowerCase() === statusFilter.toLowerCase();

    return textMatch && statusMatch;
  });

  const getBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'shipped':
        return 'outline';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'action_required':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-mono text-foreground">LOGISTICS DASHBOARD</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor shipment movements, parse status payloads, and review performance metrics.
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10 text-destructive mb-6">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <MetricsSummary orders={orders} inventory={inventory} />

      {/* Main Table / Data Panel */}
      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/60">
          <CardTitle className="text-lg font-bold font-mono">Shipments Registry</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Search retailer, tracking #..." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Order Created</SelectItem>
                  <SelectItem value="action_required">Action Required</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading shipment data...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/35" />
              <span>No orders match your filter criteria. Connect a Mock account in Settings to seed shipments.</span>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-[120px] font-bold">Retailer</TableHead>
                    <TableHead className="font-bold">Order Number</TableHead>
                    <TableHead className="font-bold">Tracking / Carrier</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold w-[250px]">Items Summary</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    <TableHead className="text-center font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const itemsSummary = order.items && order.items.length > 0 
                      ? `${order.items[0].name}${order.items.length > 1 ? ` (+${order.items.length - 1} items)` : ''}`
                      : 'No items listed';

                    return (
                      <TableRow key={order.id} className="hover:bg-muted/30 border-border">
                        <TableCell className="font-bold">
                          <div className="flex flex-col">
                            <span>{order.retailer}</span>
                            {order.delivered_to && (
                              <span className="text-xs text-muted-foreground font-normal font-mono truncate max-w-[150px]" title={order.delivered_to}>
                                📧 {order.delivered_to.split('@')[0]}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col">
                            <span>{order.order_number}</span>
                            <span className="text-xs text-muted-foreground font-sans mt-0.5">
                              📅 {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.tracking_number ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold font-mono">{order.tracking_number}</span>
                              <span className="text-xxs text-muted-foreground">Carrier: {order.carrier}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Awaiting Shipment Info
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(order.status)} className="capitalize text-xxs px-2 py-0.5">
                            {order.status?.toLowerCase() === 'pending' ? 'order created' : order.status?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={itemsSummary}>
                          {itemsSummary}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${Number(order.total || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                            className="gap-1 text-xs h-7 px-3 text-primary hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Logging Panel */}
      <SyncActivityLog />

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </DashboardLayout>
  );
}
