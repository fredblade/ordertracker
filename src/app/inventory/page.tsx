'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Package,
  Inbox
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for manual insert
  const [isAdding, setIsAdding] = useState(false);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0.00);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('in_stock');
  const [editSalePrice, setEditSalePrice] = useState<string>('');
  const [editShippingCost, setEditShippingCost] = useState<string>('');

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: productName,
          quantity: quantity,
          unit_cost: unitCost,
          status: 'in_stock'
        })
      });

      if (res.ok) {
        setIsAdding(false);
        setProductName('');
        setQuantity(1);
        setUnitCost(0);
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setEditStatus(item.status);
    setEditSalePrice(item.sale_price !== null ? item.sale_price.toString() : '');
    setEditShippingCost(item.shipping_cost !== null ? item.shipping_cost.toString() : '0');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          sale_price: editStatus === 'sold' && editSalePrice ? parseFloat(editSalePrice) : null,
          shipping_cost: editStatus === 'sold' && editShippingCost ? parseFloat(editShippingCost) : 0
        })
      });

      if (res.ok) {
        setEditingId(null);
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // P&L Metrics calculations
  const totalCost = inventory.reduce((acc, item) => acc + (Number(item.unit_cost) * Number(item.quantity)), 0);
  const soldItems = inventory.filter((item) => item.status === 'sold');
  const soldCost = soldItems.reduce((acc, item) => acc + (Number(item.unit_cost) * Number(item.quantity)), 0);
  const totalRevenue = soldItems.reduce((acc, item) => acc + (Number(item.sale_price || 0) * Number(item.quantity)), 0);
  const totalShipping = soldItems.reduce((acc, item) => acc + Number(item.shipping_cost || 0), 0);
  
  const netProfit = totalRevenue - (soldCost + totalShipping);
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-mono text-foreground">INVENTORY & P&L MANAGER</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record purchase costs, calculate sold revenues, and monitor margins.
          </p>
        </div>
        <Button 
          onClick={() => setIsAdding(!isAdding)}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Manual Item
        </Button>
      </div>

      {/* Manual Add Card Form */}
      {isAdding && (
        <Card className="border-border mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleAddManualItem} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col gap-2">
                <Label htmlFor="productName" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Name</Label>
                <Input 
                  id="productName"
                  type="text" 
                  placeholder="e.g. Sony WH-1000XM4" 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="quantity" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantity</Label>
                <Input 
                  id="quantity"
                  type="number" 
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="unitCost" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit Cost ($)</Label>
                <Input 
                  id="unitCost"
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="flex gap-2.5">
                <Button type="submit" className="flex-1 justify-center">Save</Button>
                <Button type="button" onClick={() => setIsAdding(false)} variant="secondary" className="flex-1 justify-center">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Top Margin / P&L KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Total Cost Basis */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="flex items-center gap-5 p-6">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Inventory Cost</span>
              <h2 className="text-2xl font-extrabold mt-1 font-mono">
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="flex items-center gap-5 p-6">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Sold Revenue</span>
              <h2 className="text-2xl font-extrabold mt-1 font-mono">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="flex items-center gap-5 p-6">
            <div className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center",
              netProfit >= 0 ? "bg-green-500/10 text-green-500" : "bg-destructive/15 text-destructive"
            )}>
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Net Profit</span>
              <h2 className={cn(
                "text-2xl font-extrabold mt-1 font-mono",
                netProfit >= 0 ? "text-green-400" : "text-destructive"
              )}>
                {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </CardContent>
        </Card>

        {/* Profit Margin % */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="flex items-center gap-5 p-6">
            <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Profit Margin</span>
              <h2 className="text-2xl font-extrabold mt-1 font-mono text-indigo-400">
                {profitMargin.toFixed(1)}%
              </h2>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Main Inventory Log table */}
      <Card className="border-border">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading inventory items...
            </div>
          ) : inventory.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
              <Inbox className="h-12 w-12 text-muted-foreground/35" />
              <span>No products registered in inventory. Seed items via email scan.</span>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-bold">Product</TableHead>
                    <TableHead className="font-bold">Retailer Ref</TableHead>
                    <TableHead className="font-bold w-[70px]">Qty</TableHead>
                    <TableHead className="font-bold">Unit Cost</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Sale Price</TableHead>
                    <TableHead className="font-bold">Shipping Fee</TableHead>
                    <TableHead className="text-right font-bold">Net Profit</TableHead>
                    <TableHead className="text-center font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const isEditing = editingId === item.id;
                    
                    // Calculate inline item profit
                    const costBasis = Number(item.unit_cost) * Number(item.quantity);
                    const isSold = item.status === 'sold';
                    const revenue = isSold ? (Number(item.sale_price || 0) * Number(item.quantity)) : 0;
                    const itemProfit = isSold ? (revenue - costBasis - Number(item.shipping_cost || 0)) : 0;

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 border-border">
                        {/* Product Name */}
                        <TableCell className="font-bold text-sm">
                          {item.product_name}
                        </TableCell>

                        {/* Retailer Reference */}
                        <TableCell className="text-xs text-muted-foreground">
                          {item.orders ? (
                            <div className="flex flex-col">
                              <span>{item.orders.retailer}</span>
                              <span className="text-[10px] text-muted-foreground/70 font-mono">
                                #{item.orders.order_number}
                              </span>
                            </div>
                          ) : (
                            <span className="italic text-muted-foreground/60 text-xxs">
                              Manual Item
                            </span>
                          )}
                        </TableCell>

                        {/* Quantity */}
                        <TableCell className="font-mono text-xs">
                          {item.quantity}
                        </TableCell>

                        {/* Unit Cost */}
                        <TableCell className="font-mono text-xs">
                          ${Number(item.unit_cost).toFixed(2)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {isEditing ? (
                            <Select value={editStatus} onValueChange={(val) => setEditStatus(val)}>
                              <SelectTrigger className="h-7 text-xs w-[110px]">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_stock">In Stock</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge 
                              onClick={() => handleEditClick(item)}
                              variant={isSold ? "default" : "secondary"}
                              className="cursor-pointer text-[10px] px-2 py-0.5"
                              title="Click to edit status"
                            >
                              {isSold ? 'Sold' : 'In Stock'}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Sale Price */}
                        <TableCell>
                          {isEditing ? (
                            editStatus === 'sold' ? (
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="Sale Price"
                                value={editSalePrice}
                                onChange={(e) => setEditSalePrice(e.target.value)}
                                className="h-7 text-xs w-[90px]"
                              />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )
                          ) : isSold ? (
                            <span className="font-mono text-xs">${Number(item.sale_price).toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Shipping Cost */}
                        <TableCell>
                          {isEditing ? (
                            editStatus === 'sold' ? (
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="Shipping"
                                value={editShippingCost}
                                onChange={(e) => setEditShippingCost(e.target.value)}
                                className="h-7 text-xs w-[80px]"
                              />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )
                          ) : isSold && Number(item.shipping_cost) > 0 ? (
                            <span className="font-mono text-xs">${Number(item.shipping_cost).toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Net Profit */}
                        <TableCell className={cn(
                          "text-right font-mono font-bold text-xs shrink-0",
                          isSold ? (itemProfit >= 0 ? "text-green-400" : "text-destructive") : "text-muted-foreground"
                        )}>
                          {isSold ? (
                            <>
                              {itemProfit >= 0 ? '+' : ''}
                              ${itemProfit.toFixed(2)}
                            </>
                          ) : (
                            '$0.00'
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            {isEditing ? (
                              <>
                                <Button 
                                  variant="secondary"
                                  size="icon-xs"
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="text-green-500 hover:text-green-600 hover:bg-green-500/10 shrink-0"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => setEditingId(null)}
                                  className="text-muted-foreground shrink-0"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => handleEditClick(item)}
                                  className="h-7 px-3 text-xs"
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
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
    </DashboardLayout>
  );
}
