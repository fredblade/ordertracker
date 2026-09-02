'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { TrendingUp, ShoppingBag, Truck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // 1. Spending Over Time Data (Monthly)
  const getTimelineData = () => {
    const monthlyMap: Record<string, number> = {};
    
    // Sort orders by date
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedOrders.forEach((order) => {
      const date = new Date(order.created_at);
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyMap[key] = (monthlyMap[key] || 0) + (order.total || 0);
    });

    return Object.keys(monthlyMap).map((month) => ({
      name: month,
      Amount: parseFloat(monthlyMap[month].toFixed(2))
    }));
  };

  // 2. Spending By Retailer Data
  const getRetailerData = () => {
    const retailerMap: Record<string, number> = {};

    orders.forEach((order) => {
      const key = order.retailer || 'Unknown';
      retailerMap[key] = (retailerMap[key] || 0) + (order.total || 0);
    });

    return Object.keys(retailerMap).map((retailer) => ({
      name: retailer,
      Spend: parseFloat(retailerMap[retailer].toFixed(2))
    })).sort((a, b) => b.Spend - a.Spend);
  };

  // 3. Carrier Distribution Data
  const getCarrierData = () => {
    const carrierMap: Record<string, number> = {};

    orders.forEach((order) => {
      const key = order.carrier || 'Pending';
      carrierMap[key] = (carrierMap[key] || 0) + 1;
    });

    return Object.keys(carrierMap).map((carrier) => ({
      name: carrier,
      value: carrierMap[carrier]
    }));
  };

  const timelineData = getTimelineData();
  const retailerData = getRetailerData();
  const carrierData = getCarrierData();

  // Color constants for charts
  const COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight font-mono text-foreground">ANALYTICS & INSIGHTS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Evaluate spending curves, retailer breakdowns, and carrier distributions.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Aggregating order analytics...
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No data available yet. Configure accounts in Settings and sync order confirmation emails.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* Row 1: Timeline Spending Area Chart */}
          <Card className="border-border min-h-[380px]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold font-mono flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Monthly Spend Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px]">
                {isClient && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey="name" stroke="#6b6684" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#6b6684" style={{ fontSize: '11px' }} tickFormatter={(tick) => `$${tick}`} />
                      <Tooltip 
                        contentStyle={{ background: '#120e25', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}
                        labelStyle={{ color: '#f3f1f9', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="Amount" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Row 2: Grid of Retailer Spend Bar Chart & Carrier Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Retailer Spend */}
            <Card className="border-border min-h-[350px]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold font-mono flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Spend By Retailer ($)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[260px]">
                  {isClient && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={retailerData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                        <XAxis dataKey="name" stroke="#6b6684" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#6b6684" style={{ fontSize: '11px' }} />
                        <Tooltip 
                          contentStyle={{ background: '#120e25', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                        />
                        <Bar dataKey="Spend" fill="#6366f1" radius={[4, 4, 0, 0]}>
                          {retailerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Carrier Shares */}
            <Card className="border-border min-h-[350px]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold font-mono flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Carrier Distribution (Count)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                <div className="w-full h-[260px]">
                  {isClient && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={carrierData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {carrierData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: '#120e25', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
