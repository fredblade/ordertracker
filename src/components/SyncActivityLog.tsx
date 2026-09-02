'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, RefreshCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SyncActivityLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/sync/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="mt-8 border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2 font-mono">
          <Terminal className="h-5 w-5 text-primary" />
          Worker Sync Logs
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchLogs} 
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <RefreshCcw className="h-3 w-3" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Loading background execution logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No background synchronization events recorded yet.
          </div>
        ) : (
          <ScrollArea className="h-72">
            <div className="flex flex-col gap-2.5 pr-3.5">
              {logs.map((log) => {
                const isSuccess = log.status === 'success';
                const logDate = new Date(log.created_at).toLocaleString();
                return (
                  <div 
                    key={log.id} 
                    className="flex justify-between items-center p-3.5 bg-accent/10 hover:bg-accent/20 border border-border/40 rounded-lg gap-5 transition-all"
                  >
                    <div className="flex items-center gap-3 max-w-[75%]">
                      {isSuccess ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground break-all">
                          {log.message || (isSuccess ? 'Synchronization successful.' : 'Synchronization failed.')}
                        </span>
                        <span className="text-xxs text-muted-foreground">
                          Account: {log.email_accounts?.email || 'System'} | Time: {logDate}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <Badge variant={isSuccess ? "secondary" : "destructive"} className="text-xxs font-semibold uppercase px-2 py-0.5">
                        {log.status}
                      </Badge>
                      <span className="text-xxs text-muted-foreground font-mono">
                        {log.duration_ms} ms
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
