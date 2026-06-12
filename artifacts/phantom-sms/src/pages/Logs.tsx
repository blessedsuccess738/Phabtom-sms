import { useState } from "react";
import { useListOtpLogs, ListOtpLogsStatus, useGetOtpLog, getGetOtpLogQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { StatusBadge } from "./Dashboard";
import { Search, Filter, Loader2, Info } from "lucide-react";

export function Logs() {
  const [statusFilter, setStatusFilter] = useState<ListOtpLogsStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const { data: logs, isLoading } = useListOtpLogs({ 
    limit: 100, 
    status: statusFilter === "all" ? undefined : statusFilter 
  });

  const { data: selectedLog, isLoading: isLogLoading } = useGetOtpLog(selectedLogId ?? 0, {
    query: {
      enabled: selectedLogId !== null,
      queryKey: getGetOtpLogQueryKey(selectedLogId ?? 0)
    }
  });

  const filteredLogs = logs?.filter(log => 
    search ? log.phone.includes(search) || log.requestId?.includes(search) : true
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Event Logs</h1>
        <p className="text-muted-foreground mt-1">Immutable record of all gateway transmissions and verifications</p>
      </div>

      <Card className="bg-card border-border shadow-2xl">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by phone number or request ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border font-mono text-sm"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ListOtpLogsStatus | "all")}>
              <SelectTrigger className="bg-background border-border text-sm font-mono uppercase tracking-wider">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border font-mono uppercase text-xs">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Time (UTC)</th>
                <th className="px-4 py-3 font-semibold">Request ID</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold">Attempts</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Fetching telemetry data...
                  </td>
                </tr>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-muted/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      <span className="truncate w-24 inline-block" title={log.requestId}>{log.requestId?.split('-')[0] + '...'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{log.phone}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{log.channel || 'N/A'}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{log.attemptsUsed}</td>
                    <td className="px-4 py-3 text-xs text-destructive font-mono truncate max-w-[200px]" title={log.errorMessage || ""}>
                      {log.errorMessage || (log.verifiedAt ? <span className="text-green-500">Verified</span> : '---')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No logs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={selectedLogId !== null} onOpenChange={(open) => !open && setSelectedLogId(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md font-mono">
          <DialogHeader>
            <DialogTitle className="flex items-center uppercase tracking-widest text-primary text-sm">
              <Info className="w-4 h-4 mr-2" /> Request Introspection
            </DialogTitle>
            <DialogDescription className="text-xs">Detailed telemetry for message dispatch.</DialogDescription>
          </DialogHeader>
          
          {isLogLoading || !selectedLog ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Status</div>
                  <StatusBadge status={selectedLog.status} />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Channel</div>
                  <div className="text-sm uppercase text-foreground">{selectedLog.channel || 'N/A'}</div>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Request ID</div>
                <div className="text-xs bg-muted/30 p-2 rounded border border-border/50 break-all">{selectedLog.requestId || 'N/A'}</div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Target Number</div>
                <div className="text-sm">{selectedLog.phone}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Created At</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(selectedLog.createdAt), "yyyy-MM-dd HH:mm:ss")}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Expires At</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(selectedLog.expiresAt), "yyyy-MM-dd HH:mm:ss")}</div>
                </div>
              </div>

              {selectedLog.verifiedAt && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Verified At</div>
                  <div className="text-xs text-green-500">{format(new Date(selectedLog.verifiedAt), "yyyy-MM-dd HH:mm:ss")}</div>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Error Trace</div>
                  <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">{selectedLog.errorMessage}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">App ID</div>
                  <div className="text-xs">{selectedLog.appId || 'default'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Attempts</div>
                  <div className="text-xs">{selectedLog.attemptsUsed}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

