'use client';

import React, { useState } from 'react';
import { Calendar, Receipt, MapPin, Truck, ExternalLink, Bell, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getTrackingUrl } from '@/lib/carrier/status';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrderDetailModalProps {
  order: any;
  onClose: () => void;
}

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  if (!order) return null;

  const [webhookState, setWebhookState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSendWebhook() {
    setWebhookState('sending');
    try {
      const res = await fetch(`/api/orders/${order.id}/notify`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setWebhookState('sent');
      setTimeout(() => setWebhookState('idle'), 3000);
    } catch {
      setWebhookState('error');
      setTimeout(() => setWebhookState('idle'), 3000);
    }
  }

  const statuses = ['pending', 'shipped', 'delivered'];
  const normalizedStatus = order.status?.toLowerCase() === 'action_required' ? 'pending' : order.status?.toLowerCase();
  const currentStatusIndex = statuses.indexOf(normalizedStatus);

  // Calculate percentage for progress line
  const progressPercent = currentStatusIndex <= 0 ? 0 : (currentStatusIndex / (statuses.length - 1)) * 100;

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[1100px] xl:max-w-[1300px] max-h-[92vh] overflow-y-auto p-6 md:p-8 bg-card border border-border">

        {/* Modal Header */}
        <DialogHeader className="mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Badge className="w-fit uppercase text-[10px] tracking-wider px-2 py-0.5" variant="secondary">
                {order.retailer}
              </Badge>
              <Button
                id="send-discord-webhook-btn"
                variant="outline"
                size="sm"
                onClick={handleSendWebhook}
                disabled={webhookState === 'sending'}
                className={cn(
                  "gap-1.5 text-xs transition-all",
                  webhookState === 'sent' && "border-green-500 text-green-500 hover:text-green-500",
                  webhookState === 'error' && "border-red-500 text-red-500 hover:text-red-500"
                )}
              >
                {webhookState === 'sending' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {webhookState === 'sent' && <CheckCircle className="h-3.5 w-3.5" />}
                {webhookState === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
                {webhookState === 'idle' && <Bell className="h-3.5 w-3.5" />}
                {webhookState === 'sending' ? 'Sending…' : webhookState === 'sent' ? 'Sent!' : webhookState === 'error' ? 'Failed' : 'Send to Discord'}
              </Button>
            </div>
            <DialogTitle className="text-2xl font-extrabold font-mono tracking-tight">
              Order #{order.order_number}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Placed on {new Date(order.created_at).toLocaleDateString()}
              </span>
              {order.delivered_to && (
                <span className="flex items-center gap-1">
                  📧 Inbox: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{order.delivered_to}</code>
                </span>
              )}
              {order.original_recipient && order.original_recipient !== order.delivered_to && (
                <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                  ↪️ Forwarded from: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{order.original_recipient}</code>
                </span>
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Stepper Status Progress */}
        <div className="my-8 px-2.5">
          <div className="relative">
            <div className="absolute top-[15px] left-[15px] right-[15px] h-[2px] bg-accent/40 z-1" />
            <div
              className="absolute top-[15px] left-[15px] h-[2px] bg-primary z-2 transition-all duration-500 ease-in-out"
              style={{ width: `calc(${progressPercent}% - 30px)` }}
            />
            <div className="flex justify-between z-3 position-relative">
              {statuses.map((step, idx) => {
                const isDelivered = order.status?.toLowerCase() === 'delivered';
                const isCompleted = idx < currentStatusIndex || (isDelivered && idx === currentStatusIndex);
                const isActive = idx === currentStatusIndex && !isDelivered;
                return (
                  <div key={step} className="flex flex-col items-center w-20 z-10">
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300",
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : (isActive
                          ? "border-primary text-primary shadow-[0_0_12px_rgba(139,92,246,0.3)] bg-card"
                          : "border-border text-muted-foreground bg-card")
                    )}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className={cn(
                      "mt-2 text-[10px] font-bold uppercase text-center tracking-wide",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step === 'pending' ? 'order created' : step.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Carrier Details Card */}
        {order.tracking_number && (
          <div className="bg-accent/15 border border-border/80 p-5 rounded-lg mb-8 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold tracking-wider block uppercase">
                  CARRIER: {order.carrier}
                </span>
                <strong className="text-base text-foreground font-mono">
                  {order.tracking_number}
                </strong>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5"
            >
              <a
                href={getTrackingUrl(order.carrier, order.tracking_number)}
                target="_blank"
                rel="noreferrer"
              >
                Track Package
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}

        {/* Grid: Items vs History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Left: Items list */}
          <div>
            <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 flex items-center gap-2 font-mono">
              <Receipt className="h-4 w-4 text-primary" />
              Items List
            </h3>
            <div className="flex flex-col gap-3">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-accent/5 hover:bg-accent/10 p-3.5 border border-border/40 rounded-lg transition-colors">
                  <div className="flex flex-col gap-0.5 max-w-[70%]">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Qty: {item.quantity}
                    </span>
                  </div>
                  <strong className="text-sm font-mono text-foreground shrink-0">
                    ${Number(item.unit_price ?? item.price ?? 0).toFixed(2)}
                  </strong>
                </div>
              ))}
              <div className="flex justify-between p-3.5 border-t border-border mt-2.5">
                <span className="font-bold text-sm">Total Amount</span>
                <strong className="text-base font-mono text-primary">
                  ${Number(order.total || 0).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          {/* Right: Tracking History Timeline */}
          <div>
            <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 flex items-center gap-2 font-mono">
              <MapPin className="h-4 w-4 text-primary" />
              Shipment Journey
            </h3>
            <div className="flex flex-col gap-4.5 pl-2 border-l border-border ml-2.5">
              {order.tracking_history?.slice().reverse().map((event: any, idx: number) => (
                <div key={idx} className="relative pl-4">
                  {/* Timeline dot */}
                  <span className={cn(
                    "absolute top-1 left-[-22px] w-2 h-2 rounded-full",
                    idx === 0 ? "bg-primary shadow-[0_0_6px_rgba(139,92,246,0.5)]" : "bg-muted-foreground/60"
                  )} />
                  <div className="flex justify-between items-center mb-0.5">
                    <strong className={cn(
                      "text-xs text-capitalize leading-none",
                      idx === 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>
                      {event.status}
                    </strong>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {new Date(event.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-xxs text-muted-foreground mt-0.5 leading-relaxed">
                    {event.details}
                  </p>
                  {event.location && (
                    <span className="text-[9px] text-muted-foreground/80 font-medium italic mt-0.5 block">
                      📍 {event.location}
                    </span>
                  )}
                </div>
              ))}
              {(!order.tracking_history || order.tracking_history.length === 0) && (
                <div className="text-xs text-muted-foreground italic pl-3">No journey log available yet.</div>
              )}
            </div>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}

// Utility class merger helper
