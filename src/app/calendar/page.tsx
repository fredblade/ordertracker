'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import OrderDetailModal from '@/components/OrderDetailModal';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckSquare, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal states
  const [selectedDateOrders, setSelectedDateOrders] = useState<any[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
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
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Helper values for Monthly Grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Get total days in previous month
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Array of days for the monthly grid
  const daysArray: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Previous month dates
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayVal = prevMonthTotalDays - i;
    daysArray.push({
      day: dayVal,
      isCurrentMonth: false,
      date: new Date(year, month - 1, dayVal)
    });
  }

  // Current month dates
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month dates to fill out grid (to multiple of 7)
  const totalGridItems = daysArray.length;
  const rem = totalGridItems % 7;
  if (rem !== 0) {
    const fillCount = 7 - rem;
    for (let i = 1; i <= fillCount; i++) {
      daysArray.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Find orders arriving on a given date
  const getOrdersForDate = (date: Date) => {
    return orders.filter((order) => {
      // Use delivery_date if available, otherwise check tracking history timestamps or fallback to created_at
      const dDateStr = order.delivery_date || order.updated_at;
      if (!dDateStr) return false;

      const dDate = new Date(dDateStr);
      return (
        dDate.getDate() === date.getDate() &&
        dDate.getMonth() === date.getMonth() &&
        dDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handleDateClick = (date: Date, dateOrders: any[]) => {
    setSelectedDateOrders(dateOrders);
    setSelectedDateStr(date.toLocaleDateString(undefined, { dateStyle: 'long' }));
  };

  const getBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'default';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight font-mono text-foreground">DELIVERY CALENDAR</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Coordinate upcoming packages, inspect dates, and track schedules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left: Monthly Grid panel */}
        <Card className="lg:col-span-3 border-border">
          <CardHeader className="flex flex-row justify-between items-center pb-4 border-b border-border/60">
            <CardTitle className="text-lg font-bold font-mono flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {monthNames[month]} {year}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrevMonth} variant="secondary" size="icon-sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={handleNextMonth} variant="secondary" size="icon-sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Grid Layout */}
            <div className="grid grid-cols-7 gap-2.5">
              {/* Week Headers */}
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <div key={day} className="text-center text-[10px] font-bold text-muted-foreground/70 py-2 font-mono">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {isLoading ? (
                <div className="col-span-7 py-12 text-center text-muted-foreground text-sm">
                  Loading delivery calendar...
                </div>
              ) : (
                daysArray.map((item, idx) => {
                  const dateOrders = getOrdersForDate(item.date);
                  const isToday = new Date().toDateString() === item.date.toDateString();
                  const isSelected = selectedDateStr === item.date.toLocaleDateString(undefined, { dateStyle: 'long' });

                  return (
                    <div 
                      key={idx}
                      onClick={() => handleDateClick(item.date, dateOrders)}
                      className={cn(
                        "min-h-[85px] p-2.5 border rounded-lg flex flex-col justify-between cursor-pointer transition-all duration-200 select-none",
                        isSelected 
                          ? "bg-primary/10 border-primary" 
                          : (item.isCurrentMonth 
                              ? "bg-accent/5 border-border hover:bg-accent/15 hover:border-primary/40" 
                              : "bg-transparent border-border/40 opacity-40 hover:opacity-75"),
                        isToday && "border-primary shadow-[0_0_10px_rgba(139,92,246,0.25)]"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-bold font-mono",
                        isToday ? "text-primary" : "text-foreground"
                      )}>
                        {item.day}
                      </span>

                      {/* Order bullet notifications */}
                      <div className="flex flex-col gap-1 mt-2.5">
                        {dateOrders.slice(0, 2).map((order) => (
                          <div 
                            key={order.id}
                            className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-bold truncate leading-snug",
                              order.status === 'delivered' 
                                ? "bg-green-500/10 text-green-400" 
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            {order.retailer}
                          </div>
                        ))}
                        {dateOrders.length > 2 && (
                          <div className="text-[8px] text-muted-foreground text-center font-bold">
                            +{dateOrders.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Date detail breakdown panel */}
        <Card className="lg:col-span-1 border-border min-h-[300px]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-bold font-mono flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Arriving Packages
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!selectedDateStr ? (
              <div className="text-center text-muted-foreground text-xs py-10">
                Select a date on the calendar grid to inspect package deliveries.
              </div>
            ) : selectedDateOrders.length === 0 ? (
              <div className="flex flex-col gap-2">
                <strong className="text-sm font-semibold text-foreground">{selectedDateStr}</strong>
                <p className="text-muted-foreground text-xs">
                  No packages scheduled for arrival on this date.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-0.5">
                  <strong className="text-sm font-semibold text-foreground">{selectedDateStr}</strong>
                  <span className="text-xxs text-muted-foreground">
                    {selectedDateOrders.length} {selectedDateOrders.length === 1 ? 'shipment' : 'shipments'} arriving
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {selectedDateOrders.map((order) => (
                    <div 
                      key={order.id}
                      className="p-3.5 bg-accent/5 border border-border/60 rounded-lg flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-xs font-semibold text-foreground block">{order.retailer}</strong>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{order.order_number}
                          </span>
                        </div>
                        <Badge variant={getBadgeVariant(order.status)} className="capitalize text-[8px] px-1.5 py-0.25">
                          {order.status}
                        </Badge>
                      </div>

                      <p className="text-xxs text-muted-foreground border-t border-border/40 pt-2.5 leading-normal">
                        {order.items && order.items.length > 0 ? order.items[0].name : 'No items listed'}
                        {order.items && order.items.length > 1 ? ` (+${order.items.length - 1} more)` : ''}
                      </p>

                      <Button 
                        onClick={() => setActiveOrder(order)}
                        variant="secondary" 
                        size="xs" 
                        className="w-full gap-1 text-[10px] h-7"
                      >
                        <Eye className="h-3 w-3" />
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Details modal overlay */}
      {activeOrder && (
        <OrderDetailModal 
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
        />
      )}
    </DashboardLayout>
  );
}
