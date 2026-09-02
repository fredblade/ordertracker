'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Mail, 
  Plus, 
  Trash2, 
  Bell, 
  Send,
  RefreshCw
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // Form input states
  const [emailInput, setEmailInput] = useState('');
  const [providerInput, setProviderInput] = useState('gmail');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapPassword, setImapPassword] = useState('');

  const loadData = async () => {
    try {
      const [accountsRes, settingsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/settings')
      ]);

      if (accountsRes.ok && settingsRes.ok) {
        const accountsData = await accountsRes.json();
        const settingsData = await settingsRes.json();
        
        setAccounts(accountsData.accounts || []);
        setWebhookUrl(settingsData.settings?.value?.url || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (providerInput === 'gmail') {
      setImapHost('imap.gmail.com');
      setImapPort('993');
    } else if (providerInput === 'mock') {
      setEmailInput((prev) => prev || 'demo@ordertracker.local');
    }
  }, [providerInput]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    const credentials: any = providerInput === 'mock'
      ? { speed: 1 }
      : {
          host: imapHost,
          port: parseInt(imapPort, 10) || 993,
          password: imapPassword
        };

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          provider: providerInput === 'gmail' ? 'imap' : providerInput,
          credentials
        })
      });

      if (res.ok) {
        setEmailInput('');
        setImapHost('');
        setImapPort('993');
        setImapPassword('');
        loadData();
      } else {
        alert('Failed to connect email account.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating account.');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this account? This will delete synced order references.')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });

      if (res.ok) {
        alert('Discord Webhook saved successfully.');
      } else {
        alert('Failed to save webhook settings.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setIsTestingWebhook(true);
    try {
      const res = await fetch('/api/settings/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });

      if (res.ok) {
        alert('Test notification sent successfully. Check your Discord channel!');
      } else {
        const errorData = await res.json();
        alert(`Failed to send test: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error sending test webhook.');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const getAccountStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'connected':
      case 'success':
        return 'default';
      case 'failed':
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight font-mono text-foreground">SETTINGS & INTEGRATIONS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect source mailboxes, configure credentials, and manage notification targets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Col: Connect Account Form & Webhook Settings */}
        <div className="flex flex-col gap-8">
          
          {/* Add Connection */}
          <Card className="border-border">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-lg font-bold font-mono flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Connect Email
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddAccount} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="e.g. orders@company.com" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="provider" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Connection Provider</Label>
                  <Select value={providerInput} onValueChange={(val) => setProviderInput(val)}>
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail Account (via IMAP)</SelectItem>
                      <SelectItem value="imap">Custom IMAP Email Account</SelectItem>
                      <SelectItem value="mock">Mock / Demo Account (fake orders)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {providerInput === 'gmail' && (
                  <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-lg text-xs leading-normal text-muted-foreground">
                    <strong className="text-foreground">Gmail Notice:</strong> Google requires an <strong>App Password</strong> rather than your standard Gmail password. Make sure 2-Step Verification is enabled in your Google Account security settings, then generate a 16-character App Password to paste below.
                  </div>
                )}

                {providerInput === 'mock' && (
                  <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-lg text-xs leading-normal text-muted-foreground">
                    <strong className="text-foreground">Demo Mode:</strong> No real mailbox is contacted. Syncs generate fake retailer orders so you can explore the dashboard.
                  </div>
                )}

                {providerInput !== 'mock' && (
                <div className="flex flex-col gap-4 p-4 bg-accent/5 rounded-lg border border-border">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="imapHost" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">IMAP Host Address</Label>
                    <Input 
                      id="imapHost"
                      type="text" 
                      placeholder="e.g. imap.gmail.com" 
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      required
                      disabled={providerInput === 'gmail'}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 flex flex-col gap-2">
                      <Label htmlFor="imapPort" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Port</Label>
                      <Input 
                        id="imapPort"
                        type="text" 
                        value={imapPort}
                        onChange={(e) => setImapPort(e.target.value)}
                        required
                        disabled={providerInput === 'gmail'}
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-2">
                      <Label htmlFor="imapPass" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">App Password</Label>
                      <Input 
                        id="imapPass"
                        type="password" 
                        placeholder="••••••••••••••••" 
                        value={imapPassword}
                        onChange={(e) => setImapPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                )}

                <Button type="submit" size="lg" className="w-full justify-center">
                  Create Integration
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Webhook Section */}
          <Card className="border-border">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-lg font-bold font-mono flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Discord Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="webhook" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Discord Webhook URL</Label>
                <Input 
                  id="webhook"
                  type="text" 
                  placeholder="https://discord.com/api/webhooks/..." 
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveWebhook} className="flex-1">
                  Save Webhook
                </Button>
                <Button 
                  onClick={handleTestWebhook} 
                  disabled={isTestingWebhook || !webhookUrl}
                  variant="secondary"
                  className="flex-1 gap-2"
                >
                  <Send className={cn("h-4 w-4", isTestingWebhook && "animate-spin")} />
                  Test alert
                </Button>
              </div>
              <span className="text-[11px] text-muted-foreground leading-normal">
                Setup: Open your Discord server settings, click Integrations → Create Webhook, copy the URL and paste it here.
              </span>
            </CardContent>
          </Card>

        </div>

        {/* Right Col: Connected Accounts List */}
        <Card className="border-border min-h-[400px]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-lg font-bold font-mono flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-muted-foreground text-center py-10 text-sm">
                Loading connected accounts...
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-muted-foreground text-center py-10 text-sm">
                No email integrations connected yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {accounts.map((account) => {
                  const isMock = account.provider === 'mock';
                  return (
                    <div 
                      key={account.id}
                      className="p-4 bg-accent/5 border border-border/60 rounded-lg flex justify-between items-center"
                    >
                      <div className="flex flex-col gap-1">
                        <strong className="text-sm font-semibold text-foreground break-all">{account.email}</strong>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                            isMock ? "bg-primary/10 text-primary" : "bg-indigo-500/10 text-indigo-400"
                          )}>
                            {account.provider}
                          </span>
                          <Badge variant={getAccountStatusVariant(account.status)} className="text-[9px] px-1.5 py-0">
                            {account.status}
                          </Badge>
                        </div>
                        {account.last_synced_at && (
                          <span className="text-xxs text-muted-foreground mt-1.5">
                            Last Synced: {new Date(account.last_synced_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon-sm"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
