import { useState } from "react";
import { useGetGatewayStats, useGetGatewayStatus, useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  ArrowRightRight,
  Server,
  ActivitySquare,
  Zap,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { data: stats } = useGetGatewayStats();
  const { data: status } = useGetGatewayStatus();
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">System Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time gateway telemetry and delivery statistics</p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <div className={`px-3 py-1.5 rounded-full border flex items-center text-xs font-bold uppercase tracking-wider ${status.online ? 'border-primary/50 text-primary bg-primary/10' : 'border-destructive/50 text-destructive bg-destructive/10'}`}>
              <Activity className="w-3 h-3 mr-2" />
              {status.online ? 'System Active' : 'System Degraded'}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Sent" 
          value={stats?.totalSent ?? "---"} 
          subValue={`Today: ${stats?.todaySent ?? "--"}`}
          icon={ArrowRightRight} 
        />
        <StatsCard 
          title="Verified" 
          value={stats?.totalVerified ?? "---"} 
          subValue={`Today: ${stats?.todayVerified ?? "--"}`}
          icon={CheckCircle2} 
          trend="up"
        />
        <StatsCard 
          title="Failed" 
          value={stats?.totalFailed ?? "---"} 
          subValue={`${stats?.totalExpired ?? 0} expired`}
          icon={XCircle} 
          trend="down"
        />
        <StatsCard 
          title="Success Rate" 
          value={stats ? `${stats.successRate.toFixed(1)}%` : "---"} 
          subValue="Last 30 days"
          icon={ActivitySquare} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight uppercase">Live Telemetry</h2>
            <Link href="/logs" className="text-xs text-primary hover:underline uppercase tracking-wider">
              View All Logs
            </Link>
          </div>
          <Card className="bg-card border-border shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Channel</th>
                    <th className="px-4 py-3 font-semibold">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats?.recentLogs?.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(log.createdAt), "HH:mm:ss.SSS")}
                      </td>
                      <td className="px-4 py-3 font-mono">{log.phone}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{log.channel || 'N/A'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.attemptsUsed}</td>
                    </tr>
                  ))}
                  {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No recent activity detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase">Hardware</h2>
            <Card className="bg-card border-border shadow-2xl">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center text-muted-foreground">
                  <Server className="w-4 h-4 mr-2 text-primary" />
                  Gateway Diagnostic
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-muted-foreground uppercase text-xs tracking-widest">Active Channel</span>
                  <span className="font-bold text-primary uppercase text-sm">{status?.channel || '---'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-muted-foreground uppercase text-xs tracking-widest">Modem Port</span>
                  <span className="font-mono text-sm">{status?.modemPort || 'NOT ATTACHED'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-muted-foreground uppercase text-xs tracking-widest">SMTP Ready</span>
                  <span className={status?.smtpReady ? 'text-green-500' : 'text-muted-foreground'}>
                    {status?.smtpReady ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground uppercase text-xs tracking-widest">Last Poll</span>
                  <span className="font-mono text-xs">{status ? format(new Date(status.lastChecked), "HH:mm:ss") : '---'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase">Quick Actions</h2>
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  const { toast } = useToast();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [requestId, setRequestId] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    sendOtp.mutate({ data: { phone } }, {
      onSuccess: (res) => {
        toast({ title: "OTP Sent", description: "Successfully triggered send action." });
        setRequestId(res.requestId);
      },
      onError: (err: any) => {
        toast({ title: "Send Failed", description: err.error || "Network error", variant: "destructive" });
      }
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !code) return;
    verifyOtp.mutate({ data: { phone, code, requestId } }, {
      onSuccess: (res) => {
        toast({ 
          title: res.verified ? "Verified" : "Verification Failed", 
          description: res.verified ? "Code matched successfully." : res.reason || "Invalid code.",
          variant: res.verified ? "default" : "destructive" 
        });
      },
      onError: (err: any) => {
        toast({ title: "Verification Error", description: err.error || "Network error", variant: "destructive" });
      }
    });
  };

  return (
    <Card className="bg-card border-border shadow-2xl border-t-4 border-t-primary">
      <CardContent className="p-4 space-y-4">
        <form onSubmit={handleSend} className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Manual Dispatch</label>
          <div className="flex gap-2">
            <Input 
              placeholder="Phone Number" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="bg-background border-border font-mono text-sm"
              required
            />
            <Button type="submit" disabled={sendOtp.isPending || !phone} className="shrink-0 bg-primary/20 text-primary hover:bg-primary/30">
              {sendOtp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            </Button>
          </div>
        </form>
        <form onSubmit={handleVerify} className="space-y-2 pt-4 border-t border-border/50">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Verify Dispatch</label>
          <div className="flex gap-2">
            <Input 
              placeholder="Code" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              className="bg-background border-border font-mono text-sm"
              required
            />
            <Button type="submit" disabled={verifyOtp.isPending || !phone || !code} variant="outline" className="shrink-0 border-primary/50 text-primary hover:bg-primary/10">
              {verifyOtp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function StatsCard({ title, value, subValue, icon: Icon, trend }: { title: string, value: string | number, subValue: string, icon: any, trend?: 'up' | 'down' }) {
  return (
    <Card className="bg-card border-border relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-16 h-16" />
      </div>
      <CardContent className="p-6 relative z-10">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-3xl font-black text-foreground">{value}</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">{subValue}</p>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "border-yellow-500/50 text-yellow-500 bg-yellow-500/10",
    sent: "border-blue-500/50 text-blue-500 bg-blue-500/10",
    delivered: "border-primary/50 text-primary bg-primary/10",
    failed: "border-destructive/50 text-destructive bg-destructive/10",
    verified: "border-green-500/50 text-green-500 bg-green-500/10",
    expired: "border-muted-foreground/50 text-muted-foreground bg-muted-foreground/10",
  };

  const current = variants[status] || variants.pending;

  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${current}`}>
      {status}
    </span>
  );
}

